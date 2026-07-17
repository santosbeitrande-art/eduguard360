export interface FraudIndicator {
  code: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function evaluateFraudRisk(forensic: any, contextual: any) {
  const reasons: string[] = [];
  const indicators: FraudIndicator[] = [];

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

  const intelIndicators = Array.isArray(forensic?.checks?.documentFraudIndicators)
    ? forensic.checks.documentFraudIndicators
    : [];

  for (const item of intelIndicators) {
    if (item?.code && item?.severity && item?.reason) {
      indicators.push({ code: item.code, severity: item.severity, reason: item.reason });
      reasons.push(item.reason);
    }
  }

  const metadataIndicators = Array.isArray(forensic?.checks?.metadataIndicators)
    ? forensic.checks.metadataIndicators
    : [];

  for (const item of metadataIndicators) {
    if (item?.code && item?.severity && item?.reason) {
      indicators.push({ code: item.code, severity: item.severity, reason: item.reason });
      reasons.push(item.reason);
    }
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

  const highCount = indicators.filter((item) => item.severity === 'high').length;
  const mediumCount = indicators.filter((item) => item.severity === 'medium').length;
  const lowCount = indicators.filter((item) => item.severity === 'low').length;
  const score = Number(forensic?.summary?.authenticityScore ?? forensic?.score ?? 0);
  const aiLikelihood = String(forensic?.checks?.aiLikelihood || forensic?.summary?.aiLikelihood || 'unknown');
  const dateConsistency = String(forensic?.checks?.dateConsistency || forensic?.summary?.dateConsistency || 'unknown');
  const corroborationStrength = Math.min(1, (contextualDomains * 0.35) + (contextualEmails * 0.5));

  let riskScore = 100 - score;
  riskScore += highCount * 20 + mediumCount * 9 + lowCount * 3;
  if (aiLikelihood === 'likely-ai') riskScore += 10;
  else if (aiLikelihood === 'possible-ai') riskScore += 4;
  if (dateConsistency === 'inconsistent') riskScore += 12;
  else if (dateConsistency === 'unknown') riskScore += 3;
  riskScore -= Math.round(corroborationStrength * 10);
  riskScore = clamp(riskScore);

  const likelyFraudBySignals = highCount > 0
    || mediumCount >= 2
    || score <= 50
    || (mediumCount >= 1 && score <= 65);
  const likelyFraud = likelyFraudBySignals || riskScore >= 56;

  const riskLevel = riskScore >= 72
    ? 'high'
    : riskScore >= 46
      ? 'medium'
      : 'low';

  const confidence = clamp(
    35
      + highCount * 15
      + mediumCount * 8
      + Math.min(10, lowCount * 2)
      + Math.round(corroborationStrength * 10)
      + (dateConsistency === 'inconsistent' ? 8 : 0)
      + (aiLikelihood === 'likely-ai' ? 6 : aiLikelihood === 'possible-ai' ? 3 : 0),
    0,
    99
  );

  return {
    likelyFraud,
    riskLevel,
    riskScore,
    confidence,
    indicators,
    reasons
  };
}

export default { evaluateFraudRisk };
