import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import mammoth from 'mammoth';
import routes from './routes';
import { analyzeDocument } from './forensic';
import { contextualizeText } from './contextual';
import { analyzeCaseDocuments, type CaseDocumentInput } from './document_intelligence';
import { evaluateFraudRisk } from './risk';
import {
  applyCalibrationToTrust,
  buildCalibrationProfile,
  type CalibrationProfile,
  type CalibrationTrustInput,
  type TrainingCategory,
  type TrainingExampleLite
} from './calibration';
import {
  consumeVerificationCredits,
  registerAuthRoutes,
  refundVerificationCredits,
  requireCompanyAuth,
  type AuthContext
} from './auth';
import { runExternalValidation } from './external_validation';
import { buildCaseVerificationExperience, buildSingleVerificationExperience } from './verification_experience';

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
const INTERNAL_ADMIN_EMAIL = 'admin@eduguard360.co.mz';
const TRAINING_DIR = path.join(FRAUD_DIR, 'training_examples');
const TRAINING_FILES_DIR = path.join(TRAINING_DIR, 'files');
const TRAINING_INDEX_FILE = path.join(TRAINING_DIR, 'examples.json');
if (!fs.existsSync(TRAINING_DIR)) fs.mkdirSync(TRAINING_DIR, { recursive: true });
if (!fs.existsSync(TRAINING_FILES_DIR)) fs.mkdirSync(TRAINING_FILES_DIR, { recursive: true });

interface TrainingExampleRecord {
  id: string;
  category: TrainingCategory;
  originalFileName: string;
  storedFileName: string;
  storedPath: string;
  uploadedBy: string;
  companyId: string;
  reasons: string[];
  notes: string;
  createdAt: string;
  analysis: {
    authenticityScore: number;
    likelyFraud: boolean;
    riskLevel: string;
    aiLikelihood: string;
    dateConsistency: string;
    indicatorCount: number;
    indicators: Array<{ code: string; severity: string; reason: string }>;
  };
}

