-- Add project management and publishing columns used by the current API routes.
-- Safe to run repeatedly.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS status        varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pinned        boolean NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at   timestamptz DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description   varchar(500) DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_url text DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS onboarding_state jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_user_status_pinned
ON projects(user_id, status, pinned DESC, updated_at DESC);

ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS revoked_at  timestamptz DEFAULT NULL;
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS title       varchar(255) DEFAULT NULL;
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS description varchar(500) DEFAULT NULL;
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS cover_url   text DEFAULT NULL;
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS visibility  varchar(20) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted'));
ALTER TABLE published_apps ADD COLUMN IF NOT EXISTS version_id  uuid REFERENCES versions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_published_apps_project_active
ON published_apps(project_id)
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_published_apps_project_status
ON published_apps(project_id, revoked_at);
