import type { CalibrationProfile } from './calibration';

export type DecisionStatus = 'validated' | 'review_required' | 'blocked';
export type PolicyMode = 'recommendation' | 'enforced';
export type DecisionOutcome =
  | 'document_authentic'
  | 'document_likely_authentic'
  | 'human_review_recommended'
  | 'document_likely_fraudulent'
  | 'fraud_confirmed';
export type DecisionApproval = 'approve' | 'approve_with_review' | 'reject';

export interface DecisionEvidence {
  code: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

export interface AuditableDecision {
  status: DecisionStatus;
  statusLabel: string;
  outcome: DecisionOutcome;
  approval: DecisionApproval;
  approvalLabel: string;
  reasonCode: string;
  reason: string;
  justification: string;
  confidence: number;
  riskScore: number;
  mode: PolicyMode;
  autoEnforced: boolean;
  ruleVersion: string;
  policyScope: 'global-safe' | 'company-calibrated';
  evidence: DecisionEvidence[];
  verificationSummary: {
    performed: number;
    passed: number;
    warning: number;
    failed: number;
  };
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
  verificationSummary?: {
    performed: number;
    passed: number;
    warning: number;
    failed: number;
  } | null;
}

export const DECISION_POLICY_VERSION = 'verify-policy-2026.07-v1';
export const MIN_CASES_FOR_COMPANY_CALIBRATION = 8;
const BASELINE_VERIFICATION_CHECKS = 10;
const AUTO_APPROVE_RISK_MAX = 12;
const LIKELY_AUTHENTIC_RISK_MAX = 45;
const BLOCK_RISK_MIN = 75;
const FRAUD_CONFIRMED_RISK_MIN = 95;

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

function outcomeLabel(outcome: DecisionOutcome) {
  if (outcome === 'document_authentic') return 'Documento Autentico';
  if (outcome === 'document_likely_authentic') return 'Documento Provavelmente Autentico';
  if (outcome === 'document_likely_fraudulent') return 'Documento Provavelmente Fraudulento';
  if (outcome === 'fraud_confirmed') return 'Fraude Confirmada';
  return 'Revisao Humana Recomendada';
}

function approvalLabel(approval: DecisionApproval) {
  if (approval === 'approve') return 'Sim.';
  if (approval === 'approve_with_review') return 'Sim, mas recomenda-se revisao.';
  return 'Nao. Existe forte probabilidade de fraude.';
}

function reasonText(reasonCode: string) {
  if (reasonCode === 'critical-evidence-detected') {
    return 'Bloqueado por evidencias criticas e deterministicas de fraude/adulteracao.';
  }
  if (reasonCode === 'high-risk-fraud-pattern') {
    return 'Padrao de alto risco com multiplos sinais de fraude e baixa autenticidade.';
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

function summarizeEvidence(evidence: DecisionEvidence[]) {
  return evidence
    .slice(0, 3)
    .map((item) => item.reason)
    .filter(Boolean)
    .join(' ');
}

function buildVerificationSummary(params: {
  evidenceCount: number;
  highIndicators: number;
  mediumIndicators: number;
  lowIndicators: number;
  riskScore: number;
  externalDecision: string;
}) {
  const externalChecks = params.externalDecision !== 'internal_only' ? 1 : 0;
  const performed = BASELINE_VERIFICATION_CHECKS + params.evidenceCount + externalChecks;
  let failed = params.highIndicators;
  if (params.riskScore >= 90) failed += 1;
  let warning = params.mediumIndicators + params.lowIndicators;
  if (params.externalDecision === 'manual_review') warning += 1;
  if (failed + warning > performed) {
    warning = Math.max(0, performed - failed);
  }
  const passed = Math.max(0, performed - failed - warning);
  return { performed, passed, warning, failed };
}

function decideOutcome(params: {
  status: DecisionStatus;
  reasonCode: string;
  authenticity: number;
  riskScore: number;
  confidence: number;
  highIndicators: number;
  mediumIndicators: number;
  criticalByCode: boolean;
}) {
  const {
    status,
    reasonCode,
    authenticity,
    riskScore,
    confidence,
    highIndicators,
    mediumIndicators,
    criticalByCode
  } = params;

  if (status === 'validated') {
    if (riskScore <= AUTO_APPROVE_RISK_MAX && authenticity >= 88 && confidence >= 80 && highIndicators === 0 && mediumIndicators === 0) {
      return { outcome: 'document_authentic' as DecisionOutcome, approval: 'approve' as DecisionApproval };
    }
    return { outcome: 'document_likely_authentic' as DecisionOutcome, approval: 'approve' as DecisionApproval };
  }

  if (status === 'blocked') {
    if (criticalByCode || (reasonCode === 'critical-evidence-detected' && riskScore >= FRAUD_CONFIRMED_RISK_MIN && confidence >= 72 && authenticity <= 25)) {
      return { outcome: 'fraud_confirmed' as DecisionOutcome, approval: 'reject' as DecisionApproval };
    }
    return { outcome: 'document_likely_fraudulent' as DecisionOutcome, approval: 'reject' as DecisionApproval };
  }

  return { outcome: 'human_review_recommended' as DecisionOutcome, approval: 'approve_with_review' as DecisionApproval };
}

function buildJustification(params: {
  outcome: DecisionOutcome;
  verificationSummary: { performed: number; passed: number; warning: number; failed: number };
  authenticity: number;
  riskScore: number;
  confidence: number;
  evidence: DecisionEvidence[];
  fallbackReason: string;
}) {
  const evidenceSummary = summarizeEvidence(params.evidence);
  if (params.outcome === 'document_authentic') {
    return `O documento foi considerado autentico porque o risco calculado e baixo (${params.riskScore}%), a autenticidade estimada e ${params.authenticity}% e ${params.verificationSummary.passed} de ${params.verificationSummary.performed} verificacoes ficaram consistentes sem sinais criticos.`;
  }
  if (params.outcome === 'document_likely_authentic') {
    return `O documento foi considerado provavelmente autentico porque a maioria das verificacoes passou (${params.verificationSummary.passed}/${params.verificationSummary.performed}), a autenticidade estimada e ${params.authenticity}% e nao existem evidencias criticas. ${evidenceSummary || params.fallbackReason}`.trim();
  }
  if (params.outcome === 'human_review_recommended') {
    return `A analise encontrou sinais ambiguos ou validacoes pendentes. ${params.verificationSummary.warning} verificacoes requerem atencao adicional, o risco calculado e ${params.riskScore}% e a confianca da IA e ${params.confidence}%. ${evidenceSummary || params.fallbackReason}`.trim();
  }
  if (params.outcome === 'document_likely_fraudulent') {
    return `Foram encontrados indicios relevantes de adulteracao ou incoerencia. ${params.verificationSummary.failed} verificacoes falharam, o risco calculado e ${params.riskScore}% e a autenticidade estimada caiu para ${params.authenticity}%. ${evidenceSummary || params.fallbackReason}`.trim();
  }
  return `A fraude foi considerada confirmada porque existem evidencias criticas e deterministicas, ${params.verificationSummary.failed} verificacoes falharam e o risco calculado atingiu ${params.riskScore}%. ${evidenceSummary || params.fallbackReason}`.trim();
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
  const criticalByStrength = highIndicators >= 2 && riskScore >= 82 && authenticity <= 25 && confidence >= 65;
  const hasCriticalEvidence = criticalByCode || criticalByStrength;
  const elevatedFraudPattern = !hasCriticalEvidence
    && likelyFraud
    && riskScore >= BLOCK_RISK_MIN
    && authenticity <= 40
    && confidence >= 60
    && (highIndicators >= 1 || mediumIndicators >= 3);

  let status: DecisionStatus = 'review_required';
  let reasonCode = 'ambiguous-or-conflicting-signals';

  if (hasCriticalEvidence) {
    status = 'blocked';
    reasonCode = 'critical-evidence-detected';
  } else if (elevatedFraudPattern) {
    status = 'blocked';
    reasonCode = 'high-risk-fraud-pattern';
  } else if (externalDecision === 'manual_review') {
    status = 'review_required';
    reasonCode = 'external-manual-review';
  } else if (!likelyFraud
    && riskScore <= LIKELY_AUTHENTIC_RISK_MAX
    && authenticity >= 70
    && highIndicators === 0
    && mediumIndicators <= 2
    && (confidence >= 50 || (confidence >= 45 && lowIndicators <= 2))) {
    status = 'validated';
    reasonCode = 'low-risk-consistent-evidence';
  } else if (riskScore >= BLOCK_RISK_MIN
    && (likelyFraud || highIndicators >= 1 || mediumIndicators >= 3)
    && authenticity <= 55
    && confidence >= 58) {
    status = 'blocked';
    reasonCode = 'high-risk-fraud-pattern';
  } else if (confidence < 55) {
    status = 'review_required';
    reasonCode = 'insufficient-confidence';
  }

  const calibrationSampleSize = Number(input.calibration?.sampleSize || 0);
  const calibrationEnabled = Boolean(input.calibration?.enabled);
  const calibrationQualified = calibrationEnabled && calibrationSampleSize >= MIN_CASES_FOR_COMPANY_CALIBRATION;
  const verificationSummary = input.verificationSummary || buildVerificationSummary({
    evidenceCount: evidence.length,
    highIndicators,
    mediumIndicators,
    lowIndicators,
    riskScore,
    externalDecision
  });
  const routed = decideOutcome({
    status,
    reasonCode,
    authenticity,
    riskScore,
    confidence,
    highIndicators,
    mediumIndicators,
    criticalByCode
  });
  const reason = reasonText(reasonCode);
  const justification = buildJustification({
    outcome: routed.outcome,
    verificationSummary,
    authenticity,
    riskScore,
    confidence,
    evidence,
    fallbackReason: reason
  });

  return {
    status,
    statusLabel: outcomeLabel(routed.outcome),
    outcome: routed.outcome,
    approval: routed.approval,
    approvalLabel: approvalLabel(routed.approval),
    reasonCode,
    reason,
    justification,
    confidence,
    riskScore,
    mode,
    autoEnforced: mode === 'enforced',
    ruleVersion: DECISION_POLICY_VERSION,
    policyScope: calibrationQualified ? 'company-calibrated' : 'global-safe',
    evidence,
    verificationSummary,
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
