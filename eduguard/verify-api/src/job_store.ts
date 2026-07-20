import fs from 'fs';
import path from 'path';

type JobPayload = Record<string, any>;

const POSTGRES_URL = String(process.env.VERIFY_PG_URL || process.env.DATABASE_URL || '').trim();

function filePathForJob(jobsDir: string, jobId: string) {
  return path.join(jobsDir, `${jobId}.json`);
}

function saveJobToFile(jobsDir: string, job: JobPayload) {
  fs.writeFileSync(filePathForJob(jobsDir, String(job.id || 'unknown')), JSON.stringify(job, null, 2));
}

function readJobFromFile(jobsDir: string, jobId: string): JobPayload | null {
  const filePath = filePathForJob(jobsDir, jobId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function listJobsFromFile(jobsDir: string, companyId: string): JobPayload[] {
  try {
    return fs.readdirSync(jobsDir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(jobsDir, name), 'utf8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((job) => String(job?.companyId || '') === String(companyId || ''))
      .sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')));
  } catch {
    return [];
  }
}

async function withPgClient<T>(work: (client: any) => Promise<T>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Client } = require('pg');
  const client = new Client({ connectionString: POSTGRES_URL });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

function normalizePgJob(row: any): JobPayload {
  return {
    id: row.id,
    companyId: row.company_id,
    createdBy: row.created_by,
    principalType: row.principal_type,
    filePath: row.file_path,
    status: row.status,
    billing: row.billing_json || null,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    error: row.error,
    result: row.result_json || null
  };
}

export function isPostgresJobStoreEnabled() {
  return Boolean(POSTGRES_URL);
}

export async function writeJobRecord(jobsDir: string, job: JobPayload) {
  saveJobToFile(jobsDir, job);
  if (!isPostgresJobStoreEnabled()) return;

  await withPgClient(async (client) => {
    await client.query(`
      INSERT INTO verification_jobs (
        id, company_id, created_by, principal_type, file_path, status,
        billing_json, result_json, error, created_at, started_at, finished_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        billing_json = EXCLUDED.billing_json,
        result_json = EXCLUDED.result_json,
        error = EXCLUDED.error,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at,
        updated_at = EXCLUDED.updated_at
    `, [
      String(job.id || ''),
      String(job.companyId || ''),
      String(job.createdBy || ''),
      String(job.principalType || ''),
      String(job.filePath || ''),
      String(job.status || ''),
      JSON.stringify(job.billing || null),
      JSON.stringify(job.result || null),
      job.error ? String(job.error) : null,
      job.createdAt || new Date().toISOString(),
      job.startedAt || null,
      job.finishedAt || null,
      new Date().toISOString()
    ]);

    await client.query('DELETE FROM verification_checks WHERE job_id = $1', [String(job.id || '')]);
    const checks = Array.isArray(job?.result?.evidenceReport?.checks) ? job.result.evidenceReport.checks : [];
    for (const check of checks) {
      await client.query(`
        INSERT INTO verification_checks (
          id, job_id, company_id, engine, check_id, label, status, severity, impact, message, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        `${job.id}:${check.id}`,
        String(job.id || ''),
        String(job.companyId || ''),
        String(check.engine || ''),
        String(check.id || ''),
        String(check.label || ''),
        String(check.status || ''),
        String(check.severity || ''),
        String(check.impact || ''),
        String(check.message || ''),
        new Date().toISOString()
      ]);
    }
  });
}

export async function readJobRecord(jobsDir: string, jobId: string) {
  if (isPostgresJobStoreEnabled()) {
    try {
      return await withPgClient(async (client) => {
        const result = await client.query('SELECT * FROM verification_jobs WHERE id = $1 LIMIT 1', [jobId]);
        const row = result.rows?.[0];
        return row ? normalizePgJob(row) : null;
      });
    } catch {
      return readJobFromFile(jobsDir, jobId);
    }
  }
  return readJobFromFile(jobsDir, jobId);
}

export async function listCompanyJobRecords(jobsDir: string, companyId: string) {
  if (isPostgresJobStoreEnabled()) {
    try {
      return await withPgClient(async (client) => {
        const result = await client.query('SELECT * FROM verification_jobs WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
        return result.rows.map(normalizePgJob);
      });
    } catch {
      return listJobsFromFile(jobsDir, companyId);
    }
  }
  return listJobsFromFile(jobsDir, companyId);
}