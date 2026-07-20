# EduGuard OCR Service

FastAPI skeleton for multi-engine OCR.

Planned engines:

- PaddleOCR
- EasyOCR
- Tesseract

Run locally:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8012
```