import pg from 'pg';
import dns from 'dns';
import { Resolver } from 'dns';

const customResolver = new Resolver();
customResolver.setServers(['8.8.8.8', '1.1.1.1']);

const funcSql = `
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
`;

// Patch dns.lookup to use Google DNS for Supabase hostnames
const origLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  const projectRef = 'rszbbxhxkqqxyzpkgghq';
  const expected = `db.${projectRef}.supabase.co`;

  if (hostname === expected || hostname.includes('pooler.supabase.com')) {
    const isDB = hostname === expected;
    const doResolve = isDB
      ? (cb) => customResolver.resolve6(hostname, (err, addrs) => cb(err, addrs ? addrs.map(a => ({ address: a, family: 6 })) : undefined))
      : (cb) => customResolver.resolve4(hostname, (err, addrs) => cb(err, addrs ? addrs.map(a => ({ address: a, family: 4 })) : undefined));

    return doResolve((err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        // fallback to default lookup
        return (origLookup)(hostname, options, callback);
      }
      console.log(`Custom DNS: ${hostname} -> ${addresses[0].address} (IPv${addresses[0].family})`);
      if (typeof callback === 'function') {
        if (options && options.all) {
          callback(null, addresses);
        } else {
          callback(null, addresses[0].address, addresses[0].family);
        }
      }
    });
  }

  return (origLookup)(hostname, options, callback);
};

async function main() {
  const password = process.env.DB_PASSWORD;
  if (!password) { console.error('ERROR: DB_PASSWORD env var required'); process.exit(1); }

  const projectRef = 'rszbbxhxkqqxyzpkgghq';

  const attempts = [];
  // Direct connection
  for (let i = 0; i < 3; i++) {
    attempts.push({ host: `db.${projectRef}.supabase.co`, port: 5432, user: 'postgres', label: `direct ${i+1}` });
  }
  // Pooler with all regions
  const regions = ['us-east-1', 'ap-southeast-1', 'eu-west-1', 'eu-central-1', 'ap-southeast-2', 'ap-northeast-1', 'sa-east-1', 'ca-central-1', 'eu-north-1', 'ap-south-1', 'eu-west-2', 'eu-west-3', 'eu-south-1', 'eu-south-2'];
  for (const region of regions) {
    attempts.push({ host: `aws-0-${region}.pooler.supabase.com`, port: 6543, user: `postgres.${projectRef}`, label: `tx-pooler ${region}` });
    attempts.push({ host: `aws-0-${region}.pooler.supabase.com`, port: 5432, user: `postgres.${projectRef}`, label: `session-pooler ${region}` });
  }

  for (const attempt of attempts) {
    const client = new pg.Client({
      host: attempt.host,
      port: attempt.port,
      database: 'postgres',
      user: attempt.user,
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    try {
      console.log(`\n[${attempt.label}] Connecting to ${attempt.host}:${attempt.port} as ${attempt.user}...`);
      await client.connect();
      console.log('Connected!');

      // Check draft_html column
      const { rows } = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='draft_html'`);
      if (rows.length > 0) {
        console.log('  draft_html column already exists');
      } else {
        console.log('  Adding draft_html column...');
        await client.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS draft_html text');
        console.log('  Creating index...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_projects_draft_html ON projects (id) WHERE draft_html IS NOT NULL');
      }

      console.log('  Creating or replacing commit_draft_transaction...');
      await client.query(funcSql);
      console.log('  Function is up to date!');

      console.log('\n=== Migration completed! ===');
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`  -> ${err.message}`);
      try { await client.end(); } catch {}
    }
  }

  console.error('\nAll attempts failed.');
  process.exit(1);
}

main();
