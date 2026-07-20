import { getCheckDefinition, getCheckRegistrySummary, type EvidenceEngineName } from './check_registry';

export type EvidenceCheckStatus = 'passed' | 'warning' | 'failed' | 'not_applicable';

export interface EvidenceCheck {
  id: string;
  label: string;
  engine: EvidenceEngineName;
  status: EvidenceCheckStatus;
  severity: 'low' | 'medium' | 'high';
  message: string;
  impact: 'positive' | 'neutral' | 'negative';
  scoreImpact: number;
}

export interface EvidenceReport {
  architecture: {
    version: string;
    strategy: string;
    engines: EvidenceEngineName[];
  };
  summary: {
    catalogSize: number;
    performed: number;
    passed: number;
    warning: number;
    failed: number;
    notApplicable: number;
    criticalFailures: number;
    weightedRiskScore: number;
    weightedTrustScore: number;
  };
  engines: Array<{
    engine: EvidenceEngineName;
    performed: number;
    passed: number;
    warning: number;
    failed: number;
  }>;
  decisionDrivers: {
    positive: string[];
    warning: string[];
    negative: string[];
  };
  analyzed: string[];
  checks: EvidenceCheck[];
}

interface EvidenceTrust {
  authenticityPercentage?: number;
  riskScore?: number;
  confidence?: number;
  riskLevel?: string;
  likelyFraud?: boolean;
  indicators?: Array<{ code?: unknown; severity?: unknown; reason?: unknown }>;
  calibration?: { enabled?: boolean; sampleSize?: number } | null;
}

interface SingleEvidenceInput {
  fileName: string;
  extractionMode: 'text' | 'metadata-fallback';
  text: string;
  forensic: any;
  contextual: any;
  externalValidation: any;
  trust: EvidenceTrust;
  serviceReports?: any;
}

interface CaseEvidenceInput {
  fileNames: string[];
  documentResults: Array<{ fileName: string; status: 'done' | 'failed'; extractionMode: 'text' | 'metadata-fallback'; forensic?: any }>;
  caseAnalysis: any;
  contextual: any;
  externalValidation: any;
  trust: EvidenceTrust;
  serviceReports?: any;
}

const ENGINE_ORDER: EvidenceEngineName[] = [
  'preprocessing',
  'ocr',
  'forensics',
  'metadata',
  'content',
  'contextual',
  'external',
  'cross_document',
  'decision'
];

const ENGINE_WEIGHTS: Record<EvidenceEngineName, number> = {
  preprocessing: 0.9,
  ocr: 1.0,
  forensics: 1.5,
  metadata: 1.2,
  content: 1.1,
  contextual: 0.7,
  external: 1.4,
  cross_document: 1.3,
  decision: 1.2
};

const SEVERITY_WEIGHTS: Record<'low' | 'medium' | 'high', number> = {
  low: 1,
  medium: 2,
  high: 4
};

