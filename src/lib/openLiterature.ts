export type OpenLiteratureSourceId = 'gutenberg' | 'openlibrary' | 'internetarchive' | 'doab' | 'repoarte';

export interface OpenLiteratureFilters {
  language?: string;
  country?: string;
  source?: string;
  subject?: string;
  license?: string;
  access?: string;
  format?: string;
  yearMin?: number;
  yearMax?: number;
  sortBy?: 'relevance' | 'year' | 'title';
  page?: number;
  pageSize?: number;
}

export interface OpenLiteratureResult {
  id: string;
  title: string;
  authors: string;
  source: string;
  source_id: OpenLiteratureSourceId | string;
  access_status: string;
  license: string;
  cover_image_url?: string;
  file_url?: string;
  file_format?: string;
  download_url?: string | null;
  download_format?: string | null;
  publish_year?: number | null;
  subjects?: string;
  languages?: string;
  sources?: string[];
  licenses?: string[];
}

const DEFAULT_FALLBACK: OpenLiteratureResult[] = [
  {
    id: 'dom-quixote',
    title: 'Dom Quixote',
    authors: 'Miguel de Cervantes',
    source: 'Project Gutenberg',
    source_id: 'gutenberg',
    access_status: 'Domínio público',
    license: 'Domínio Público',
    cover_image_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
    file_url: 'https://www.gutenberg.org/ebooks/9968',
    file_format: 'web',
    download_url: 'https://www.gutenberg.org/files/9968/9968-0.txt',
    download_format: 'txt',
    sources: ['Project Gutenberg'],
    licenses: ['Domínio Público']
  },
  {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    authors: 'Jane Austen',
    source: 'Project Gutenberg',
    source_id: 'gutenberg',
    access_status: 'Domínio público',
    license: 'Domínio Público',
    cover_image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
    file_url: 'https://www.gutenberg.org/ebooks/1342',
    file_format: 'web',
    download_url: 'https://www.gutenberg.org/files/1342/1342-0.txt',
    download_format: 'txt',
    sources: ['Project Gutenberg'],
    licenses: ['Domínio Público']
  }
];

const normalizeText = (value?: string) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const safeArray = (value: unknown) => (Array.isArray(value) ? value : []);

const toSourceLabel = (sourceId?: string) => {
  switch (sourceId) {
    case 'gutenberg':
      return 'Project Gutenberg';
    case 'openlibrary':
      return 'Open Library';
    case 'internetarchive':
      return 'Internet Archive';
    case 'doab':
      return 'DOAB';
    case 'repoarte':
      return 'Repoarte.ac.mz';
    default:
      return 'Open Literature';
  }
};

export const buildLiteratureApiCandidates = (baseUrl = String(import.meta.env.VITE_LITERATURE_API_BASE_URL ?? '').trim()) => {
  const sanitizedBase = baseUrl.replace(/\/+$/, '');

  if (sanitizedBase) {
    return [
      `${sanitizedBase}/literature/search`,
      `${sanitizedBase}/literature-search`,
    ];
  }

  return ['/api/literature/search', '/api/literature-search'];
};

export const normalizeGutenbergDoc = (doc: any): OpenLiteratureResult => {
  const formats = doc?.formats ?? {};
  const htmlUrl = formats['text/html; charset=utf-8'] || formats['text/html'];
  const textUrl = formats['text/plain; charset=utf-8'] || formats['text/plain'];
  const pdfUrl = formats['application/pdf'];
  const epubUrl = formats['application/epub+zip'];
  const readUrl = htmlUrl || textUrl || `https://www.gutenberg.org/ebooks/${doc?.id}`;
  const downloadUrl = pdfUrl || epubUrl || textUrl || null;
  const downloadFormat = pdfUrl ? 'pdf' : epubUrl ? 'epub' : textUrl ? 'txt' : null;

  return {
    id: String(doc?.id ?? 'gutenberg-item'),
    title: doc?.title || 'Título desconhecido',
    authors: Array.isArray(doc?.authors)
      ? doc.authors.map((author: any) => author?.name ?? 'Autor desconhecido').join(', ')
      : 'Autor desconhecido',
    source: 'Project Gutenberg',
    source_id: 'gutenberg',
    access_status: 'Domínio público',
    license: 'Domínio Público',
    cover_image_url: formats['image/jpeg'] || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
    file_url: readUrl,
    file_format: htmlUrl ? 'html' : textUrl ? 'txt' : 'web',
    download_url: downloadUrl,
    download_format: downloadFormat,
    publish_year: typeof doc?.download_count === 'number' ? doc.download_count : null,
    subjects: safeArray(doc?.subject).slice(0, 3).join(', ') || '',
    languages: safeArray(doc?.languages).join(', ') || 'en',
    sources: ['Project Gutenberg'],
    licenses: ['Domínio Público']
  };
};

