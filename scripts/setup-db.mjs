import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.rszbbxhxkqqxyzpkgghq:hjhdsrs061123@db.rszbbxhxkqqxyzpkgghq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync('database.sql', 'utf-8');

console.log('Connecting to Supabase...');
const client = await pool.connect();

try {
  console.log('Running schema...');
  await client.query(sql);
  console.log('Done. Tables created successfully.');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  client.release();
  await pool.end();
}
