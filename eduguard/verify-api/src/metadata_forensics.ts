import fs from 'fs';

export interface MetadataIndicator {
  code: string;
  severity: 'low' | 'medium';
  reason: string;
}

export interface PdfMetadata {
  producer?: string;
  creator?: string;
  creationDate?: string;
  modDate?: string;
}

export interface ImageMetadata {
  software?: string;
  make?: string;
  model?: string;
  dateTimeOriginal?: string;
  createDate?: string;
  modifyDate?: string;
}

export interface OfficeMetadata {
  application?: string;
  created?: string;
  modified?: string;
  lastModifiedBy?: string;
}

export interface FormatMetadata {
  format: 'pdf' | 'image' | 'office' | 'other';
  pdf?: PdfMetadata;
  image?: ImageMetadata;
  office?: OfficeMetadata;
}

export interface MetadataForensicsInput {
  ext: string;
  text: string;
  documentType: string;
  employers: string[];
  ocrDates: string[];
  fileMtime?: string;
  metadata: FormatMetadata;
}

const SUSPICIOUS_EDITOR_NAMES = [
  'canva', 'photoshop', 'gimp', 'snapseed', 'lightroom', 'pixlr', 'ilovepdf', 'smallpdf'
];

function normalize(value: unknown) {
  return String(value || '').trim();
}

function firstMatch(content: string, regex: RegExp) {
  const match = content.match(regex);
  return match?.[1] ? String(match[1]).trim() : '';
}

function parseIsoLike(input: string): number {
  const value = normalize(input);
  if (!value) return NaN;

  const pdfDate = value.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/i);
  if (pdfDate) {
    const year = Number(pdfDate[1]);
    const month = Number(pdfDate[2]);
    const day = Number(pdfDate[3]);
    const hour = Number(pdfDate[4] || '0');
    const minute = Number(pdfDate[5] || '0');
    const second = Number(pdfDate[6] || '0');
    return Date.UTC(year, month - 1, day, hour, minute, second);
  }

  const exifDate = value.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (exifDate) {
    const year = Number(exifDate[1]);
    const month = Number(exifDate[2]);
    const day = Number(exifDate[3]);
    const hour = Number(exifDate[4]);
    const minute = Number(exifDate[5]);
    const second = Number(exifDate[6]);
    return Date.UTC(year, month - 1, day, hour, minute, second);
  }

  if (/^\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}$/.test(value)) {
    const [year, month, day] = value.split(/[-\/.]/).map((item) => Number(item));
    return Date.UTC(year, month - 1, day);
  }

  if (/^\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}$/.test(value)) {
    const [day, month, year] = value.split(/[-\/.]/).map((item) => Number(item));
    return Date.UTC(year, month - 1, day);
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isFormalDocumentContext(input: MetadataForensicsInput) {
  const docType = normalize(input.documentType).toLowerCase();
  if (['identity', 'income-statement', 'bank-statement', 'residence-proof'].includes(docType)) return true;

  if ((input.employers || []).length > 0) return true;

  const lowerText = normalize(input.text).toLowerCase();
  return /ministerio|ministry|governo|government|banco|bank|universidade|university|instituto/.test(lowerText);
}

function containsSuspiciousEditor(value: string) {
  const lower = normalize(value).toLowerCase();
  if (!lower) return false;
  return SUSPICIOUS_EDITOR_NAMES.some((token) => lower.includes(token));
}

function pickMostRelevantDate(values: string[]) {
  for (const value of values) {
    const parsed = parseIsoLike(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

function daysDiff(a: number, b: number) {
  return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

export function extractFormatMetadata(filePath: string, ext: string): FormatMetadata {
  const normalizedExt = normalize(ext).toLowerCase();

  if (normalizedExt === '.pdf') {
    try {
      const raw = fs.readFileSync(filePath);
      const latin1 = raw.toString('latin1');
      return {
        format: 'pdf',
        pdf: {
          producer: firstMatch(latin1, /\/Producer\s*\(([^)]+)\)/i),
          creator: firstMatch(latin1, /\/Creator\s*\(([^)]+)\)/i),
          creationDate: firstMatch(latin1, /\/CreationDate\s*\(([^)]+)\)/i),
          modDate: firstMatch(latin1, /\/ModDate\s*\(([^)]+)\)/i)
        }
      };
    } catch {
      return { format: 'pdf', pdf: {} };
    }
  }

  if (['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp', '.bmp'].includes(normalizedExt)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const exifParser = require('exif-parser');
      const raw = fs.readFileSync(filePath);
      const parsed = exifParser.create(raw).parse();
      const tags = parsed?.tags || {};

      const toExifDate = (value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          const ms = value < 10000000000 ? value * 1000 : value;
          return new Date(ms).toISOString();
        }
        return normalize(value);
      };

      return {
        format: 'image',
        image: {
          software: normalize(tags.Software),
          make: normalize(tags.Make),
          model: normalize(tags.Model),
          dateTimeOriginal: toExifDate(tags.DateTimeOriginal),
          createDate: toExifDate(tags.CreateDate),
          modifyDate: toExifDate(tags.ModifyDate)
        }
      };
    } catch {
      return { format: 'image', image: {} };
    }
  }

  if (normalizedExt === '.docx') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(filePath);
      const coreEntry = zip.getEntry('docProps/core.xml');
      const appEntry = zip.getEntry('docProps/app.xml');

      const coreXml = coreEntry ? String(coreEntry.getData().toString('utf8')) : '';
      const appXml = appEntry ? String(appEntry.getData().toString('utf8')) : '';

      const extractTag = (xml: string, tag: string) => firstMatch(xml, new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));

      return {
        format: 'office',
        office: {
          application: extractTag(appXml, 'Application'),
          created: extractTag(coreXml, 'dcterms:created'),
          modified: extractTag(coreXml, 'dcterms:modified'),
          lastModifiedBy: extractTag(coreXml, 'cp:lastModifiedBy')
        }
      };
    } catch {
      return { format: 'office', office: {} };
    }
  }

  return { format: 'other' };
}

