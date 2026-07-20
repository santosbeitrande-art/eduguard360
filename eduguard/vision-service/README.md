# EduGuard Vision Service

FastAPI skeleton for visual document analysis.

Planned engines:

- layout detection
- edited region detection
- logo detection
- stamp detection
- signature detection
- QR/barcode decoding

Run locally:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8011
```