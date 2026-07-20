# EduGuard Forensics Service

FastAPI skeleton for PDF and document forensics.

Planned engines:

- PDF integrity and object graph
- hidden object detection
- signature metadata analysis
- image-level forensic extraction

Run locally:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8013
```