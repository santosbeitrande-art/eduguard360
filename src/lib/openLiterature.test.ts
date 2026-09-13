import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLiteratureApiCandidates, rankOpenLiteratureResults, searchOpenLiterature } from './openLiterature';

describe('buildLiteratureApiCandidates', () => {
  it('uses a production-safe API base when configured and keeps a stable fallback', () => {
    vi.stubEnv('VITE_LITERATURE_API_BASE_URL', 'https://api.eduguard360.example');

    expect(buildLiteratureApiCandidates()).toEqual([
      'https://api.eduguard360.example/literature/search',
      'https://api.eduguard360.example/literature-search',
    ]);

    vi.unstubAllEnvs();
  });
});

describe('vercel routing', () => {
  it('keeps the public literature endpoints ahead of the catch-all /api rewrite', async () => {
    const config = await import('../../vercel.json', { assert: { type: 'json' } });
    const rewrites = config.default?.rewrites ?? [];
    const literatureRewrite = rewrites.find((entry: any) => entry.source === '/api/literature/search');
    const catchAllRewrite = rewrites.find((entry: any) => entry.source === '/api/(.*)');

    expect(literatureRewrite).toEqual({
      source: '/api/literature/search',
      destination: '/api/literature-search',
    });
    expect(rewrites.indexOf(literatureRewrite)).toBeLessThan(rewrites.indexOf(catchAllRewrite));
  });
});

describe('rankOpenLiteratureResults', () => {
  it('prioritizes public domain and open access results', () => {
    const ranked = rankOpenLiteratureResults([
      {
        id: 'b',
        title: 'Livro restrito',
        authors: 'Autor B',
        source: 'Open Library',
        source_id: 'openlibrary',
        access_status: 'Catálogo',
        license: 'Catálogo',
        file_url: 'https://example.com/b',
        sources: ['Open Library'],
        licenses: ['Catálogo']
      },
      {
        id: 'a',
        title: 'Livro livre',
        authors: 'Autor A',
        source: 'Project Gutenberg',
        source_id: 'gutenberg',
        access_status: 'Domínio público',
        license: 'Domínio Público',
        file_url: 'https://example.com/a',
        sources: ['Project Gutenberg'],
        licenses: ['Domínio Público']
      },
      {
        id: 'c',
        title: 'Livro aberto',
        authors: 'Autor C',
        source: 'DOAB',
        source_id: 'doab',
        access_status: 'Open Access',
        license: 'CC BY 4.0',
        file_url: 'https://example.com/c',
        sources: ['DOAB'],
        licenses: ['CC BY 4.0']
      }
    ]);

    expect(ranked[0].id).toBe('a');
    expect(ranked[1].id).toBe('c');
    expect(ranked[2].id).toBe('b');
  });

  it('avoids direct browser calls to the CORS-blocked DOAB endpoint by default', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith('/api/literature')) {
        return {
          ok: false,
          status: 404,
        } as Response;
      }

      const responseBody = {
        results: [
          {
            id: 78025,
            title: 'Main currents in American thought',
            authors: [{ name: 'R. W. B. Lewis' }],
            formats: {
              'text/html; charset=utf-8': 'https://www.gutenberg.org/ebooks/78025',
              'image/jpeg': 'https://example.com/cover.jpg',
            },
            download_count: 10,
            subject: ['literature'],
            languages: ['en'],
          },
        ],
      };

      if (String(url).includes('gutendex.com')) {
        return {
          ok: true,
          json: async () => responseBody,
        } as Response;
      }

      if (String(url).includes('openlibrary.org/search.json')) {
        return {
          ok: true,
          json: async () => ({
            docs: [{
              key: '/works/OL123W',
              title: 'Literature sample',
              author_name: ['A. Author'],
              first_publish_year: 2020,
              cover_i: 123,
              has_fulltext: true,
            }],
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await searchOpenLiterature('literature', {});

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('api.doabooks.org'),
      expect.anything(),
    );
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });
});
