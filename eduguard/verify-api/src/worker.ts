import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { analyzeDocument } from './forensic';

const JOBS_DIR = path.join(__dirname, '..', '..', 'eduguard_jobs');
const OCR_WORKER = path.join(__dirname, '..', '..', 'ocr-worker', 'worker.py');

if (!fs.existsSync(JOBS_DIR)) fs.mkdirSync(JOBS_DIR, { recursive: true });

const processing = new Set<string>();

function readJob(jobFile: string) {
  try {
    const data = fs.readFileSync(jobFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function writeJob(jobFile: string, job: any) {
  fs.writeFileSync(jobFile, JSON.stringify(job, null, 2), 'utf8');
}

function runOcr(filePath: string, timeoutMs = 120000): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python', [OCR_WORKER, filePath]);
    let out = '';
    let err = '';
    const to = setTimeout(() => {
      proc.kill();
      reject(new Error('timeout'));
    }, timeoutMs);

    proc.stdout.on('data', (d) => (out += d.toString()));
    proc.stderr.on('data', (d) => (err += d.toString()));
    proc.on('close', (code) => {
      clearTimeout(to);
      if (code !== 0) return reject(new Error(err || `exit ${code}`));
      try {
        const json = JSON.parse(out);
        resolve(json);
      } catch (e) {
        reject(new Error('invalid-json'));
      }
    });
  });
}

async function processQueue() {
  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  for (const fname of files) {
    const jobPath = path.join(JOBS_DIR, fname);
    if (processing.has(jobPath)) continue;
    const job = readJob(jobPath);
    if (!job) continue;
    if (job.status !== 'queued') continue;

    processing.add(jobPath);
    job.status = 'processing';
    job.startedAt = new Date().toISOString();
    writeJob(jobPath, job);

    try {
      const res = await runOcr(job.filePath);
      job.result = res;
      // Run forensic analysis
      try {
        const forensic = analyzeDocument(job.filePath, res.text || '');
        job.result.forensic = forensic;
        job.status = 'done';
      } catch (e) {
        job.status = 'done';
        job.result.forensicError = String(e);
      }
      job.finishedAt = new Date().toISOString();
      writeJob(jobPath, job);
    } catch (e: any) {
      job.status = 'failed';
      job.error = String(e.message || e);
      job.finishedAt = new Date().toISOString();
      writeJob(jobPath, job);
    } finally {
      processing.delete(jobPath);
    }
  }
}

console.log('Job processor started, watching', JOBS_DIR);
setInterval(() => {
  processQueue().catch((e) => console.error('queue-error', e));
}, 2000);
