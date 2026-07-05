import fs from 'fs';
import path from 'path';

const DEFAULT_TOKENS = [
  'document', 'verify', 'authenticity', 'validation', 'analysis', 'forensic',
  'official', 'certificate', 'university', 'institution', 'organization', 'signature'
];

function tokenize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

export function detectAiStyle(text: string) {
  const tokens = tokenize(text);
  const score = tokens.reduce((acc, token) => {
    if (DEFAULT_TOKENS.includes(token)) acc += 1;
    return acc;
  }, 0);
  const repetition = tokens.length > 0 ? new Set(tokens).size / tokens.length : 0;
  const aiScore = Math.min(1, Math.round((score / Math.max(1, tokens.length)) * 10) / 10 + (repetition < 0.4 ? 0.2 : 0));
  if (aiScore >= 0.6) return 'likely-ai';
  if (aiScore >= 0.35) return 'possible-ai';
  return 'likely-human';
}

export default { detectAiStyle };
