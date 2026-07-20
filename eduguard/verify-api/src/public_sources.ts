import { cacheGet, cacheSet } from './cache_store';

interface PublicSourceRecord {
  id: string;
  countryCode: string;
  issuerType: string;
  issuerName: string;
  endpointUrl: string;
  authMode?: string;
  cacheTtlSeconds?: number;
  isActive?: boolean;
}

function builtinSources(): PublicSourceRecord[] {
  return [
    {
      id: 'builtin-mz-gov-domain',
      countryCode: 'MZ',
      issuerType: 'government-domain',
      issuerName: 'Mozambique Government Domains',
      endpointUrl: 'https://www.gov.mz',
      authMode: 'none',
      cacheTtlSeconds: 3600,
      isActive: true
    },
    {
      id: 'builtin-mz-education-domain',
      countryCode: 'MZ',
      issuerType: 'education-domain',
      issuerName: 'Mozambique Academic Domains',
      endpointUrl: 'https://www.uem.mz',
      authMode: 'none',
      cacheTtlSeconds: 3600,
      isActive: true
    }
  ];
}

async function configuredSources(): Promise<PublicSourceRecord[]> {
  const envJson = String(process.env.PUBLIC_SOURCES_JSON || '').trim();
  if (!envJson) return builtinSources();
  try {
    const parsed = JSON.parse(envJson);
    return Array.isArray(parsed) ? parsed : builtinSources();
  } catch {
    return builtinSources();
  }
}

async function probeEndpoint(url: string, ttlSeconds: number) {
  const cacheKey = `public-source:${url}`;
  const cached = await cacheGet<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(url, { method: 'GET' });
    const payload = { ok: response.ok, status: response.status, checkedAt: new Date().toISOString() };
    await cacheSet(cacheKey, payload, ttlSeconds);
    return payload;
  } catch (error: any) {
    const payload = { ok: false, status: 0, error: String(error?.message || error), checkedAt: new Date().toISOString() };
    await cacheSet(cacheKey, payload, ttlSeconds);
    return payload;
  }
}

export async function validatePublicSources(input: { country?: string; domains?: string[]; emails?: string[] }) {
  const country = String(input.country || 'ANY').trim().toUpperCase();
  const sources = await configuredSources();
  const eligible = sources.filter((item) => Boolean(item.isActive) && (item.countryCode === country || item.countryCode === 'ANY'));
  const domains = new Set((input.domains || []).map((item) => String(item || '').toLowerCase()));
  const emailDomains = new Set((input.emails || []).map((item) => String(item || '').split('@')[1] || '').filter(Boolean).map((item) => item.toLowerCase()));

  const checks = [];
  for (const source of eligible) {
    const endpointHost = source.endpointUrl.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
    const domainMatch = domains.has(endpointHost) || emailDomains.has(endpointHost) || Array.from(domains).some((value) => value.endsWith(endpointHost));
    const probe = await probeEndpoint(source.endpointUrl, Number(source.cacheTtlSeconds || 3600));
    checks.push({
      sourceId: source.id,
      issuerType: source.issuerType,
      issuerName: source.issuerName,
      endpointUrl: source.endpointUrl,
      domainMatch,
      probe
    });
  }

  return {
    country,
    matchedSources: checks.filter((item) => item.domainMatch).length,
    checks
  };
}