function normalizeCode(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function indicatorSet(indicators: Array<{ code?: unknown }> | undefined) {
  return new Set((Array.isArray(indicators) ? indicators : []).map((item) => normalizeCode(item?.code)));
}

function indicatorCounts(indicators: Array<{ severity?: unknown }> | undefined) {
  const rows = Array.isArray(indicators) ? indicators : [];
  return {
    high: rows.filter((item) => normalizeCode(item?.severity) === 'high').length,
    medium: rows.filter((item) => normalizeCode(item?.severity) === 'medium').length,
    low: rows.filter((item) => normalizeCode(item?.severity) === 'low').length
  };
}

function summarizeChecks(checks: EvidenceCheck[]): EvidenceReport {
  const registrySummary = getCheckRegistrySummary();
  const performedChecks = checks.filter((item) => item.status !== 'not_applicable');
  const riskAccumulator = performedChecks
    .filter((item) => item.scoreImpact < 0)
    .reduce((acc, item) => acc + Math.abs(item.scoreImpact), 0);
  const trustAccumulator = performedChecks
    .filter((item) => item.scoreImpact > 0)
    .reduce((acc, item) => acc + item.scoreImpact, 0);
  const engines = ENGINE_ORDER.map((engine) => {
    const rows = performedChecks.filter((item) => item.engine === engine);
    return {
      engine,
      performed: rows.length,
      passed: rows.filter((item) => item.status === 'passed').length,
      warning: rows.filter((item) => item.status === 'warning').length,
      failed: rows.filter((item) => item.status === 'failed').length
    };
  }).filter((item) => item.performed > 0);

  const toMessages = (impact: EvidenceCheck['impact']) => checks
    .filter((item) => item.impact === impact && item.status !== 'not_applicable')
    .slice(0, 8)
    .map((item) => item.message);

  return {
    architecture: {
      version: 'evidence-engine-2026.07-v1',
      strategy: 'multiengine-weighted-evidence',
      engines: ENGINE_ORDER
    },
    summary: {
      catalogSize: registrySummary.totalChecks,
      performed: performedChecks.length,
      passed: performedChecks.filter((item) => item.status === 'passed').length,
      warning: performedChecks.filter((item) => item.status === 'warning').length,
      failed: performedChecks.filter((item) => item.status === 'failed').length,
      notApplicable: checks.filter((item) => item.status === 'not_applicable').length,
      criticalFailures: performedChecks.filter((item) => item.status === 'failed' && item.severity === 'high').length,
      weightedRiskScore: Number(riskAccumulator.toFixed(2)),
      weightedTrustScore: Number(trustAccumulator.toFixed(2))
    },
    engines,
    decisionDrivers: {
      positive: toMessages('positive'),
      warning: toMessages('neutral'),
      negative: toMessages('negative')
    },
    analyzed: [],
    checks
  };
}

function buildCheck(
  id: string,
  status: EvidenceCheckStatus,
  message: string,
  impact: EvidenceCheck['impact'],
  severity?: 'low' | 'medium' | 'high'
): EvidenceCheck {
  const definition = getCheckDefinition(id);
  const resolvedSeverity = severity || definition.defaultSeverity;
  const engineWeight = ENGINE_WEIGHTS[definition.engine] || 1;
  const severityWeight = SEVERITY_WEIGHTS[resolvedSeverity] || 1;
  const base = engineWeight * severityWeight;
  let scoreImpact = 0;
  if (status === 'passed' && impact === 'positive') scoreImpact = base;
  if (status === 'warning' || impact === 'neutral') scoreImpact = -(base * 0.45);
  if (status === 'failed' || impact === 'negative') scoreImpact = -(base * 1.25);

  return {
    id,
    label: definition.label,
    engine: definition.engine,
    status,
    severity: resolvedSeverity,
    message,
    impact,
    scoreImpact: Number(scoreImpact.toFixed(2))
  };
}

function buildMetadataStatus(forensic: any) {
  const format = normalizeCode(forensic?.metadata?.formatDetails?.format || 'other');
  const indicators = Array.isArray(forensic?.checks?.metadataIndicators) ? forensic.checks.metadataIndicators : [];
  const codes = indicatorSet(indicators);
  const suspiciousEditor = Array.from(codes).some((code) => code.includes('context-mismatch'));
  const temporalConflict = Array.from(codes).some((code) => code.includes('date-conflict'));
  return {
    format,
    indicators,
    suspiciousEditor,
    temporalConflict,
    parsed: format !== 'other' || Object.keys(forensic?.metadata?.formatDetails || {}).length > 1
  };
}

function buildSingleChecks(input: SingleEvidenceInput) {
  const checks: EvidenceCheck[] = [];
  const text = normalizeText(input.text);
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const extracted = input.forensic?.checks?.extractedFields || {};
  const docType = normalizeCode(input.forensic?.checks?.documentType || input.forensic?.summary?.documentType || 'unknown');
  const indicators = Array.isArray(input.trust?.indicators) ? input.trust.indicators : [];
  const indicatorCodes = indicatorSet(indicators);
  const counts = indicatorCounts(indicators);
  const metadata = buildMetadataStatus(input.forensic);
  const authenticity = Number(input.trust?.authenticityPercentage ?? input.forensic?.summary?.authenticityScore ?? input.forensic?.score ?? 0);
  const riskScore = Number(input.trust?.riskScore ?? 0);
  const confidence = Number(input.trust?.confidence ?? 0);
  const contextualChecks = Array.isArray(input.contextual?.checks) ? input.contextual.checks : [];
  const reachableDomains = contextualChecks.filter((item: any) => item?.result?.ok).length;
  const allDomains = Array.isArray(input.contextual?.found?.domains) ? input.contextual.found.domains : [];
  const allEmails = Array.isArray(input.contextual?.found?.emails) ? input.contextual.found.emails : [];
  const external = input.externalValidation || { enabled: false, decision: 'internal_only', providers: {} };
  const publicSources = Array.isArray(input.contextual?.publicSources?.checks) ? input.contextual.publicSources.checks : [];
  const matchedPublicSources = publicSources.filter((item: any) => item?.domainMatch && item?.probe?.ok);
  const visionQr = input.serviceReports?.vision?.qrBarcode?.payload?.codes || null;
  const visionLogos = input.serviceReports?.vision?.logos?.payload?.logos || null;
  const visionStamps = input.serviceReports?.vision?.stamps?.payload?.stamps || null;
  const visionSignatures = input.serviceReports?.vision?.signatures?.payload?.signatures || null;
  const forensicsPdf = input.serviceReports?.forensics?.pdf?.payload?.pdf || null;
  const isFinancial = docType === 'income-statement' || docType === 'bank-statement';
  const isIdentity = docType === 'identity';
  const isResidence = docType === 'residence-proof';

  const push = (check: EvidenceCheck) => checks.push(check);
  const pushBool = (
    id: string,
    passCondition: boolean,
    failMessage: string,
    passMessage: string,
    severity: 'low' | 'medium' | 'high' = 'medium',
    warningCondition?: boolean,
    warningMessage?: string
  ) => {
    if (warningCondition) {
      push(buildCheck(id, 'warning', warningMessage || failMessage, 'neutral', severity));
      return;
    }
    push(buildCheck(id, passCondition ? 'passed' : 'failed', passCondition ? passMessage : failMessage, passCondition ? 'positive' : 'negative', severity));
  };
  const pushNA = (id: string, message: string) => {
    push(buildCheck(id, 'not_applicable', message, 'neutral', 'low'));
  };

  pushBool('prep.file-size', Number(input.forensic?.metadata?.size || 0) > 0, 'Ficheiro sem tamanho valido para analise.', 'Ficheiro recebido com tamanho valido.', 'high');
  pushBool('prep.format-supported', Boolean(input.forensic?.metadata?.ext), 'Formato nao identificado para verificacao.', `Formato ${input.forensic?.metadata?.ext || 'desconhecido'} identificado para verificacao.`, 'medium');
  pushBool('prep.text-extracted', words.length > 0, 'Nao foi possivel obter texto utilizavel do documento.', 'Texto utilizavel foi extraido do documento.', 'high');
  pushBool('prep.extraction-mode', input.extractionMode === 'text', 'Analise dependeu de fallback por metadados sem texto extraivel.', 'Extracao direta de texto/OCR concluida sem fallback.', 'medium', input.extractionMode === 'metadata-fallback', 'Documento sem texto extraivel exigiu fallback por metadados.');
  pushBool('prep.word-coverage', words.length >= 20, 'Conteudo textual insuficiente para verificacao forte.', `Conteudo textual suficiente para avaliacao (${words.length} palavras).`, 'high', words.length > 0 && words.length < 20, `Conteudo textual reduzido (${words.length} palavras) limita parte das validacoes.`);

  pushBool('ocr.document-type', docType !== 'unknown', 'Tipo documental nao foi identificado com confianca.', `Tipo documental identificado como ${docType}.`, 'medium');
  pushBool('ocr.dates', Array.isArray(extracted?.dates) && extracted.dates.length > 0, 'Nenhuma data estruturada foi reconhecida no conteudo.', 'Datas relevantes foram reconhecidas no conteudo.', 'low', docType === 'unknown', 'Documento sem classificacao forte; datas reconhecidas podem ser irrelevantes.');
  pushBool('ocr.contacts', allEmails.length > 0 || Array.isArray(extracted?.phones) && extracted.phones.length > 0, 'Nao foram reconhecidos emails ou telefones estruturados.', 'Entidades de contacto foram reconhecidas no documento.', 'low', isIdentity || isResidence, 'Entidades de contacto nao sao obrigatorias para este tipo documental.');
  if (isIdentity) {
    pushBool('ocr.identity-id', Array.isArray(extracted?.idNumbers) && extracted.idNumbers.length > 0, 'Documento de identidade sem identificador reconhecido.', 'Identificador oficial reconhecido no documento.', 'high');
    pushBool('ocr.identity-name', Array.isArray(extracted?.fullNames) && extracted.fullNames.length > 0, 'Documento de identidade sem nome legivel extraido.', 'Nome principal reconhecido no documento.', 'medium');
  } else {
    pushNA('ocr.identity-id', 'Verificacao especifica para documentos de identidade.');
    pushNA('ocr.identity-name', 'Verificacao especifica para documentos de identidade.');
  }
  if (docType === 'income-statement') {
    pushBool('ocr.income-employer', Array.isArray(extracted?.employers) && extracted.employers.length > 0, 'Declaracao de rendimentos sem entidade patronal reconhecida.', 'Entidade patronal reconhecida na declaracao.', 'high');
    pushBool('ocr.income-values', Array.isArray(extracted?.amounts) && extracted.amounts.length > 0, 'Declaracao de rendimentos sem valores monetarios extraiveis.', 'Valores monetarios reconhecidos na declaracao.', 'medium');
  } else {
    pushNA('ocr.income-employer', 'Verificacao especifica para comprovativos de rendimento.');
    pushNA('ocr.income-values', 'Verificacao especifica para comprovativos de rendimento.');
  }
  if (docType === 'bank-statement') {
    pushBool('ocr.bank-identifiers', (Array.isArray(extracted?.accountNumbers) && extracted.accountNumbers.length > 0) || (Array.isArray(extracted?.ibanLike) && extracted.ibanLike.length > 0), 'Extrato bancario sem identificador bancario reconhecivel.', 'Identificadores bancarios reconhecidos no extrato.', 'high');
    pushBool('ocr.bank-values', Array.isArray(extracted?.amounts) && extracted.amounts.length >= 2, 'Extrato bancario sem massa minima de valores para coerencia.', 'Extrato bancario com valores suficientes para validacao.', 'medium');
  } else {
    pushNA('ocr.bank-identifiers', 'Verificacao especifica para extratos bancarios.');
    pushNA('ocr.bank-values', 'Verificacao especifica para extratos bancarios.');
  }

  pushBool('forensics.authenticity-score', authenticity >= 75, `Score forense baixo (${authenticity}%).`, `Score forense consistente (${authenticity}%).`, 'high', authenticity >= 55 && authenticity < 75, `Score forense intermedio (${authenticity}%) recomenda corroboracao adicional.`);
  pushBool('forensics.ai-likelihood', normalizeCode(input.forensic?.checks?.aiLikelihood) === 'likely-human', 'Heuristicas indicam forte probabilidade de texto gerado por IA.', 'Nao ha sinais fortes de geracao artificial.', 'medium', normalizeCode(input.forensic?.checks?.aiLikelihood) === 'possible-ai', 'Existem sinais moderados de geracao artificial que exigem cautela.');
  pushBool('forensics.date-consistency', normalizeCode(input.forensic?.checks?.dateConsistency) === 'consistent', 'Datas do conteudo divergem dos metadados do ficheiro.', 'Datas do conteudo estao coerentes com os metadados observados.', 'high', normalizeCode(input.forensic?.checks?.dateConsistency) === 'unknown', 'Nao foi possivel confirmar consistencia temporal completa.');
  pushBool('forensics.high-indicators', counts.high === 0, `Foram encontrados ${counts.high} indicadores criticos de fraude/adulteracao.`, 'Nao foram encontrados indicadores criticos.', 'high');
  pushBool('forensics.medium-indicators', counts.medium <= 1, `Foram encontrados ${counts.medium} sinais medios com impacto relevante.`, 'Quantidade de sinais medios dentro do limite seguro.', 'medium', counts.medium >= 2 && counts.medium <= 3, `Foram encontrados ${counts.medium} sinais medios que recomendam observacao.`);
  pushBool('forensics.image-dimensions', Boolean(input.forensic?.metadata?.dimensions), 'Documento de imagem sem dimensoes estruturais disponiveis.', 'Dimensoes da imagem foram lidas para analise estrutural.', 'low', metadata.format !== 'image', 'Verificacao aplicavel apenas a documentos baseados em imagem.');

  pushBool('metadata.parsed', metadata.parsed, 'Nao foi possivel extrair metadados do formato.', 'Metadados tecnicos do formato foram extraidos.', 'medium', metadata.format === 'other', 'Formato sem metadados estruturados ricos para esta verificacao.');
  pushBool('metadata.suspicious-editor', !metadata.suspiciousEditor, 'Metadados apontam para software de edicao incomum para documento formal.', 'Nao foram encontrados editores tecnicos incompativeis com o contexto.', 'medium');
  pushBool('metadata.temporal-conflicts', !metadata.temporalConflict, 'Metadados apresentam conflito temporal interno ou com o conteudo.', 'Metadados nao apresentam conflitos temporais relevantes.', 'high');
  pushBool('metadata.indicator-pressure', metadata.indicators.length === 0, `Metadados produziram ${metadata.indicators.length} alertas tecnicos.`, 'Nao foram encontrados alertas tecnicos relevantes em metadados.', 'medium', metadata.indicators.length > 0 && metadata.indicators.length <= 2, `Metadados produziram ${metadata.indicators.length} alertas que requerem observacao.`);

  pushBool('content.template-markers', !indicatorCodes.has('template-like-content'), 'Foram encontrados marcadores de modelo, amostra ou geracao artificial.', 'Nao foram encontrados marcadores de template ou amostra.', 'high');
  pushBool('content.repetition', !indicatorCodes.has('character-repetition'), 'Conteudo apresenta repeticao anomala de caracteres.', 'Conteudo textual nao apresenta repeticao anomala.', 'medium');
  pushBool('content.minimal-content', !indicatorCodes.has('too-little-content'), 'Conteudo curto limita verificacoes de autenticidade.', 'Conteudo textual suficiente para validacao contextual.', 'high');
  pushBool('content.document-signals', (Array.isArray(extracted?.fullNames) && extracted.fullNames.length > 0) || (Array.isArray(extracted?.idNumbers) && extracted.idNumbers.length > 0) || (Array.isArray(extracted?.accountNumbers) && extracted.accountNumbers.length > 0), 'Nao foram reconhecidos campos nucleares suficientes.', 'Foram reconhecidos campos nucleares relevantes para este documento.', 'medium');
  if (isFinancial) {
    pushBool('content.financial-coherence-ready', Array.isArray(extracted?.amounts) && extracted.amounts.length > 0, 'Documento financeiro sem valores suficientes para testes de coerencia.', 'Documento financeiro com valores para testes de coerencia.', 'medium');
  } else {
    pushNA('content.financial-coherence-ready', 'Verificacao especifica para documentos financeiros.');
  }
  pushBool('vision.logo-detection', Boolean(visionLogos?.candidateCount || visionLogos?.boxes?.length), 'Nao foram identificados logotipos visuais relevantes.', 'Foram identificados candidatos visuais a logotipo.', 'low', !input.serviceReports?.vision?.logos?.available && !input.serviceReports?.vision?.logos?.ok, 'Motor visual de logotipos indisponivel nesta analise.');
  pushBool('vision.stamp-detection', Boolean(visionStamps?.detected), 'Nao foram identificados selos/carimbos visuais.', 'Foram identificados selos/carimbos visuais.', 'medium', visionStamps && !visionStamps.detected, 'Selo/carimbo nao foi visualmente confirmado.');
  pushBool('vision.signature-detection', Boolean(visionSignatures?.signatureLike || visionSignatures?.candidateCount), 'Nao foi identificada assinatura visualmente consistente.', 'Foi identificada assinatura visualmente consistente.', 'medium', visionSignatures && !visionSignatures.signatureLike, 'Assinatura visual requer corroboracao adicional.');
  pushBool('vision.qr-detection', Boolean(visionQr?.qrDetected), 'Nao foi identificado QR Code no documento.', 'QR Code identificado no documento.', 'medium', !visionQr, 'Motor de QR Code indisponivel nesta analise.');
  pushBool('vision.qr-decode', Boolean(visionQr?.qrValue), 'QR Code identificado, mas sem leitura valida.', 'QR Code lido com sucesso.', 'high', visionQr?.qrDetected && !visionQr?.qrValue, 'QR Code detetado mas nao decodificado.');
  pushBool('vision.logo-consistency', Boolean(visionLogos?.candidateCount || visionLogos?.boxes?.length), 'Nao foi possivel corroborar visualmente o logotipo esperado.', 'Logotipo visual com consistencia minima para corroboracao.', 'medium', !visionLogos, 'Consistencia de logotipo depende de motor visual adicional.');
  pushBool('vision.signature-consistency', Boolean(visionSignatures?.signatureLike || visionSignatures?.candidateCount), 'Assinatura visual inconsistente ou ausente.', 'Assinatura visual coerente com documento formal.', 'high', !visionSignatures, 'Consistencia da assinatura depende de motor visual adicional.');

  pushBool('contextual.extraction', contextualChecks.length > 0 || allDomains.length > 0 || allEmails.length > 0, 'Nao foram encontradas evidencias contextuais publicas para corroboracao.', 'Foi executada extracao de evidencias contextuais.', 'low');
  pushBool('contextual.domains', allDomains.length > 0, 'Nao foram reconhecidos dominios contextuais.', 'Foram reconhecidos dominios potencialmente corroborantes.', 'low', isIdentity || isResidence, 'Dominios publicos podem nao ser obrigatorios para este tipo documental.');
  pushBool('contextual.emails', allEmails.length > 0, 'Nao foram reconhecidos emails contextuais.', 'Foram reconhecidos emails para corroboracao.', 'low', isIdentity || isResidence, 'Emails nao sao obrigatorios para este tipo documental.');
  pushBool('contextual.reachability', reachableDomains > 0, 'Nenhum dominio contextual respondeu positivamente na verificacao.', 'Pelo menos um dominio contextual respondeu positivamente.', 'low', allDomains.length > 0 && reachableDomains === 0, 'Dominios foram encontrados, mas sem confirmacao de alcance.');

  const providerRows = [external?.providers?.energent, external?.providers?.checkfile].filter(Boolean);
  pushBool('external.providers-available', external.enabled, 'Motores externos nao estavam disponiveis para corroboracao.', 'Pelo menos um motor externo foi executado.', 'medium', !external.enabled, 'Validacao externa nao estava ativa nesta analise.');
  for (const provider of providerRows) {
    pushBool(`external.${provider.provider}`, provider.pass === true, `Motor ${provider.provider} devolveu estado ${provider.status || 'desconhecido'}.`, `Motor ${provider.provider} confirmou consistencia.`, 'medium', provider.enabled && provider.pass !== true, `Motor ${provider.provider} devolveu ${provider.status || 'resultado inconclusivo'}.`);
  }
  pushBool('external.combined-decision', normalizeCode(external?.decision) === 'approved' || normalizeCode(external?.decision) === 'internal_only', 'A validacao externa recomendou revisao manual.', 'Motores externos nao introduziram restricao adicional.', 'medium', normalizeCode(external?.decision) === 'manual_review', 'A validacao externa recomendou revisao manual.');
  pushBool('external.public-registry-match', matchedPublicSources.length > 0, 'Nenhuma fonte publica configurada corroborou o emissor ou dominio.', 'Fontes publicas configuradas corroboraram o emissor/dominio.', 'medium', publicSources.length > 0 && matchedPublicSources.length === 0, 'Fontes publicas foram consultadas sem correspondencia forte.');
  pushBool('external.issuer-domain-match', matchedPublicSources.length > 0 || allDomains.length > 0, 'Nao foi possivel ligar o documento a um dominio emissor confiavel.', 'Documento ligado a pelo menos um dominio emissor ou fonte publica.', 'medium', allDomains.length > 0 && matchedPublicSources.length === 0, 'Dominios foram encontrados, mas sem correspondencia publica confirmada.');
  pushBool('metadata.pdf-integrity', Boolean(forensicsPdf?.available || input.forensic?.metadata?.formatDetails?.format === 'pdf'), 'Integridade estrutural do PDF nao foi confirmada.', 'Integridade estrutural do PDF foi pelo menos parcialmente inspecionada.', 'high', input.forensic?.metadata?.ext !== '.pdf', 'Verificacao especifica para documentos PDF.');
  pushBool('metadata.pdf-hidden-objects', Number(forensicsPdf?.embeddedFileCount || 0) === 0, 'PDF contem ficheiros embebidos ou objetos adicionais que requerem validacao.', 'Nao foram encontrados ficheiros embebidos suspeitos no PDF.', 'high', input.forensic?.metadata?.ext !== '.pdf', 'Verificacao especifica para documentos PDF.');

  pushBool('decision.risk-band', riskScore <= 42, `Risco operacional elevado (${riskScore}%).`, `Risco operacional controlado (${riskScore}%).`, 'high', riskScore > 42 && riskScore < 70, `Risco operacional intermedio (${riskScore}%) requer observacao.`);
  pushBool('decision.confidence-band', confidence >= 70, `Confianca da IA insuficiente (${confidence}%).`, `Confianca da IA suficiente (${confidence}%).`, 'medium', confidence >= 55 && confidence < 70, `Confianca da IA moderada (${confidence}%) recomenda reforco manual.`);
  pushBool('decision.calibration', Boolean(input.trust?.calibration?.enabled), 'Calibracao especifica da empresa ainda nao esta ativa.', 'Calibracao da empresa esta ativa para este perfil documental.', 'low', !input.trust?.calibration?.enabled, 'Decisao suportada por politica global segura sem calibracao local.');
  pushBool('decision.likely-fraud', !Boolean(input.trust?.likelyFraud), 'Conjunto agregado de sinais apontou para provavel fraude.', 'Conjunto agregado de sinais nao aponta para fraude provavel.', 'high', Boolean(input.trust?.likelyFraud) && riskScore < 85, 'Conjunto agregado de sinais exige revisao antes de aprovacao.');

  const report = summarizeChecks(checks);
  report.analyzed = [
    `Documento ${input.fileName}`,
    'Motor OCR/extracao textual',
    'Motor de analise forense e metadados',
    'Motor de validacao de conteudo e regras',
    'Motor contextual/publico',
    external.enabled ? 'Motores externos especializados' : 'Sem motores externos ativos'
  ];
  return report;
}

function buildCaseChecks(input: CaseEvidenceInput) {
  const checks: EvidenceCheck[] = [];
  const indicators = Array.isArray(input.trust?.indicators) ? input.trust.indicators : [];
  const indicatorCodes = indicatorSet(indicators);
  const counts = indicatorCounts(indicators);
  const successfulDocs = input.documentResults.filter((item) => item.status === 'done');
  const fallbackDocs = successfulDocs.filter((item) => item.extractionMode === 'metadata-fallback').length;
  const avgAuthenticity = Number(input.trust?.authenticityPercentage ?? 0);
  const riskScore = Number(input.trust?.riskScore ?? 0);
  const confidence = Number(input.trust?.confidence ?? 0);
  const enabledExternal = Array.isArray(input.externalValidation?.documents)
    ? input.externalValidation.documents.filter((item: any) => item?.enabled)
    : [];
  const contextualChecks = Array.isArray(input.contextual?.checks) ? input.contextual.checks : [];
  const publicSources = Array.isArray(input.contextual?.publicSources?.checks) ? input.contextual.publicSources.checks : [];
  const matchedPublicSources = publicSources.filter((item: any) => item?.domainMatch && item?.probe?.ok);

  const push = (check: EvidenceCheck) => checks.push(check);
  const pushBool = (
    id: string,
    passCondition: boolean,
    failMessage: string,
    passMessage: string,
    severity: 'low' | 'medium' | 'high' = 'medium',
    warningCondition?: boolean,
    warningMessage?: string
  ) => {
    if (warningCondition) {
      push(buildCheck(id, 'warning', warningMessage || failMessage, 'neutral', severity));
      return;
    }
    push(buildCheck(id, passCondition ? 'passed' : 'failed', passCondition ? passMessage : failMessage, passCondition ? 'positive' : 'negative', severity));
  };

  pushBool('prep.case-doc-count', successfulDocs.length > 0, 'Nenhum documento do dossier ficou utilizavel.', `${successfulDocs.length} documento(s) do dossier ficaram utilizaveis.`, 'high');
  pushBool('prep.case-fallback-pressure', fallbackDocs === 0, `${fallbackDocs} documento(s) dependeram de fallback por metadados.`, 'Nenhum documento do dossier dependeu de fallback por metadados.', 'medium', fallbackDocs > 0 && fallbackDocs < successfulDocs.length, `${fallbackDocs} documento(s) do dossier dependeram de fallback por metadados.`);
  pushBool('prep.case-all-processed', successfulDocs.length === input.documentResults.length, 'Um ou mais documentos do dossier falharam no processamento.', 'Todos os documentos do dossier foram processados.', 'medium', successfulDocs.length > 0 && successfulDocs.length < input.documentResults.length, 'Parte do dossier falhou no processamento.');

  pushBool('cross.name-consistency', !indicatorCodes.has('name-mismatch'), 'Existem nomes divergentes entre documentos do dossier.', 'Nao foram encontrados conflitos relevantes de nome.', 'medium');
  pushBool('cross.id-consistency', !indicatorCodes.has('id-mismatch'), 'Existem identificadores oficiais divergentes no dossier.', 'Nao foram encontrados conflitos de identificadores oficiais.', 'high');
  pushBool('cross.nuit-consistency', !indicatorCodes.has('nuit-mismatch'), 'Existem NUITs divergentes no dossier.', 'NUITs presentes estao coerentes entre documentos.', 'high');
  pushBool('cross.employer-consistency', !indicatorCodes.has('employer-mismatch'), 'Entidade patronal inconsistente entre documentos.', 'Entidade patronal coerente entre documentos analisados.', 'medium');
  pushBool('cross.bank-recency', !indicatorCodes.has('outdated-bank-statement'), 'Extrato bancario parece desatualizado para a decisao.', 'Extrato bancario nao aparenta estar desatualizado.', 'medium');
  pushBool('cross.income-bank-coherence', !indicatorCodes.has('income-bank-inconsistency'), 'Valores declarados e comportamento financeiro nao sao coerentes.', 'Padrao financeiro coerente com os rendimentos declarados.', 'medium');

  pushBool('forensics.case-authenticity', avgAuthenticity >= 75, `Score agregado do dossier baixo (${avgAuthenticity}%).`, `Score agregado do dossier consistente (${avgAuthenticity}%).`, 'high', avgAuthenticity >= 55 && avgAuthenticity < 75, `Score agregado do dossier intermedio (${avgAuthenticity}%).`);
  pushBool('forensics.case-high-indicators', counts.high === 0, `Foram encontrados ${counts.high} sinais criticos no dossier.`, 'Nao foram encontrados sinais criticos no dossier.', 'high');
  pushBool('forensics.case-medium-indicators', counts.medium <= 1, `Foram encontrados ${counts.medium} sinais medios no dossier.`, 'Sinais medios do dossier mantiveram-se sob controlo.', 'medium', counts.medium >= 2 && counts.medium <= 3, `Foram encontrados ${counts.medium} sinais medios no dossier.`);

  pushBool('contextual.case-context', contextualChecks.length > 0, 'Dossier sem corroboracao contextual publica.', 'Dossier com sinais contextuais adicionais.', 'low');
  pushBool('external.public-registry-match', matchedPublicSources.length > 0, 'Nenhuma fonte publica configurada corroborou o emissor do dossier.', 'Fontes publicas configuradas corroboraram o emissor do dossier.', 'medium', publicSources.length > 0 && matchedPublicSources.length === 0, 'Fontes publicas foram consultadas sem correspondencia forte para o dossier.');
  pushBool('external.case-engines', enabledExternal.length > 0, 'Nenhum motor externo ficou ativo no dossier.', `${enabledExternal.length} validacao(oes) externas executadas no dossier.`, 'medium', Array.isArray(input.externalValidation?.documents) && input.externalValidation.documents.length > 0 && enabledExternal.length === 0, 'Chamadas externas foram tentadas mas nao corroboraram o dossier.');
  pushBool('external.case-decision', normalizeCode(input.externalValidation?.decision) === 'approved' || normalizeCode(input.externalValidation?.decision) === 'internal_only', 'Validacao externa do dossier recomendou revisao manual.', 'Validacao externa do dossier nao criou bloqueio adicional.', 'medium', normalizeCode(input.externalValidation?.decision) === 'manual_review', 'Validacao externa do dossier recomendou revisao manual.');

  pushBool('decision.case-risk', riskScore <= 42, `Risco agregado do dossier elevado (${riskScore}%).`, `Risco agregado do dossier controlado (${riskScore}%).`, 'high', riskScore > 42 && riskScore < 70, `Risco agregado do dossier intermedio (${riskScore}%).`);
  pushBool('decision.case-confidence', confidence >= 70, `Confianca da IA no dossier insuficiente (${confidence}%).`, `Confianca da IA no dossier suficiente (${confidence}%).`, 'medium', confidence >= 55 && confidence < 70, `Confianca da IA no dossier moderada (${confidence}%).`);
  pushBool('decision.case-fraud', !Boolean(input.trust?.likelyFraud), 'Sinais agregados do dossier apontam para fraude provavel.', 'Sinais agregados do dossier nao apontam para fraude provavel.', 'high', Boolean(input.trust?.likelyFraud) && riskScore < 85, 'Sinais agregados do dossier exigem revisao manual.');

  const report = summarizeChecks(checks);
  report.analyzed = [
    `Dossier com ${input.fileNames.length} documento(s)`,
    'Motor de extração/OCR por documento',
    'Motor de consistencia cruzada entre documentos',
    'Motor forense e de metadados',
    'Motor contextual/publico',
    enabledExternal.length ? 'Motores externos especializados por documento' : 'Sem motores externos ativos'
  ];
  return report;
}

export function buildSingleDocumentEvidenceReport(input: SingleEvidenceInput): EvidenceReport {
  return buildSingleChecks(input);
}

export function buildCaseEvidenceReport(input: CaseEvidenceInput): EvidenceReport {
  return buildCaseChecks(input);
}