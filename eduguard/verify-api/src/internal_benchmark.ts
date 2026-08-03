import fs from 'fs';
import os from 'os';
import path from 'path';
import { analyzeDocument } from './forensic';
import { evaluateFraudRisk } from './risk';
import {
  buildAuditableDecision,
  toLegacyFinalDecision,
  DECISION_POLICY_VERSION,
  MIN_CASES_FOR_COMPANY_CALIBRATION
} from './decision_policy';

type FixtureCase = {
  id: string;
  label: 'genuine' | 'fraud';
  documentType: string;
  country?: string;
  language?: string;
  mtime: string;
  text: string;
  expect?: {
    likelyFraud?: boolean;
    minAuthenticity?: number;
    maxAuthenticity?: number;
  };
};

type BenchmarkRecord = {
  id: string;
  label: 'genuine' | 'fraud';
  documentType: string;
  country: string;
  language: string;
  predictedFraud: boolean;
  decisionStatus: 'validated' | 'review_required' | 'blocked';
};

interface InternalBenchmarkOptions {
  fixturesPath?: string;
  country?: string;
  language?: string;
}

function safeRatio(num: number, den: number) {
  if (!den) return 0;
  return num / den;
}

function round4(value: number) {
  return Number(value.toFixed(4));
}

function normalizeCountry(value: unknown) {
  const text = String(value || 'ANY').trim().toUpperCase();
  return text || 'ANY';
}

function normalizeLanguage(value: unknown) {
  const text = String(value || 'any').trim().toLowerCase();
  return text || 'any';
}

function wilsonInterval(successes: number, total: number, z = 1.96) {
  if (!total) {
    return { low: 0, high: 0 };
  }
  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + (z2 / total);
  const center = (p + (z2 / (2 * total))) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) / total) + (z2 / (4 * total * total)))) / denominator;
  return {
    low: round4(Math.max(0, center - margin)),
    high: round4(Math.min(1, center + margin))
  };
}

function writeTempDocument(name: string, text: string, mtimeIso: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eduguard-benchmark-'));
  const filePath = path.join(dir, `${name}.txt`);
  fs.writeFileSync(filePath, text, 'utf8');
  const mtime = new Date(mtimeIso);
  fs.utimesSync(filePath, mtime, mtime);
  return filePath;
}

function loadFixtures(fixturesPath: string): FixtureCase[] {
  const raw = fs.readFileSync(fixturesPath, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed as FixtureCase[] : [];
}

function computeMetrics(records: BenchmarkRecord[]) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let reviewCount = 0;
  let blockedCount = 0;
  let validatedCount = 0;

  for (const item of records) {
    const actualFraud = item.label === 'fraud';
    const predictedFraud = item.predictedFraud;

    if (actualFraud && predictedFraud) tp += 1;
    else if (!actualFraud && predictedFraud) fp += 1;
    else if (!actualFraud && !predictedFraud) tn += 1;
    else fn += 1;

    if (item.decisionStatus === 'review_required') reviewCount += 1;
    else if (item.decisionStatus === 'blocked') blockedCount += 1;
    else validatedCount += 1;
  }

  const total = records.length;
  const precision = safeRatio(tp, tp + fp);
  const recall = safeRatio(tp, tp + fn);
  const falsePositiveRate = safeRatio(fp, fp + tn);
  const falseNegativeRate = safeRatio(fn, fn + tp);
  const accuracy = safeRatio(tp + tn, total);

  return {
    count: total,
    tp,
    fp,
    tn,
    fn,
    precision: round4(precision),
    precisionCI95: wilsonInterval(tp, tp + fp),
    recall: round4(recall),
    recallCI95: wilsonInterval(tp, tp + fn),
    accuracy: round4(accuracy),
    accuracyCI95: wilsonInterval(tp + tn, total),
    falsePositiveRate: round4(falsePositiveRate),
    falseNegativeRate: round4(falseNegativeRate),
    reviewRate: round4(safeRatio(reviewCount, total)),
    blockedRate: round4(safeRatio(blockedCount, total)),
    validatedRate: round4(safeRatio(validatedCount, total))
  };
}

