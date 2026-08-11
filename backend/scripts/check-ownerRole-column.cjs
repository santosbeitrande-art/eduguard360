#!/usr/bin/env node
const { Client } = require('pg');

if ((!process.env.DATABASE_HOST || !process.env.DATABASE_USER || !process.env.DATABASE_NAME) && process.env.DATABASE_URL) {
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    process.env.DATABASE_HOST = process.env.DATABASE_HOST || parsed.hostname;
    process.env.DATABASE_PORT = process.env.DATABASE_PORT || parsed.port || '5432';
    process.env.DATABASE_USER = process.env.DATABASE_USER || decodeURIComponent(parsed.username || '');
    process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || decodeURIComponent(parsed.password || '');
    process.env.DATABASE_NAME = process.env.DATABASE_NAME || String(parsed.pathname || '').replace(/^\//, '');
    if (!process.env.DATABASE_SSL && parsed.searchParams.get('sslmode') === 'require') {
      process.env.DATABASE_SSL = 'true';
    }
  } catch {
    // ignore invalid URL; validation below will report missing env vars
  }
}

const required = ['DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_NAME'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(2);
}

async function run() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  const existsResult = await client.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'enterprise_workflow_steps'
        AND column_name = 'ownerRole'
      LIMIT 1
    `,
  );

  const migrationsResult = await client.query(
    `
      SELECT id, timestamp, name
      FROM migrations
      ORDER BY id DESC
      LIMIT 5
    `,
  ).catch(() => ({ rows: [] }));

  const exists = existsResult.rowCount > 0;

  console.log(JSON.stringify({
    ok: exists,
    table: 'enterprise_workflow_steps',
    column: 'ownerRole',
    migrationRows: migrationsResult.rows,
  }, null, 2));

  await client.end();

  if (!exists) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('check-ownerRole-column failed:', error.message || error);
  process.exit(1);
});
