import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
import { EXTERNAL_PROCESSING_MODE, isExternalProcessingModeRequired } from './processing_mode';
import { runInternalBenchmark } from './internal_benchmark';
import { buildAuditableDecision, toLegacyFinalDecision } from './decision_policy';

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
const SUPPORTED_UPLOAD_FORMATS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff', 'txt', 'csv', 'json', 'md', 'docx'];
const METADATA_FALLBACK_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff', '.docx']);
const TRAINING_DIR = path.join(FRAUD_DIR, 'training_examples');
const TRAINING_FILES_DIR = path.join(TRAINING_DIR, 'files');
const TRAINING_INDEX_FILE = path.join(TRAINING_DIR, 'examples.json');
const FEEDBACK_INDEX_FILE = path.join(TRAINING_DIR, 'verification_feedback.json');
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

interface ExtractedTextResult {
  text: string;
  usedMetadataFallback: boolean;
}

type ReviewerOutcome = 'fraud_confirmed' | 'authenticity_confirmed' | 'inconclusive';

interface VerificationFeedbackRecord {
  id: string;
  companyId: string;
  jobId: string;
  outcome: ReviewerOutcome;
  reviewer: string;
  reviewerConfidence: number;
  notes: string;
  authenticityScore: number | null;
  riskScore: number | null;
  decisionStatus: string;
  createdAt: string;
  updatedAt: string;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const TEXT_LIKE_EXTENSIONS = new Set([
  '.txt', '.csv', '.tsv', '.json', '.md', '.log', '.rtf', '.xml', '.html', '.htm', '.yaml', '.yml', '.ini', '.cfg'
]);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff']);
const SUPPORTED_FORMATS = [
  'pdf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff',
  'txt', 'csv', 'tsv', 'json', 'md', 'docx', 'rtf', 'xml', 'html', 'htm', 'yaml', 'yml', 'log', 'ini', 'cfg'
];

function normalizeExtractedText(value: unknown) {
  return String(value || '')
    .replace(/\u0000/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripMarkup(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripRtf(text: string) {
  return text
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-zA-Z]+-?\d* ?/g, ' ')
    .replace(/[{}]/g, ' ');
}

function tryReadTextFallback(filePath: string) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 30 * 1024 * 1024) return '';
    const raw = fs.readFileSync(filePath);
    const decoded = raw.toString('utf8');
    if (!decoded.trim()) return '';

    const sample = decoded.slice(0, 12000);
    const printable = (sample.match(/[\x20-\x7E\n\r\t]/g) || []).length;
    const replacement = (sample.match(/\uFFFD/g) || []).length;
    const ratio = sample.length ? printable / sample.length : 0;

    if (ratio < 0.45 || replacement > sample.length * 0.1) return '';
    return decoded;
  } catch {
    return '';
  }
}

