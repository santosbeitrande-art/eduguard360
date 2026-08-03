export type TrainingCategory = 'high-risk-fraud' | 'high-authenticity';

export interface TrainingExampleLite {
  companyId: string;
  category: TrainingCategory;
  analysis?: {
    authenticityScore?: number;
    documentType?: string;
    country?: string;
    reviewerConfidence?: number;
  };
}

export interface CalibrationSegmentProfile {
  documentType: string;
  country: string;
  sampleSize: number;
  fraudCount: number;
  authenticCount: number;
  fraudMean: number;
  authenticMean: number;
  threshold: number;
  margin: number;
  confidence: number;
  probabilityThreshold: number;
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
  modelVersion: string;
  probabilityThreshold: number;
  segments: CalibrationSegmentProfile[];
}

export interface CalibrationTrustInput {
  authenticityPercentage: number;
  likelyFraud: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  confidence: number;
  indicators: Array<{ code: string; severity: string; reason: string }>;
  fraudReasons: string[];
  documentType?: string;
  country?: string;
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

function normalizeDocumentType(value: unknown) {
  const text = String(value || 'unknown').trim().toLowerCase();
  return text || 'unknown';
}

function normalizeCountry(value: unknown) {
  const text = String(value || 'ANY').trim().toUpperCase();
  return text || 'ANY';
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function logistic(score: number, threshold: number, margin: number) {
  const scale = Math.max(3, margin * 1.4);
  const z = (score - threshold) / scale;
  return 1 / (1 + Math.exp(z));
}

function buildSegmentProfile(rows: Array<{ category: TrainingCategory; score: number; documentType: string; country: string }>) {
  const fraudScores = rows.filter((item) => item.category === 'high-risk-fraud').map((item) => item.score);
  const authenticScores = rows.filter((item) => item.category === 'high-authenticity').map((item) => item.score);
  if (rows.length < 6 || fraudScores.length < 2 || authenticScores.length < 2) return null;

  const fraudMean = mean(fraudScores);
  const authenticMean = mean(authenticScores);
  const fraudStd = stdDev(fraudScores);
  const authenticStd = stdDev(authenticScores);
  const threshold = clamp(round((fraudMean + authenticMean) / 2), 36, 75);
  const margin = clamp(round((fraudStd + authenticStd) / 2), 3, 14);
  const separation = Math.abs(authenticMean - fraudMean);
  const confidence = clamp(round(
    Math.min(50, rows.length * 3)
      + Math.min(28, separation)
      + Math.min(12, Math.max(0, 12 - margin))
  ), 25, 97);

  const probabilityThreshold = clamp(round(0.52 + ((100 - confidence) / 500), 2), 0.5, 0.7);
  return {
    sampleSize: rows.length,
    fraudCount: fraudScores.length,
    authenticCount: authenticScores.length,
    fraudMean: round(fraudMean, 2),
    authenticMean: round(authenticMean, 2),
    threshold,
    margin,
    confidence,
    probabilityThreshold
  };
}

const MIN_CASES_FOR_COMPANY_CALIBRATION = 8;
const MIN_CLASS_CASES_FOR_COMPANY_CALIBRATION = 3;
const CALIBRATION_MODEL_VERSION = 'calibration-2026.08-probabilistic-v1';

export function buildCalibrationProfile(trainingExamples: TrainingExampleLite[], companyId: string): CalibrationProfile {
  const companyRows = trainingExamples
    .filter((item) => String(item.companyId || '') === String(companyId || ''))
    .filter((item) => Number.isFinite(Number(item?.analysis?.authenticityScore)))
    .map((item) => ({
      category: item.category,
      score: Number(item.analysis?.authenticityScore || 0),
      documentType: normalizeDocumentType(item.analysis?.documentType),
      country: normalizeCountry(item.analysis?.country)
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
      reason: 'insufficient-examples',
      modelVersion: CALIBRATION_MODEL_VERSION,
      probabilityThreshold: 0.58,
      segments: []
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

  const groupMap = new Map<string, Array<{ category: TrainingCategory; score: number; documentType: string; country: string }>>();
  for (const row of companyRows) {
    const key = `${row.documentType}|${row.country}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)?.push(row);
  }

  const segments: CalibrationSegmentProfile[] = [];
  for (const [key, rows] of groupMap.entries()) {
    const built = buildSegmentProfile(rows);
    if (!built) continue;
    const [documentType, country] = key.split('|');
    segments.push({
      documentType: documentType || 'unknown',
      country: country || 'ANY',
      ...built
    });
  }

  segments.sort((a, b) => b.sampleSize - a.sampleSize || a.documentType.localeCompare(b.documentType) || a.country.localeCompare(b.country));

  const probabilityThreshold = clamp(round(0.54 + ((100 - confidence) / 500), 2), 0.5, 0.7);

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
    reason: 'ok',
    modelVersion: CALIBRATION_MODEL_VERSION,
    probabilityThreshold,
    segments
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
    fraudReasons: Array.isArray(input.fraudReasons) ? [...input.fraudReasons] : [],
    documentType: normalizeDocumentType(input.documentType),
    country: normalizeCountry(input.country)
  };

  if (!profile.enabled) {
    return { ...trust, calibration: profile };
  }

  const highCount = trust.indicators.filter((item) => item.severity === 'high').length;
  const mediumCount = trust.indicators.filter((item) => item.severity === 'medium').length;
  const segment = (profile.segments || []).find((item) => item.documentType === trust.documentType && item.country === trust.country)
    || (profile.segments || []).find((item) => item.documentType === trust.documentType && item.country === 'ANY')
    || null;

  const threshold = Number(segment?.threshold ?? profile.threshold);
  const margin = Number(segment?.margin ?? profile.margin);
  const probabilityThreshold = Number(segment?.probabilityThreshold ?? profile.probabilityThreshold ?? 0.58);
  const distance = trust.authenticityPercentage - threshold;
  const estimatedFraudProbability = logistic(trust.authenticityPercentage, threshold, margin);

  let riskShift = 0;
  if (distance >= margin) riskShift -= 8;
  if (distance <= -margin) riskShift += 10;
  if (distance >= margin + 8) riskShift -= 4;
  if (distance <= -(margin + 8)) riskShift += 6;

  if (estimatedFraudProbability >= probabilityThreshold) {
    riskShift += 8;
  } else if (estimatedFraudProbability <= (1 - probabilityThreshold)) {
    riskShift -= 6;
  }

  trust.riskScore = clamp(Math.round(trust.riskScore + riskShift), 0, 100);
  const probabilityCertainty = Math.abs(estimatedFraudProbability - 0.5) * 2;
  const calibrationConfidence = Number(segment?.confidence ?? profile.confidence);
  const confidenceBoost = Math.round(probabilityCertainty * 12);
  trust.confidence = clamp(Math.round((trust.confidence + calibrationConfidence) / 2) + confidenceBoost, 0, 99);

  if (highCount === 0 && mediumCount <= 1 && distance >= margin + 4 && trust.riskScore <= 55 && estimatedFraudProbability < probabilityThreshold) {
    trust.likelyFraud = false;
    trust.riskLevel = trust.riskScore >= 46 ? 'medium' : 'low';
  } else if ((highCount > 0 || mediumCount >= 1) && (distance <= -margin || estimatedFraudProbability >= probabilityThreshold)) {
    trust.likelyFraud = true;
    trust.riskLevel = trust.riskScore >= 72 ? 'high' : 'medium';
  }

  trust.indicators.push({
    code: 'training-calibration',
    severity: 'low',
    reason: `Calibracao probabilistica aplicada (p_fraud=${round(estimatedFraudProbability, 3)}, n=${profile.sampleSize}, threshold=${threshold}, margem=${margin}).`
  });

  trust.fraudReasons = Array.from(new Set(trust.fraudReasons));
  return { ...trust, calibration: profile };
}
