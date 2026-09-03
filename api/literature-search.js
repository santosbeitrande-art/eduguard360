const literatureCache = new Map();
const LITERATURE_CACHE_TTL = 5 * 60 * 1000;

export default async function handler(req, res) {
  const {
    q = 'literature',
    source = 'all',
    language = 'all',
    country = 'all',
    subject = '',
    license = 'all',
    access = 'all',
    format = 'all',
    yearMin = '',
    yearMax = '',
    sortBy = 'relevance',
    page = '1',
    pageSize = '40'
  } = req.query || {};

  try {
    const selectedSource = typeof source === 'string' ? source : 'all';
    const searchQuery = typeof q === 'string' && q.trim() ? q.trim() : 'literature';
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.max(1, Number(pageSize) || 40);
    const sourceList = selectedSource === 'all'
      ? ['gutenberg', 'openlibrary', 'internetarchive']
      : [selectedSource];

    const cacheKey = JSON.stringify({
      q: searchQuery,
      source: selectedSource,
      language,
      country,
      subject,
      license,
      access,
      format,
      yearMin,
      yearMax,
      sortBy,
      page: safePage,
      pageSize: safePageSize,
    });

    const cached = literatureCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < LITERATURE_CACHE_TTL) {
      return res.status(200).json(cached.payload);
    }

    const fetchJson = async (url) => {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json();
    };

    const normalizeText = (value = '') =>
      String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const normalizeGutenbergDoc = (doc) => ({
      id: String(doc?.id ?? 'gutenberg-item'),
      title: doc?.title || 'Título desconhecido',
      authors: Array.isArray(doc?.authors) ? doc.authors.map((author) => author?.name ?? 'Autor desconhecido').join(', ') : 'Autor desconhecido',
      source: 'Project Gutenberg',
      source_id: 'gutenberg',
      access_status: 'Domínio público',
      license: 'Domínio Público',
      file_url: doc?.formats?.['text/html; charset=utf-8'] || doc?.formats?.['text/html'] || doc?.formats?.['text/plain; charset=utf-8'] || doc?.formats?.['text/plain'] || `https://www.gutenberg.org/ebooks/${doc?.id}`,
      file_format: doc?.formats?.['text/html; charset=utf-8'] ? 'html' : 'web',
      download_url: doc?.formats?.['application/pdf'] || doc?.formats?.['application/epub+zip'] || null,
      download_format: doc?.formats?.['application/pdf'] ? 'pdf' : doc?.formats?.['application/epub+zip'] ? 'epub' : null,
      publish_year: null,
      subjects: Array.isArray(doc?.subject) ? doc.subject.slice(0, 3).join(', ') : '',
      languages: Array.isArray(doc?.languages) ? doc.languages.join(', ') : 'en',
      sources: ['Project Gutenberg'],
      licenses: ['Domínio Público']
    });

    const normalizeOpenLibraryDoc = (doc) => ({
      id: doc?.key?.replace('/works/', '') || doc?.cover_edition_key || doc?.key || 'unknown',
      title: doc?.title || 'Título desconhecido',
      authors: Array.isArray(doc?.author_name) ? doc.author_name.join(', ') : 'Autor desconhecido',
      source: 'Open Library',
      source_id: 'openlibrary',
      access_status: doc?.ebook_access || doc?.has_fulltext ? 'Acesso aberto' : 'Catálogo',
      license: doc?.ebook_access || doc?.has_fulltext ? 'Open Access' : 'Catálogo',
      file_url: doc?.key ? `https://openlibrary.org${doc.key}` : 'https://openlibrary.org',
      file_format: doc?.ebook_count_i ? 'html' : 'web',
      download_url: null,
      download_format: null,
      publish_year: typeof doc?.first_publish_year === 'number' ? doc.first_publish_year : null,
      subjects: Array.isArray(doc?.subject) ? doc.subject.slice(0, 3).join(', ') : '',
      languages: Array.isArray(doc?.language) ? doc.language.join(', ') : 'pt',
      sources: ['Open Library'],
      licenses: [doc?.ebook_access || doc?.has_fulltext ? 'Open Access' : 'Catálogo']
    });

    const normalizeDoabDoc = (doc) => ({
      id: doc?.id || `doab-${normalizeText(doc?.title || doc?.name || 'item')}`,
      title: doc?.title || doc?.name || 'Título desconhecido',
      authors: Array.isArray(doc?.authors) ? doc.authors.map((author) => typeof author === 'string' ? author : author?.name || 'Autor desconhecido').join(', ') : (doc?.author || 'Autor desconhecido'),
      source: 'DOAB',
      source_id: 'doab',
      access_status: 'Open Access',
      license: 'Licença definida pela obra',
      file_url: doc?.url || doc?.download_url || doc?.link || 'https://directory.doabooks.org',
      file_format: doc?.format || 'web',
      download_url: doc?.download_url || null,
      download_format: doc?.download_format || null,
      publish_year: typeof doc?.year === 'number' ? doc.year : null,
      subjects: Array.isArray(doc?.subjects) ? doc.subjects.slice(0, 3).join(', ') : '',
      languages: doc?.language || 'multi',
      sources: ['DOAB'],
      licenses: ['Licença definida pela obra']
    });

    const normalizeArchiveDoc = (doc) => ({
      id: `archive-${doc?.identifier || 'item'}`,
      title: Array.isArray(doc?.title) ? doc.title[0] : doc?.title || 'Título desconhecido',
      authors: Array.isArray(doc?.creator) ? doc.creator.join(', ') : (doc?.creator || 'Autor desconhecido'),
      source: 'Internet Archive',
      source_id: 'internetarchive',
      access_status: 'Acesso legal conforme a obra',
      license: 'Dependente da obra',
      file_url: doc?.identifier ? `https://archive.org/details/${doc.identifier}` : 'https://archive.org',
      file_format: Array.isArray(doc?.format) ? (doc.format.find((item) => /pdf|epub|txt/i.test(item)) || 'web') : 'web',
      download_url: null,
      download_format: null,
      publish_year: typeof doc?.date === 'string' ? Number(String(doc.date).slice(0, 4)) || null : null,
      subjects: Array.isArray(doc?.subject) ? doc.subject.slice(0, 3).join(', ') : '',
      languages: 'multi',
      sources: ['Internet Archive'],
      licenses: ['Dependente da obra']
    });

    const rank = (items) => {
      const sourcePriority = { gutenberg: 5, doab: 4, internetarchive: 3, openlibrary: 2, repoarte: 3 };
      const licensePriority = {
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
        const aLicense = normalizeText(a.license);
        const bLicense = normalizeText(b.license);
        const aScore = (licensePriority[aLicense] ?? 0) * 10 + (sourcePriority[normalizeText(a.source)] ?? 0) * 3 + (normalizeText(a.access_status).includes('dominio') || normalizeText(a.access_status).includes('open access') ? 1 : 0);
        const bScore = (licensePriority[bLicense] ?? 0) * 10 + (sourcePriority[normalizeText(b.source)] ?? 0) * 3 + (normalizeText(b.access_status).includes('dominio') || normalizeText(b.access_status).includes('open access') ? 1 : 0);
        if (bScore !== aScore) return bScore - aScore;
        return (b.publish_year ?? 0) - (a.publish_year ?? 0);
      });
    };

    const dedupe = (items) => {
      const map = new Map();
      for (const item of items) {
        const key = `${normalizeText(item.title)}|${normalizeText(item.authors)}`;
        if (!map.has(key)) map.set(key, item);
      }
      return Array.from(map.values());
    };

    const tasks = sourceList.map(async (sourceName) => {
      try {
        if (sourceName === 'gutenberg') {
          const data = await fetchJson(`https://gutendex.com/books?search=${encodeURIComponent(searchQuery)}&page=1`);
          return Array.isArray(data?.results) ? data.results.map(normalizeGutenbergDoc).slice(0, safePageSize) : [];
        }

        if (sourceName === 'openlibrary') {
          const url = new URL('https://openlibrary.org/search.json');
          url.searchParams.set('q', searchQuery);
          url.searchParams.set('limit', String(safePageSize));
          if (language !== 'all') url.searchParams.set('language', String(language));
          if (country !== 'all') url.searchParams.set('place', String(country));
          const data = await fetchJson(url.toString());
          return (Array.isArray(data?.docs) ? data.docs : []).filter((doc) => doc?.key && doc?.title).map(normalizeOpenLibraryDoc).slice(0, safePageSize);
        }

        if (sourceName === 'doab') {
          const url = new URL('https://api.doabooks.org/volumes/');
          url.searchParams.set('q', searchQuery);
          url.searchParams.set('limit', String(safePageSize));
          const data = await fetchJson(url.toString());
          const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
          return items.map(normalizeDoabDoc).slice(0, safePageSize);
        }

        if (sourceName === 'internetarchive') {
          const url = new URL('https://archive.org/advancedsearch.php');
          url.searchParams.set('q', `title:(${searchQuery}) OR creator:(${searchQuery})`);
          url.searchParams.set('rows', String(safePageSize));
          url.searchParams.set('output', 'json');
          url.searchParams.set('fl[]', 'identifier,title,creator,date,subject,format');
          const data = await fetchJson(url.toString());
          return (Array.isArray(data?.response?.docs) ? data.response.docs : []).map(normalizeArchiveDoc).slice(0, safePageSize);
        }

        return [];
      } catch {
        return [];
      }
    });

    let results = rank(dedupe((await Promise.all(tasks)).flat()));

    if (access !== 'all') {
      results = results.filter((item) => {
        const text = `${item.license} ${item.access_status}`.toLowerCase();
        if (access === 'open_access') return text.includes('open') || text.includes('acesso');
        if (access === 'public_domain') return text.includes('dominio') || text.includes('public');
        if (access === 'catalog') return text.includes('catalog');
        return true;
      });
    }

    if (format !== 'all') {
      results = results.filter((item) => {
        const candidate = `${item.file_format || ''} ${item.download_format || ''}`.toLowerCase();
        return candidate.includes(String(format).toLowerCase());
      });
    }

    if (yearMin || yearMax) {
      results = results.filter((item) => {
        const year = Number(item.publish_year ?? 0);
        if (yearMin && year < Number(yearMin)) return false;
        if (yearMax && year > Number(yearMax)) return false;
        return true;
      });
    }

    if (license !== 'all') {
      results = results.filter((item) => {
        const text = `${item.license} ${item.access_status}`.toLowerCase();
        if (license === 'public_domain') return text.includes('dominio') || text.includes('public');
        if (license === 'cc_by') return text.includes('creative') || text.includes('cc');
        if (license === 'open_access') return text.includes('open') || text.includes('dominio') || text.includes('acesso');
        return true;
      });
    }

    if (typeof subject === 'string' && subject.trim()) {
      results = results.filter((item) => {
        const haystack = normalizeText(`${item.title} ${item.authors} ${item.subjects || ''}`);
        return haystack.includes(normalizeText(subject));
      });
    }

    if (sortBy === 'year') {
      results = [...results].sort((a, b) => (Number(b.publish_year ?? 0) - Number(a.publish_year ?? 0)));
    } else if (sortBy === 'title') {
      results = [...results].sort((a, b) => a.title.localeCompare(b.title));
    } else {
      results = rank(results);
    }

    const total = results.length;
    const pagination = {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };

    const paginated = results.slice((safePage - 1) * safePageSize, safePage * safePageSize);
    const payload = {
      query: searchQuery,
      source: selectedSource,
      count: paginated.length,
      total: total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: pagination.totalPages,
      results: paginated
    };

    literatureCache.set(cacheKey, { timestamp: Date.now(), payload });

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      error: 'open_literature_search_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      results: []
    });
  }
}
