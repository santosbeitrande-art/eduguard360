export type EvidenceEngineName =
  | 'preprocessing'
  | 'ocr'
  | 'forensics'
  | 'metadata'
  | 'content'
  | 'contextual'
  | 'external'
  | 'cross_document'
  | 'decision';

export interface CheckDefinition {
  id: string;
  label: string;
  engine: EvidenceEngineName;
  defaultSeverity: 'low' | 'medium' | 'high';
  appliesTo: string[];
  deterministic: boolean;
}

const BASE_CHECK_DEFINITIONS: CheckDefinition[] = [
  { id: 'prep.file-size', label: 'Ficheiro com dados', engine: 'preprocessing', defaultSeverity: 'high', appliesTo: ['all'], deterministic: true },
  { id: 'prep.format-supported', label: 'Formato suportado', engine: 'preprocessing', defaultSeverity: 'medium', appliesTo: ['all'], deterministic: true },
  { id: 'prep.text-extracted', label: 'Texto extraido', engine: 'preprocessing', defaultSeverity: 'high', appliesTo: ['all'], deterministic: true },
  { id: 'prep.extraction-mode', label: 'Extracao primaria', engine: 'preprocessing', defaultSeverity: 'medium', appliesTo: ['all'], deterministic: false },
  { id: 'prep.word-coverage', label: 'Cobertura minima de conteudo', engine: 'preprocessing', defaultSeverity: 'high', appliesTo: ['single'], deterministic: false },
  { id: 'prep.case-doc-count', label: 'Numero de documentos utilizavel', engine: 'preprocessing', defaultSeverity: 'high', appliesTo: ['case'], deterministic: true },
  { id: 'prep.case-fallback-pressure', label: 'Pressao de fallback controlada', engine: 'preprocessing', defaultSeverity: 'medium', appliesTo: ['case'], deterministic: false },
  { id: 'prep.case-all-processed', label: 'Dossier processado com sucesso', engine: 'preprocessing', defaultSeverity: 'medium', appliesTo: ['case'], deterministic: true },
  { id: 'ocr.document-type', label: 'Tipo documental identificado', engine: 'ocr', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'ocr.dates', label: 'Datas reconhecidas', engine: 'ocr', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'ocr.contacts', label: 'Entidades de contacto reconhecidas', engine: 'ocr', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'ocr.identity-id', label: 'Identificador oficial reconhecido', engine: 'ocr', defaultSeverity: 'high', appliesTo: ['identity'], deterministic: true },
  { id: 'ocr.identity-name', label: 'Nome reconhecido', engine: 'ocr', defaultSeverity: 'medium', appliesTo: ['identity'], deterministic: false },
  { id: 'ocr.income-employer', label: 'Entidade patronal reconhecida', engine: 'ocr', defaultSeverity: 'high', appliesTo: ['income-statement'], deterministic: true },
  { id: 'ocr.income-values', label: 'Valores de rendimento reconhecidos', engine: 'ocr', defaultSeverity: 'medium', appliesTo: ['income-statement'], deterministic: false },
  { id: 'ocr.bank-identifiers', label: 'Conta/NIB/IBAN reconhecido', engine: 'ocr', defaultSeverity: 'high', appliesTo: ['bank-statement'], deterministic: true },
  { id: 'ocr.bank-values', label: 'Movimentos/valores reconhecidos', engine: 'ocr', defaultSeverity: 'medium', appliesTo: ['bank-statement'], deterministic: false },
  { id: 'forensics.authenticity-score', label: 'Score forense de autenticidade', engine: 'forensics', defaultSeverity: 'high', appliesTo: ['single'], deterministic: false },
  { id: 'forensics.ai-likelihood', label: 'Risco de IA generativa', engine: 'forensics', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'forensics.date-consistency', label: 'Consistencia temporal principal', engine: 'forensics', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'forensics.high-indicators', label: 'Ausencia de indicadores criticos', engine: 'forensics', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'forensics.medium-indicators', label: 'Pressao de sinais medios controlada', engine: 'forensics', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'forensics.image-dimensions', label: 'Dimensoes da imagem consistentes', engine: 'forensics', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'forensics.case-authenticity', label: 'Score forense agregado', engine: 'forensics', defaultSeverity: 'high', appliesTo: ['case'], deterministic: false },
  { id: 'forensics.case-high-indicators', label: 'Ausencia de sinais criticos no dossier', engine: 'forensics', defaultSeverity: 'high', appliesTo: ['case'], deterministic: true },
  { id: 'forensics.case-medium-indicators', label: 'Sinais medios sob controlo', engine: 'forensics', defaultSeverity: 'medium', appliesTo: ['case'], deterministic: false },
  { id: 'metadata.parsed', label: 'Metadados de formato extraidos', engine: 'metadata', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'metadata.suspicious-editor', label: 'Editor compativel com contexto', engine: 'metadata', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'metadata.temporal-conflicts', label: 'Sem conflitos temporais em metadados', engine: 'metadata', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'metadata.indicator-pressure', label: 'Pressao de anomalias de metadados controlada', engine: 'metadata', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'content.template-markers', label: 'Ausencia de padroes de template/falso', engine: 'content', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'content.repetition', label: 'Ausencia de repeticao anomala', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'content.minimal-content', label: 'Conteudo suficiente para validacao', engine: 'content', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'content.document-signals', label: 'Campos nucleares reconhecidos', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'content.financial-coherence-ready', label: 'Documento apto para coerencia financeira', engine: 'content', defaultSeverity: 'medium', appliesTo: ['income-statement', 'bank-statement'], deterministic: false },
  { id: 'contextual.extraction', label: 'Extracao de evidencias contextuais', engine: 'contextual', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'contextual.domains', label: 'Dominios contextuais reconhecidos', engine: 'contextual', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'contextual.emails', label: 'Emails contextuais reconhecidos', engine: 'contextual', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'contextual.reachability', label: 'Dominios contextuais acessiveis', engine: 'contextual', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'contextual.case-context', label: 'Corroboracao contextual do dossier', engine: 'contextual', defaultSeverity: 'low', appliesTo: ['case'], deterministic: false },
  { id: 'external.providers-available', label: 'Motores externos disponiveis', engine: 'external', defaultSeverity: 'medium', appliesTo: ['all'], deterministic: false },
  { id: 'external.energent', label: 'Motor externo energent', engine: 'external', defaultSeverity: 'medium', appliesTo: ['all'], deterministic: false },
  { id: 'external.checkfile', label: 'Motor externo checkfile', engine: 'external', defaultSeverity: 'medium', appliesTo: ['all'], deterministic: false },
  { id: 'external.combined-decision', label: 'Consenso externo', engine: 'external', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'external.case-engines', label: 'Motores externos do dossier', engine: 'external', defaultSeverity: 'medium', appliesTo: ['case'], deterministic: false },
  { id: 'external.case-decision', label: 'Consenso externo do dossier', engine: 'external', defaultSeverity: 'medium', appliesTo: ['case'], deterministic: false },
  { id: 'cross.name-consistency', label: 'Consistencia de nomes entre documentos', engine: 'cross_document', defaultSeverity: 'medium', appliesTo: ['case'], deterministic: false },
  { id: 'cross.id-consistency', label: 'Consistencia de identificadores oficiais', engine: 'cross_document', defaultSeverity: 'high', appliesTo: ['case'], deterministic: true },
  { id: 'cross.nuit-consistency', label: 'Consistencia de NUIT', engine: 'cross_document', defaultSeverity: 'high', appliesTo: ['case'], deterministic: true },
  { id: 'cross.employer-consistency', label: 'Consistencia de entidade patronal', engine: 'cross_document', defaultSeverity: 'medium', appliesTo: ['case'], deterministic: false },
  { id: 'cross.bank-recency', label: 'Recencia do extrato bancario', engine: 'cross_document', defaultSeverity: 'medium', appliesTo: ['case'], deterministic: false },
  { id: 'cross.income-bank-coherence', label: 'Coerencia entre rendimento e movimentos', engine: 'cross_document', defaultSeverity: 'medium', appliesTo: ['case'], deterministic: false },
  { id: 'decision.risk-band', label: 'Risco operacional controlado', engine: 'decision', defaultSeverity: 'high', appliesTo: ['single'], deterministic: false },
  { id: 'decision.confidence-band', label: 'Confianca da IA suficiente', engine: 'decision', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'decision.calibration', label: 'Calibracao de aprendizagem disponivel', engine: 'decision', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'decision.likely-fraud', label: 'Sinal final de fraude controlado', engine: 'decision', defaultSeverity: 'high', appliesTo: ['single'], deterministic: false },
  { id: 'decision.case-risk', label: 'Risco operacional do dossier', engine: 'decision', defaultSeverity: 'high', appliesTo: ['case'], deterministic: false },
  { id: 'decision.case-confidence', label: 'Confianca da IA no dossier', engine: 'decision', defaultSeverity: 'medium', appliesTo: ['case'], deterministic: false },
  { id: 'decision.case-fraud', label: 'Sinal final de fraude no dossier', engine: 'decision', defaultSeverity: 'high', appliesTo: ['case'], deterministic: false },

  { id: 'metadata.pdf-integrity', label: 'Integridade estrutural do PDF', engine: 'metadata', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'metadata.pdf-object-history', label: 'Historico de objetos PDF', engine: 'metadata', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'metadata.pdf-hidden-objects', label: 'Objetos ocultos no PDF', engine: 'metadata', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'metadata.pdf-incremental-save', label: 'Rasto de gravacao incremental', engine: 'metadata', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'metadata.pdf-embedded-files', label: 'Ficheiros embebidos no PDF', engine: 'metadata', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'metadata.pdf-font-inventory', label: 'Inventario de fontes do PDF', engine: 'metadata', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'metadata.pdf-creator-chain', label: 'Cadeia de criacao do PDF', engine: 'metadata', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'metadata.office-revision-chain', label: 'Historico de revisao Office', engine: 'metadata', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'metadata.office-author-consistency', label: 'Consistencia do autor Office', engine: 'metadata', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'metadata.image-exif-coherence', label: 'Coerencia do EXIF da imagem', engine: 'metadata', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },

  { id: 'forensics.hidden-objects', label: 'Detecao de objetos ocultos', engine: 'forensics', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'forensics.compression-profile', label: 'Perfil de compressao da imagem', engine: 'forensics', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'forensics.edit-history', label: 'Historico tecnico de edicao', engine: 'forensics', defaultSeverity: 'high', appliesTo: ['single'], deterministic: false },
  { id: 'forensics.layer-anomalies', label: 'Anomalias de camadas', engine: 'forensics', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'forensics.page-consistency', label: 'Consistencia entre paginas', engine: 'forensics', defaultSeverity: 'medium', appliesTo: ['single', 'case'], deterministic: false },
  { id: 'forensics.resave-pattern', label: 'Padrao de regravacao suspeito', engine: 'forensics', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'forensics.rasterization-profile', label: 'Perfil de rasterizacao', engine: 'forensics', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'forensics.visual-ocr-drift', label: 'Divergencia entre OCR e imagem', engine: 'forensics', defaultSeverity: 'high', appliesTo: ['single'], deterministic: false },
  { id: 'forensics.signature-visual-integrity', label: 'Integridade visual da assinatura', engine: 'forensics', defaultSeverity: 'high', appliesTo: ['single'], deterministic: false },
  { id: 'forensics.stamp-visual-integrity', label: 'Integridade visual do selo/carimbo', engine: 'forensics', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },

  { id: 'vision.layout-zones', label: 'Zonas de layout identificadas', engine: 'content', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'vision.region-edits', label: 'Regioes editadas identificadas', engine: 'content', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'vision.logo-detection', label: 'Detecao de logotipos', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'vision.logo-consistency', label: 'Consistencia do logotipo', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'vision.stamp-detection', label: 'Detecao de selos/carimbos', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'vision.stamp-consistency', label: 'Consistencia do selo/carimbo', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'vision.signature-detection', label: 'Detecao de assinatura', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'vision.signature-consistency', label: 'Consistencia da assinatura', engine: 'content', defaultSeverity: 'high', appliesTo: ['single'], deterministic: false },
  { id: 'vision.qr-detection', label: 'Detecao de QR Code', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'vision.qr-decode', label: 'Leitura do QR Code', engine: 'content', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'vision.qr-consistency', label: 'Consistencia do QR Code', engine: 'content', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'vision.barcode-detection', label: 'Detecao de codigo de barras', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'vision.barcode-decode', label: 'Leitura do codigo de barras', engine: 'content', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'vision.barcode-consistency', label: 'Consistencia do codigo de barras', engine: 'content', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'vision.visual-watermarks', label: 'Detecao de marcas de agua', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'vision.background-uniformity', label: 'Uniformidade do fundo', engine: 'content', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'vision.font-render-consistency', label: 'Consistencia visual das fontes', engine: 'content', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'vision.paste-splice', label: 'Sinais de colagem visual', engine: 'content', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },

  { id: 'ocr.multi-engine-agreement', label: 'Concordancia entre motores OCR', engine: 'ocr', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'ocr.field-alignment', label: 'Alinhamento de campos OCR', engine: 'ocr', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'ocr.page-to-page-consistency', label: 'Consistencia OCR entre paginas', engine: 'ocr', defaultSeverity: 'medium', appliesTo: ['single', 'case'], deterministic: false },
  { id: 'ocr.handwriting-detection', label: 'Detecao de manuscrito', engine: 'ocr', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'ocr.numeric-field-confidence', label: 'Confianca em campos numericos', engine: 'ocr', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'ocr.name-field-confidence', label: 'Confianca em campos de nome', engine: 'ocr', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'ocr-document-language', label: 'Idioma documental reconhecido', engine: 'ocr', defaultSeverity: 'low', appliesTo: ['single'], deterministic: false },
  { id: 'ocr-script-consistency', label: 'Consistencia do sistema de escrita', engine: 'ocr', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },

  { id: 'external.public-registry-match', label: 'Correspondencia com base publica', engine: 'external', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'external.issuer-domain-match', label: 'Correspondencia com dominio emissor', engine: 'external', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'external.tax-id-validation', label: 'Validacao de identificador fiscal', engine: 'external', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },
  { id: 'external.university-registry-match', label: 'Correspondencia com registo universitario', engine: 'external', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'external.bank-issuer-match', label: 'Correspondencia com emissor bancario', engine: 'external', defaultSeverity: 'medium', appliesTo: ['single'], deterministic: false },
  { id: 'external.qr-public-lookup', label: 'Validacao publica do QR Code', engine: 'external', defaultSeverity: 'high', appliesTo: ['single'], deterministic: true },

  { id: 'decision.evidence-density', label: 'Densidade de evidencias suficientes', engine: 'decision', defaultSeverity: 'medium', appliesTo: ['single', 'case'], deterministic: false },
  { id: 'decision.deterministic-fraud-evidence', label: 'Evidencia deterministica de fraude', engine: 'decision', defaultSeverity: 'high', appliesTo: ['single', 'case'], deterministic: true },
  { id: 'decision.cross-engine-agreement', label: 'Concordancia entre motores', engine: 'decision', defaultSeverity: 'medium', appliesTo: ['single', 'case'], deterministic: false },
  { id: 'decision.explainability-completeness', label: 'Completude explicavel da decisao', engine: 'decision', defaultSeverity: 'low', appliesTo: ['single', 'case'], deterministic: false }
];

