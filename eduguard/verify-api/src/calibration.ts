export type TrainingCategory = 'high-risk-fraud' | 'high-authenticity';

export interface TrainingExampleLite {
  companyId: string;
  category: TrainingCategory;
  analysis?: {
    authenticityScore?: number;
  };
}

export interface CalibrationProfile {
  enabled: boolean;
  companyId: string;
  sampleSize: number;
  fraudCount: number;
  authenticCount: number;
  fraudMean: number | null;
  authenticMean: number | null;
  threshold: number;
  margin: number;
  confidence: number;
  reason: string;
}

export interface CalibrationTrustInput {
  authenticityPercentage: number;
  likelyFraud: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  confidence: number;
  indicators: Array<{ code: string; severity: string; reason: string }>;
  fraudReasons: string[];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((acc, current) => acc + current, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, current) => acc + ((current - m) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

const MIN_CASES_FOR_COMPANY_CALIBRATION = 8;
const MIN_CLASS_CASES_FOR_COMPANY_CALIBRATION = 3;

export function buildCalibrationProfile(trainingExamples: TrainingExampleLite[], companyId: string): CalibrationProfile {
  const companyRows = trainingExamples
    .filter((item) => String(item.companyId || '') === String(companyId || ''))
    .filter((item) => Number.isFinite(Number(item?.analysis?.authenticityScore)))
    .map((item) => ({
      category: item.category,
      score: Number(item.analysis?.authenticityScore || 0)
    }));

  const fraudScores = companyRows.filter((item) => item.category === 'high-risk-fraud').map((item) => item.score);
  const authenticScores = companyRows.filter((item) => item.category === 'high-authenticity').map((item) => item.score);
  const sampleSize = companyRows.length;

  const baselineThreshold = 55;
  if (
    sampleSize < MIN_CASES_FOR_COMPANY_CALIBRATION
    || (fraudScores.length + authenticScores.length) < MIN_CASES_FOR_COMPANY_CALIBRATION
    || fraudScores.length < MIN_CLASS_CASES_FOR_COMPANY_CALIBRATION
    || authenticScores.length < MIN_CLASS_CASES_FOR_COMPANY_CALIBRATION
  ) {
    return {
      enabled: false,
      companyId,
      sampleSize,
      fraudCount: fraudScores.length,
      authenticCount: authenticScores.length,
      fraudMean: fraudScores.length ? Math.round(mean(fraudScores)) : null,
      authenticMean: authenticScores.length ? Math.round(mean(authenticScores)) : null,
      threshold: baselineThreshold,
      margin: 7,
      confidence: 0,
      reason: 'insufficient-examples'
    };
  }

  const fraudMean = fraudScores.length ? mean(fraudScores) : null;
  const authenticMean = authenticScores.length ? mean(authenticScores) : null;
  const fraudStd = stdDev(fraudScores);
  const authenticStd = stdDev(authenticScores);

  let threshold = baselineThreshold;
  if (fraudMean !== null && authenticMean !== null) {
    threshold = (fraudMean + authenticMean) / 2;
  } else if (authenticMean !== null) {
    threshold = authenticMean - 18;
  } else if (fraudMean !== null) {
    threshold = fraudMean + 18;
  }
  threshold = clamp(Math.round(threshold), 38, 72);

  const margin = clamp(Math.round((fraudStd + authenticStd) / 2), 4, 12);
  const separation = (fraudMean !== null && authenticMean !== null) ? Math.abs(authenticMean - fraudMean) : 0;
  const confidence = clamp(
    Math.round(
      Math.min(45, sampleSize * 4)
      + Math.min(30, separation)
      + Math.min(15, Math.max(0, 12 - margin))
    ),
    20,
    95
  );

  return {
    enabled: true,
    companyId,
    sampleSize,
    fraudCount: fraudScores.length,
    authenticCount: authenticScores.length,
    fraudMean: fraudMean !== null ? Math.round(fraudMean) : null,
    authenticMean: authenticMean !== null ? Math.round(authenticMean) : null,
    threshold,
    margin,
    confidence,
    reason: 'ok'
  };
}

export function applyCalibrationToTrust(input: CalibrationTrustInput, profile: CalibrationProfile): CalibrationTrustInput & { calibration: CalibrationProfile } {
  const trust: CalibrationTrustInput = {
    authenticityPercentage: Number(input.authenticityPercentage || 0),
    likelyFraud: Boolean(input.likelyFraud),
    riskLevel: input.riskLevel,
    riskScore: Number(input.riskScore || 0),
    confidence: Number(input.confidence || 0),
    indicators: Array.isArray(input.indicators) ? [...input.indicators] : [],
    fraudReasons: Array.isArray(input.fraudReasons) ? [...input.fraudReasons] : []
  };

  if (!profile.enabled) {
    return { ...trust, calibration: profile };
  }

  const highCount = trust.indicators.filter((item) => item.severity === 'high').length;
  const mediumCount = trust.indicators.filter((item) => item.severity === 'medium').length;
  const distance = trust.authenticityPercentage - profile.threshold;

  let riskShift = 0;
  if (distance >= profile.margin) riskShift -= 8;
  if (distance <= -profile.margin) riskShift += 10;
  if (distance >= profile.margin + 8) riskShift -= 4;
  if (distance <= -(profile.margin + 8)) riskShift += 6;

  trust.riskScore = clamp(Math.round(trust.riskScore + riskShift), 0, 100);
  trust.confidence = clamp(Math.round((trust.confidence + profile.confidence) / 2), 0, 99);

  if (highCount === 0 && mediumCount <= 1 && distance >= profile.margin + 4 && trust.riskScore <= 55) {
    trust.likelyFraud = false;
    trust.riskLevel = trust.riskScore >= 46 ? 'medium' : 'low';
  } else if ((highCount > 0 || mediumCount >= 1) && distance <= -profile.margin) {
    trust.likelyFraud = true;
    trust.riskLevel = trust.riskScore >= 72 ? 'high' : 'medium';
  }

  trust.indicators.push({
    code: 'training-calibration',
    severity: 'low',
    reason: `Calibracao por historico da empresa aplicada (n=${profile.sampleSize}, threshold=${profile.threshold}, margem=${profile.margin}).`
  });

  trust.fraudReasons = Array.from(new Set(trust.fraudReasons));
  return { ...trust, calibration: profile };
}
