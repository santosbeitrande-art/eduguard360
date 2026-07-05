import fs from 'fs';
import path from 'path';
import imageSize from 'image-size';
import mime from 'mime-types';
import { detectAiStyle } from './ai_detector';
import { analyzeTextIntelligence } from './document_intelligence';

const SCORE_BASELINE = 42;
const UNIQUE_RATIO_WEIGHT = 28;
const AI_SCORE_WEIGHT = 12;
const DATE_INCONSISTENT_PENALTY = 12;
const DATE_UNKNOWN_PENALTY = 4;

let pdfParse: any = null;
try {
  // optional import; may not be installed in all environments
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  pdfParse = require('pdf-parse');
} catch (e) {
  pdfParse = null;
}

export function analyzeDocument(filePath: string, ocrText?: string) {
  const result: any = { metadata: {}, checks: {}, score: 0 };
  try {
    const stats = fs.statSync(filePath);
    result.metadata.size = stats.size;
    result.metadata.ctime = stats.ctime.toISOString();
    result.metadata.mtime = stats.mtime.toISOString();
    result.metadata.ext = path.extname(filePath).toLowerCase();
    result.metadata.mime = mime.lookup(filePath) || 'unknown';
  } catch (e) {
    result.metadata.error = String(e);
  }

  // Image dimensions when applicable
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif'].includes(ext)) {
      const d = imageSize(filePath as any);
      result.metadata.dimensions = d;
    }
  } catch (e) {
    result.metadata.dimensionsError = String(e);
  }

  // PDF metadata extraction when possible
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf' && pdfParse) {
      const data = fs.readFileSync(filePath);
      // pdf-parse returns metadata and text; keep metadata for forensic checks
      // Note: this is synchronous for prototype; in production use async
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      pdfParse(data).then((pdfRes: any) => {
        result.metadata.pdfInfo = {
          info: pdfRes.info || null,
          metadata: pdfRes.metadata || null,
          numPages: pdfRes.numpages || null
        };
      }).catch((e: any) => {
        result.metadata.pdfError = String(e);
      });
    }
  } catch (e) {
    result.metadata.pdfError = String(e);
  }

  // Simple OCR-based heuristics for AI-generation detection
  const text = (ocrText || '').trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const uniqRatio = words.length ? uniqueWords.size / words.length : 0;
  result.checks.wordCount = words.length;
  result.checks.uniqueRatio = uniqRatio;

  // Additional heuristics
  const punctuationCount = (text.match(/[.,;:!?()"'-]/g) || []).length;
  const avgWordLen = words.length ? Math.round(words.join('').length / words.length) : 0;
  result.checks.punctuationCount = punctuationCount;
  result.checks.avgWordLength = avgWordLen;

  // Heuristic score for AI-like text: low unique ratio, low punctuation, short average words
  let aiScore = 0;
  if (uniqRatio < 0.45) aiScore += 2;
  if (punctuationCount < Math.max(1, words.length / 20)) aiScore += 1;
  if (avgWordLen < 4) aiScore += 1;

  const aiStyle = detectAiStyle(text);
  result.checks.aiStyle = aiStyle;
  const textIntel = analyzeTextIntelligence(text);
  result.checks.documentType = textIntel.extracted.documentType;
  result.checks.extractedFields = textIntel.extracted;
  result.checks.documentFraudIndicators = textIntel.indicators;

  if (words.length < 20) {
    result.checks.aiLikelihood = 'unknown';
  } else if (aiScore >= 3 || aiStyle === 'likely-ai') {
    result.checks.aiLikelihood = 'likely-ai';
  } else if (aiScore >= 1 || aiStyle === 'possible-ai') {
    result.checks.aiLikelihood = 'possible-ai';
  } else {
    result.checks.aiLikelihood = 'likely-human';
  }

  // Simple tampering heuristics (file time vs content dates)
  const dateMatches = text.match(/\b((?:\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})|(?:\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}))\b/g) || [];
  result.checks.ocrDates = dateMatches.slice(0, 5);

  function parseDetectedDate(dateValue: string): number {
    const value = String(dateValue || '').trim();
    if (!value) return NaN;

    if (/^\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}$/.test(value)) {
      const [year, month, day] = value.split(/[-\/.]/).map((chunk) => Number(chunk));
      return Date.UTC(year, month - 1, day);
    }

    if (/^\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}$/.test(value)) {
      const [day, month, year] = value.split(/[-\/.]/).map((chunk) => Number(chunk));
      return Date.UTC(year, month - 1, day);
    }

    return new Date(value).getTime();
  }

  try {
    if (result.metadata.mtime && dateMatches.length) {
      const mtime = new Date(result.metadata.mtime).getTime();
      const firstDate = dateMatches[0];
      if (firstDate) {
        const parsed = parseDetectedDate(firstDate);
        if (!isNaN(parsed)) {
          result.checks.dateConsistency = Math.abs(mtime - parsed) < 1000 * 60 * 60 * 24 * 365 ? 'consistent' : 'inconsistent';
        } else {
          result.checks.dateConsistency = 'unknown';
        }
      }
    }
  } catch (e) {
    result.checks.dateConsistency = 'error';
  }

  // Score calculation: baseline, penalize AI-likelihood and date inconsistencies
  let score = SCORE_BASELINE + Math.floor(uniqRatio * UNIQUE_RATIO_WEIGHT) - aiScore * AI_SCORE_WEIGHT;
  if (result.metadata.dimensions) score += 5;
  if (result.checks.dateConsistency === 'inconsistent') score -= DATE_INCONSISTENT_PENALTY;
  if (result.checks.dateConsistency === 'unknown' && words.length >= 30) score -= DATE_UNKNOWN_PENALTY;
  score -= textIntel.penalty;
  score = Math.max(0, Math.min(100, score));
  result.score = score;

  result.summary = {
    authenticityScore: score,
    aiLikelihood: result.checks.aiLikelihood,
    dateConsistency: result.checks.dateConsistency || 'unknown',
    documentType: result.checks.documentType,
    indicatorCount: (textIntel.indicators || []).length
  };

  return result;
}

export default { analyzeDocument };
