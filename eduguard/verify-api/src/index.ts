import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import routes from './routes';
import { analyzeDocument } from './forensic';
import { contextualizeText } from './contextual';
import {
  consumeVerificationCredits,
  registerAuthRoutes,
  refundVerificationCredits,
  requireCompanyAuth,
  type AuthContext
} from './auth';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', routes);
registerAuthRoutes(app);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'eduguard_uploads');
const JOBS_DIR = path.join(__dirname, '..', '..', 'eduguard_jobs');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(JOBS_DIR)) fs.mkdirSync(JOBS_DIR, { recursive: true });
const FRAUD_DIR = path.join(__dirname, '..', '..', 'eduguard_fraud');
if (!fs.existsSync(FRAUD_DIR)) fs.mkdirSync(FRAUD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

function buildFraudSignals(forensic: any, contextual: any) {
  const reasons: string[] = [];
  const indicators: Array<{ code: string; severity: 'low' | 'medium' | 'high'; reason: string }> = [];

  if (forensic?.checks?.dateConsistency === 'inconsistent') {
    indicators.push({
      code: 'date-inconsistency',
      severity: 'high',
      reason: 'Datas encontradas no documento divergem de metadados de modificacao do ficheiro.'
    });
    reasons.push('Inconsistencia de datas entre OCR e metadados.');
  }

  if (forensic?.checks?.aiLikelihood === 'likely-ai') {
    indicators.push({
      code: 'ai-likely',
      severity: 'medium',
      reason: 'Heuristicas linguisticas indicam padrao de texto possivelmente gerado por IA.'
    });
    reasons.push('Padrao de escrita com forte indicio de IA.');
  }

  const contextualDomains = (contextual?.found?.domains || []).length;
  const contextualEmails = (contextual?.found?.emails || []).length;
  if (contextualDomains === 0 && contextualEmails === 0) {
    indicators.push({
      code: 'no-context-evidence',
      severity: 'low',
      reason: 'Nao foram encontradas evidencias contextuais publicas para corroborar o conteudo analisado.'
    });
    reasons.push('Sem corroboracao contextual publica relevante.');
  }

  const isFraudLikely = indicators.some((item) => item.severity === 'high')
    || indicators.filter((item) => item.severity === 'medium').length >= 2;

  return {
    likelyFraud: isFraudLikely,
    indicators,
    reasons
  };
}

async function extractTextImmediately(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      const pdf = await pdfParse(buffer);
      return typeof pdf?.text === 'string' ? pdf.text : '';
    } catch (error) {
      return '';
    }
  }

  const workerPath = path.join(__dirname, '..', '..', 'ocr-worker', 'worker.py');
  const result = spawnSync('python', [workerPath, filePath], {
    encoding: 'utf8',
    timeout: 120000
  });

  if (result.status !== 0 || !result.stdout) {
    return '';
  }

  try {
    const parsed = JSON.parse(result.stdout);
    return parsed?.text || '';
  } catch (error) {
    return '';
  }
}