interface TrainingFilterOptions {
  auth: AuthContext;
  category?: string;
  search?: string;
  limit?: number;
  scopeAll?: boolean;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

function readTrainingExamples(): TrainingExampleRecord[] {
  if (!fs.existsSync(TRAINING_INDEX_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(TRAINING_INDEX_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTrainingExamples(examples: TrainingExampleRecord[]) {
  fs.writeFileSync(TRAINING_INDEX_FILE, JSON.stringify(examples, null, 2));
}

function sanitizeFileName(fileName: string) {
  return String(fileName || 'document')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function parseReasons(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12);
  }
  const text = String(raw || '');
  return text
    .split(/\n|\r|;|\|/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function requireInternalAdmin(auth: AuthContext) {
  return String(auth.username || '').toLowerCase() === INTERNAL_ADMIN_EMAIL;
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildTrainingCsv(rows: TrainingExampleRecord[]) {
  const header = [
    'id',
    'createdAt',
    'category',
    'companyId',
    'uploadedBy',
    'originalFileName',
    'authenticityScore',
    'riskLevel',
    'likelyFraud',
    'aiLikelihood',
    'dateConsistency',
    'indicatorCount',
    'reasons',
    'notes'
  ];

  const lines = rows.map((item) => [
    item.id,
    item.createdAt,
    item.category,
    item.companyId,
    item.uploadedBy,
    item.originalFileName,
    item.analysis.authenticityScore,
    item.analysis.riskLevel,
    item.analysis.likelyFraud,
    item.analysis.aiLikelihood,
    item.analysis.dateConsistency,
    item.analysis.indicatorCount,
    item.reasons.join(' | '),
    item.notes
  ].map((cell) => escapeCsvCell(cell)).join(','));

  return [header.join(','), ...lines].join('\n');
}

function summarizeTrainingStats(rows: TrainingExampleRecord[]) {
  return {
    total: rows.length,
    fraudExamples: rows.filter((item) => item.category === 'high-risk-fraud').length,
    authenticExamples: rows.filter((item) => item.category === 'high-authenticity').length
  };
}

function queryTrainingExamples(options: TrainingFilterOptions) {
  const all = readTrainingExamples();
  const category = String(options.category || '').trim().toLowerCase();
  const search = String(options.search || '').trim().toLowerCase();
  const limitRaw = Number(options.limit || 50);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 50;

  const allowAllScope = options.scopeAll && requireInternalAdmin(options.auth);
  const byScope = allowAllScope ? all : all.filter((item) => item.companyId === options.auth.companyId);

  const byCategory = category === 'high-risk-fraud' || category === 'high-authenticity'
    ? byScope.filter((item) => item.category === category)
    : byScope;

  const bySearch = search
    ? byCategory.filter((item) => {
      const haystack = [
        item.originalFileName,
        item.uploadedBy,
        item.notes,
        item.reasons.join(' '),
        item.analysis.indicators.map((indicator) => `${indicator.code} ${indicator.reason}`).join(' ')
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    })
    : byCategory;

  return {
    items: bySearch.slice(0, limit),
    totalScope: byScope.length,
    totalFiltered: bySearch.length,
    stats: summarizeTrainingStats(byScope)
  };
}

function getCompanyCalibrationProfile(auth: AuthContext, companyId: string): CalibrationProfile {
  if (!requireInternalAdmin(auth)) {
    return {
      enabled: false,
      companyId,
      sampleSize: 0,
      fraudCount: 0,
      authenticCount: 0,
      fraudMean: null,
      authenticMean: null,
      threshold: 55,
      margin: 7,
      confidence: 0,
      reason: 'admin-access-required'
    };
  }

  const examples = readTrainingExamples() as TrainingExampleLite[];
  return buildCalibrationProfile(examples, companyId);
}

async function createTrainingExampleRecord(auth: AuthContext, file: Express.Multer.File, payload: { category?: unknown; reasons?: unknown; notes?: unknown }) {
  const rawCategory = String(payload.category || '').trim().toLowerCase();
  const category: TrainingCategory = rawCategory === 'high-authenticity' ? 'high-authenticity' : 'high-risk-fraud';
  const reasons = parseReasons(payload.reasons);
  const notes = String(payload.notes || '').trim().slice(0, 2000);

  if (!reasons.length) {
    throw new Error('reasons-required');
  }

  const text = await extractTextImmediately(file.path);
  const forensic = analyzeDocument(file.path, text || '');
  const contextual = text ? await contextualizeText(text) : { found: { domains: [], emails: [] }, checks: [] };
  const risk = evaluateFraudRisk(forensic, contextual);

  const storedFileName = `${Date.now()}-${uuidv4()}-${sanitizeFileName(file.originalname)}`;
  const finalPath = path.join(TRAINING_FILES_DIR, storedFileName);
  fs.copyFileSync(file.path, finalPath);

  const record: TrainingExampleRecord = {
    id: uuidv4(),
    category,
    originalFileName: file.originalname,
    storedFileName,
    storedPath: finalPath,
    uploadedBy: auth.username,
    companyId: auth.companyId,
    reasons,
    notes,
    createdAt: new Date().toISOString(),
    analysis: {
      authenticityScore: Number(forensic?.summary?.authenticityScore ?? forensic?.score ?? 0),
      likelyFraud: Boolean(risk.likelyFraud),
      riskLevel: String(risk.riskLevel || 'unknown'),
      aiLikelihood: String(forensic?.summary?.aiLikelihood || 'unknown'),
      dateConsistency: String(forensic?.summary?.dateConsistency || 'unknown'),
      indicatorCount: Array.isArray(risk.indicators) ? risk.indicators.length : 0,
      indicators: Array.isArray(risk.indicators)
        ? risk.indicators.map((item) => ({ code: String(item.code), severity: String(item.severity), reason: String(item.reason) }))
        : []
    }
  };

  const all = readTrainingExamples();
  all.unshift(record);
  writeTrainingExamples(all.slice(0, 2000));
  return record;
}

async function extractTextImmediately(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const textLikeExtensions = new Set(['.txt', '.csv', '.json', '.md']);
  const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff']);

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

  if (textLikeExtensions.has(ext)) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return '';
    }
  }

  if (ext === '.docx') {
    try {
      const output = await mammoth.extractRawText({ path: filePath });
      return output?.value || '';
    } catch (error) {
      return '';
    }
  }

  if (!imageExtensions.has(ext)) {
    throw new Error('unsupported-file-format');
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
    if (!text || !String(text).trim()) {
      refundVerificationCredits(auth.companyId, jobId, 'empty-text-extraction');
      const failedJob = {
        ...job,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: 'unsupported-or-empty-document'
      };
      fs.writeFileSync(path.join(JOBS_DIR, `${jobId}.json`), JSON.stringify(failedJob, null, 2));
      return res.status(415).json({
        jobId,
        status: 'failed',
        error: 'unsupported-or-empty-document',
        supportedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff', 'txt', 'csv', 'json', 'md', 'docx']
      });
    }
    const forensic = analyzeDocument(req.file.path, text);
    const contextual = text ? await contextualizeText(text) : { found: { domains: [], emails: [] }, checks: [] };
    const fraudSignals = evaluateFraudRisk(forensic, contextual);
    const calibrationProfile = getCompanyCalibrationProfile(auth, auth.companyId);
    const calibratedTrust = applyCalibrationToTrust({
      authenticityPercentage: forensic.summary?.authenticityScore ?? forensic.score,
      likelyFraud: fraudSignals.likelyFraud,
      riskLevel: fraudSignals.riskLevel,
      riskScore: fraudSignals.riskScore,
      confidence: fraudSignals.confidence,
      fraudReasons: fraudSignals.reasons,
      indicators: fraudSignals.indicators
    } as CalibrationTrustInput, calibrationProfile);
    const externalValidation = await runExternalValidation({
      jobId,
      companyId: auth.companyId,
      filePath: req.file.path,
      fileName: req.file.originalname,
      text
    });
    if (externalValidation.enabled && externalValidation.decision === 'manual_review') {
      calibratedTrust.likelyFraud = true;
      calibratedTrust.riskLevel = calibratedTrust.riskLevel === 'high' ? 'high' : 'medium';
      calibratedTrust.riskScore = Math.max(62, Number(calibratedTrust.riskScore || 0));
      calibratedTrust.indicators.push({
        code: 'external-validation-manual-review',
        severity: 'medium',
        reason: 'Validacao externa (Energent.ai/CheckFile.ai) requer revisao manual.'
      });
      calibratedTrust.fraudReasons = Array.from(
        new Set([...(calibratedTrust.fraudReasons || []), 'Validacao externa sinalizou revisao manual.'])
      );
    }
    const aiSignals = forensic.checks?.aiLikelihood === 'likely-ai' || forensic.checks?.aiLikelihood === 'possible-ai';
    const contextualSignals = (contextual.checks || []).length > 0 || ((contextual.found?.domains || []).length > 0) || ((contextual.found?.emails || []).length > 0);
    const passiveIssuesFound = forensic.checks?.dateConsistency === 'inconsistent' || forensic.checks?.aiLikelihood === 'likely-ai' || forensic.score < 45;
    const result = {
      text,
      forensic,
      contextual,
      summary: forensic.summary,
      trust: calibratedTrust,
      externalValidation,
      processingMode: externalValidation.enabled ? 'api-external-orchestrated' : 'api-internal-engine',
      finalDecision: externalValidation.enabled
        ? (externalValidation.decision === 'approved' ? 'aprovado' : 'revisao_manual')
        : 'motor_interno',
      verdicts: {
        passive: passiveIssuesFound ? 'found' : 'not_found',
        contextual: contextualSignals ? 'found' : 'not_found',
        ai: aiSignals ? 'found' : 'not_found',
        fraud: calibratedTrust.likelyFraud ? 'found' : 'not_found',
        external: externalValidation.enabled
          ? (externalValidation.decision === 'approved' ? 'not_found' : 'found')
          : 'not_found'
      },
      experience: buildSingleVerificationExperience({
        fileName: req.file.originalname,
        text,
        forensic,
        trust: calibratedTrust,
        externalValidation,
        processingMode: externalValidation.enabled ? 'api-external-orchestrated' : 'api-internal-engine',
        finalDecision: externalValidation.enabled
          ? (externalValidation.decision === 'approved' ? 'aprovado' : 'revisao_manual')
          : 'motor_interno'
      }),
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

app.post('/upload-case', requireCompanyAuth, upload.array('files', 10), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) return res.status(400).json({ error: 'no files' });

  const auth = (req as any).auth as AuthContext;
  const jobId = uuidv4();
  const creditCost = files.length;

  const billing = consumeVerificationCredits(auth.companyId, jobId, creditCost);
  if (!billing.ok) {
    const status = billing.error === 'insufficient-credits' || billing.error === 'verification-limit-reached' ? 402 : 403;
    return res.status(status).json({ error: billing.error, details: billing });
  }

  const job = {
    id: jobId,
    companyId: auth.companyId,
    createdBy: auth.username,
    principalType: auth.principalType,
    status: 'processing',
    fileCount: files.length,
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
    const documentResults: Array<{
      fileName: string;
      filePath: string;
      status: 'done' | 'failed';
      textLength: number;
      forensic?: any;
      error?: string;
    }> = [];
    const caseInputs: CaseDocumentInput[] = [];
    const textChunks: string[] = [];

    for (const file of files) {
      const text = await extractTextImmediately(file.path);
      if (!text || !String(text).trim()) {
        documentResults.push({
          fileName: file.originalname,
          filePath: file.path,
          status: 'failed',
          textLength: 0,
          error: 'unsupported-or-empty-document'
        });
        continue;
      }

      const forensic = analyzeDocument(file.path, text);
      documentResults.push({
        fileName: file.originalname,
        filePath: file.path,
        status: 'done',
        textLength: text.length,
        forensic
      });

      caseInputs.push({
        fileName: file.originalname,
        text,
        forensicScore: Number(forensic?.score || 0),
        extracted: forensic?.checks?.extractedFields
      });

      textChunks.push(text.slice(0, 20000));
    }

    const successfulDocs = documentResults.filter((item) => item.status === 'done');
    if (!successfulDocs.length) {
      refundVerificationCredits(auth.companyId, jobId, 'all-documents-empty-or-unsupported');
      const failedJob = {
        ...job,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: 'unsupported-or-empty-document',
        documents: documentResults
      };
      fs.writeFileSync(path.join(JOBS_DIR, `${jobId}.json`), JSON.stringify(failedJob, null, 2));
      return res.status(415).json({
        jobId,
        status: 'failed',
        error: 'unsupported-or-empty-document',
        documents: documentResults
      });
    }

    const caseAnalysis = analyzeCaseDocuments(caseInputs);
    const contextual = await contextualizeText(textChunks.join('\n'));
    const baseLikelyFraud = caseAnalysis.indicators.some((item) => item.severity === 'high')
      || caseAnalysis.indicators.filter((item) => item.severity === 'medium').length >= 2;
    const baseTrust: CalibrationTrustInput = {
      authenticityPercentage: caseAnalysis.score,
      likelyFraud: baseLikelyFraud,
      riskLevel: baseLikelyFraud ? 'medium' : 'low',
      riskScore: baseLikelyFraud ? 60 : 35,
      confidence: caseAnalysis.indicators.length ? 70 : 50,
      fraudReasons: caseAnalysis.indicators.map((item) => item.reason),
      indicators: caseAnalysis.indicators
    };
    const calibrationProfile = getCompanyCalibrationProfile(auth, auth.companyId);
    const calibratedTrust = applyCalibrationToTrust(baseTrust, calibrationProfile);
    const perDocumentExternal = await Promise.all(successfulDocs.map(async (item) => {
      const matchingInput = caseInputs.find((doc) => doc.fileName === item.fileName);
      const textForPayload = matchingInput?.text || '';
      return runExternalValidation({
        jobId,
        companyId: auth.companyId,
        filePath: item.filePath,
        fileName: item.fileName,
        text: textForPayload
      });
    }));
    const enabledExternal = perDocumentExternal.filter((item) => item.enabled);
    const hasExternalManualReview = enabledExternal.some((item) => item.decision === 'manual_review');
    const caseExternalDecision = enabledExternal.length
      ? (hasExternalManualReview ? 'manual_review' : 'approved')
      : 'internal_only';
    if (caseExternalDecision === 'manual_review') {
      calibratedTrust.likelyFraud = true;
      calibratedTrust.riskLevel = calibratedTrust.riskLevel === 'high' ? 'high' : 'medium';
      calibratedTrust.riskScore = Math.max(62, Number(calibratedTrust.riskScore || 0));
      calibratedTrust.indicators.push({
        code: 'external-validation-manual-review',
        severity: 'medium',
        reason: 'Validacao externa do dossier requer revisao manual.'
      });
      calibratedTrust.fraudReasons = Array.from(
        new Set([...(calibratedTrust.fraudReasons || []), 'Validacao externa sinalizou revisao manual no dossier.'])
      );
    }

    const result = {
      documents: documentResults,
      case: caseAnalysis,
      contextual,
      trust: calibratedTrust,
      externalValidation: {
        enabled: enabledExternal.length > 0,
        decision: caseExternalDecision,
        documents: perDocumentExternal
      },
      processingMode: enabledExternal.length ? 'api-external-orchestrated' : 'api-internal-engine',
      finalDecision: enabledExternal.length
        ? (caseExternalDecision === 'approved' ? 'aprovado' : 'revisao_manual')
        : 'motor_interno',
      verdicts: {
        passive: caseAnalysis.indicators.length > 0 ? 'found' : 'not_found',
        contextual: (contextual.checks || []).length > 0 ? 'found' : 'not_found',
        ai: documentResults.some((item) => item.forensic?.checks?.aiLikelihood === 'likely-ai' || item.forensic?.checks?.aiLikelihood === 'possible-ai') ? 'found' : 'not_found',
        fraud: calibratedTrust.likelyFraud ? 'found' : 'not_found',
        external: enabledExternal.length
          ? (caseExternalDecision === 'approved' ? 'not_found' : 'found')
          : 'not_found'
      },
      experience: buildCaseVerificationExperience({
        documents: documentResults,
        caseAnalysis,
        trust: calibratedTrust,
        externalValidation: {
          enabled: enabledExternal.length > 0,
          decision: caseExternalDecision,
          documents: perDocumentExternal
        },
        processingMode: enabledExternal.length ? 'api-external-orchestrated' : 'api-internal-engine',
        finalDecision: enabledExternal.length
          ? (caseExternalDecision === 'approved' ? 'aprovado' : 'revisao_manual')
          : 'motor_interno'
      }),
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
    refundVerificationCredits(auth.companyId, jobId, 'upload-case-failed');
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

app.post('/training-examples', requireCompanyAuth, upload.single('file'), async (req, res) => {
  const auth = (req as any).auth as AuthContext;
  if (!req.file) return res.status(400).json({ error: 'no-file' });

  try {
    const record = await createTrainingExampleRecord(auth, req.file, {
      category: req.body?.category,
      reasons: req.body?.reasons,
      notes: req.body?.notes
    });

    return res.json({ ok: true, record });
  } catch (error: any) {
    if (String(error?.message || error) === 'reasons-required') {
      return res.status(400).json({ error: 'reasons-required' });
    }
    return res.status(500).json({ error: String(error?.message || error) });
  }
});

app.get('/training-examples', requireCompanyAuth, (req, res) => {
  const auth = (req as any).auth as AuthContext;
  const scopeAll = String(req.query?.scope || '').trim().toLowerCase() === 'all';
  const response = queryTrainingExamples({
    auth,
    category: req.query?.category as string,
    search: req.query?.search as string,
    limit: Number(req.query?.limit || 50),
    scopeAll
  });

  return res.json({
    examples: response.items,
    stats: response.stats,
    totalScope: response.totalScope,
    totalFiltered: response.totalFiltered
  });
});

app.delete('/training-examples/:id', requireCompanyAuth, (req, res) => {
  const auth = (req as any).auth as AuthContext;
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'invalid-id' });

  const all = readTrainingExamples();
  const idx = all.findIndex((item) => item.id === id);
  if (idx < 0) return res.status(404).json({ error: 'not-found' });

  const item = all[idx];
  const canDelete = item.companyId === auth.companyId || requireInternalAdmin(auth);
  if (!canDelete) return res.status(403).json({ error: 'forbidden' });

  all.splice(idx, 1);
  writeTrainingExamples(all);

  try {
    if (item.storedPath && fs.existsSync(item.storedPath)) {
      fs.unlinkSync(item.storedPath);
    }
  } catch {
    // keep operation non-fatal if file cleanup fails
  }

  return res.json({ ok: true, removedId: id });
});

app.get('/training-examples/export.csv', requireCompanyAuth, (req, res) => {
  const auth = (req as any).auth as AuthContext;
  const scopeAll = String(req.query?.scope || '').trim().toLowerCase() === 'all';
  const response = queryTrainingExamples({
    auth,
    category: req.query?.category as string,
    search: req.query?.search as string,
    limit: Number(req.query?.limit || 500),
    scopeAll
  });

  const csv = buildTrainingCsv(response.items);
  const fileName = `training-examples-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.status(200).send(csv);
});

app.post('/admin/training-examples', requireCompanyAuth, upload.single('file'), async (req, res) => {
  const auth = (req as any).auth as AuthContext;
  if (!requireInternalAdmin(auth)) return res.status(403).json({ error: 'admin-access-required' });
  if (!req.file) return res.status(400).json({ error: 'no-file' });

  try {
    const record = await createTrainingExampleRecord(auth, req.file, {
      category: req.body?.category,
      reasons: req.body?.reasons,
      notes: req.body?.notes
    });
    return res.json({ ok: true, record });
  } catch (error: any) {
    if (String(error?.message || error) === 'reasons-required') {
      return res.status(400).json({ error: 'reasons-required' });
    }
    return res.status(500).json({ error: String(error?.message || error) });
  }
});

app.get('/admin/training-examples', requireCompanyAuth, (req, res) => {
  const auth = (req as any).auth as AuthContext;
  if (!requireInternalAdmin(auth)) return res.status(403).json({ error: 'admin-access-required' });
  const response = queryTrainingExamples({
    auth,
    category: req.query?.category as string,
    search: req.query?.search as string,
    limit: Number(req.query?.limit || 100),
    scopeAll: true
  });

  return res.json({
    examples: response.items,
    stats: response.stats,
    totalScope: response.totalScope,
    totalFiltered: response.totalFiltered
  });
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
