-- VibeCraft Database Schema
-- Run this in Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    credits INT DEFAULT 1000 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    current_html TEXT NOT NULL,
    selected_skills VARCHAR(50)[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Version snapshots table
CREATE TABLE IF NOT EXISTS versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    html_content TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Published apps table
CREATE TABLE IF NOT EXISTS published_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    slug VARCHAR(50) UNIQUE NOT NULL,
    html_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_versions_project_id ON versions(project_id);
CREATE INDEX IF NOT EXISTS idx_published_apps_slug ON published_apps(slug);

-- Atomic transaction function for chat send (deduct credits + update project + insert version)
CREATE OR REPLACE FUNCTION chat_send_transaction(
  p_user_id UUID,
  p_project_id UUID,
  p_new_html TEXT,
  p_message TEXT,
  p_credits_cost INT
) RETURNS void AS $$
BEGIN
  UPDATE users SET credits = credits - p_credits_cost WHERE id = p_user_id AND credits >= p_credits_cost;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  UPDATE projects SET current_html = p_new_html, updated_at = NOW() WHERE id = p_project_id;

  INSERT INTO versions (project_id, html_content, message) VALUES (p_project_id, p_new_html, p_message);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