export const normalizeOpenLibraryDoc = (doc: any): OpenLiteratureResult => {
  const hasAccess = Boolean(doc?.ebook_access || doc?.has_fulltext);

  return {
    id: doc?.key?.replace('/works/', '') || doc?.cover_edition_key || doc?.key || 'unknown',
    title: doc?.title || 'Título desconhecido',
    authors: safeArray(doc?.author_name).join(', ') || 'Autor desconhecido',
    source: 'Open Library',
    source_id: 'openlibrary',
    access_status: hasAccess ? 'Acesso aberto' : 'Catálogo',
    license: hasAccess ? 'Open Access' : 'Catálogo',
    cover_image_url: doc?.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
    file_url: doc?.key ? `https://openlibrary.org${doc.key}` : 'https://openlibrary.org',
    file_format: doc?.ebook_count_i ? 'html' : 'web',
    download_url: null,
    download_format: null,
    publish_year: typeof doc?.first_publish_year === 'number' ? doc.first_publish_year : null,
    subjects: safeArray(doc?.subject).slice(0, 3).join(', ') || '',
    languages: safeArray(doc?.language).join(', ') || 'pt',
    sources: ['Open Library'],
    licenses: [hasAccess ? 'Open Access' : 'Catálogo']
  };
};

export const normalizeInternetArchiveDoc = (doc: any): OpenLiteratureResult => {
  const title = Array.isArray(doc?.title) ? doc.title[0] : doc?.title || 'Título desconhecido';
  const creator = Array.isArray(doc?.creator) ? doc.creator.join(', ') : doc?.creator || 'Autor desconhecido';
  const formats = Array.isArray(doc?.format) ? doc.format : [];
  const identifier = doc?.identifier || 'internet-archive-item';
  const cover = doc?.cover?
    `https://archive.org/services/img/${encodeURIComponent(doc.cover)}` :
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800';

  return {
    id: `archive-${String(identifier)}`,
    title,
    authors: creator,
    source: 'Internet Archive',
    source_id: 'internetarchive',
    access_status: 'Acesso legal conforme a obra',
    license: 'Dependente da obra',
    cover_image_url: cover,
    file_url: doc?.identifier ? `https://archive.org/details/${doc.identifier}` : 'https://archive.org',
    file_format: formats.find((item: string) => /pdf|epub|txt/i.test(item)) || 'web',
    download_url: null,
    download_format: null,
    publish_year: typeof doc?.date === 'string' ? Number(doc.date.slice(0, 4)) || null : null,
    subjects: Array.isArray(doc?.subject) ? doc.subject.slice(0, 3).join(', ') : '',
    languages: 'multi',
    sources: ['Internet Archive'],
    licenses: ['Dependente da obra']
  };
};

export const normalizeDoabDoc = (doc: any): OpenLiteratureResult => {
  const title = doc?.title || doc?.name || 'Título desconhecido';
  const authors = Array.isArray(doc?.authors)
    ? doc.authors.map((author: any) => author?.name || author).join(', ')
    : doc?.author || 'Autor desconhecido';
  const url = doc?.url || doc?.download_url || doc?.link || 'https://directory.doabooks.org';

  return {
    id: doc?.id || `doab-${normalizeText(title)}`,
    title,
    authors,
    source: 'DOAB',
    source_id: 'doab',
    access_status: 'Open Access',
    license: 'Licença definida pela obra',
    cover_image_url: doc?.cover || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
    file_url: url,
    file_format: doc?.format || 'web',
    download_url: doc?.download_url || null,
    download_format: doc?.download_format || null,
    publish_year: typeof doc?.year === 'number' ? doc.year : null,
    subjects: Array.isArray(doc?.subjects) ? doc.subjects.slice(0, 3).join(', ') : '',
    languages: doc?.language || 'multi',
    sources: ['DOAB'],
    licenses: ['Licença definida pela obra']
  };
};

