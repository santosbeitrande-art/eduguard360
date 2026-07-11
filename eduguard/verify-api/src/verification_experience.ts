type ExperienceStageStatus = 'ok' | 'attention' | 'info';

type ExperienceStage = {
  key: string;
  title: string;
  status: ExperienceStageStatus;
  summary: string;
  details: string[];
};

type ExperienceAction = {
  code: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
};

type ExperiencePayload = {
  summary: string;
  decisionTitle: string;
  stages: ExperienceStage[];
  actions: ExperienceAction[];
};

function documentTypeLabel(value: unknown) {
  const key = String(value || '').trim().toLowerCase();
  switch (key) {
    case 'identity':
      return 'documento de identidade';
    case 'income-statement':
      return 'comprovativo de rendimento';
    case 'bank-statement':
      return 'extrato bancario';
    case 'invoice':
      return 'fatura';
    case 'contract':
      return 'contrato';
    default:
      return 'documento geral';
  }
}

function formatCount(label: string, value: unknown) {
  const n = Number(value || 0);
  return n > 0 ? `${n} ${label}` : '';
}

function normalizeDetails(items: Array<string | undefined | null>) {
  return items.map((item) => String(item || '').trim()).filter(Boolean);
}

function buildActions(input: {
  likelyFraud: boolean;
  finalDecision: string;
  externalEnabled: boolean;
  externalDecision: string;
  hasHighIndicators: boolean;
}): ExperienceAction[] {
  const actions: ExperienceAction[] = [];

  if (input.finalDecision === 'aprovado' && !input.likelyFraud) {
    actions.push({
      code: 'approve-and-archive',
      priority: 'low',
      title: 'Aprovar e arquivar',
      description: 'Documento apto para seguir o fluxo normal com registo de auditoria.'
    });
  } else {
    actions.push({
      code: 'manual-review',
      priority: 'high',
      title: 'Enviar para revisao manual',
      description: 'Confirmar o documento com um operador antes de qualquer aprovacao final.'
    });
  }

  if (input.externalEnabled && input.externalDecision === 'manual_review') {
    actions.push({
      code: 'request-source-document',
      priority: 'high',
      title: 'Solicitar documento de origem',
      description: 'Pedir ficheiro original ou comprovativo adicional porque a validacao externa sinalizou atencao.'
    });
  }

  if (input.hasHighIndicators) {
    actions.push({
      code: 'escalate-risk',
      priority: 'medium',
      title: 'Escalar risco e registar incidente',
      description: 'Atualizar CRM, compliance ou fila de fraude com os sinais encontrados.'
    });
  } else {
    actions.push({
      code: 'notify-workflow',
      priority: 'medium',
      title: 'Disparar notificacoes e workflow',
      description: 'Notificar equipa, atualizar sistemas e gerar relatorio automatizado.'
    });
  }

  return actions;
}

export function buildSingleVerificationExperience(input: {
  fileName: string;
  text: string;
  forensic: any;
  trust: any;
  externalValidation: any;
  processingMode: string;
  finalDecision: string;
}): ExperiencePayload {
  const extracted = input.forensic?.checks?.extractedFields || {};
  const indicators = Array.isArray(input.trust?.indicators) ? input.trust.indicators : [];
  const highIndicators = indicators.filter((item: any) => item?.severity === 'high');
  const mediumIndicators = indicators.filter((item: any) => item?.severity === 'medium');
  const docType = documentTypeLabel(input.forensic?.summary?.documentType || input.forensic?.checks?.documentType);
  const textLength = String(input.text || '').trim().length;

  const extractionDetails = normalizeDetails([
    formatCount('datas extraidas', extracted?.dates?.length),
    formatCount('montantes encontrados', extracted?.amounts?.length),
    formatCount('IDs detetados', extracted?.idNumbers?.length),
    formatCount('emails detetados', extracted?.emails?.length),
    textLength ? `${textLength} caracteres analisados` : ''
  ]);

  const crossValidationStatus: ExperienceStageStatus = input.forensic?.checks?.dateConsistency === 'inconsistent' || highIndicators.length
    ? 'attention'
    : 'ok';

  const verdictStatus: ExperienceStageStatus = input.trust?.likelyFraud || input.finalDecision === 'revisao_manual'
    ? 'attention'
    : 'ok';

  return {
    summary: verdictStatus === 'ok'
      ? 'Analise concluida com sinais de consistencia suficientes para seguir fluxo normal.'
      : 'Analise concluida com sinais que exigem atencao antes da aprovacao.',
    decisionTitle: verdictStatus === 'ok' ? 'Compliant / aprovado' : 'Attention required / revisao manual',
    stages: [
      {
        key: 'understanding',
        title: 'Understanding',
        status: 'ok',
        summary: `O motor classificou o ficheiro como ${docType} no modo ${input.processingMode}.`,
        details: normalizeDetails([
          input.fileName,
          `autenticidade ${Number(input.trust?.authenticityPercentage || 0)}%`,
          `risco ${Number(input.trust?.riskScore || 0)}/100`
        ])
      },
      {
        key: 'extraction',
        title: 'Extraction',
        status: textLength > 0 ? 'ok' : 'attention',
        summary: textLength > 0
          ? 'Os dados principais foram extraidos para leitura e validacao.'
          : 'A extracao teve pouco conteudo util e deve ser revista.',
        details: extractionDetails
      },
      {
        key: 'cross-validation',
        title: 'Cross-validation',
        status: crossValidationStatus,
        summary: crossValidationStatus === 'ok'
          ? 'Os checks internos mantiveram consistencia suficiente entre datas, estrutura e sinais do documento.'
          : 'Foram encontrados sinais de incoerencia ou risco que enfraquecem a confianca.',
        details: normalizeDetails([
          `datas ${input.forensic?.summary?.dateConsistency || 'unknown'}`,
          `ai ${input.forensic?.summary?.aiLikelihood || 'unknown'}`,
          highIndicators.length ? `${highIndicators.length} indicador(es) de alto risco` : '',
          mediumIndicators.length ? `${mediumIndicators.length} indicador(es) medio(s)` : ''
        ])
      },
      {
        key: 'verdict',
        title: 'Verdict',
        status: verdictStatus,
        summary: input.externalValidation?.enabled
          ? `Decisao final: ${input.finalDecision}. Validacao externa: ${input.externalValidation?.decision || 'unknown'}.`
          : `Decisao final: ${input.finalDecision}. Resultado emitido pelo motor interno.`,
        details: normalizeDetails([
          `confianca ${Number(input.trust?.confidence || 0)}%`,
          input.externalValidation?.enabled ? 'enriquecido por APIs externas' : 'sem enriquecimento externo'
        ])
      }
    ],
    actions: buildActions({
      likelyFraud: Boolean(input.trust?.likelyFraud),
      finalDecision: input.finalDecision,
      externalEnabled: Boolean(input.externalValidation?.enabled),
      externalDecision: String(input.externalValidation?.decision || 'internal_only'),
      hasHighIndicators: highIndicators.length > 0
    })
  };
}

