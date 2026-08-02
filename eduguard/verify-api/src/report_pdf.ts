function safe(value: unknown) {
  return String(value ?? '').trim();
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sectionTitle(doc: any, title: string) {
  doc.moveDown(0.6);
  doc.fontSize(13).fillColor('#0f172a').text(title, { underline: false });
  doc.moveDown(0.25);
}

function writeKeyValue(doc: any, key: string, value: string) {
  doc.fontSize(10).fillColor('#334155').text(`${key}: `, { continued: true });
  doc.fillColor('#0b1d2a').text(value || '-');
}

function drawHeatmapGrid(doc: any, heatmap: any) {
  const rows = Math.max(0, Number(heatmap?.gridRows || 0));
  const cols = Math.max(0, Number(heatmap?.gridCols || 0));
  const values = Array.isArray(heatmap?.values) ? heatmap.values : [];
  if (!rows || !cols || !values.length) {
    doc.fontSize(10).fillColor('#475569').text('Heatmap indisponivel para este job.');
    return;
  }

  const startX = doc.x;
  const startY = doc.y;
  const maxWidth = 440;
  const maxHeight = 160;
  const cellW = maxWidth / cols;
  const cellH = maxHeight / rows;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const value = num(values[r]?.[c], 0);
      const intensity = Math.max(0, Math.min(1, value));
      const red = Math.round(255);
      const green = Math.round(245 - (170 * intensity));
      const blue = Math.round(245 - (220 * intensity));
      doc
        .rect(startX + (c * cellW), startY + (r * cellH), cellW, cellH)
        .fillAndStroke(`rgb(${red},${green},${blue})`, '#cbd5e1');
    }
  }

  doc.moveDown(0.2);
  doc.y = startY + maxHeight + 8;
  doc.fontSize(9).fillColor('#64748b').text('Escala do heatmap: 0 (baixo risco) a 1 (alto risco).');
}

function writeChecks(doc: any, checks: any[]) {
  const rows = Array.isArray(checks) ? checks : [];
  if (!rows.length) {
    doc.fontSize(10).fillColor('#475569').text('Sem checks disponiveis.');
    return;
  }

  const selected = rows
    .filter((item) => String(item?.status || '') === 'failed' || String(item?.status || '') === 'warning')
    .slice(0, 25);

  if (!selected.length) {
    doc.fontSize(10).fillColor('#16a34a').text('Nenhum ponto suspeito relevante foi encontrado nos checks.');
    return;
  }

  for (const item of selected) {
    const status = safe(item?.status).toUpperCase();
    const severity = safe(item?.severity).toUpperCase();
    const label = safe(item?.label || item?.id || 'check');
    const message = safe(item?.message || '-');
    doc.fontSize(10).fillColor('#0b1d2a').text(`- [${status}/${severity}] ${label}`);
    doc.fontSize(9).fillColor('#475569').text(`  ${message}`);
  }
}

function writeBoundingBoxes(doc: any, boxes: any[]) {
  const rows = Array.isArray(boxes) ? boxes.slice(0, 30) : [];
  if (!rows.length) {
    doc.fontSize(10).fillColor('#475569').text('Nenhuma bounding box disponivel.');
    return;
  }

  for (const box of rows) {
    const label = safe(box?.label || 'area');
    const severity = safe(box?.severity || 'low').toUpperCase();
    const confidence = Number.isFinite(Number(box?.confidence)) ? `${Math.round(Number(box.confidence) * 100)}%` : '-';
    const coords = `x=${num(box?.x)}, y=${num(box?.y)}, w=${num(box?.w)}, h=${num(box?.h)}`;
    doc.fontSize(9).fillColor('#0b1d2a').text(`- ${label} | severidade=${severity} | confianca=${confidence} | ${coords}`);
  }
}

function toRiskLabel(riskScore: number) {
  if (riskScore <= 10) return 'Muito Baixo';
  if (riskScore <= 30) return 'Baixo';
  if (riskScore <= 55) return 'Medio';
  if (riskScore <= 80) return 'Alto';
  return 'Muito Alto';
}

