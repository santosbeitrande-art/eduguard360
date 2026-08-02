export interface ServiceRequestPayload {
  jobId: string;
  filePath: string;
  fileName?: string;
  documentType?: string;
  text?: string;
}

export interface ServiceResponseEnvelope {
  available: boolean;
  service: string;
  endpoint: string | null;
  ok: boolean;
  status: string;
  contractVersion: string;
  durationMs: number;
  payload?: any;
  error?: string;
}

async function callService(baseUrl: string | undefined, route: string, payload: Record<string, unknown>, service: string): Promise<ServiceResponseEnvelope> {
  const startedAt = Date.now();
  const endpoint = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!endpoint) {
    return {
      available: false,
      service,
      endpoint: null,
      ok: false,
      status: 'disabled',
      contractVersion: 'service-contract-2026.08-v1',
      durationMs: Date.now() - startedAt,
      error: 'missing-service-url'
    };
  }

  try {
    const response = await fetch(`${endpoint}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const rawText = await response.text();
    let parsed: any = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = { rawText };
    }
    return {
      available: true,
      service,
      endpoint: `${endpoint}${route}`,
      ok: response.ok,
      status: response.ok ? 'ok' : `http-${response.status}`,
      contractVersion: 'service-contract-2026.08-v1',
      durationMs: Date.now() - startedAt,
      payload: parsed,
      error: response.ok ? undefined : String(parsed?.error || rawText || `http-${response.status}`)
    };
  } catch (error: any) {
    return {
      available: true,
      service,
      endpoint: `${endpoint}${route}`,
      ok: false,
      status: 'error',
      contractVersion: 'service-contract-2026.08-v1',
      durationMs: Date.now() - startedAt,
      error: String(error?.message || error)
    };
  }
}

export async function callOcrExtractService(input: ServiceRequestPayload) {
  return callService(process.env.OCR_SERVICE_URL, '/ocr/extract', {
    job_id: input.jobId,
    file_path: input.filePath,
    language: process.env.OCR_SERVICE_LANGUAGE || 'por'
  }, 'ocr-service');
}

export async function callVisionService(input: ServiceRequestPayload) {
  const [layout, tampering, logos, stamps, signatures, qrBarcode] = await Promise.all([
    callService(process.env.VISION_SERVICE_URL, '/vision/layout', {
      job_id: input.jobId,
      file_path: input.filePath,
      document_type: input.documentType || 'unknown'
    }, 'vision-layout'),
    callService(process.env.VISION_SERVICE_URL, '/vision/tampering', {
      job_id: input.jobId,
      file_path: input.filePath,
      document_type: input.documentType || 'unknown'
    }, 'vision-tampering'),
    callService(process.env.VISION_SERVICE_URL, '/vision/logo-detection', {
      job_id: input.jobId,
      file_path: input.filePath
    }, 'vision-logos'),
    callService(process.env.VISION_SERVICE_URL, '/vision/stamp-detection', {
      job_id: input.jobId,
      file_path: input.filePath
    }, 'vision-stamps'),
    callService(process.env.VISION_SERVICE_URL, '/vision/signature-detection', {
      job_id: input.jobId,
      file_path: input.filePath
    }, 'vision-signatures'),
    callService(process.env.VISION_SERVICE_URL, '/vision/qr-barcode', {
      job_id: input.jobId,
      file_path: input.filePath
    }, 'vision-qr-barcode')
  ]);

  return { layout, tampering, logos, stamps, signatures, qrBarcode };
}

export async function callForensicsService(input: ServiceRequestPayload) {
  const [pdf, image, signatures] = await Promise.all([
    callService(process.env.FORENSICS_SERVICE_URL, '/forensics/pdf', {
      job_id: input.jobId,
      file_path: input.filePath,
      file_name: input.fileName || null
    }, 'forensics-pdf'),
    callService(process.env.FORENSICS_SERVICE_URL, '/forensics/image', {
      job_id: input.jobId,
      file_path: input.filePath,
      file_name: input.fileName || null
    }, 'forensics-image'),
    callService(process.env.FORENSICS_SERVICE_URL, '/forensics/signatures', {
      job_id: input.jobId,
      file_path: input.filePath,
      file_name: input.fileName || null
    }, 'forensics-signatures')
  ]);

  return { pdf, image, signatures };
}