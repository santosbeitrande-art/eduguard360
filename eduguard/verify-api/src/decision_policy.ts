import type { CalibrationProfile } from './calibration';

export type DecisionStatus = 'validated' | 'review_required' | 'blocked';
export type PolicyMode = 'recommendation' | 'enforced';

export interface DecisionEvidence {
  code: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

export interface AuditableDecision {
  status: DecisionStatus;
  statusLabel: string;
  reasonCode: string;
  reason: string;
  confidence: number;
  mode: PolicyMode;
  autoEnforced: boolean;
  ruleVersion: string;
  policyScope: 'global-safe' | 'company-calibrated';
  evidence: DecisionEvidence[];
  audit: {
    generatedAt: string;
    input: {
      authenticityPercentage: number;
      riskScore: number;
      riskLevel: string;
      likelyFraud: boolean;
      externalDecision: string;
      highIndicators: number;
      mediumIndicators: number;
      lowIndicators: number;
      calibrationSampleSize: number;
      calibrationEnabled: boolean;
    };
  };
}

export interface DecisionPolicyInput {
  trust: {
    authenticityPercentage: number;
    riskScore: number;
    riskLevel: string;
    likelyFraud: boolean;
    confidence: number;
    indicators?: Array<{ code?: unknown; severity?: unknown; reason?: unknown }>;
  };
  externalDecision?: string;
  calibration?: CalibrationProfile | null;
  mode?: PolicyMode;
}

export const DECISION_POLICY_VERSION = 'verify-policy-2026.07-v1';
export const MIN_CASES_FOR_COMPANY_CALIBRATION = 12;

const CRITICAL_EVIDENCE_CODES = new Set([
  'signature-tampered',
  'document-invalid',
  'forged-document',
  'critical-identity-mismatch',
  'critical-qr-mismatch',
  'invalid-digital-signature',
  'metadata-tampering-confirmed',
  'external-critical-fraud'
]);

function clamp(value: number, min = 0, max = 99) {
  return Math.max(min, Math.min(max, value));
}

function normalizeEvidence(indicators: Array<{ code?: unknown; severity?: unknown; reason?: unknown }> | undefined): DecisionEvidence[] {
  if (!Array.isArray(indicators)) return [];
  return indicators
    .map((item) => ({
      code: String(item?.code || 'unknown-indicator'),
      severity: String(item?.severity || 'low') as 'low' | 'medium' | 'high',
      reason: String(item?.reason || 'No reason provided')
    }))
    .filter((item) => ['low', 'medium', 'high'].includes(item.severity));
}

function statusLabel(status: DecisionStatus) {
  if (status === 'validated') return 'Validado';
  if (status === 'blocked') return 'Bloqueado por evidencia critica';
  return 'Revisao obrigatoria';
}

function reasonText(reasonCode: string) {
  if (reasonCode === 'critical-evidence-detected') {
    return 'Bloqueado por evidencias criticas e deterministicas de fraude/adulteracao.';
  }
  if (reasonCode === 'external-manual-review') {
    return 'Validacao externa indicou revisao manual obrigatoria.';
  }
  if (reasonCode === 'insufficient-confidence') {
    return 'Confianca insuficiente para validacao automatica segura.';
  }
  if (reasonCode === 'low-risk-consistent-evidence') {
    return 'Risco baixo com evidencias consistentes entre sinais internos.';
  }
  return 'Sinais ambiguos ou conflitantes exigem revisao humana.';
}

function isCriticalEvidence(evidence: DecisionEvidence[]) {
  return evidence.some((item) => {
    const code = String(item.code || '').toLowerCase();
    if (CRITICAL_EVIDENCE_CODES.has(code)) return true;
    return code.includes('critical') || code.includes('tamper') || code.includes('forged') || code.includes('invalid-signature');
  });
}

export function buildAuditableDecision(input: DecisionPolicyInput): AuditableDecision {
  const mode: PolicyMode = input.mode || 'recommendation';
  const trust = input.trust || {
    authenticityPercentage: 0,
    riskScore: 100,
    riskLevel: 'high',
    likelyFraud: true,
    confidence: 0,
    indicators: []
  };

  const evidence = normalizeEvidence(trust.indicators).slice(0, 12);
  const highIndicators = evidence.filter((item) => item.severity === 'high').length;
  const mediumIndicators = evidence.filter((item) => item.severity === 'medium').length;
  const lowIndicators = evidence.filter((item) => item.severity === 'low').length;

  const authenticity = Number(trust.authenticityPercentage || 0);
  const riskScore = Number(trust.riskScore || 0);
  const confidence = clamp(Number(trust.confidence || 0));
  const likelyFraud = Boolean(trust.likelyFraud);
  const externalDecision = String(input.externalDecision || 'internal_only');

  const criticalByCode = isCriticalEvidence(evidence);
  const criticalByStrength = highIndicators >= 2 && riskScore >= 85 && authenticity <= 25 && confidence >= 70;
  const hasCriticalEvidence = criticalByCode || criticalByStrength;

  let status: DecisionStatus = 'review_required';
  let reasonCode = 'ambiguous-or-conflicting-signals';

  if (hasCriticalEvidence) {
    status = 'blocked';
    reasonCode = 'critical-evidence-detected';
  } else if (externalDecision === 'manual_review') {
    status = 'review_required';
    reasonCode = 'external-manual-review';
  } else if (!likelyFraud
    && riskScore <= 42
    && authenticity >= 68
    && highIndicators === 0
    && mediumIndicators <= 1
    && (confidence >= 50 || (confidence >= 45 && lowIndicators <= 2))) {
    status = 'validated';
    reasonCode = 'low-risk-consistent-evidence';
  } else if (confidence < 55) {
    status = 'review_required';
    reasonCode = 'insufficient-confidence';
  }

  const calibrationSampleSize = Number(input.calibration?.sampleSize || 0);
  const calibrationEnabled = Boolean(input.calibration?.enabled);
  const calibrationQualified = calibrationEnabled && calibrationSampleSize >= MIN_CASES_FOR_COMPANY_CALIBRATION;

  return {
    status,
    statusLabel: statusLabel(status),
    reasonCode,
    reason: reasonText(reasonCode),
    confidence,
    mode,
    autoEnforced: mode === 'enforced',
    ruleVersion: DECISION_POLICY_VERSION,
    policyScope: calibrationQualified ? 'company-calibrated' : 'global-safe',
    evidence,
    audit: {
      generatedAt: new Date().toISOString(),
      input: {
        authenticityPercentage: authenticity,
        riskScore,
        riskLevel: String(trust.riskLevel || 'unknown'),
        likelyFraud,
        externalDecision,
        highIndicators,
        mediumIndicators,
        lowIndicators,
        calibrationSampleSize,
        calibrationEnabled
      }
    }
  };
}

export function toLegacyFinalDecision(status: DecisionStatus) {
  if (status === 'validated') return 'validado';
  if (status === 'blocked') return 'bloqueado_evidencia_critica';
  return 'revisao_obrigatoria';
}
