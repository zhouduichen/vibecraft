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
    selected_skills VARCHAR(50)[] DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE projects IS 'User app projects, each started from a template';
COMMENT ON COLUMN projects.current_html IS 'Current full React CDN HTML of the project';
COMMENT ON COLUMN projects.selected_skills IS 'Array of enabled skill IDs from config';

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

-- Published apps (public sharing links)
CREATE TABLE IF NOT EXISTS published_apps (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    slug         VARCHAR(50) UNIQUE NOT NULL,
    html_content TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE published_apps IS 'Publicly shared apps with unique slug URLs';

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

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_projects_user_id       ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_updated   ON projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_project_id     ON versions(project_id);
CREATE INDEX IF NOT EXISTS idx_versions_project_created ON versions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_apps_slug     ON published_apps(slug);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user_id       ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user_created  ON credit_transactions(user_id, created_at DESC);

-- ── Core Transaction ───────────────────────────────────────

-- Atomic: deduct credits + update project HTML + insert version + log transaction
CREATE OR REPLACE FUNCTION chat_send_transaction(
    p_user_id    UUID,
    p_project_id UUID,
    p_new_html   TEXT,
    p_message    TEXT,
    p_cost       INT DEFAULT 10
) RETURNS void AS $$
BEGIN
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

    -- 3. Insert version snapshot
    INSERT INTO versions (project_id, html_content, message)
    VALUES (p_project_id, p_new_html, p_message);

    -- 4. Log transaction
    INSERT INTO credit_transactions (user_id, amount, reason, project_id)
    VALUES (p_user_id, -p_cost, 'ai_chat', p_project_id);
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
