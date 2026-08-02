# EduGuard Verify AI Blueprint

## Objetivo

Transformar a EduGuard Verify AI em uma plataforma internacional de verificacao inteligente de documentos, com foco em:

- Alta precisao na deteccao de fraude documental
- Resposta rapida para operacoes em escala
- Explicabilidade auditavel ponta a ponta
- Governanca de modelos e melhoria continua

Cada analise deve responder de forma objetiva:

- O documento e confiavel?
- Existe probabilidade relevante de falsificacao?
- Quais evidencias sustentam a decisao?

## Principios tecnicos

- Arquitetura modular com contratos claros entre servicos
- Benchmark apenas com projetos Open Source e literatura publica
- Sem copia de codigo que viole licencas
- Evidencias tecnicas rastreaveis por verificacao, documento e decisao
- Decisao final sempre acompanhada de justificativa operacional

## Estado atual do repositorio

Ja existem bases importantes no codigo:

- Politica de decisao com 5 desfechos de negocio em eduguard/verify-api/src/decision_policy.ts
- Relatorio multiengine de evidencias em eduguard/verify-api/src/evidence_engine.ts
- Registro central de verificacoes em eduguard/verify-api/src/check_registry.ts
- Camada de pesos para decisao em eduguard/verify-api/src/decision_weights.ts
- Orquestracao de analise de documento unico e dossier em eduguard/verify-api/src/index.ts
- Servicos dedicados de OCR, visao e forense em:
  - eduguard/ocr-service/main.py
  - eduguard/vision-service/main.py
  - eduguard/forensics-service/main.py
- Conectores de fontes publicas em eduguard/verify-api/src/public_sources.ts

## Benchmarking tecnologico (Open Source)

Adotar avaliacao continua de tecnologias por modulo:

- OCR: PaddleOCR, Tesseract, EasyOCR, DocTR
- Layout e estrutura: LayoutParser, Detectron2, MMDetection
- Visao documental: YOLO, OpenCV, Segment Anything
- NLP e raciocinio: Hugging Face Transformers, LLMs com guardrails
- Treino e inferencia: PyTorch, TensorFlow, ONNX Runtime
- Data augmentation: Albumentations

Politica de benchmark:

- Revisao trimestral de desempenho por categoria de documento
- Prova A/B por datasets internos anonimizados
- Substituicao de motor somente com ganho estatisticamente relevante

## Arquitetura alvo

```text
Entrada de Documento
  -> Preprocessamento e Normalizacao
  -> OCR Multimotor
  -> Analise de Estrutura/Layout
  -> Forense Visual e Metadados
  -> Validacoes de Consistencia Semantica
  -> Validacoes Externas/Publicas
  -> Motor de Evidencias e Pesos
  -> Politica de Decisao
  -> Mapa Visual + Relatorio PDF
  -> Feedback Humano e Aprendizagem
```

## Modulos obrigatorios

### 1. Modulo OCR

Objetivo:

- Extrair texto com alta precisao e cobertura por regiao

Capacidades:

- Extracao por multiplos motores
- Concordancia entre motores por bloco/pagina
- Confianca por campo critico (nome, numero, data, assinatura textual)
- Deteccao de divergencia OCR versus estrutura visual

### 2. Modulo de Estrutura

Objetivo:

- Identificar e segmentar componentes do documento

Elementos minimos:

- Cabecalho e rodape
- Logos, selos e carimbos
- Assinaturas e fotografias
- QR codes e codigos de barras
- Tabelas, campos preenchidos e zonas em branco

### 3. Modulo de Verificacao Visual

Objetivo:

- Detectar manipulacao grafica e adulteracao digital

Sinais:

- Colagem/sobreposicao
- Diferencas locais de compressao
- Inconsistencia de iluminacao e sombras
- Objetos adicionados/removidos
- Fontes renderizadas de forma incompativel
- Rastros de geracao por IA e deepfake documental

### 4. Modulo de Consistencia

Objetivo:

- Validar coerencia interna e entre documentos do dossier

Verificacoes:

- Datas incompativeis
- Sequencias e numeracoes invalidas
- Campos ausentes
- Ortografia e formato fora do padrao esperado
- Assinaturas, selos e logos incompativeis com contexto

### 5. Modulo de Seguranca

Objetivo:

- Verificar elementos de autenticidade tecnica

Verificacoes:

- QR code valido versus falso
- Codigo de barras valido versus invalido
- Watermarks e marcas invisiveis (quando detectavel)
- Microtexto e holograma (quando viavel por qualidade de imagem)

### 6. Modulo de IA e Decisao

Objetivo:

- Produzir resultado quantitativo, qualitativo e explicavel

Saidas obrigatorias:

- Indice Geral de Confiabilidade (0 a 100)
- Indice de Falsificacao (0 a 100)
- Nivel de risco: Muito Baixo, Baixo, Medio, Alto, Muito Alto
- Decisao operacional: aprovar, aprovar com revisao, rejeitar

## Modelo de scoring e risco

