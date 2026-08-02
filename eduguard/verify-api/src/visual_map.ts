type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence?: number;
  severity: 'low' | 'medium' | 'high';
};

export interface VisualMap {
  version: string;
  generatedAt: string;
  image?: {
    width: number;
    height: number;
  } | null;
  boundingBoxes: Box[];
  heatmap: {
    gridRows: number;
    gridCols: number;
    values: number[][];
  };
  highlights: string[];
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function toRounded(value: number) {
  return Number(value.toFixed(4));
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pushBoxesFromVision(candidate: any, label: string, severity: 'low' | 'medium' | 'high', target: Box[]) {
  const boxes = Array.isArray(candidate?.boxes) ? candidate.boxes : [];
  for (const box of boxes) {
    const x = safeNumber(box?.x, 0);
    const y = safeNumber(box?.y, 0);
    const w = safeNumber(box?.w, 0);
    const h = safeNumber(box?.h, 0);
    if (w <= 0 || h <= 0) continue;
    target.push({
      x,
      y,
      w,
      h,
      label,
      confidence: Number.isFinite(Number(box?.confidence)) ? Number(box.confidence) : undefined,
      severity
    });
  }
}

function defaultHeatmap(rows = 8, cols = 8) {
  const values: number[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row: number[] = [];
    for (let c = 0; c < cols; c += 1) {
      row.push(0);
    }
    values.push(row);
  }
  return values;
}

function raiseHeatmapByBoxes(values: number[][], boxes: Box[], imageWidth: number, imageHeight: number, magnitude: number) {
  const rows = values.length;
  const cols = values[0]?.length || 0;
  if (!rows || !cols || imageWidth <= 0 || imageHeight <= 0) return;

  for (const box of boxes) {
    const x0 = clamp(box.x / imageWidth, 0, 1);
    const y0 = clamp(box.y / imageHeight, 0, 1);
    const x1 = clamp((box.x + box.w) / imageWidth, 0, 1);
    const y1 = clamp((box.y + box.h) / imageHeight, 0, 1);

    const startCol = Math.max(0, Math.floor(x0 * cols));
    const endCol = Math.min(cols - 1, Math.ceil(x1 * cols));
    const startRow = Math.max(0, Math.floor(y0 * rows));
    const endRow = Math.min(rows - 1, Math.ceil(y1 * rows));

    for (let r = startRow; r <= endRow; r += 1) {
      for (let c = startCol; c <= endCol; c += 1) {
        values[r][c] = toRounded(clamp(values[r][c] + magnitude));
      }
    }
  }
}

export function buildVisualMap(input: {
  fileName: string;
  serviceReports?: any;
  evidenceReport?: any;
}): VisualMap {
  const vision = input.serviceReports?.vision || null;
  const layoutPayload = vision?.layout?.payload?.layout || {};
  const image = layoutPayload?.image && Number(layoutPayload.image.width) > 0 && Number(layoutPayload.image.height) > 0
    ? {
      width: Number(layoutPayload.image.width),
      height: Number(layoutPayload.image.height)
    }
    : null;

  const boxes: Box[] = [];
  const layoutBlocks = Array.isArray(layoutPayload?.blocks)
    ? layoutPayload.blocks
    : [];

  for (const block of layoutBlocks.slice(0, 25)) {
    const x = safeNumber(block?.x, 0);
    const y = safeNumber(block?.y, 0);
    const w = safeNumber(block?.w, 0);
    const h = safeNumber(block?.h, 0);
    if (w <= 0 || h <= 0) continue;
    boxes.push({ x, y, w, h, label: 'layout-block', severity: 'low' });
  }

  const logos = vision?.logos?.payload?.logos;
  const stamps = vision?.stamps?.payload?.stamps;
  const signatures = vision?.signatures?.payload?.signatures;
  const qrCodes = vision?.qrBarcode?.payload?.codes;

  pushBoxesFromVision(logos, 'logo', 'medium', boxes);
  pushBoxesFromVision(stamps, 'stamp', 'medium', boxes);
  pushBoxesFromVision(signatures, 'signature', 'high', boxes);
  pushBoxesFromVision(qrCodes, 'qr-or-barcode', 'high', boxes);

  const heatmapValues = defaultHeatmap(8, 8);
  const imageWidth = image?.width || 0;
  const imageHeight = image?.height || 0;

  raiseHeatmapByBoxes(heatmapValues, boxes.filter((item) => item.severity === 'low'), imageWidth, imageHeight, 0.08);
  raiseHeatmapByBoxes(heatmapValues, boxes.filter((item) => item.severity === 'medium'), imageWidth, imageHeight, 0.18);
  raiseHeatmapByBoxes(heatmapValues, boxes.filter((item) => item.severity === 'high'), imageWidth, imageHeight, 0.28);

  const tampering = vision?.tampering?.payload?.tampering;
  if (tampering) {
    const edgeRatio = safeNumber(tampering?.edgeRatio, 0);
    const blurVariance = safeNumber(tampering?.blurVariance, 0);
    const suspicious = Boolean(tampering?.suspicious);
    const globalPenalty = clamp((edgeRatio * 0.5) + (suspicious ? 0.35 : 0) + (blurVariance < 18 ? 0.2 : 0));
    for (let r = 0; r < heatmapValues.length; r += 1) {
      for (let c = 0; c < heatmapValues[r].length; c += 1) {
        heatmapValues[r][c] = toRounded(clamp(heatmapValues[r][c] + globalPenalty * 0.18));
      }
    }
  }

  const checks = Array.isArray(input.evidenceReport?.checks) ? input.evidenceReport.checks : [];
  const highlights = checks
    .filter((item: any) => String(item?.status || '') === 'failed' || String(item?.status || '') === 'warning')
    .slice(0, 10)
    .map((item: any) => String(item?.message || item?.label || item?.id || 'check-alert'));

  return {
    version: 'visual-map-2026.08-v1',
    generatedAt: new Date().toISOString(),
    image,
    boundingBoxes: boxes,
    heatmap: {
      gridRows: heatmapValues.length,
      gridCols: heatmapValues[0]?.length || 0,
      values: heatmapValues
    },
    highlights
  };
}
