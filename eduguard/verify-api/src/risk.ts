export interface FraudIndicator {
  code: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
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
  const score = Number(forensic?.summary?.authenticityScore ?? forensic?.score ?? 0);

  const likelyFraud = highCount > 0
    || mediumCount >= 2
    || score <= 50
    || (mediumCount >= 1 && score <= 65);

  const riskLevel = highCount > 0 || score <= 40
    ? 'high'
    : likelyFraud
      ? 'medium'
      : 'low';

  return {
    likelyFraud,
    riskLevel,
    indicators,
    reasons
  };
}

export default { evaluateFraudRisk };