export function runInternalBenchmark(options: InternalBenchmarkOptions = {}) {
  const fixturesPath = options.fixturesPath || path.join(process.cwd(), 'test-fixtures', 'fraud_cases.json');
  const filterCountry = normalizeCountry(options.country || 'ANY');
  const filterLanguage = normalizeLanguage(options.language || 'any');
  const fixtures = loadFixtures(fixturesPath);
  const filteredFixtures = fixtures.filter((item) => {
    const fixtureCountry = normalizeCountry(item.country || 'ANY');
    const fixtureLanguage = normalizeLanguage(item.language || 'any');
    const countryMatch = filterCountry === 'ANY' || fixtureCountry === filterCountry;
    const languageMatch = filterLanguage === 'any' || fixtureLanguage === filterLanguage;
    return countryMatch && languageMatch;
  });
  const records: BenchmarkRecord[] = [];

  for (const fixture of filteredFixtures) {
    const filePath = writeTempDocument(fixture.id, fixture.text, fixture.mtime);
    const forensic = analyzeDocument(filePath, fixture.text);
    const contextual = { found: { domains: [], emails: [] }, checks: [] };
    const risk = evaluateFraudRisk(forensic, contextual);

    const decision = buildAuditableDecision({
      trust: {
        authenticityPercentage: Number(forensic?.summary?.authenticityScore ?? forensic?.score ?? 0),
        likelyFraud: Boolean(risk.likelyFraud),
        riskLevel: String(risk.riskLevel || 'unknown'),
        riskScore: Number(risk.riskScore || 0),
        confidence: Number(risk.confidence || 0),
        indicators: Array.isArray(risk.indicators) ? risk.indicators : []
      },
      externalDecision: 'internal_only',
      mode: 'recommendation',
      calibration: null
    });

    records.push({
      id: fixture.id,
      label: fixture.label,
      documentType: String(fixture.documentType || 'unknown'),
      country: normalizeCountry(fixture.country || 'ANY'),
      language: normalizeLanguage(fixture.language || 'any'),
      predictedFraud: Boolean(risk.likelyFraud || decision.status === 'blocked'),
      decisionStatus: decision.status
    });
  }

  const overall = computeMetrics(records);
  const byDocumentType: Record<string, ReturnType<typeof computeMetrics>> = {};
  const documentTypes = Array.from(new Set(records.map((item) => item.documentType)));
  for (const docType of documentTypes) {
    byDocumentType[docType] = computeMetrics(records.filter((item) => item.documentType === docType));
  }

  const byCountry: Record<string, ReturnType<typeof computeMetrics>> = {};
  const countries = Array.from(new Set(records.map((item) => item.country)));
  for (const country of countries) {
    byCountry[country] = computeMetrics(records.filter((item) => item.country === country));
  }

  const byLanguage: Record<string, ReturnType<typeof computeMetrics>> = {};
  const languages = Array.from(new Set(records.map((item) => item.language)));
  for (const language of languages) {
    byLanguage[language] = computeMetrics(records.filter((item) => item.language === language));
  }

  return {
    generatedAt: new Date().toISOString(),
    policy: {
      mode: 'recommendation',
      ruleVersion: DECISION_POLICY_VERSION,
      minimumCasesForCompanyCalibration: MIN_CASES_FOR_COMPANY_CALIBRATION,
      legacyDecisionMapping: {
        validated: toLegacyFinalDecision('validated'),
        review_required: toLegacyFinalDecision('review_required'),
        blocked: toLegacyFinalDecision('blocked')
      }
    },
    totals: {
      fixtures: filteredFixtures.length,
      fraud: filteredFixtures.filter((item) => item.label === 'fraud').length,
      genuine: filteredFixtures.filter((item) => item.label === 'genuine').length,
      documentTypes: documentTypes.length,
      countries: countries.length,
      languages: languages.length
    },
    filters: {
      country: filterCountry,
      language: filterLanguage
    },
    overall,
    byDocumentType,
    byCountry,
    byLanguage
  };
}