export async function generateVerificationReportPdf(jobId: string, job: any): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `EduGuard Verify AI Report ${jobId}`,
      Author: 'EduGuard Verify AI',
      Subject: 'Document verification report'
    }
  });

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const result = job?.result || {};
  const decision = result?.decision || {};
  const trust = result?.trust || {};
  const summary = result?.summary || {};
  const evidenceReport = result?.evidenceReport || {};
  const visualMap = result?.visualMap || {};

  const authenticity = num(trust?.authenticityPercentage, num(summary?.authenticityScore, 0));
  const fraudProbability = num(trust?.riskScore, num(decision?.riskScore, 0));
  const confidence = num(decision?.confidence, num(trust?.confidence, 0));
  const riskLabel = toRiskLabel(fraudProbability);

  doc.fontSize(20).fillColor('#0b1d2a').text('EduGuard Verify AI - Relatorio Inteligente');
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#475569').text(`Job ID: ${jobId}`);
  doc.fontSize(10).fillColor('#475569').text(`Gerado em: ${new Date().toISOString()}`);
  doc.fontSize(10).fillColor('#475569').text(`Documento: ${safe(result?.auditReport?.document?.originalFileName || result?.documents?.[0]?.fileName || 'N/A')}`);

  sectionTitle(doc, 'Resumo Executivo');
  writeKeyValue(doc, 'Resultado geral', safe(decision?.statusLabel || result?.finalDecision || 'N/A'));
  writeKeyValue(doc, 'Decisao operacional', safe(decision?.approvalLabel || decision?.approval || 'N/A'));
  writeKeyValue(doc, 'Confiabilidade geral', `${authenticity.toFixed(2)}%`);
  writeKeyValue(doc, 'Indice de falsificacao', `${fraudProbability.toFixed(2)}%`);
  writeKeyValue(doc, 'Nivel de risco', riskLabel);
  writeKeyValue(doc, 'Confianca da IA', `${confidence.toFixed(2)}%`);

  sectionTitle(doc, 'Justificativa e Evidencias');
  doc.fontSize(10).fillColor('#0b1d2a').text(safe(decision?.justification || decision?.reason || 'Sem justificativa fornecida.'));

  sectionTitle(doc, 'Pontos Suspeitos e Alertas');
  writeChecks(doc, evidenceReport?.checks);

  if (doc.y > 700) {
    doc.addPage();
  }

  sectionTitle(doc, 'Mapa Visual - Bounding Boxes');
  writeBoundingBoxes(doc, visualMap?.boundingBoxes);

  sectionTitle(doc, 'Mapa Visual - Heatmap');
  drawHeatmapGrid(doc, visualMap?.heatmap);

  sectionTitle(doc, 'Metricas Tecnicas');
  writeKeyValue(doc, 'Checks executados', String(num(evidenceReport?.summary?.performed, 0)));
  writeKeyValue(doc, 'Checks aprovados', String(num(evidenceReport?.summary?.passed, 0)));
  writeKeyValue(doc, 'Checks com alerta', String(num(evidenceReport?.summary?.warning, 0)));
  writeKeyValue(doc, 'Checks falhados', String(num(evidenceReport?.summary?.failed, 0)));
  writeKeyValue(doc, 'Versao da politica', safe(decision?.ruleVersion || 'N/A'));
  writeKeyValue(doc, 'Versao do mapa visual', safe(visualMap?.version || 'N/A'));

  sectionTitle(doc, 'Conclusao');
  doc.fontSize(10).fillColor('#0b1d2a').text(
    `A decisao final foi ${safe(decision?.statusLabel || result?.finalDecision || 'N/A')} com indice de falsificacao ${fraudProbability.toFixed(2)}% e confiabilidade ${authenticity.toFixed(2)}%. Recomenda-se seguir a decisao operacional indicada e revisar os pontos suspeitos listados neste relatorio.`
  );

  doc.end();
  return done;
}
