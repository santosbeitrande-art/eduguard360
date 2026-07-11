import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

type ExternalDecision = 'approved' | 'manual_review' | 'internal_only';
type ProviderName = 'energent' | 'checkfile';

export interface ProviderValidationResult {
  provider: ProviderName;
  enabled: boolean;
  ok: boolean;
  pass: boolean | null;
  status: string;
  reason?: string;
  responseCode?: number;
}

export interface ExternalValidationResult {
  enabled: boolean;
  decision: ExternalDecision;
  providers: {
    energent: ProviderValidationResult;
    checkfile: ProviderValidationResult;
  };
}

export interface ExternalValidationInput {
  jobId: string;
  companyId: string;
  filePath: string;
  fileName: string;
  text: string;
}

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function toLimitedText(value: unknown, max = 140) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function extractStatus(jsonPayload: any) {
  if (!jsonPayload || typeof jsonPayload !== 'object') return '';
  const direct = normalizeStatus(jsonPayload.status);
  if (direct) return direct;
  const nested = normalizeStatus(jsonPayload?.result?.status);
  if (nested) return nested;
  const verification = normalizeStatus(jsonPayload?.verification?.status);
  if (verification) return verification;
  return '';
}

function isSemanticPass(status: string) {
  return ['ok', 'approved', 'valid', 'consistent', 'authentic'].includes(status);
}

function isIntegrityPass(status: string) {
  return ['valid', 'ok', 'approved', 'clean', 'authentic'].includes(status);
}

function buildSkippedResult(provider: ProviderName, reason: string): ProviderValidationResult {
  return {
    provider,
    enabled: false,
    ok: false,
    pass: null,
    status: 'skipped',
    reason
  };
}

async function callProvider(
  provider: ProviderName,
  endpoint: string | undefined,
  apiKey: string | undefined,
  timeoutMs: number,
  payload: Record<string, unknown>,
  passRule: (status: string) => boolean
): Promise<ProviderValidationResult> {
  if (!endpoint) return buildSkippedResult(provider, 'missing-endpoint');
  if (!apiKey) return buildSkippedResult(provider, 'missing-api-key');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const rawText = await res.text();
    let parsed: any = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = null;
    }

    const status = extractStatus(parsed);
    const pass = status ? passRule(status) : false;
    const reason = !status ? toLimitedText(rawText) || `http-${res.status}` : undefined;

    return {
      provider,
      enabled: true,
      ok: res.ok,
      pass: res.ok ? pass : false,
      status: status || 'unknown',
      reason,
      responseCode: res.status
    };
  } catch (error: any) {
    return {
      provider,
      enabled: true,
      ok: false,
      pass: false,
      status: 'error',
      reason: toLimitedText(error?.message || error)
    };
  } finally {
    clearTimeout(timer);
  }
}

export function combineExternalValidationResults(
  energent: ProviderValidationResult,
  checkfile: ProviderValidationResult
): ExternalValidationResult {
  const enabledProviders = [energent, checkfile].filter((item) => item.enabled);
  if (!enabledProviders.length) {
    return {
      enabled: false,
      decision: 'internal_only',
      providers: { energent, checkfile }
    };
  }

  const failedProvider = enabledProviders.find((item) => item.pass !== true);
  if (failedProvider) {
    return {
      enabled: true,
      decision: 'manual_review',
      providers: { energent, checkfile }
    };
  }

  return {
    enabled: true,
    decision: 'approved',
    providers: { energent, checkfile }
  };
}

export async function runExternalValidation(input: ExternalValidationInput): Promise<ExternalValidationResult> {
  const stats = fs.existsSync(input.filePath) ? fs.statSync(input.filePath) : null;
  const ext = path.extname(input.fileName || input.filePath).toLowerCase();
  const payload = {
    jobId: input.jobId,
    companyId: input.companyId,
    fileName: input.fileName,
    extension: ext,
    fileSize: stats?.size || 0,
    textSample: String(input.text || '').slice(0, 12000)
  };

  const energent = await callProvider(
    'energent',
    process.env.ENERGENT_API_URL,
    process.env.ENERGENT_API_KEY,
    Number(process.env.ENERGENT_TIMEOUT_MS || 12000),
    payload,
    isSemanticPass
  );

  const checkfile = await callProvider(
    'checkfile',
    process.env.CHECKFILE_API_URL,
    process.env.CHECKFILE_API_KEY,
    Number(process.env.CHECKFILE_TIMEOUT_MS || 12000),
    payload,
    isIntegrityPass
  );

  return combineExternalValidationResults(energent, checkfile);
}
