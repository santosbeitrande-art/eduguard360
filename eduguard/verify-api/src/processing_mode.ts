export const EXTERNAL_PROCESSING_MODE = 'api-external-orchestrated';

function normalizeHeaderValue(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim().toLowerCase();
  }
  return String(value || '').trim().toLowerCase();
}

export function getRequestedProcessingMode(headers: Record<string, unknown> = {}): string {
  const preferred = normalizeHeaderValue(headers['x-eduguard-required-processing-mode']);
  if (preferred) return preferred;
  return normalizeHeaderValue(headers['x-eduguard-processing-mode']);
}

export function isExternalProcessingModeRequired(headers: Record<string, unknown> = {}): boolean {
  return getRequestedProcessingMode(headers) === EXTERNAL_PROCESSING_MODE;
}
