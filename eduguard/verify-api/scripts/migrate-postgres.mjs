import fs from 'fs';
import path from 'path';
import pg from 'pg';

const connectionString = process.env.VERIFY_PG_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('VERIFY_PG_URL or DATABASE_URL is required');
  process.exit(1);
}

const sqlPath = path.join(process.cwd(), 'sql', '002_verify_ai_postgres_schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');
const client = new pg.Client({ connectionString });

try {
  await client.connect();
  await client.query(sql);
  console.log(JSON.stringify({ ok: true, schema: '002_verify_ai_postgres_schema.sql' }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }, null, 2));
  process.exitCode = 1;
} finally {
  await client.end();
}