import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { analyzeDocument } from '../forensic';
import { analyzeCaseDocuments } from '../document_intelligence';
import { evaluateFraudRisk } from '../risk';
import { applyCalibrationToTrust, buildCalibrationProfile } from '../calibration';
import { combineExternalValidationResults } from '../external_validation';
import { getRequestedProcessingMode, isExternalProcessingModeRequired } from '../processing_mode';

type FixtureCase = {
  id: string;
  label: 'genuine' | 'fraud';
  documentType: string;
  mtime: string;
  text: string;
  expect: {
    likelyFraud: boolean;
    minAuthenticity?: number;
    maxAuthenticity?: number;
  };
};

function loadFixtures(): FixtureCase[] {
  const fixturePath = path.join(process.cwd(), 'test-fixtures', 'fraud_cases.json');
  const content = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(content) as FixtureCase[];
}

function writeTempDocument(name: string, text: string, mtimeIso: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eduguard-fraud-test-'));
  const filePath = path.join(dir, `${name}.txt`);
  fs.writeFileSync(filePath, text, 'utf8');
  const mtime = new Date(mtimeIso);
  fs.utimesSync(filePath, mtime, mtime);
  return filePath;
}

test('fraud calibration fixtures keep false negatives low', () => {
  const fixtures = loadFixtures();
  let truePositive = 0;
  let falsePositive = 0;
  let trueNegative = 0;
  let falseNegative = 0;

  for (const fixture of fixtures) {
    const filePath = writeTempDocument(fixture.id, fixture.text, fixture.mtime);
    const forensic = analyzeDocument(filePath, fixture.text);
    const contextual = { found: { domains: [], emails: [] }, checks: [] };
    const risk = evaluateFraudRisk(forensic, contextual);
    assert.ok(typeof (risk as any).riskScore === 'number', `Expected numeric riskScore for ${fixture.id}`);
    assert.ok((risk as any).riskScore >= 0 && (risk as any).riskScore <= 100, `Invalid riskScore for ${fixture.id}: ${(risk as any).riskScore}`);
    assert.ok(typeof (risk as any).confidence === 'number', `Expected numeric confidence for ${fixture.id}`);
    assert.ok((risk as any).confidence >= 0 && (risk as any).confidence <= 99, `Invalid confidence for ${fixture.id}: ${(risk as any).confidence}`);

    if (fixture.label === 'fraud') {
      if (risk.likelyFraud) {
        truePositive += 1;
      } else {
        falseNegative += 1;
      }
    } else if (risk.likelyFraud) {
      falsePositive += 1;
    } else {
      trueNegative += 1;
    }

    assert.equal(
      risk.likelyFraud,
      fixture.expect.likelyFraud,
      `Unexpected likelyFraud for fixture ${fixture.id}. score=${forensic.score} indicators=${forensic?.checks?.documentFraudIndicators?.length || 0}`
    );

    if (typeof fixture.expect.minAuthenticity === 'number') {
      assert.ok(
        forensic.score >= fixture.expect.minAuthenticity,
        `Fixture ${fixture.id} expected score >= ${fixture.expect.minAuthenticity}, got ${forensic.score}`
      );
    }

    if (typeof fixture.expect.maxAuthenticity === 'number') {
      assert.ok(
        forensic.score <= fixture.expect.maxAuthenticity,
        `Fixture ${fixture.id} expected score <= ${fixture.expect.maxAuthenticity}, got ${forensic.score}`
      );
    }
  }

  const fraudCount = fixtures.filter((fixture) => fixture.label === 'fraud').length;
  const genuineCount = fixtures.filter((fixture) => fixture.label === 'genuine').length;
  const fnr = fraudCount > 0 ? falseNegative / fraudCount : 0;
  const fpr = genuineCount > 0 ? falsePositive / genuineCount : 0;

  assert.ok(fnr <= 0.25, `False negative rate too high: ${fnr}`);
  assert.ok(fpr <= 0.4, `False positive rate too high: ${fpr}`);
  assert.ok(truePositive >= 2, `Expected at least 2 fraud true positives, got ${truePositive}`);
  assert.ok(trueNegative >= 1, `Expected at least 1 genuine true negative, got ${trueNegative}`);
});

test('cross-document consistency detects fraudulent dossier mismatches', () => {
  const docs = [
    {
      fileName: 'bi-carlos.txt',
      text: 'BILHETE DE IDENTIDADE Nome: Carlos Alberto Mucavele Numero BI: 110234567891A NUIT: 123456789 Data de Emissao: 2025-08-12',
      forensicScore: 70,
      extracted: {
        documentType: 'identity',
        fullNames: ['Carlos Alberto Mucavele'],
        idNumbers: ['110234567891A'],
        nuits: ['123456789'],
        employers: [],
        accountNumbers: [],
        ibanLike: [],
        dates: ['2025-08-12'],
        amounts: [],
        emails: [],
        phones: []
      }
    },
    {
      fileName: 'extrato-maria.txt',
      text: 'EXTRATO BANCARIO Titular: Maria Joana Samuel Conta: 0123456789012345 Periodo: 01/06/2026 a 30/06/2026 Saldo disponivel: 18000,00 MZN',
      forensicScore: 66,
      extracted: {
        documentType: 'bank-statement',
        fullNames: ['Maria Joana Samuel'],
        idNumbers: [],
        nuits: ['999111333'],
        employers: [],
        accountNumbers: ['0123456789012345'],
        ibanLike: [],
        dates: ['01/06/2026', '30/06/2026'],
        amounts: [18000],
        emails: [],
        phones: []
      }
    }
  ];

  const result = analyzeCaseDocuments(docs as any);
  const codes = result.indicators.map((item: any) => item.code);
  assert.ok(codes.includes('name-mismatch'), 'Expected name-mismatch indicator');
  assert.ok(codes.includes('nuit-mismatch'), 'Expected nuit-mismatch indicator');
  assert.ok(result.score <= 60, `Expected low case score after mismatches, got ${result.score}`);
});