const ADVANCED_CHECK_BLUEPRINTS: Array<{
  engine: EvidenceEngineName;
  prefix: string;
  appliesTo: string[];
  defaultSeverity: 'low' | 'medium' | 'high';
  deterministic: boolean;
  labels: string[];
}> = [
  {
    engine: 'preprocessing',
    prefix: 'prep',
    appliesTo: ['all'],
    defaultSeverity: 'medium',
    deterministic: true,
    labels: [
      'assinatura MIME valida',
      'codificacao textual consistente',
      'ordem de paginas normalizada',
      'orientacao de pagina consistente',
      'densidade de pixels adequada',
      'resolucao minima operacional',
      'margens documentais consistentes',
      'cabecalho e rodape detectados',
      'segmentacao de blocos estavel',
      'normalizacao de caracteres unicode',
      'paragrafos estruturados',
      'delimitadores de campo preservados'
    ]
  },
  {
    engine: 'ocr',
    prefix: 'ocr',
    appliesTo: ['single', 'case'],
    defaultSeverity: 'medium',
    deterministic: false,
    labels: [
      'confianca por linha OCR',
      'confianca por bloco OCR',
      'estabilidade entre motores OCR',
      'consistencia de nomes proprios',
      'consistencia de datas OCR',
      'consistencia de valores monetarios OCR',
      'deteccao de campos truncados',
      'deteccao de colunas desalinhadas',
      'coerencia de pontuacao textual',
      'concordancia OCR com layout visual',
      'qualidade de leitura em zonas criticas',
      'deteccao de caracteres substituidos'
    ]
  },
  {
    engine: 'forensics',
    prefix: 'forensics',
    appliesTo: ['single', 'case'],
    defaultSeverity: 'high',
    deterministic: false,
    labels: [
      'consistencia de histogramas de compressao',
      'assinatura de ruido de sensor',
      'inconsistencia de bordas artificiais',
      'padrao de interpolacao suspeito',
      'deteccao de blending local',
      'analise de duplicacao de regioes',
      'coerencia de iluminacao global',
      'coerencia de sombras e reflexos',
      'deteccao de remocao de artefatos',
      'detecao de reamostragem local',
      'inconsistencia de perfil de cor',
      'rastro de edicao por ferramenta grafica'
    ]
  },
  {
    engine: 'metadata',
    prefix: 'metadata',
    appliesTo: ['single', 'case'],
    defaultSeverity: 'medium',
    deterministic: true,
    labels: [
      'coerencia entre timezone e emissor',
      'coerencia entre locale e idioma',
      'sequencia cronologica de criacao/modificacao',
      'assinatura de produtor compativel',
      'cadeia de ferramentas sem conflito',
      'consistencia de versao PDF',
      'consistencia de versao Office',
      'ausencia de campos metadata nulos criticos',
      'consistencia entre nome do ficheiro e metadata',
      'coerencia de autor e entidade emissora',
      'detecao de metadata duplicada',
      'detecao de metadata sobrescrita'
    ]
  },
  {
    engine: 'content',
    prefix: 'content',
    appliesTo: ['single', 'case'],
    defaultSeverity: 'medium',
    deterministic: false,
    labels: [
      'coerencia semantica global',
      'coerencia numerica basica',
      'consistencia de entidade emissora',
      'coerencia de endereco institucional',
      'coerencia entre titulos e campos',
      'coerencia de nomenclatura oficial',
      'coerencia de unidades monetarias',
      'coerencia de periodo temporal',
      'detecao de texto placeholder residual',
      'coerencia de assinatura textual',
      'coerencia de referencias internas',
      'coerencia de assinatura e cargo'
    ]
  },
  {
    engine: 'contextual',
    prefix: 'contextual',
    appliesTo: ['single', 'case'],
    defaultSeverity: 'low',
    deterministic: false,
    labels: [
      'corroboracao por dominio institucional',
      'corroboracao por email institucional',
      'corroboracao por padroes de nomenclatura',
      'corroboracao por endpoint publico',
      'corroboracao por paginas relacionadas',
      'coerencia entre emissor e dominio publico',
      'coerencia entre curso e instituicao',
      'coerencia entre funcao e entidade',
      'coerencia entre data e evento publico',
      'coerencia entre localidade e emissor',
      'consistencia de contexto entre documentos',
      'forca global de corroboracao contextual'
    ]
  },
  {
    engine: 'external',
    prefix: 'external',
    appliesTo: ['single', 'case'],
    defaultSeverity: 'high',
    deterministic: true,
    labels: [
      'validacao com registry governamental',
      'validacao com registry academico',
      'validacao com registry fiscal',
      'validacao com motor antifraude A',
      'validacao com motor antifraude B',
      'validacao com motor antifraude C',
      'consenso entre providers externos',
      'latencia de provider em faixa esperada',
      'assinatura de resposta externa valida',
      'integridade de payload externo',
      'coerencia de score externo',
      'detecao de conflito entre providers'
    ]
  },
  {
    engine: 'cross_document',
    prefix: 'cross',
    appliesTo: ['case'],
    defaultSeverity: 'high',
    deterministic: false,
    labels: [
      'consistencia de nome principal',
      'consistencia de numero identificador',
      'consistencia de data de emissao',
      'consistencia de entidade emissora',
      'consistencia de endereco',
      'consistencia de contatos',
      'consistencia de periodo de rendimento',
      'consistencia de saldo e rendimento',
      'consistencia de assinatura entre documentos',
      'consistencia de selo entre documentos',
      'consistencia de QR entre documentos',
      'consistencia de risco agregado do dossier'
    ]
  },
  {
    engine: 'decision',
    prefix: 'decision',
    appliesTo: ['single', 'case'],
    defaultSeverity: 'medium',
    deterministic: false,
    labels: [
      'equilibrio risco-autenticidade',
      'forca de evidencia positiva',
      'forca de evidencia negativa',
      'equilibrio entre motores',
      'robustez da justificacao final',
      'consistencia da aprovacao pratica',
      'aderencia a politica operacional',
      'estabilidade sob ruido moderado',
      'completude das evidencias citadas',
      'confianca ajustada por historico',
      'consistencia da decisao com feedback',
      'nivel de auditabilidade final'
    ]
  }
];

