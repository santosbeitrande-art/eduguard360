import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { analyzeDocument } from '../forensic';
import { analyzeCaseDocuments } from '../document_intelligence';
import { evaluateFraudRisk } from '../risk';

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
