-- ============================================================
-- VibeCraft Database Schema v2
-- Run in Supabase SQL Editor: copy all, paste, click Run
-- ============================================================

-- ── Triggers & Functions ────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Tables ──────────────────────────────────────────────────

-- Users (syncs with NextAuth on first GitHub sign-in)
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    credits     INT NOT NULL DEFAULT 1000 CHECK (credits >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE users IS 'Users synced from NextAuth on first sign-in';
COMMENT ON COLUMN users.credits IS 'Token credits balance, >= 0 enforced';

-- Projects (one per user-created app)
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id     VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL CHECK (name <> ''),
    current_html    TEXT NOT NULL,
    draft_html      TEXT DEFAULT NULL,
    selected_skills VARCHAR(50)[] DEFAULT '{}',
    design_profile  JSONB DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE projects IS 'User app projects, each started from a template';
COMMENT ON COLUMN projects.current_html IS 'Current full React CDN HTML of the project';
COMMENT ON COLUMN projects.draft_html IS 'Pending generated HTML awaiting preview and commit';
COMMENT ON COLUMN projects.selected_skills IS 'Array of enabled skill IDs from config';
COMMENT ON COLUMN projects.design_profile IS 'Optional design preference profile used to steer AI generation';

-- Existing installations can apply this safely after the table already exists.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_profile JSONB DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS draft_html TEXT DEFAULT NULL;

-- Auto-update updated_at on projects
DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Version snapshots (created after every AI modification)
CREATE TABLE IF NOT EXISTS versions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    html_content TEXT NOT NULL,
    message      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE versions IS 'Version snapshots for rollback after AI edits';

-- Phase 3: Extend versions with kind, summary, checkpoint, ancestry
ALTER TABLE versions ADD COLUMN IF NOT EXISTS summary          TEXT DEFAULT NULL;
ALTER TABLE versions ADD COLUMN IF NOT EXISTS kind             VARCHAR(20) NOT NULL DEFAULT 'ai_edit' CHECK (kind IN ('ai_edit', 'manual', 'publish', 'rollback', 'repair', 'checkpoint'));
ALTER TABLE versions ADD COLUMN IF NOT EXISTS is_checkpoint    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE versions ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_versions_project_kind ON versions(project_id, kind);

-- Phase 3: Onboarding state for projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS onboarding_state JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN projects.onboarding_state IS 'Milestone tracking: { first_ai_edit?, first_publish?, first_rollback? }';

-- Published apps (public sharing links)
CREATE TABLE IF NOT EXISTS published_apps (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    slug         VARCHAR(50) UNIQUE NOT NULL,
    html_content TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE published_apps IS 'Publicly shared apps with unique slug URLs';

ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_published_apps_project_active
ON published_apps(project_id)
WHERE revoked_at IS NULL;

-- Credit transactions (audit trail for billing)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      INT NOT NULL,
    reason      VARCHAR(100) NOT NULL,
    project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE credit_transactions IS 'Audit log of all credit changes';
COMMENT ON COLUMN credit_transactions.amount IS 'Negative = spent, positive = topped up';

-- ── Phase 1: Project Management & Publishing Overhaul ──────

-- Projects: add management fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pinned          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at     TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description     VARCHAR(500) DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_url   TEXT DEFAULT NULL;

-- Index for filtered listing
CREATE INDEX IF NOT EXISTS idx_projects_user_status_pinned
ON projects(user_id, status, pinned DESC, updated_at DESC);

-- Published apps: add metadata fields
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS title         VARCHAR(255) DEFAULT NULL;
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS description   VARCHAR(500) DEFAULT NULL;
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS cover_url     TEXT DEFAULT NULL;
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS visibility    VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted'));
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS version_id    UUID REFERENCES versions(id) ON DELETE SET NULL;

-- Index for status lookup
CREATE INDEX IF NOT EXISTS idx_published_apps_project_status
ON published_apps(project_id, revoked_at);

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_projects_user_id       ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_updated   ON projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_draft_html     ON projects(id) WHERE draft_html IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_versions_project_id     ON versions(project_id);
CREATE INDEX IF NOT EXISTS idx_versions_project_created ON versions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_apps_slug     ON published_apps(slug);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user_id       ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user_created  ON credit_transactions(user_id, created_at DESC);

-- ── RLS Note ────────────────────────────────────────────────
-- Row Level Security is NOT enabled because this app uses
-- NextAuth (not Supabase Auth), so auth.uid() does not match
-- the VibeCraft user IDs. All authorization is enforced at the
-- API layer via eq('user_id', session.user.id). The service
-- role key bypasses RLS — ensure every API route adds ownership
-- checks before any DB mutation.
-- When migrating to Supabase Auth, enable:
--   ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY p ON projects USING (user_id = auth.uid());

-- ── Core Transaction ───────────────────────────────────────

-- Atomic: deduct credits + update project HTML + insert version + log transaction
CREATE OR REPLACE FUNCTION chat_send_transaction(
    p_user_id         UUID,
    p_project_id      UUID,
    p_new_html        TEXT,
    p_message         TEXT,
    p_cost            INT DEFAULT 10,
    p_kind            VARCHAR(20) DEFAULT 'ai_edit',
    p_summary         TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
    v_milestone JSONB;
BEGIN
    -- 0. Verify project ownership (defense-in-depth)
    PERFORM 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project does not belong to user';
    END IF;

    -- 1. Atomic credit deduction
    UPDATE users
    SET credits = credits - p_cost
    WHERE id = p_user_id AND credits >= p_cost;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;

    -- 2. Update project
    UPDATE projects
    SET current_html = p_new_html, updated_at = NOW()
    WHERE id = p_project_id;

    -- 3. Insert version snapshot with kind and summary
    INSERT INTO versions (project_id, html_content, message, kind, summary)
    VALUES (p_project_id, p_new_html, p_message, p_kind, p_summary);

    -- 4. Log transaction
    INSERT INTO credit_transactions (user_id, amount, reason, project_id)
    VALUES (p_user_id, -p_cost, 'ai_chat', p_project_id);

    -- 5. Track first_ai_edit milestone
    IF p_kind = 'ai_edit' THEN
        SELECT onboarding_state INTO v_milestone FROM projects WHERE id = p_project_id;
        IF v_milestone IS NULL OR NOT (v_milestone ? 'first_ai_edit') THEN
            UPDATE projects SET onboarding_state = COALESCE(onboarding_state, '{}'::jsonb) || '{"first_ai_edit": true}'::jsonb
            WHERE id = p_project_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS commit_draft_transaction(UUID, TEXT, TEXT, UUID, INT);

-- Atomic: commit previewed draft + deduct credits + insert version + log transaction
CREATE OR REPLACE FUNCTION commit_draft_transaction(
    p_user_id    UUID,
    p_project_id UUID,
    p_new_html   TEXT,
    p_message    TEXT,
    p_cost       INT,
    p_kind       TEXT DEFAULT 'ai_edit',
    p_summary    TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
    user_credits INT;
    v_milestone JSONB;
BEGIN
    IF p_cost < 0 THEN
        RAISE EXCEPTION 'invalid_cost';
    END IF;

    PERFORM 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'project_not_found';
    END IF;

    SELECT credits INTO user_credits FROM users WHERE id = p_user_id FOR UPDATE;
    IF user_credits IS NULL THEN
        RAISE EXCEPTION 'user_not_found';
    END IF;

    IF user_credits < p_cost THEN
        RAISE EXCEPTION 'insufficient_balance';
    END IF;

    UPDATE users
    SET credits = credits - p_cost
    WHERE id = p_user_id;

    UPDATE projects
    SET current_html = p_new_html,
        draft_html = NULL,
        updated_at = NOW()
    WHERE id = p_project_id AND user_id = p_user_id;

    INSERT INTO versions (project_id, html_content, message, kind, summary)
    VALUES (p_project_id, p_new_html, p_message, p_kind, p_summary);

    INSERT INTO credit_transactions (user_id, amount, reason, project_id)
    VALUES (p_user_id, -p_cost, 'ai_edit', p_project_id);

    IF p_kind = 'ai_edit' THEN
        SELECT onboarding_state INTO v_milestone FROM projects WHERE id = p_project_id;
        IF v_milestone IS NULL OR NOT (v_milestone ? 'first_ai_edit') THEN
            UPDATE projects
            SET onboarding_state = COALESCE(onboarding_state, '{}'::jsonb) || '{"first_ai_edit": true}'::jsonb
            WHERE id = p_project_id AND user_id = p_user_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Maintenance ─────────────────────────────────────────────

-- Clean up old versions (keep last 100 per project)
CREATE OR REPLACE FUNCTION cleanup_old_versions()
RETURNS void AS $$
BEGIN
    DELETE FROM versions
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY project_id ORDER BY created_at DESC
            ) AS rn
            FROM versions
        ) sub
        WHERE rn > 100
    );
END;
$$ LANGUAGE plpgsql;

-- ── Rollback RPC ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rollback_project_version(
    p_user_id UUID,
    p_project_id UUID,
    p_version_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_html TEXT;
    v_summary TEXT;
BEGIN
    PERFORM 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project does not belong to user';
    END IF;

    SELECT html_content, summary INTO v_html, v_summary
    FROM versions
    WHERE id = p_version_id AND project_id = p_project_id;

    IF v_html IS NULL THEN
        RAISE EXCEPTION 'Version not found';
    END IF;

    UPDATE projects
    SET current_html = v_html, updated_at = NOW()
    WHERE id = p_project_id AND user_id = p_user_id;

    INSERT INTO versions (project_id, html_content, message, kind, summary)
    VALUES (p_project_id, v_html, '回滚到历史版本', 'rollback',
        CASE WHEN v_summary IS NOT NULL THEN '回滚到: ' || v_summary ELSE NULL END);

    RETURN v_html;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Preview Version RPC ──────────────────────────────────────

CREATE OR REPLACE FUNCTION preview_project_version(
    p_user_id UUID,
    p_project_id UUID,
    p_version_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_html TEXT;
BEGIN
    PERFORM 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project does not belong to user';
    END IF;

    SELECT html_content INTO v_html
    FROM versions
    WHERE id = p_version_id AND project_id = p_project_id;

    IF v_html IS NULL THEN
        RAISE EXCEPTION 'Version not found';
    END IF;

    RETURN v_html;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