function slugify(text: string) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildAdvancedCheckDefinitions(): CheckDefinition[] {
  const rows: CheckDefinition[] = [];
  for (const blueprint of ADVANCED_CHECK_BLUEPRINTS) {
    for (const label of blueprint.labels) {
      rows.push({
        id: `advanced.${blueprint.prefix}.${slugify(label)}`,
        label: `Advanced: ${label}`,
        engine: blueprint.engine,
        defaultSeverity: blueprint.defaultSeverity,
        appliesTo: blueprint.appliesTo,
        deterministic: blueprint.deterministic
      });
    }
  }
  return rows;
}

const CHECK_DEFINITIONS: CheckDefinition[] = [
  ...BASE_CHECK_DEFINITIONS,
  ...buildAdvancedCheckDefinitions()
];

const CHECK_MAP = new Map(CHECK_DEFINITIONS.map((item) => [item.id, item]));

export function getCheckDefinition(id: string): CheckDefinition {
  const found = CHECK_MAP.get(id);
  if (!found) throw new Error(`unknown-check-definition:${id}`);
  return found;
}

export function getCheckRegistrySummary() {
  return {
    totalChecks: CHECK_DEFINITIONS.length,
    byEngine: CHECK_DEFINITIONS.reduce<Record<string, number>>((acc, item) => {
      acc[item.engine] = (acc[item.engine] || 0) + 1;
      return acc;
    }, {})
  };
}
