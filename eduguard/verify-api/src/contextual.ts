import fetch from 'node-fetch';
import { URL } from 'url';

export function extractDomainsAndEntities(text: string) {
  const domains = new Set<string>();
  const emails = new Set<string>();
  const domainRegex = /([a-z0-9\-]+\.[a-z]{2,})(?:\/[\S]*)?/gi;
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  let m: RegExpExecArray | null;
  while ((m = domainRegex.exec(text))) {
    domains.add(m[1].toLowerCase());
  }
  while ((m = emailRegex.exec(text))) {
    emails.add(m[0].toLowerCase());
    const parts = m[0].split('@');
    if (parts[1]) domains.add(parts[1].toLowerCase());
  }
  return { domains: Array.from(domains), emails: Array.from(emails) };
}

async function checkUrl(url: string, timeoutMs = 5000) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(id);
    return { ok: res.ok, status: res.status };
  } catch (e: any) {
    return { ok: false, error: String(e.message || e) };
  }
}

export async function contextualizeText(text: string) {
  const found = extractDomainsAndEntities(text || '');
  const checks: any[] = [];
  for (const d of found.domains) {
    let url = d;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
      const r = await checkUrl(url);
      checks.push({ domain: d, url, result: r });
    } catch (e) {
      checks.push({ domain: d, url, error: String(e) });
    }
  }
  return { found, checks };
}

export default { extractDomainsAndEntities, contextualizeText };
