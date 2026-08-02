export interface WeightedIndicatorInput {
  code: string;
  severity: 'low' | 'medium' | 'high';
  deterministic?: boolean;
}

export interface WeightedDecisionInput {
  authenticityScore: number;
  indicatorInputs: WeightedIndicatorInput[];
  aiLikelihood: string;
  dateConsistency: string;
  contextualDomains: number;
  contextualEmails: number;
}

export interface WeightedDecisionSignals {
  authenticityScore: number;
  fraudPressureScore: number;
  uncertaintyScore: number;
  adjustedRiskScore: number;
}

const SEVERITY_WEIGHTS: Record<'low' | 'medium' | 'high', number> = {
  low: 4,
  medium: 11,
  high: 23
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLikelihood(value: string) {
  return String(value || '').trim().toLowerCase();
}

function normalizeConsistency(value: string) {
  return String(value || '').trim().toLowerCase();
}

function isDeterministicByCode(code: string) {
  const normalized = String(code || '').toLowerCase();
  return normalized.includes('critical')
    || normalized.includes('tamper')
    || normalized.includes('forged')
    || normalized.includes('invalid-signature')
    || normalized.includes('qr-mismatch')
    || normalized.includes('id-mismatch')
    || normalized.includes('nuit-mismatch');
}

export function computeWeightedDecisionSignals(input: WeightedDecisionInput): WeightedDecisionSignals {
  const authenticityScore = clamp(Number(input.authenticityScore || 0));
  const indicatorInputs = Array.isArray(input.indicatorInputs) ? input.indicatorInputs : [];
  const aiLikelihood = normalizeLikelihood(input.aiLikelihood);
  const dateConsistency = normalizeConsistency(input.dateConsistency);
  const contextualDomains = Math.max(0, Number(input.contextualDomains || 0));
  const contextualEmails = Math.max(0, Number(input.contextualEmails || 0));

  let fraudPressure = 0;
  let uncertainty = 0;

  for (const indicator of indicatorInputs) {
    const severity = indicator.severity in SEVERITY_WEIGHTS ? indicator.severity : 'low';
    const baseWeight = SEVERITY_WEIGHTS[severity];
    const deterministic = Boolean(indicator.deterministic) || isDeterministicByCode(indicator.code);
    const deterministicMultiplier = deterministic ? 1.45 : 1;
    const contribution = baseWeight * deterministicMultiplier;

    fraudPressure += contribution;
    if (!deterministic && severity !== 'high') {
      uncertainty += baseWeight * 0.4;
    }
  }

  if (aiLikelihood === 'likely-ai') {
    fraudPressure += 12;
    uncertainty += 6;
  } else if (aiLikelihood === 'possible-ai') {
    fraudPressure += 5;
    uncertainty += 4;
  }

  if (dateConsistency === 'inconsistent') {
    fraudPressure += 14;
  } else if (dateConsistency === 'unknown') {
    uncertainty += 6;
  }

  const contextualStrength = Math.min(1, (contextualDomains * 0.35) + (contextualEmails * 0.5));
  fraudPressure -= contextualStrength * 7;
  uncertainty -= contextualStrength * 4;

  const authenticityPenalty = (100 - authenticityScore) * 0.58;
  const adjustedRiskScore = clamp(authenticityPenalty + fraudPressure + (uncertainty * 0.35));

  return {
    authenticityScore,
    fraudPressureScore: clamp(fraudPressure),
    uncertaintyScore: clamp(uncertainty),
    adjustedRiskScore
  };
}