export const deduplicateOpenLiteratureResults = (items: OpenLiteratureResult[]) => {
  const map = new Map<string, OpenLiteratureResult>();

  items.forEach((item) => {
    const key = `${normalizeText(item.title)}|${normalizeText(item.authors)}` || `${item.id}|${item.source}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      return;
    }

    const merged = {
      ...existing,
      ...item,
      source: existing.source || item.source,
      source_id: existing.source_id || item.source_id,
      access_status: existing.access_status || item.access_status,
      license: existing.license || item.license,
      file_url: existing.file_url || item.file_url,
      download_url: existing.download_url || item.download_url,
      cover_image_url: existing.cover_image_url || item.cover_image_url,
      sources: Array.from(new Set([...(existing.sources ?? [existing.source]), ...(item.sources ?? [item.source])])).filter(Boolean),
      licenses: Array.from(new Set([...(existing.licenses ?? [existing.license]), ...(item.licenses ?? [item.license])])).filter(Boolean)
    };

    map.set(key, merged);
  });

  return Array.from(map.values());
};

export const rankOpenLiteratureResults = (items: OpenLiteratureResult[]) => {
  const sourcePriority: Record<string, number> = {
    gutenberg: 5,
    doab: 4,
    internetarchive: 3,
    openlibrary: 2,
    repoarte: 3
  };

  const licensePriority: Record<string, number> = {
    'dominio publico': 5,
    'public domain': 5,
    'open access': 4,
    'cc by': 4,
    'cc0': 4,
    'creative commons': 3,
    'catalog': 1,
    'dependente da obra': 2
  };

  return [...items].sort((a, b) => {
    const aLicenseKey = normalizeText(a.license);
    const bLicenseKey = normalizeText(b.license);
    const aLicenseScore = licensePriority[aLicenseKey] ?? 0;
    const bLicenseScore = licensePriority[bLicenseKey] ?? 0;
    const aSourceScore = sourcePriority[normalizeText(a.source)] ?? 0;
    const bSourceScore = sourcePriority[normalizeText(b.source)] ?? 0;
    const aAccessScore = normalizeText(a.access_status).includes('dominio') || normalizeText(a.access_status).includes('open access') ? 1 : 0;
    const bAccessScore = normalizeText(b.access_status).includes('dominio') || normalizeText(b.access_status).includes('open access') ? 1 : 0;

    const aScore = (aLicenseScore * 10) + (aSourceScore * 3) + aAccessScore;
    const bScore = (bLicenseScore * 10) + (bSourceScore * 3) + bAccessScore;

    if (bScore !== aScore) return bScore - aScore;
    return (b.publish_year ?? 0) - (a.publish_year ?? 0);
  });
};

const fetchJson = async (url: string) => {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const filterByLicense = (items: OpenLiteratureResult[], license?: string) => {
  if (!license || license === 'all') return items;

  const target = license.toLowerCase();
  return items.filter((item) => {
    const entry = `${item.license} ${item.access_status} ${item.sources?.join(' ') ?? ''}`.toLowerCase();
    if (target === 'public_domain') return entry.includes('domínio') || entry.includes('public');
    if (target === 'cc_by') return entry.includes('creative') || entry.includes('cc');
    if (target === 'open_access') return entry.includes('open') || entry.includes('acesso') || entry.includes('domínio');
    return true;
  });
};

const filterBySubject = (items: OpenLiteratureResult[], subject?: string) => {
  if (!subject) return items;
  const text = normalizeText(subject);
  return items.filter((item) => {
    const haystack = normalizeText(`${item.title} ${item.authors} ${item.subjects ?? ''} ${item.sources?.join(' ') ?? ''}`);
    return haystack.includes(text);
  });
};

export const searchOpenLiterature = async (
  query: string,
  filters: OpenLiteratureFilters = {},
  limit = 40,
): Promise<{ results: OpenLiteratureResult[]; total: number; page: number; pageSize: number; totalPages: number } | OpenLiteratureResult[]> => {
  const page = Number(filters.page ?? 1);
  const pageSize = Number(filters.pageSize ?? limit);

  try {
    const params = new URLSearchParams({
      q: query,
      source: filters.source ?? 'all',
      language: filters.language ?? 'all',
      country: filters.country ?? 'all',
      subject: filters.subject ?? '',
      license: filters.license ?? 'all',
      access: filters.access ?? 'all',
      format: filters.format ?? 'all',
      yearMin: String(filters.yearMin ?? ''),
      yearMax: String(filters.yearMax ?? ''),
      sortBy: filters.sortBy ?? 'relevance',
      page: String(page),
      pageSize: String(pageSize),
    });

    if (typeof window !== 'undefined') {
      const candidates = buildLiteratureApiCandidates().map((baseUrl) => `${baseUrl}?${params.toString()}`);

      for (const url of candidates) {
        const response = await fetch(url);
        if (!response.ok) continue;

        const payload = await response.json();
        const results = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload?.data) ? payload.data : [];
        const total = Number(payload?.total ?? results.length);
        const resolvedPage = Number(payload?.page ?? page);
        const resolvedPageSize = Number(payload?.pageSize ?? pageSize);
        const totalPages = Number(payload?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(resolvedPageSize, 1))));
        if (results.length > 0 || payload?.results || payload?.data) {
          return {
            results,
            total,
            page: resolvedPage,
            pageSize: resolvedPageSize,
            totalPages,
          };
        }
      }
    }
  } catch {
    // Fallback to direct source queries below.
  }

  const normalizedQuery = query.trim() || 'literature';
  const allowedSource = filters.source ?? 'all';
  const sources = allowedSource === 'all'
    ? ['gutenberg', 'openlibrary', 'internetarchive']
    : [allowedSource];

  const tasks = sources.map(async (source) => {
    try {
      if (source === 'gutenberg') {
        const gutenbergUrl = new URL('https://gutendex.com/books');
        gutenbergUrl.searchParams.set('search', normalizedQuery);
        gutenbergUrl.searchParams.set('page', '1');
        const data = await fetchJson(gutenbergUrl.toString());
        return (Array.isArray(data?.results) ? data.results : []).map(normalizeGutenbergDoc).slice(0, limit);
      }

      if (source === 'openlibrary') {
        const openLibraryUrl = new URL('https://openlibrary.org/search.json');
        openLibraryUrl.searchParams.set('q', normalizedQuery);
        openLibraryUrl.searchParams.set('limit', String(limit));
        if (filters.language && filters.language !== 'all') openLibraryUrl.searchParams.set('language', filters.language);
        if (filters.country && filters.country !== 'all') openLibraryUrl.searchParams.set('place', filters.country);
        const data = await fetchJson(openLibraryUrl.toString());
        return (Array.isArray(data?.docs) ? data.docs : []).filter((doc: any) => doc?.key && doc?.title).map(normalizeOpenLibraryDoc).slice(0, limit);
      }

      if (source === 'internetarchive') {
        const archiveUrl = new URL('https://archive.org/advancedsearch.php');
        const rawQuery = `title:(${normalizedQuery}) OR creator:(${normalizedQuery})`;
        archiveUrl.searchParams.set('q', rawQuery);
        archiveUrl.searchParams.set('rows', String(limit));
        archiveUrl.searchParams.set('output', 'json');
        archiveUrl.searchParams.set('fl[]', 'identifier,title,creator,description,date,subject,format,collection');
        const data = await fetchJson(archiveUrl.toString());
        return (Array.isArray(data?.response?.docs) ? data.response.docs : []).map(normalizeInternetArchiveDoc).slice(0, limit);
      }

      if (source === 'doab') {
        const doabUrl = new URL('https://api.doabooks.org/volumes/');
        doabUrl.searchParams.set('q', normalizedQuery);
        doabUrl.searchParams.set('limit', String(limit));
        const data = await fetchJson(doabUrl.toString());
        const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        return items.map(normalizeDoabDoc).slice(0, limit);
      }

      return [];
    } catch {
      return [];
    }
  });

  const merged = rankOpenLiteratureResults(deduplicateOpenLiteratureResults((await Promise.all(tasks)).flat()));
  let filtered = merged;

  if (filters.access && filters.access !== 'all') {
    filtered = filtered.filter((item) => {
      const access = normalizeText(item.access_status);
      if (filters.access === 'open_access') return access.includes('acesso') || access.includes('open');
      if (filters.access === 'public_domain') return access.includes('dominio') || access.includes('public');
      if (filters.access === 'catalog') return access.includes('catalog');
      return true;
    });
  }

  if (filters.format && filters.format !== 'all') {
    filtered = filtered.filter((item) => {
      const formatKey = normalizeText(item.file_format || item.download_format || item.file_url || '');
      return formatKey.includes(normalizeText(filters.format));
    });
  }

  if (filters.yearMin || filters.yearMax) {
    filtered = filtered.filter((item) => {
      const year = Number(item.publish_year ?? 0);
      if (filters.yearMin && year < Number(filters.yearMin)) return false;
      if (filters.yearMax && year > Number(filters.yearMax)) return false;
      return true;
    });
  }

  filtered = rankOpenLiteratureResults(filterBySubject(filterByLicense(filtered, filters.license), filters.subject));

  const total = filtered.length;
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const startIndex = (safePage - 1) * safePageSize;
  const paginated = filtered.slice(startIndex, startIndex + safePageSize);

  return {
    results: paginated.length > 0 ? paginated : rankOpenLiteratureResults(DEFAULT_FALLBACK.filter((item) => {
      const haystack = normalizeText(`${item.title} ${item.authors} ${item.source}`);
      return haystack.includes(normalizeText(normalizedQuery));
    })),
    total: total || DEFAULT_FALLBACK.length,
    page: safePage,
    pageSize: safePageSize,
    totalPages: totalPages || 1,
  };
};

export const resolveSourceLabel = (sourceId?: string) => toSourceLabel(sourceId);
