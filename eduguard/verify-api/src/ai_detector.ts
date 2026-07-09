const DEFAULT_TOKENS = [
  'document', 'verify', 'authenticity', 'validation', 'analysis', 'forensic',
  'official', 'certificate', 'university', 'institution', 'organization', 'signature'
];

function tokenize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function countRepeatedBigrams(tokens: string[]) {
  if (tokens.length < 4) return 0;
  const seen = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    seen.set(bigram, (seen.get(bigram) || 0) + 1);
  }
  let repeated = 0;
  for (const value of seen.values()) {
    if (value > 1) repeated += (value - 1);
  }
  return repeated;
}

function countBoilerplateMarkers(text: string) {
  const markers = [
    /lorem ipsum/gi,
    /\btemplate\b/gi,
    /\bdummy\b/gi,
    /gerado por ia/gi,
    /\bchatgpt\b/gi,
    /sample document/gi,
    /for illustration/gi
  ];
  return markers.reduce((acc, regex) => acc + ((text.match(regex) || []).length), 0);
}

export function detectAiStyleDetails(text: string) {
  const tokens = tokenize(text);
  const tokenCount = tokens.length;
  if (!tokenCount) {
    return {
      label: 'unknown' as const,
      score: 0,
      features: {
        tokenCount: 0,
        keywordRatio: 0,
        repetitionRatio: 0,
        bigramRepeatRatio: 0,
        boilerplateRatio: 0
      }
    };
  }

  const keywordHits = tokens.reduce((acc, token) => acc + (DEFAULT_TOKENS.includes(token) ? 1 : 0), 0);
  const uniqueRatio = new Set(tokens).size / tokenCount;
  const repetitionRatio = 1 - uniqueRatio;
  const repeatedBigrams = countRepeatedBigrams(tokens);
  const bigramRepeatRatio = repeatedBigrams / Math.max(1, tokenCount - 1);
  const boilerplateRatio = countBoilerplateMarkers(text.toLowerCase()) / Math.max(1, tokenCount / 25);
  const keywordRatio = keywordHits / Math.max(1, tokenCount);

  // Weighted suspiciousness score tuned for conservative behavior.
  const score = clamp(
    keywordRatio * 0.35
    + repetitionRatio * 0.28
    + bigramRepeatRatio * 0.22
    + clamp(boilerplateRatio, 0, 1) * 0.35
  );

  const label = score >= 0.62
    ? 'likely-ai'
    : score >= 0.38
      ? 'possible-ai'
      : 'likely-human';

  return {
    label,
    score: Math.round(score * 1000) / 1000,
    features: {
      tokenCount,
      keywordRatio: Math.round(keywordRatio * 1000) / 1000,
      repetitionRatio: Math.round(repetitionRatio * 1000) / 1000,
      bigramRepeatRatio: Math.round(bigramRepeatRatio * 1000) / 1000,
      boilerplateRatio: Math.round(boilerplateRatio * 1000) / 1000
    }
  };
}

export function detectAiStyle(text: string) {
  return detectAiStyleDetails(text).label;
}

export default { detectAiStyle, detectAiStyleDetails };