test('company training calibration shifts decision boundaries with sufficient examples', () => {
  const trainingExamples = [
    { companyId: 'comp-a', category: 'high-risk-fraud', analysis: { authenticityScore: 28 } },
    { companyId: 'comp-a', category: 'high-risk-fraud', analysis: { authenticityScore: 33 } },
    { companyId: 'comp-a', category: 'high-risk-fraud', analysis: { authenticityScore: 41 } },
    { companyId: 'comp-a', category: 'high-authenticity', analysis: { authenticityScore: 78 } },
    { companyId: 'comp-a', category: 'high-authenticity', analysis: { authenticityScore: 84 } },
    { companyId: 'comp-a', category: 'high-authenticity', analysis: { authenticityScore: 88 } }
  ] as any;

  const profile = buildCalibrationProfile(trainingExamples, 'comp-a');
  assert.equal(profile.enabled, true, 'Expected profile to be enabled with enough examples');
  assert.ok(profile.threshold >= 45 && profile.threshold <= 70, `Unexpected threshold ${profile.threshold}`);

  const likelyLegit = applyCalibrationToTrust({
    authenticityPercentage: 83,
    likelyFraud: true,
    riskLevel: 'medium',
    riskScore: 58,
    confidence: 64,
    indicators: [{ code: 'weak-context', severity: 'low', reason: 'No strong context evidence.' }],
    fraudReasons: ['No strong context evidence.']
  }, profile);
  assert.equal(likelyLegit.likelyFraud, false, 'Calibration should reduce false positive on high-score sample');

  const likelyFraud = applyCalibrationToTrust({
    authenticityPercentage: 37,
    likelyFraud: false,
    riskLevel: 'low',
    riskScore: 32,
    confidence: 52,
    indicators: [{ code: 'text-template', severity: 'medium', reason: 'Template-like content.' }],
    fraudReasons: ['Template-like content.']
  }, profile);
  assert.equal(likelyFraud.likelyFraud, true, 'Calibration should reduce false negative on low-score sample');
});

test('disabled calibration profile preserves trust decision for non-admin flow', () => {
  const profile = {
    enabled: false,
    companyId: 'comp-z',
    sampleSize: 0,
    fraudCount: 0,
    authenticCount: 0,
    fraudMean: null,
    authenticMean: null,
    threshold: 55,
    margin: 7,
    confidence: 0,
    reason: 'admin-access-required'
  } as const;

  const trust = applyCalibrationToTrust({
    authenticityPercentage: 61,
    likelyFraud: false,
    riskLevel: 'low',
    riskScore: 34,
    confidence: 58,
    indicators: [],
    fraudReasons: []
  }, profile as any);

  assert.equal(trust.likelyFraud, false);
  assert.equal(trust.riskScore, 34);
  assert.equal(trust.calibration.reason, 'admin-access-required');
});

test('external validation combines provider decisions conservatively', () => {
  const approved = combineExternalValidationResults(
    { provider: 'energent', enabled: true, ok: true, pass: true, status: 'ok' },
    { provider: 'checkfile', enabled: true, ok: true, pass: true, status: 'valid' }
  );
  assert.equal(approved.enabled, true);
  assert.equal(approved.decision, 'approved');

  const manualReview = combineExternalValidationResults(
    { provider: 'energent', enabled: true, ok: true, pass: true, status: 'ok' },
    { provider: 'checkfile', enabled: true, ok: true, pass: false, status: 'invalid' }
  );
  assert.equal(manualReview.enabled, true);
  assert.equal(manualReview.decision, 'manual_review');

  const internalOnly = combineExternalValidationResults(
    { provider: 'energent', enabled: false, ok: false, pass: null, status: 'skipped', reason: 'missing-endpoint' },
    { provider: 'checkfile', enabled: false, ok: false, pass: null, status: 'skipped', reason: 'missing-endpoint' }
  );
  assert.equal(internalOnly.enabled, false);
  assert.equal(internalOnly.decision, 'internal_only');
});

test('processing mode headers require external orchestrated mode when requested', () => {
  const requiredHeaders = { 'x-eduguard-required-processing-mode': 'api-external-orchestrated' };
  assert.equal(getRequestedProcessingMode(requiredHeaders), 'api-external-orchestrated');
  assert.equal(isExternalProcessingModeRequired(requiredHeaders), true);

  const fallbackHeader = { 'x-eduguard-processing-mode': 'api-external-orchestrated' };
  assert.equal(getRequestedProcessingMode(fallbackHeader), 'api-external-orchestrated');
  assert.equal(isExternalProcessingModeRequired(fallbackHeader), true);

  const optionalHeader = { 'x-eduguard-required-processing-mode': 'api-internal-engine' };
  assert.equal(isExternalProcessingModeRequired(optionalHeader), false);
});