export function buildMetadataIndicators(input: MetadataForensicsInput): MetadataIndicator[] {
  const indicators: MetadataIndicator[] = [];
  const formalContext = isFormalDocumentContext(input);
  const ocrDate = pickMostRelevantDate(Array.isArray(input.ocrDates) ? input.ocrDates : []);
  const fileMtime = parseIsoLike(normalize(input.fileMtime));

  if (input.metadata.format === 'pdf' && input.metadata.pdf) {
    const producer = normalize(input.metadata.pdf.producer);
    const creator = normalize(input.metadata.pdf.creator);
    const creationDate = parseIsoLike(normalize(input.metadata.pdf.creationDate));
    const modDate = parseIsoLike(normalize(input.metadata.pdf.modDate));
    const producerOrCreator = `${producer} ${creator}`.trim();

    if (formalContext && containsSuspiciousEditor(producerOrCreator)) {
      indicators.push({
        code: 'pdf-producer-context-mismatch',
        severity: 'medium',
        reason: 'Metadados PDF indicam editor comum de design/edicao em documento formal; requer validacao adicional.'
      });
    }

    if (Number.isFinite(creationDate) && Number.isFinite(modDate) && modDate < creationDate) {
      indicators.push({
        code: 'pdf-metadata-date-conflict',
        severity: 'medium',
        reason: 'Metadados PDF com conflito temporal interno entre criacao e modificacao.'
      });
    }

    if (Number.isFinite(ocrDate) && Number.isFinite(modDate) && daysDiff(ocrDate, modDate) > 180) {
      indicators.push({
        code: 'pdf-content-metadata-date-conflict',
        severity: 'medium',
        reason: 'Data textual do documento diverge significativamente da data de modificacao em metadados PDF.'
      });
    }
  }

  if (input.metadata.format === 'image' && input.metadata.image) {
    const software = normalize(input.metadata.image.software);
    const editDate = parseIsoLike(normalize(input.metadata.image.modifyDate) || normalize(input.metadata.image.createDate) || normalize(input.metadata.image.dateTimeOriginal));

    if (formalContext && containsSuspiciousEditor(software)) {
      indicators.push({
        code: 'image-software-context-mismatch',
        severity: 'medium',
        reason: 'EXIF indica software de edicao em documento formal; recomenda-se revisao manual.'
      });
    }

    if (Number.isFinite(ocrDate) && Number.isFinite(editDate) && daysDiff(ocrDate, editDate) > 180) {
      indicators.push({
        code: 'image-exif-date-conflict',
        severity: 'medium',
        reason: 'Data textual do documento e data EXIF divergem de forma relevante.'
      });
    }

    if (Number.isFinite(fileMtime) && Number.isFinite(editDate) && daysDiff(fileMtime, editDate) > 365) {
      indicators.push({
        code: 'image-file-exif-date-gap',
        severity: 'low',
        reason: 'Grande diferenca entre data de ficheiro e metadata EXIF; pode indicar cadeia de conversao.'
      });
    }
  }

  if (input.metadata.format === 'office' && input.metadata.office) {
    const application = normalize(input.metadata.office.application);
    const created = parseIsoLike(normalize(input.metadata.office.created));
    const modified = parseIsoLike(normalize(input.metadata.office.modified));
    const lastModifiedBy = normalize(input.metadata.office.lastModifiedBy);

    if (formalContext && containsSuspiciousEditor(application)) {
      indicators.push({
        code: 'office-application-context-mismatch',
        severity: 'medium',
        reason: 'Aplicacao de autoria Office pouco compativel com o contexto emissor declarado.'
      });
    }

    if (Number.isFinite(created) && Number.isFinite(modified) && modified < created) {
      indicators.push({
        code: 'office-metadata-date-conflict',
        severity: 'medium',
        reason: 'Metadados Office apresentam ordem temporal inconsistente entre criacao e alteracao.'
      });
    }

    if (Number.isFinite(ocrDate) && Number.isFinite(modified) && daysDiff(ocrDate, modified) > 365) {
      indicators.push({
        code: 'office-content-metadata-date-conflict',
        severity: 'medium',
        reason: 'Datas extraidas do conteudo divergem fortemente da data de alteracao do documento Office.'
      });
    }

    if (formalContext && lastModifiedBy && /^(user|admin|owner|unknown)$/i.test(lastModifiedBy)) {
      indicators.push({
        code: 'office-generic-editor-identity',
        severity: 'low',
        reason: 'Identidade de ultimo editor Office e generica para documento formal; requer corroboracao contextual.'
      });
    }
  }

  return indicators;
}