Padrao recomendado:

- confiabilidade = media ponderada de verificacoes positivas
- falsificacao = pressao acumulada de sinais negativos deterministas e heuristicos
- incerteza = conflito entre motores + baixa cobertura de evidencias

Faixas de risco sugeridas:

- Muito Baixo: 0 a 10
- Baixo: 11 a 30
- Medio: 31 a 55
- Alto: 56 a 80
- Muito Alto: 81 a 100

Regra de seguranca:

- Evidencia critica deterministica valida bloqueio automatico, mesmo com confiabilidade global moderada.

## Explicabilidade obrigatoria

Cada suspeita deve incluir:

- O que foi encontrado
- Porque e suspeito
- Grau de confianca do achado
- Evidencias observadas
- Localizacao exata na imagem/pagina

Formato de evidencias:

- Bounding boxes por regiao
- Heatmap de anomalias
- Lista de checks com status: passed, warning, failed, not_applicable

## Relatorio inteligente em PDF

Estrutura minima:

- Resumo Executivo
- Resultado Geral
- Indice de Confiabilidade
- Indice de Falsificacao
- Nivel de Risco
- Pontos Suspeitos
- Pontos Confirmados
- Analise Tecnica por modulo
- Recomendacoes
- Conclusao

O relatorio deve ser auditavel:

- Versao do modelo
- Versao da politica de decisao
- Data/hora de inferencia
- Origem das validacoes externas

## Aprendizagem continua

Projetar para:

- Atualizacao de modelos sem downtime significativo
- Inclusao de novos tipos documentais
- Recalibracao supervisionada por feedback humano
- Fluxo semi-supervisionado com triagem de casos ambiguos
- Monitoramento de drift e degradacao por tipo de documento

Requisitos de dados:

- Dataset anonimizados por categoria
- Rotulos de fraude confirmada, autenticidade confirmada e inconclusivo
- Controle de versao de conjunto de treino e metricas

## Performance e escalabilidade

SLOs minimos:

- OCR menor que 3s por documento padrao
- Analise completa menor que 10s por documento padrao
- Suporte a GPU quando disponivel
- Fallback estavel para CPU quando necessario

Requisitos de plataforma:

- API horizontalmente escalavel
- Filas para processamento assincrono em picos
- Arquitetura preparada para microsservicos
- Cache para validacoes externas e consultas repetidas

## Qualidade de codigo e testes

Padroes obrigatorios:

- Modularidade e baixo acoplamento
- Documentacao tecnica atualizada
- Testes unitarios, integracao e regressao
- Evitar duplicacao de regras
- Telemetria e logs estruturados por etapa

Matriz minima de testes:

- OCR por idioma e qualidade de imagem
- Forense PDF e imagem com casos autenticos e adulterados
- Regras de consistencia por tipo documental
- Endpoints de decisao com cenarios limite
- Reproducibilidade de score para mesmo input

## Governanca legal e licenciamento

Diretrizes:

- Manter inventario de dependencias e licencas
- Preservar avisos obrigatorios de copyright/licenca
- Revisar compatibilidade de licencas antes de distribuicao
- Evitar ingestao de dados sensiveis sem base legal e controles adequados

Checklist de conformidade:

- Dependencia aprovada por politica de licencas
- Termos de uso de fontes externas revisados
- Trilha de auditoria para cada verificacao
- Retencao e descarte de dados conforme politica institucional

## Pesquisa cientifica continua

Manter trilha de pesquisa aplicada em:

- Document Fraud Detection
- Fake Document Detection
- Image Tampering Detection
- Signature Verification
- AI Document Verification
- Digital Forensics
- Document Authentication

Fluxo recomendado:

- Radar mensal de publicacoes
- Prototipo rapido de tecnicas promissoras
- Incorporacao apenas apos benchmark interno reproduzivel

## Roadmap de execucao

Fase 1 (0 a 30 dias): consolidacao do baseline

- Padronizar contratos de servicos OCR/visao/forense
- Finalizar matriz de checks no registro central
- Validar pipeline de evidencias e pesos em producao controlada

Fase 2 (31 a 60 dias): robustez e explicabilidade

- Expandir detectores de QR, barcode, logo, selo e assinatura
- Produzir heatmaps e bounding boxes no relatorio final
- Reforcar validacoes de metadados e consistencia cruzada

Fase 3 (61 a 90 dias): escalabilidade e aprendizado

- Persistencia completa em banco para analytics historico
- Dashboards de drift, FP/FN e desacordo com revisores
- Pipeline de recalibracao com feedback humano confiavel

Fase 4 (90+ dias): internacionalizacao

- Conectores publicos por pais/setor
- Perfis de documento por jurisdicao
- Benchmarks globais por idioma e formato documental

## Regra de produto

A plataforma nunca deve terminar em "analise concluida" sem posicionamento operacional.

Toda resposta deve encerrar com:

- Decisao
- Nivel de risco
- Confiabilidade
- Probabilidade de falsificacao
- Justificativa explicavel
- Evidencia visual