-- Fix commit_draft_transaction to write credit_transactions audit log and enforce ownership.
DROP FUNCTION IF EXISTS commit_draft_transaction(uuid, text, text, uuid, int);

CREATE OR REPLACE FUNCTION commit_draft_transaction(
  p_user_id uuid,
  p_project_id uuid,
  p_new_html text,
  p_message text,
  p_cost int,
  p_kind text DEFAULT 'ai_edit',
  p_summary text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  user_credits int;
  v_milestone jsonb;
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

  UPDATE users SET credits = credits - p_cost WHERE id = p_user_id;

  UPDATE projects
  SET current_html = p_new_html,
      draft_html = NULL,
      updated_at = now()
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
