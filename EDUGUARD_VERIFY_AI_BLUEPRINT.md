# EduGuard Verify AI Blueprint

## Objective

Transform EduGuard Verify AI from a document analyzer into a decision engine that answers:

**Can I trust this document or not?**

The platform must produce:

- A decision
- A risk level
- A confidence level
- A practical approval answer
- An explainable evidence trail

## Current foundations already implemented

- Decision policy with 5 business outcomes in `eduguard/verify-api/src/decision_policy.ts`
- Multiengine evidence report in `eduguard/verify-api/src/evidence_engine.ts`
- Single-document and dossier orchestration in `eduguard/verify-api/src/index.ts`
- Human reviewer feedback loop in `POST /verification-feedback`
- Review queue, CSV export, and quality dashboard with decision metrics
- Evidence report endpoint and CSV export in:
  - `GET /status/:id/evidence`
  - `GET /status/:id/evidence/export.csv`

## Target architecture

```text
Upload
  -> Preprocessing
  -> OCR Engine
  -> PDF / Image Forensics
  -> Computer Vision Engine
  -> Generative AI Detection
  -> Content Validation Engine
  -> Business Rules Engine
  -> Learning / Calibration Engine
  -> Decision Engine
  -> Explainable Report
```

## Core code modules needed

### 1. Verification registry

Create a central registry to define all checks explicitly.

Suggested file:

- `eduguard/verify-api/src/check_registry.ts`

Suggested responsibilities:

- Stable check IDs
- Human labels
- Engine ownership
- Severity weight
- Document-type applicability
- Whether the check is deterministic or heuristic

Example shape:

```ts
export interface CheckDefinition {
  id: string;
  label: string;
  engine: 'ocr' | 'forensics' | 'vision' | 'metadata' | 'rules' | 'external';
  severityWeight: number;
  appliesTo: string[];
  deterministic: boolean;
}
```

### 2. Decision weighting layer

Create a weighted evidence scorer so the final verdict depends on accumulated evidence instead of one threshold.

Suggested file:

- `eduguard/verify-api/src/decision_weights.ts`

Responsibilities:

- Convert check results into weighted signals
- Apply stronger penalties to deterministic fraud evidence
- Learn calibration deltas by document type and issuer
- Produce:
  - authenticity score
  - fraud pressure score
  - uncertainty score

### 3. Vision engine service

This should become a separate Python service.

Suggested service folder:

- `eduguard/vision-service/`

Suggested stack:

- FastAPI
- OpenCV
- Pillow
- scikit-image
- YOLO
- Detectron2
- Segment Anything
- CLIP

Suggested endpoints:

- `POST /vision/layout`
- `POST /vision/tampering`
- `POST /vision/logo-detection`
- `POST /vision/stamp-detection`
- `POST /vision/signature-detection`
- `POST /vision/qr-barcode`

Expected outputs:

- Edited region heatmaps
- Detected layout blocks
- Logo/stamp/signature matches
- QR/barcode decoded values
- Visual anomaly scores

### 4. Advanced OCR engine service

Suggested service folder:

- `eduguard/ocr-service/`

Suggested stack:

- FastAPI
- PaddleOCR
- EasyOCR
- Tesseract

Suggested behavior:

- Run multiple OCR engines per page
- Compare agreement between engines
- Return confidence by field and by region
- Highlight OCR-image mismatches

Suggested endpoints:

- `POST /ocr/extract`
- `POST /ocr/compare-engines`
- `POST /ocr/field-alignment`

### 5. Forensic document service

Suggested service folder:

- `eduguard/forensics-service/`

Suggested stack:

- FastAPI
- PyMuPDF
- pdfplumber
- pikepdf
- qpdf

Checks to implement there:

- PDF integrity
- Object graph anomalies
- Hidden objects
- Incremental save traces
- Font inventory
- Embedded image inventory
- Signature metadata
- Creation/modification chain

Suggested endpoints:

- `POST /forensics/pdf`
- `POST /forensics/image`
- `POST /forensics/signatures`

### 6. Public validation connectors

Suggested file:

- `eduguard/verify-api/src/public_sources.ts`

Possible responsibilities:

- Validate issuer domains
- Validate public QR payloads
- Validate known official formats
- Check tax, company, or university public records when legally available

Important:

- Implement per-country connector isolation
- Cache responses in Redis
- Record provenance and timestamp for each public lookup

### 7. Learning and retrieval layer

Suggested stack:

- PostgreSQL
- pgvector
- Redis
- FAISS when offline indexing is needed

Suggested storage model:

- `verification_jobs`
- `verification_checks`
- `document_profiles`
- `issuer_profiles`
- `review_feedback`
- `fraud_patterns`
- `evidence_embeddings`

This layer should support:

- Similar-case retrieval
- Calibration by issuer/document type
- Drift monitoring
- False positive and false negative tracking

## Decision model requirements

The final decision must always map to one of these outcomes:

- Documento Autentico
- Documento Provavelmente Autentico
- Revisao Humana Recomendada
- Documento Provavelmente Fraudulento
- Fraude Confirmada

And one practical answer:

- Sim.
- Sim, mas recomenda-se revisao.
- Nao. Existe forte probabilidade de fraude.

## Performance requirements

To outperform weaker competitors, optimize for these metrics instead of marketing claims:

- Low false negative rate on confirmed fraud
- Low false positive rate on authentic documents
- High agreement with expert reviewers
- Stable performance by document type
- Explainability completeness per decision
- Time to decision

## What to build next in code

1. Add `check_registry.ts` and convert the evidence engine to use registry-driven checks.
2. Split OCR, forensics, and vision into Python FastAPI services behind stable contracts.
3. Add PostgreSQL persistence for per-check outcomes instead of JSON-only job files.
4. Add Redis caching for external/public validations.
5. Add QR, barcode, logo, stamp, signature, and visual tampering engines.
6. Add dashboard views for engine drift, top failing checks, and reviewer disagreement.
7. Add benchmark datasets per document type and measure precision/recall weekly.

## Product rule

The system should never stop at “analysis completed”.

It must end with a decision, a reason, a risk level, a confidence level, and a practical approval answer.