function readTrainingExamples(): TrainingExampleRecord[] {
  if (!fs.existsSync(TRAINING_INDEX_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(TRAINING_INDEX_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readVerificationFeedback(): VerificationFeedbackRecord[] {
  if (!fs.existsSync(FEEDBACK_INDEX_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(FEEDBACK_INDEX_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeVerificationFeedback(rows: VerificationFeedbackRecord[]) {
  fs.writeFileSync(FEEDBACK_INDEX_FILE, JSON.stringify(rows, null, 2));
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

function readJob(jobId: string): any | null {
  const safeId = String(jobId || '').trim();
  if (!safeId) return null;
  const filePath = path.join(JOBS_DIR, `${safeId}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function listCompanyJobs(companyId: string): any[] {
  const target = String(companyId || '').trim();
  if (!target) return [];
  try {
    const files = fs.readdirSync(JOBS_DIR).filter((name) => name.endsWith('.json'));
    const jobs = files
      .map((fileName) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(JOBS_DIR, fileName), 'utf8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((job) => String(job?.companyId || '') === target);

    return jobs.sort((a, b) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')));
  } catch {
    return [];
  }
}

function getReviewState(feedbackRows: VerificationFeedbackRecord[], companyId: string, jobId: string) {
  const rows = feedbackRows.filter((item) => item.companyId === companyId && item.jobId === jobId);
  const reviewers = Array.from(new Set(rows.map((item) => String(item.reviewer || '').toLowerCase()).filter(Boolean)));
  const outcomes = Array.from(new Set(rows.map((item) => String(item.outcome || '').toLowerCase()).filter(Boolean)));
  return {
    feedbackCount: rows.length,
    reviewerCount: reviewers.length,
    reviewers,
    outcomes,
    consensus: outcomes.length === 1 ? outcomes[0] : 'mixed',
    doubleValidationComplete: reviewers.length >= 2
  };
}

function computeFileSha256(filePath: string): string {
  try {
    const digest = crypto.createHash('sha256');
    digest.update(fs.readFileSync(filePath));
    return digest.digest('hex');
  } catch {
    return 'unavailable';
  }
}

function normalizeEvidenceForAudit(evidence: any[] | undefined) {
  if (!Array.isArray(evidence)) return [];
  return evidence.slice(0, 12).map((item) => ({
    code: String(item?.code || 'signal'),
    severity: String(item?.severity || 'low'),
    reason: String(item?.reason || 'no-reason')
  }));
}

function toCalibrationExamplesFromFeedback(feedbackRows: VerificationFeedbackRecord[], companyId: string): TrainingExampleLite[] {
  const minConfidence = 60;
  return feedbackRows
    .filter((item) => item.companyId === companyId)
    .filter((item) => item.outcome === 'fraud_confirmed' || item.outcome === 'authenticity_confirmed')
    .filter((item) => Number.isFinite(Number(item.authenticityScore)))
    .filter((item) => Number(item.reviewerConfidence || 0) >= minConfidence)
    .map((item) => ({
      companyId: item.companyId,
      category: item.outcome === 'fraud_confirmed' ? 'high-risk-fraud' : 'high-authenticity',
      analysis: {
        authenticityScore: Number(item.authenticityScore || 0)
      }
    }));
}

function getCompanyCalibrationProfile(auth: AuthContext, companyId: string): CalibrationProfile {
  const trainingExamples = readTrainingExamples() as TrainingExampleLite[];
  const feedbackExamples = toCalibrationExamplesFromFeedback(readVerificationFeedback(), companyId);
  const merged = [...trainingExamples, ...feedbackExamples];
  return buildCalibrationProfile(merged, companyId);
}

async function createTrainingExampleRecord(auth: AuthContext, file: Express.Multer.File, payload: { category?: unknown; reasons?: unknown; notes?: unknown }) {
  const rawCategory = String(payload.category || '').trim().toLowerCase();
  const category: TrainingCategory = rawCategory === 'high-authenticity' ? 'high-authenticity' : 'high-risk-fraud';
  const reasons = parseReasons(payload.reasons);
  const notes = String(payload.notes || '').trim().slice(0, 2000);

  if (!reasons.length) {
    throw new Error('reasons-required');
  }

  const extraction = await extractTextForAnalysis(file);
  const text = extraction.text;
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

  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      const pdf = await pdfParse(buffer);
      return normalizeExtractedText(typeof pdf?.text === 'string' ? pdf.text : '');
    } catch {
      return '';
    }
  }

  if (TEXT_LIKE_EXTENSIONS.has(ext)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const cleaned = ext === '.html' || ext === '.htm' || ext === '.xml'
        ? stripMarkup(raw)
        : ext === '.rtf'
          ? stripRtf(raw)
          : raw;
      return normalizeExtractedText(cleaned);
    } catch {
      return '';
    }
  }

  if (ext === '.docx') {
    try {
      const output = await mammoth.extractRawText({ path: filePath });
      return normalizeExtractedText(output?.value || '');
    } catch {
      return '';
    }
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
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
      return normalizeExtractedText(parsed?.text || '');
    } catch {
      return '';
    }
  }

  const fallback = normalizeExtractedText(tryReadTextFallback(filePath));
  if (fallback) return fallback;
  throw new Error('unsupported-file-format');
}

function uploadedFileExtension(file: Pick<Express.Multer.File, 'originalname' | 'path'>) {
  return path.extname(file.originalname || file.path).toLowerCase();
}

function buildMetadataFallbackText(file: Express.Multer.File) {
  const extension = uploadedFileExtension(file) || '.unknown';
  const safeFileName = sanitizeFileName(file.originalname || path.basename(file.path));
  const size = Number(file.size || (fs.existsSync(file.path) ? fs.statSync(file.path).size : 0));
  return [
    'document_metadata_fallback',
    `file_name:${safeFileName}`,
    `extension:${extension}`,
    `file_size_bytes:${size}`,
    'warning:no_extractable_text',
    `generated_at:${new Date().toISOString()}`
  ].join('\n');
}

async function extractTextForAnalysis(file: Express.Multer.File): Promise<ExtractedTextResult> {
  let extracted = '';
  try {
    extracted = await extractTextImmediately(file.path);
  } catch (error: any) {
    const reason = String(error?.message || error);
    if (reason !== 'unsupported-file-format') {
      throw error;
    }
  }

  if (extracted && String(extracted).trim()) {
    return { text: extracted, usedMetadataFallback: false };
  }

  if (!METADATA_FALLBACK_EXTENSIONS.has(uploadedFileExtension(file))) {
    return { text: '', usedMetadataFallback: false };
  }

  return {
    text: buildMetadataFallbackText(file),
    usedMetadataFallback: true
  };
}

function applyNoExtractableTextRisk(trust: CalibrationTrustInput, fileNames: string[]) {
  const uniqueNames = Array.from(
    new Set(
      fileNames
        .map((name) => String(name || '').trim())
        .filter(Boolean)
    )
  );
  if (!uniqueNames.length) return;

  const reason = uniqueNames.length === 1
    ? `Documento sem texto extraivel (${uniqueNames[0]}). Revisao manual recomendada.`
    : `Documentos sem texto extraivel (${uniqueNames.join(', ')}). Revisao manual recomendada.`;

  trust.likelyFraud = true;
  trust.riskLevel = trust.riskLevel === 'high' ? 'high' : 'medium';
  trust.riskScore = Math.max(68, Number(trust.riskScore || 0));
  trust.confidence = Math.max(70, Number(trust.confidence || 0));
  trust.fraudReasons = Array.from(new Set([...(trust.fraudReasons || []), reason]));
  trust.indicators.push({
    code: 'no-extractable-text',
    severity: 'medium',
    reason
  });
}

function buildExternalModeRequirementDetails(externalValidation: any) {
  return {
    requiredProcessingMode: EXTERNAL_PROCESSING_MODE,
    providerStatus: {
      energent: {
        enabled: Boolean(externalValidation?.providers?.energent?.enabled),
        status: String(externalValidation?.providers?.energent?.status || 'unknown'),
        reason: externalValidation?.providers?.energent?.reason || null
      },
      checkfile: {
        enabled: Boolean(externalValidation?.providers?.checkfile?.enabled),
        status: String(externalValidation?.providers?.checkfile?.status || 'unknown'),
        reason: externalValidation?.providers?.checkfile?.reason || null
      }
    }
  };
}

const EXTERNAL_BRIDGE_SUSPICIOUS_TERMS = [
  'fake',
  'forged',
  'tampered',
  'manipulated',
  'counterfeit',
  'photoshop',
  'generated by ai',
  'chatgpt',
  'lorem ipsum'
];

const EXTERNAL_BRIDGE_ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.bmp',
  '.tif',
  '.tiff',
  '.txt',
  '.csv',
  '.json',
  '.md',
  '.docx'
]);

type ExternalBridgeProvider = 'energent' | 'checkfile';

type ExternalBridgeAssessment = {
  riskScore: number;
  confidence: number;
  highRisk: boolean;
  suspiciousTerms: string[];
  unsupportedExtension: boolean;
  emptyText: boolean;
  minimalText: boolean;
  reasons: string[];
};

function readBearerToken(headerValue: unknown): string {
  const rawHeader = Array.isArray(headerValue) ? String(headerValue[0] || '') : String(headerValue || '');
  const match = rawHeader.match(/^Bearer\s+(.+)$/i);
  return match ? String(match[1] || '').trim() : '';
}

function assessExternalProviderPayload(payload: Record<string, unknown>): ExternalBridgeAssessment {
  const extension = String(payload?.extension || '').trim().toLowerCase();
  const fileSize = Number(payload?.fileSize || 0);
  const textSample = String(payload?.textSample || '').toLowerCase();
  const normalizedText = textSample.replace(/\s+/g, ' ').trim();
  const suspiciousTerms = EXTERNAL_BRIDGE_SUSPICIOUS_TERMS.filter((term) => normalizedText.includes(term));
  const emptyText = normalizedText.length === 0;
  const minimalText = normalizedText.length > 0 && normalizedText.length < 24;
  const unsupportedExtension = !extension || !EXTERNAL_BRIDGE_ALLOWED_EXTENSIONS.has(extension);

  let riskScore = 0;
  if (unsupportedExtension) riskScore += 35;
  if (emptyText) riskScore += 35;
  if (minimalText) riskScore += 12;
  if (fileSize <= 0) riskScore += 22;
  if (fileSize > 25 * 1024 * 1024) riskScore += 8;
  riskScore += Math.min(56, suspiciousTerms.length * 16);

  const boundedRiskScore = Math.max(0, Math.min(99, riskScore));
  const confidence = Math.max(
    50,
    Math.min(96, 70 + suspiciousTerms.length * 4 + (unsupportedExtension ? 8 : 0) + (emptyText ? 10 : 0))
  );

  const reasons: string[] = [];
  if (unsupportedExtension) reasons.push(`unsupported-extension:${extension || 'missing'}`);
  if (emptyText) reasons.push('empty-text-sample');
  if (minimalText) reasons.push('insufficient-text-sample');
  if (fileSize <= 0) reasons.push('invalid-file-size');
  if (fileSize > 25 * 1024 * 1024) reasons.push('oversized-document');
  if (suspiciousTerms.length > 0) reasons.push(`suspicious-terms:${suspiciousTerms.join(',')}`);
  if (!reasons.length) reasons.push('no-high-risk-signals');

  return {
    riskScore: boundedRiskScore,
    confidence,
    highRisk: boundedRiskScore >= 55,
    suspiciousTerms,
    unsupportedExtension,
    emptyText,
    minimalText,
    reasons
  };
}

function resolveBridgeStatus(provider: ExternalBridgeProvider, assessment: ExternalBridgeAssessment): string {
  if (assessment.highRisk) return 'invalid';
  return provider === 'energent' ? 'authentic' : 'valid';
}

function registerExternalProviderBridge(
  provider: ExternalBridgeProvider,
  routePath: string,
  apiKeyEnvName: 'ENERGENT_API_KEY' | 'CHECKFILE_API_KEY'
) {
  app.post(routePath, (req, res) => {
    const expectedApiKey = String(process.env[apiKeyEnvName] || '').trim();
    if (!expectedApiKey) {
      return res.status(503).json({ status: 'error', reason: 'provider-key-not-configured' });
    }

    const providedApiKey = readBearerToken(req.headers?.authorization);
    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      return res.status(401).json({ status: 'unauthorized', reason: 'invalid-provider-token' });
    }

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ status: 'invalid', reason: 'invalid-payload' });
    }

    const assessment = assessExternalProviderPayload(req.body as Record<string, unknown>);
    const status = resolveBridgeStatus(provider, assessment);
    return res.json({
      status,
      provider,
      riskScore: assessment.riskScore,
      confidence: assessment.confidence,
      reasons: assessment.reasons,
      signals: {
        suspiciousTerms: assessment.suspiciousTerms,
        unsupportedExtension: assessment.unsupportedExtension,
        emptyText: assessment.emptyText,
        minimalText: assessment.minimalText
      }
    });
  });
}

registerExternalProviderBridge('energent', '/external/providers/energent/verify', 'ENERGENT_API_KEY');
registerExternalProviderBridge('checkfile', '/external/providers/checkfile/verify', 'CHECKFILE_API_KEY');

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
    const extraction = await extractTextForAnalysis(req.file);
    const text = extraction.text;
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
        supportedFormats: SUPPORTED_UPLOAD_FORMATS
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
    const externalModeRequired = isExternalProcessingModeRequired(req.headers as Record<string, unknown>);
    if (externalModeRequired && !externalValidation.enabled) {
      refundVerificationCredits(auth.companyId, jobId, 'external-validation-required');
      const failedJob = {
        ...job,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: 'external-validation-required',
        details: buildExternalModeRequirementDetails(externalValidation)
      };
      fs.writeFileSync(path.join(JOBS_DIR, `${jobId}.json`), JSON.stringify(failedJob, null, 2));
      return res.status(503).json({
        jobId,
        status: 'failed',
        error: 'external-validation-required',
        details: buildExternalModeRequirementDetails(externalValidation)
      });
    }
    if (extraction.usedMetadataFallback) {
      applyNoExtractableTextRisk(calibratedTrust, [req.file.originalname]);
      if (externalValidation.enabled && externalValidation.decision === 'approved') {
        externalValidation.decision = 'manual_review';
      }
    }
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
    const auditableDecision = buildAuditableDecision({
      trust: {
        authenticityPercentage: Number(calibratedTrust.authenticityPercentage || 0),
        likelyFraud: Boolean(calibratedTrust.likelyFraud),
        riskLevel: String(calibratedTrust.riskLevel || 'unknown'),
        riskScore: Number(calibratedTrust.riskScore || 0),
        confidence: Number(calibratedTrust.confidence || 0),
        indicators: Array.isArray(calibratedTrust.indicators) ? calibratedTrust.indicators : []
      },
      externalDecision: externalValidation.decision,
      calibration: calibratedTrust.calibration || null,
      mode: 'recommendation'
    });

    const result = {
      decision: auditableDecision,
      text,
      forensic,
      contextual,
      summary: forensic.summary,
      trust: calibratedTrust,
      externalValidation,
      extraction: {
        mode: extraction.usedMetadataFallback ? 'metadata-fallback' : 'text',
        warning: extraction.usedMetadataFallback ? 'no-extractable-text' : null
      },
      processingMode: externalValidation.enabled ? 'api-external-orchestrated' : 'api-internal-engine',
      finalDecision: toLegacyFinalDecision(auditableDecision.status),
      decisionMode: 'recommendation',
      verdicts: {
        passive: passiveIssuesFound ? 'found' : 'not_found',
        contextual: contextualSignals ? 'found' : 'not_found',
        ai: aiSignals ? 'found' : 'not_found',
        fraud: calibratedTrust.likelyFraud ? 'found' : 'not_found',
        external: externalValidation.enabled
          ? (externalValidation.decision === 'approved' ? 'not_found' : 'found')
          : 'not_found'
      },
      auditReport: {
        reportVersion: 'case-audit-2026.07-v1',
        generatedAt: new Date().toISOString(),
        caseType: 'single-document',
        jobId,
        actor: {
          username: auth.username,
          companyId: auth.companyId,
          principalType: auth.principalType
        },
        document: {
          originalFileName: req.file.originalname,
          storedFileName: path.basename(req.file.path),
          mimeType: String(req.file.mimetype || 'unknown'),
          sizeBytes: Number(req.file.size || 0),
          sha256: computeFileSha256(req.file.path)
        },
        decision: {
          status: auditableDecision.status,
          statusLabel: auditableDecision.statusLabel,
          confidence: Number(auditableDecision.confidence || 0),
          ruleVersion: auditableDecision.ruleVersion,
          policyScope: auditableDecision.policyScope
        },
        rules: {
          externalDecision: String(externalValidation.decision || 'internal_only'),
          processingMode: externalValidation.enabled ? 'api-external-orchestrated' : 'api-internal-engine'
        },
        evidence: normalizeEvidenceForAudit(auditableDecision.evidence)
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
      extractionMode: 'text' | 'metadata-fallback';
      textLength: number;
      forensic?: any;
      error?: string;
    }> = [];
    const caseInputs: CaseDocumentInput[] = [];
    const textChunks: string[] = [];
    const fallbackFileNames: string[] = [];

    for (const file of files) {
      const extraction = await extractTextForAnalysis(file);
      const text = extraction.text;
      if (!text || !String(text).trim()) {
        documentResults.push({
          fileName: file.originalname,
          filePath: file.path,
          status: 'failed',
          extractionMode: 'text',
          textLength: 0,
          error: 'unsupported-or-empty-document'
        });
        continue;
      }

      const forensic = analyzeDocument(file.path, text);
      if (extraction.usedMetadataFallback) {
        fallbackFileNames.push(file.originalname);
      }
      documentResults.push({
        fileName: file.originalname,
        filePath: file.path,
        status: 'done',
        extractionMode: extraction.usedMetadataFallback ? 'metadata-fallback' : 'text',
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
    const metadataIndicatorsFromDocs = successfulDocs
      .flatMap((item) => Array.isArray(item.forensic?.checks?.metadataIndicators) ? item.forensic.checks.metadataIndicators : [])
      .slice(0, 20);
    const baseLikelyFraud = caseAnalysis.indicators.some((item) => item.severity === 'high')
      || caseAnalysis.indicators.filter((item) => item.severity === 'medium').length >= 2
      || metadataIndicatorsFromDocs.filter((item) => item?.severity === 'medium').length >= 3;
    const baseTrust: CalibrationTrustInput = {
      authenticityPercentage: caseAnalysis.score,
      likelyFraud: baseLikelyFraud,
      riskLevel: baseLikelyFraud ? 'medium' : 'low',
      riskScore: Math.min(100, (baseLikelyFraud ? 60 : 35) + (metadataIndicatorsFromDocs.filter((item) => item?.severity === 'medium').length * 4)),
      confidence: Math.min(95, (caseAnalysis.indicators.length ? 70 : 50) + metadataIndicatorsFromDocs.length),
      fraudReasons: [
        ...caseAnalysis.indicators.map((item) => item.reason),
        ...metadataIndicatorsFromDocs.map((item) => String(item.reason || ''))
      ].filter(Boolean),
      indicators: [...caseAnalysis.indicators, ...metadataIndicatorsFromDocs]
    };
    const calibrationProfile = getCompanyCalibrationProfile(auth, auth.companyId);
    const calibratedTrust = applyCalibrationToTrust(baseTrust, calibrationProfile);
    if (fallbackFileNames.length) {
      applyNoExtractableTextRisk(calibratedTrust, fallbackFileNames);
    }
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
    const externalModeRequired = isExternalProcessingModeRequired(req.headers as Record<string, unknown>);
    if (externalModeRequired && !enabledExternal.length) {
      const energentProvider = perDocumentExternal
        .map((item) => item?.providers?.energent)
        .find((provider) => provider) || { enabled: false, status: 'skipped', reason: 'missing-endpoint' };
      const checkfileProvider = perDocumentExternal
        .map((item) => item?.providers?.checkfile)
        .find((provider) => provider) || { enabled: false, status: 'skipped', reason: 'missing-endpoint' };
      const emptyExternal = {
        enabled: false,
        providers: {
          energent: energentProvider,
          checkfile: checkfileProvider
        }
      };
      refundVerificationCredits(auth.companyId, jobId, 'external-validation-required');
      const failedJob = {
        ...job,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: 'external-validation-required',
        details: buildExternalModeRequirementDetails(emptyExternal)
      };
      fs.writeFileSync(path.join(JOBS_DIR, `${jobId}.json`), JSON.stringify(failedJob, null, 2));
      return res.status(503).json({
        jobId,
        status: 'failed',
        error: 'external-validation-required',
        details: buildExternalModeRequirementDetails(emptyExternal)
      });
    }
    const hasExternalManualReview = enabledExternal.some((item) => item.decision === 'manual_review') || fallbackFileNames.length > 0;
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

    const caseDecision = buildAuditableDecision({
      trust: {
        authenticityPercentage: Number(calibratedTrust.authenticityPercentage || 0),
        likelyFraud: Boolean(calibratedTrust.likelyFraud),
        riskLevel: String(calibratedTrust.riskLevel || 'unknown'),
        riskScore: Number(calibratedTrust.riskScore || 0),
        confidence: Number(calibratedTrust.confidence || 0),
        indicators: Array.isArray(calibratedTrust.indicators) ? calibratedTrust.indicators : []
      },
      externalDecision: caseExternalDecision,
      calibration: calibratedTrust.calibration || null,
      mode: 'recommendation'
    });

    const result = {
      decision: caseDecision,
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
      finalDecision: toLegacyFinalDecision(caseDecision.status),
      decisionMode: 'recommendation',
      verdicts: {
        passive: caseAnalysis.indicators.length > 0 ? 'found' : 'not_found',
        contextual: (contextual.checks || []).length > 0 ? 'found' : 'not_found',
        ai: documentResults.some((item) => item.forensic?.checks?.aiLikelihood === 'likely-ai' || item.forensic?.checks?.aiLikelihood === 'possible-ai') ? 'found' : 'not_found',
        fraud: calibratedTrust.likelyFraud ? 'found' : 'not_found',
        external: enabledExternal.length
          ? (caseExternalDecision === 'approved' ? 'not_found' : 'found')
          : 'not_found'
      },
      auditReport: {
        reportVersion: 'case-audit-2026.07-v1',
        generatedAt: new Date().toISOString(),
        caseType: 'multi-document',
        jobId,
        actor: {
          username: auth.username,
          companyId: auth.companyId,
          principalType: auth.principalType
        },
        documents: successfulDocs.map((item) => {
          const matchedUpload = files.find((file) => file.path === item.filePath);
          return {
            originalFileName: item.fileName,
            storedFileName: path.basename(item.filePath),
            mimeType: String(matchedUpload?.mimetype || 'unknown'),
            sizeBytes: Number(matchedUpload?.size || 0),
            sha256: computeFileSha256(item.filePath)
          };
        }),
        decision: {
          status: caseDecision.status,
          statusLabel: caseDecision.statusLabel,
          confidence: Number(caseDecision.confidence || 0),
          ruleVersion: caseDecision.ruleVersion,
          policyScope: caseDecision.policyScope
        },
        rules: {
          externalDecision: String(caseExternalDecision || 'internal_only'),
          processingMode: enabledExternal.length ? 'api-external-orchestrated' : 'api-internal-engine'
        },
        evidence: normalizeEvidenceForAudit(caseDecision.evidence)
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

app.get('/benchmark/internal', requireCompanyAuth, (req, res) => {
  const auth = (req as any).auth as AuthContext;
  if (!requireInternalAdmin(auth)) {
    return res.status(403).json({ error: 'admin-access-required' });
  }

  try {
    const report = runInternalBenchmark();
    return res.json(report);
  } catch (error: any) {
    return res.status(500).json({ error: String(error?.message || error) });
  }
});

app.post('/verification-feedback', requireCompanyAuth, (req, res) => {
  const auth = (req as any).auth as AuthContext;
  const jobId = String(req.body?.jobId || '').trim();
  const outcome = String(req.body?.outcome || '').trim().toLowerCase() as ReviewerOutcome;
  const notes = String(req.body?.notes || '').trim().slice(0, 2000);
  const reviewerConfidenceRaw = Number(req.body?.reviewerConfidence ?? 70);
  const reviewerConfidence = Number.isFinite(reviewerConfidenceRaw)
    ? Math.max(0, Math.min(100, Math.round(reviewerConfidenceRaw)))
    : 70;

  if (!jobId) return res.status(400).json({ error: 'job-id-required' });
  if (!['fraud_confirmed', 'authenticity_confirmed', 'inconclusive'].includes(outcome)) {
    return res.status(400).json({ error: 'invalid-outcome' });
  }

  const job = readJob(jobId);
  if (!job) return res.status(404).json({ error: 'job-not-found' });
  if (String(job.companyId || '') !== String(auth.companyId || '')) {
    return res.status(403).json({ error: 'job-access-denied' });
  }

  const authenticityScoreRaw = Number(job?.result?.trust?.authenticityPercentage ?? job?.result?.summary?.authenticityScore);
  const riskScoreRaw = Number(job?.result?.trust?.riskScore);

  const now = new Date().toISOString();
  const all = readVerificationFeedback();
  const existingIdx = all.findIndex(
    (item) => item.companyId === auth.companyId && item.jobId === jobId && String(item.reviewer || '').toLowerCase() === String(auth.username || '').toLowerCase()
  );

  const payload: VerificationFeedbackRecord = {
    id: existingIdx >= 0 ? all[existingIdx].id : uuidv4(),
    companyId: auth.companyId,
    jobId,
    outcome,
    reviewer: auth.username,
    reviewerConfidence,
    notes,
    authenticityScore: Number.isFinite(authenticityScoreRaw) ? authenticityScoreRaw : null,
    riskScore: Number.isFinite(riskScoreRaw) ? riskScoreRaw : null,
    decisionStatus: String(job?.result?.decision?.status || job?.result?.finalDecision || 'unknown'),
    createdAt: existingIdx >= 0 ? all[existingIdx].createdAt : now,
    updatedAt: now
  };

  if (existingIdx >= 0) {
    all[existingIdx] = payload;
  } else {
    all.unshift(payload);
  }

  writeVerificationFeedback(all.slice(0, 10000));
  const calibration = getCompanyCalibrationProfile(auth, auth.companyId);
  return res.json({
    ok: true,
    feedback: payload,
    reviewState: getReviewState(all, auth.companyId, jobId),
    calibration
  });
});

app.get('/verification-feedback', requireCompanyAuth, (req, res) => {
  const auth = (req as any).auth as AuthContext;
  const scopeAll = String(req.query?.scope || '').trim().toLowerCase() === 'all';
  const limitRaw = Number(req.query?.limit ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 50;

  const all = readVerificationFeedback();
  const rows = scopeAll && requireInternalAdmin(auth)
    ? all
    : all.filter((item) => item.companyId === auth.companyId);

  return res.json({
    feedback: rows.slice(0, limit),
    total: rows.length,
    calibration: getCompanyCalibrationProfile(auth, auth.companyId)
  });
});

app.get('/review/queue', requireCompanyAuth, (req, res) => {
  const auth = (req as any).auth as AuthContext;
  const slaHoursRaw = Number(req.query?.slaHours ?? 24);
  const slaHours = Number.isFinite(slaHoursRaw) ? Math.max(1, Math.min(240, Math.round(slaHoursRaw))) : 24;
  const nowMs = Date.now();
  const feedbackRows = readVerificationFeedback();

  const items = listCompanyJobs(auth.companyId)
    .filter((job) => String(job?.status || '') === 'done')
    .filter((job) => {
      const status = String(job?.result?.decision?.status || job?.result?.finalDecision || '').toLowerCase();
      return status.includes('review') || status.includes('blocked') || status.includes('revisao') || status.includes('bloqueado');
    })
    .map((job) => {
      const jobId = String(job?.id || '');
      const reviewState = getReviewState(feedbackRows, auth.companyId, jobId);
      const createdAt = String(job?.createdAt || job?.startedAt || new Date().toISOString());
      const createdMs = new Date(createdAt).getTime();
      const dueAtMs = Number.isFinite(createdMs) ? createdMs + (slaHours * 60 * 60 * 1000) : nowMs;
      const dueAt = new Date(dueAtMs).toISOString();
      const doubleValidationRequired = true;
      const resolved = doubleValidationRequired ? reviewState.doubleValidationComplete : reviewState.feedbackCount > 0;
      const slaBreached = !resolved && nowMs > dueAtMs;
      const topEvidence = normalizeEvidenceForAudit(job?.result?.decision?.evidence || job?.result?.trust?.indicators);

      return {
        jobId,
        decision: {
          status: String(job?.result?.decision?.status || job?.result?.finalDecision || 'unknown'),
          statusLabel: String(job?.result?.decision?.statusLabel || 'Review required'),
          confidence: Number(job?.result?.decision?.confidence ?? job?.result?.trust?.confidence ?? 0)
        },
        createdAt,
        dueAt,
        slaBreached,
        resolved,
        doubleValidationRequired,
        reviewState,
        evidence: topEvidence.slice(0, 3)
      };
    })
    .sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      if (a.slaBreached !== b.slaBreached) return a.slaBreached ? -1 : 1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

  return res.json({
    queue: items,
    policy: {
      slaHours,
      doubleValidationMinReviewers: 2
    },
    summary: {
      total: items.length,
      open: items.filter((item) => !item.resolved).length,
      resolved: items.filter((item) => item.resolved).length,
      slaBreached: items.filter((item) => item.slaBreached).length
    }
  });
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

app.get('/status/:id/audit', requireCompanyAuth, (req, res) => {
  const auth = (req as any).auth as AuthContext;
  const id = req.params.id;
  const job = readJob(id);
  if (!job) return res.status(404).json({ error: 'not found' });
  if (job.companyId && job.companyId !== auth.companyId) {
    return res.status(404).json({ error: 'not found' });
  }
  const auditReport = job?.result?.auditReport;
  if (!auditReport) return res.status(404).json({ error: 'audit-report-not-found' });
  return res.json({ jobId: id, auditReport });
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