export function buildCaseVerificationExperience(input: {
  documents: any[];
  caseAnalysis: any;
  trust: any;
  externalValidation: any;
  processingMode: string;
  finalDecision: string;
}): ExperiencePayload {
  const docs = Array.isArray(input.documents) ? input.documents : [];
  const successful = docs.filter((item) => item?.status === 'done');
  const failed = docs.filter((item) => item?.status !== 'done');
  const indicators = Array.isArray(input.trust?.indicators) ? input.trust.indicators : [];
  const highIndicators = indicators.filter((item: any) => item?.severity === 'high');
  const documentTypes = Array.from(new Set(
    successful.map((item) => documentTypeLabel(item?.forensic?.summary?.documentType || item?.forensic?.checks?.documentType))
  )).filter(Boolean);
  const verdictStatus: ExperienceStageStatus = input.trust?.likelyFraud || input.finalDecision === 'revisao_manual'
    ? 'attention'
    : 'ok';

  return {
    summary: verdictStatus === 'ok'
      ? 'Dossier analisado com consistencia suficiente entre documentos.'
      : 'Dossier analisado com divergencias ou sinais de risco que exigem revisao.',
    decisionTitle: verdictStatus === 'ok' ? 'Compliant dossier' : 'Dossier requires attention',
    stages: [
      {
        key: 'understanding',
        title: 'Understanding',
        status: 'ok',
        summary: `O motor identificou ${successful.length} documento(s) validos no dossier em ${input.processingMode}.`,
        details: normalizeDetails([
          documentTypes.length ? `tipos: ${documentTypes.join(', ')}` : '',
          failed.length ? `${failed.length} ficheiro(s) sem extracao valida` : ''
        ])
      },
      {
        key: 'extraction',
        title: 'Extraction',
        status: failed.length ? 'attention' : 'ok',
        summary: failed.length
          ? 'Nem todos os documentos do dossier produziram extracao util.'
          : 'Os documentos do dossier foram lidos com sucesso para analise conjunta.',
        details: normalizeDetails([
          `${successful.length}/${docs.length} documento(s) analisado(s)`,
          `${successful.reduce((sum, item) => sum + Number(item?.textLength || 0), 0)} caracteres combinados`
        ])
      },
      {
        key: 'cross-validation',
        title: 'Cross-validation',
        status: highIndicators.length || (input.caseAnalysis?.indicators || []).length ? 'attention' : 'ok',
        summary: (input.caseAnalysis?.indicators || []).length
          ? 'Foram executados checks cruzados entre nomes, montantes, datas e referencias.'
          : 'Nao foram encontrados conflitos relevantes entre os documentos analisados.',
        details: normalizeDetails([
          `${(input.caseAnalysis?.indicators || []).length} indicador(es) cruzado(s)`,
          highIndicators.length ? `${highIndicators.length} indicador(es) de alto risco` : ''
        ])
      },
      {
        key: 'verdict',
        title: 'Verdict',
        status: verdictStatus,
        summary: input.externalValidation?.enabled
          ? `Decisao final do dossier: ${input.finalDecision}. Validacao externa agregada: ${input.externalValidation?.decision || 'unknown'}.`
          : `Decisao final do dossier: ${input.finalDecision}. Resultado emitido pelo motor interno.`,
        details: normalizeDetails([
          `autenticidade ${Number(input.trust?.authenticityPercentage || 0)}%`,
          `confianca ${Number(input.trust?.confidence || 0)}%`
        ])
      }
    ],
    actions: buildActions({
      likelyFraud: Boolean(input.trust?.likelyFraud),
      finalDecision: input.finalDecision,
      externalEnabled: Boolean(input.externalValidation?.enabled),
      externalDecision: String(input.externalValidation?.decision || 'internal_only'),
      hasHighIndicators: highIndicators.length > 0
    })
  };
}
