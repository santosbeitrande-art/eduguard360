export type Severity = 'low' | 'medium' | 'high';

export interface RiskIndicator {
  code: string;
  severity: Severity;
  reason: string;
}

export interface ExtractedFields {
  documentType: 'identity' | 'income-statement' | 'bank-statement' | 'residence-proof' | 'unknown';
  fullNames: string[];
  idNumbers: string[];
  nuits: string[];
  employers: string[];
  accountNumbers: string[];
  ibanLike: string[];
  dates: string[];
  amounts: number[];
  emails: string[];
  phones: string[];
}

export interface TextIntelligenceResult {
  extracted: ExtractedFields;
  indicators: RiskIndicator[];
  penalty: number;
}

export interface CaseDocumentInput {
  fileName: string;
  text: string;
  forensicScore: number;
  extracted: ExtractedFields;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeIdentityValue(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function parseMoney(value: string): number | null {
  const cleaned = value.replace(/\s/g, '');
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;

  if (hasComma && hasDot) {
    const commaPos = cleaned.lastIndexOf(',');
    const dotPos = cleaned.lastIndexOf('.');
    if (commaPos > dotPos) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function detectDocumentType(text: string): ExtractedFields['documentType'] {
  const lower = text.toLowerCase();
  if (/bilhete de identidade|identity card|id card|documento de identidade|passaporte/.test(lower)) {
    return 'identity';
  }
  if (/declara[çc][aã]o de rendimentos|sal[aá]rio|vencimento|entidade patronal|empregador/.test(lower)) {
    return 'income-statement';
  }
  if (/extrat[o|a] banc[aá]ri[o|a]|movimentos|saldo anterior|saldo dispon[ií]vel|nib|iban/.test(lower)) {
    return 'bank-statement';
  }
  if (/declara[çc][aã]o de resid[eê]ncia|comprovativo de resid[eê]ncia|bairro|quarteir[aã]o/.test(lower)) {
    return 'residence-proof';
  }
  return 'unknown';
}

function parseDate(dateText: string): number | null {
  const cleaned = dateText.trim();
  if (!cleaned) return null;

  if (/^\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}$/.test(cleaned)) {
    const [year, month, day] = cleaned.split(/[\/.\-]/).map((chunk) => Number(chunk));
    const ts = Date.UTC(year, month - 1, day);
    return Number.isFinite(ts) ? ts : null;
  }

  if (/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split(/[\/.\-]/).map((chunk) => Number(chunk));
    const ts = Date.UTC(year, month - 1, day);
    return Number.isFinite(ts) ? ts : null;
  }

  const fallback = new Date(cleaned).getTime();
  return Number.isFinite(fallback) ? fallback : null;
}

function extractValues(text: string): ExtractedFields {
  const docType = detectDocumentType(text);

  const fullNames = unique(
    Array.from(text.matchAll(/(?:nome|titular|benefici[aá]rio|cliente)\s*[:\-]\s*([A-ZÀ-ÿ][A-ZÀ-ÿ'\-\s]{5,80})/gim)).map(
      (match) => match[1]
    )
  );

  const employers = unique(
    Array.from(text.matchAll(/(?:entidade patronal|empregador|empresa)\s*[:\-]\s*([A-ZÀ-ÿ0-9&.'\-\s]{2,80})/gim)).map(
      (match) => match[1]
    )
  );

  const idNumbers = unique(
    Array.from(text.matchAll(/\b([A-Z]{0,2}\d{6,14}[A-Z]{0,2})\b/gim))
      .map((match) => match[1])
      .filter((value) => /\d/.test(value) && value.length >= 8)
  );

  const nuits = unique(Array.from(text.matchAll(/\b(\d{9})\b/gm)).map((match) => match[1]));

  const accountNumbers = unique(Array.from(text.matchAll(/\b(\d{10,21})\b/gm)).map((match) => match[1]));
  const ibanLike = unique(Array.from(text.matchAll(/\b([A-Z]{2}\d{2}[A-Z0-9]{8,30})\b/gm)).map((match) => match[1]));
  const dates = unique(
    Array.from(text.matchAll(/\b((?:\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})|(?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}))\b/gm)).map(
      (match) => match[1]
    )
  );

  const amounts = Array.from(
    text.matchAll(/(?:MZN|MT|USD|EUR)?\s*(\d{1,3}(?:[\.\s]\d{3})*(?:,\d{2})|\d+(?:[\.,]\d{2}))/gim)
  )
    .map((match) => parseMoney(match[1]))
    .filter((value): value is number => value !== null)
    .filter((value) => value > 0);

  const emails = unique(Array.from(text.matchAll(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gim)).map((match) => match[1]));
  const phones = unique(Array.from(text.matchAll(/\b(?:\+?258)?\s?(8[2-7]\d{7})\b/gm)).map((match) => match[1]));

  return {
    documentType: docType,
    fullNames,
    idNumbers,
    nuits,
    employers,
    accountNumbers,
    ibanLike,
    dates,
    amounts,
    emails,
    phones
  };
}

export function analyzeTextIntelligence(text: string): TextIntelligenceResult {
  const extracted = extractValues(text || '');
  const indicators: RiskIndicator[] = [];

  const trimmed = (text || '').trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 15) {
    indicators.push({
      code: 'too-little-content',
      severity: 'high',
      reason: 'Conteudo textual muito curto para validar autenticidade com confianca.'
    });
  }

  if (/(modelo|template|sample|exemplo fict[ií]cio|dummy|lorem ipsum|gerado por ia|chatgpt)/i.test(trimmed)) {
    indicators.push({
      code: 'template-like-content',
      severity: 'high',
      reason: 'Texto contem marcadores de modelo, amostra ou geracao artificial.'
    });
  }

  if (/(.)\1{6,}/.test(trimmed)) {
    indicators.push({
      code: 'character-repetition',
      severity: 'medium',
      reason: 'Repeticao anormal de caracteres pode indicar adulteracao ou OCR degradado.'
    });
  }

  if (extracted.documentType === 'identity' && extracted.idNumbers.length === 0) {
    indicators.push({
      code: 'missing-id-number',
      severity: 'high',
      reason: 'Documento de identidade sem numero identificador reconhecivel.'
    });
  }

  if (extracted.documentType === 'income-statement') {
    if (extracted.employers.length === 0) {
      indicators.push({
        code: 'missing-employer',
        severity: 'high',
        reason: 'Declaracao de rendimentos sem entidade patronal identificada.'
      });
    }
    if (extracted.amounts.length === 0) {
      indicators.push({
        code: 'missing-income-values',
        severity: 'medium',
        reason: 'Declaracao de rendimentos sem valores monetarios extraiveis.'
      });
    }
  }

  if (extracted.documentType === 'bank-statement' && extracted.accountNumbers.length === 0 && extracted.ibanLike.length === 0) {
    indicators.push({
      code: 'missing-bank-identifiers',
      severity: 'high',
      reason: 'Extrato bancario sem conta, NIB ou IBAN identificavel.'
    });
  }

  const high = indicators.filter((indicator) => indicator.severity === 'high').length;
  const medium = indicators.filter((indicator) => indicator.severity === 'medium').length;
  const low = indicators.filter((indicator) => indicator.severity === 'low').length;
  const penalty = high * 18 + medium * 8 + low * 3;

  return { extracted, indicators, penalty };
}

export function analyzeCaseDocuments(documents: CaseDocumentInput[]) {
  const indicators: RiskIndicator[] = [];

  function compareField(
    field: keyof Pick<ExtractedFields, 'fullNames' | 'idNumbers' | 'nuits' | 'employers'>,
    code: string,
    severity: Severity,
    description: string
  ) {
    const source = new Map<string, string[]>();
    for (const doc of documents) {
      const values = doc.extracted[field] as string[];
      for (const value of values) {
        const norm = normalizeIdentityValue(value);
        if (!norm) continue;
        const current = source.get(norm) || [];
        current.push(doc.fileName);
        source.set(norm, current);
      }
    }
    if (source.size > 1) {
      const values = Array.from(source.keys()).slice(0, 4).join(', ');
      indicators.push({
        code,
        severity,
        reason: `${description}. Valores conflitantes: ${values}`
      });
    }
  }

  compareField('fullNames', 'name-mismatch', 'medium', 'Nome divergente entre documentos');
  compareField('idNumbers', 'id-mismatch', 'high', 'Numero de identificacao divergente entre documentos');
  compareField('nuits', 'nuit-mismatch', 'high', 'NUIT divergente entre documentos');
  compareField('employers', 'employer-mismatch', 'medium', 'Entidade patronal inconsistente no dossier');

  const bankDocuments = documents.filter((doc) => doc.extracted.documentType === 'bank-statement');
  const incomeDocuments = documents.filter((doc) => doc.extracted.documentType === 'income-statement');

  if (bankDocuments.length) {
    const allDates = bankDocuments.flatMap((doc) => doc.extracted.dates.map((value) => parseDate(value)).filter((value): value is number => value !== null));
    if (allDates.length) {
      const mostRecentDate = Math.max(...allDates);
      const ageDays = (Date.now() - mostRecentDate) / (1000 * 60 * 60 * 24);
      if (ageDays > 185) {
        indicators.push({
          code: 'outdated-bank-statement',
          severity: 'medium',
          reason: 'Extrato bancario aparentemente desatualizado para avaliacao de credito.'
        });
      }
    }
  }

  if (bankDocuments.length && incomeDocuments.length) {
    const incomeValues = incomeDocuments.flatMap((doc) => doc.extracted.amounts).filter((value) => value > 0);
    const bankValues = bankDocuments.flatMap((doc) => doc.extracted.amounts).filter((value) => value > 0);
    if (incomeValues.length && bankValues.length) {
      const declaredIncome = Math.max(...incomeValues);
      const observedBankMedian = median(bankValues);
      if (declaredIncome > 0) {
        const ratio = observedBankMedian / declaredIncome;
        if (ratio < 0.35 || ratio > 3) {
          indicators.push({
            code: 'income-bank-inconsistency',
            severity: 'medium',
            reason: 'Valores declarados de rendimento nao sao coerentes com o padrao financeiro observado.'
          });
        }
      }
    }
  }

  const averageForensic = documents.length
    ? Math.round(documents.reduce((acc, doc) => acc + doc.forensicScore, 0) / documents.length)
    : 0;
  const high = indicators.filter((item) => item.severity === 'high').length;
  const medium = indicators.filter((item) => item.severity === 'medium').length;
  const penalty = high * 15 + medium * 7;
  const caseScore = Math.max(0, Math.min(100, averageForensic - penalty));

  return {
    indicators,
    score: caseScore,
    averageForensic,
    summary: {
      totalDocuments: documents.length,
      conflicts: indicators.length,
      highSeverity: high,
      mediumSeverity: medium
    }
  };
}
