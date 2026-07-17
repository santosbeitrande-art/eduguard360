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
  predictedFraud: boolean;
  decisionStatus: 'validated' | 'review_required' | 'blocked';
};

function safeRatio(num: number, den: number) {
  if (!den) return 0;
  return num / den;
}

function round4(value: number) {
  return Number(value.toFixed(4));
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

  return {
    count: total,
    tp,
    fp,
    tn,
    fn,
    precision: round4(precision),
    recall: round4(recall),
    falsePositiveRate: round4(falsePositiveRate),
    falseNegativeRate: round4(falseNegativeRate),
    reviewRate: round4(safeRatio(reviewCount, total)),
    blockedRate: round4(safeRatio(blockedCount, total)),
    validatedRate: round4(safeRatio(validatedCount, total))
  };
}

export function runInternalBenchmark(fixturesPath = path.join(process.cwd(), 'test-fixtures', 'fraud_cases.json')) {
  const fixtures = loadFixtures(fixturesPath);
  const records: BenchmarkRecord[] = [];

  for (const fixture of fixtures) {
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
      fixtures: fixtures.length,
      fraud: fixtures.filter((item) => item.label === 'fraud').length,
      genuine: fixtures.filter((item) => item.label === 'genuine').length,
      documentTypes: documentTypes.length
    },
    overall,
    byDocumentType
  };
}