app.post('/upload', requireCompanyAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const auth = (req as any).auth as AuthContext;
  const jobId = uuidv4();

  const billing = consumeVerificationCredits(auth.companyId, jobId, 1);
  if (!billing.ok) {
    const status = billing.error === 'insufficient-credits' || billing.error === 'verification-limit-reached' ? 402 : 403;
    return res.status(status).json({ error: billing.error, details: billing });
  }

  const job = {
    id: jobId,
    companyId: auth.companyId,
    createdBy: auth.username,
    principalType: auth.principalType,
    filePath: req.file.path,
    status: 'processing',
    billing: {
      debit: billing.debit,
      balanceAfterDebit: billing.balance,
      ledgerId: 'entry' in billing ? (billing.entry?.id ?? null) : null
    },
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(JOBS_DIR, `${jobId}.json`), JSON.stringify(job, null, 2));

  try {
    const text = await extractTextImmediately(req.file.path);
    const forensic = analyzeDocument(req.file.path, text);
    const contextual = text ? await contextualizeText(text) : { found: { domains: [], emails: [] }, checks: [] };
    const fraudSignals = buildFraudSignals(forensic, contextual);
    const aiSignals = forensic.checks?.aiLikelihood === 'likely-ai' || forensic.checks?.aiLikelihood === 'possible-ai';
    const contextualSignals = (contextual.checks || []).length > 0 || ((contextual.found?.domains || []).length > 0) || ((contextual.found?.emails || []).length > 0);
    const passiveIssuesFound = forensic.checks?.dateConsistency === 'inconsistent' || forensic.checks?.aiLikelihood === 'likely-ai' || forensic.score < 45;
    const result = {
      text,
      forensic,
      contextual,
      summary: forensic.summary,
      trust: {
        authenticityPercentage: forensic.summary?.authenticityScore ?? forensic.score,
        likelyFraud: fraudSignals.likelyFraud,
        fraudReasons: fraudSignals.reasons,
        indicators: fraudSignals.indicators
      },
      verdicts: {
        passive: passiveIssuesFound ? 'found' : 'not_found',
        contextual: contextualSignals ? 'found' : 'not_found',
        ai: aiSignals ? 'found' : 'not_found',
        fraud: fraudSignals.likelyFraud ? 'found' : 'not_found'
      },
      status: 'done'
    };

    const completedJob = {
      ...job,
      status: 'done',
      finishedAt: new Date().toISOString(),
      result
    };

    fs.writeFileSync(path.join(JOBS_DIR, `${jobId}.json`), JSON.stringify(completedJob, null, 2));
    return res.json({ jobId, status: 'done', result });
  } catch (error: any) {
    refundVerificationCredits(auth.companyId, jobId, 'upload-failed');
    const failedJob = {
      ...job,
      status: 'failed',
      finishedAt: new Date().toISOString(),
      error: String(error?.message || error)
    };

    fs.writeFileSync(path.join(JOBS_DIR, `${jobId}.json`), JSON.stringify(failedJob, null, 2));
    return res.status(500).json({ jobId, status: 'failed', error: failedJob.error });
  }
});

app.get('/status/:id', requireCompanyAuth, (req, res) => {
  const auth = (req as any).auth as AuthContext;
  const id = req.params.id;
  const jobFile = path.join(JOBS_DIR, `${id}.json`);
  if (!fs.existsSync(jobFile)) return res.status(404).json({ error: 'not found' });
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  if (job.companyId && job.companyId !== auth.companyId) {
    return res.status(404).json({ error: 'not found' });
  }
  return res.json(job);
});

// Contextualization endpoint: run internet checks and attach to job
app.post('/context/:id', requireCompanyAuth, async (req, res) => {
  const auth = (req as any).auth as AuthContext;
  const id = req.params.id;
  const jobFile = path.join(JOBS_DIR, `${id}.json`);
  if (!fs.existsSync(jobFile)) return res.status(404).json({ error: 'not found' });
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  if (job.companyId && job.companyId !== auth.companyId) {
    return res.status(404).json({ error: 'not found' });
  }
  if (!job.result || !job.result.text) return res.status(400).json({ error: 'no-ocr-text' });
  try {
    const ctx = await contextualizeText(job.result.text);
    job.result.context = ctx;
    fs.writeFileSync(jobFile, JSON.stringify(job, null, 2));
    return res.json({ ok: true, context: ctx });
  } catch (e: any) {
    return res.status(500).json({ error: String(e.message || e) });
  }
});

// Fraud Intelligence Network endpoints (prototype)
app.post('/fraud-signature', requireCompanyAuth, (req, res) => {
  const sig = req.body;
  if (!sig || !sig.id) return res.status(400).json({ error: 'invalid' });
  const file = path.join(FRAUD_DIR, `${sig.id}.json`);
  fs.writeFileSync(file, JSON.stringify({ signature: sig, receivedAt: new Date().toISOString() }, null, 2));
  return res.json({ ok: true });
});

app.get('/fraud-signature/:id', requireCompanyAuth, (req, res) => {
  const id = req.params.id;
  const file = path.join(FRAUD_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  return res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Verify API running on http://localhost:${port}`));
