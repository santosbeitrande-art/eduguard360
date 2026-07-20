from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

try:
    import fitz  # PyMuPDF
except Exception:  # pragma: no cover
    fitz = None

try:
    import pdfplumber
except Exception:  # pragma: no cover
    pdfplumber = None

try:
    import pikepdf
except Exception:  # pragma: no cover
    pikepdf = None


app = FastAPI(title="EduGuard Forensics Service", version="0.1.0")


class ForensicsRequest(BaseModel):
    file_path: str | None = None
    job_id: str | None = None
    file_name: str | None = None


def _exists(file_path: str):
    return Path(file_path).exists()


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "eduguard-forensics-service",
        "engines": ["pymupdf", "pdfplumber", "pikepdf", "qpdf"],
    }


@app.post("/forensics/pdf")
def analyze_pdf(payload: ForensicsRequest):
    file_path = payload.file_path or ""
    if not _exists(file_path):
        return {"status": "error", "error": "file-not-found"}

    result = {"status": "ok", "pdf": {"available": False}}
    if fitz is not None:
        try:
            doc = fitz.open(file_path)
            metadata = doc.metadata or {}
            fonts = []
            for page_index in range(min(doc.page_count, 3)):
                page = doc.load_page(page_index)
                fonts.extend(page.get_fonts())
            result["pdf"] = {
                "available": True,
                "pageCount": doc.page_count,
                "metadata": metadata,
                "fontCount": len(fonts),
                "embeddedFileCount": len(doc.embfile_names()) if hasattr(doc, "embfile_names") else 0,
            }
        except Exception as error:  # pragma: no cover
            result["pdf"] = {"available": True, "error": str(error)}

    if pdfplumber is not None:
        try:
            with pdfplumber.open(file_path) as pdf:
                result["pdfplumber"] = {
                    "pages": len(pdf.pages),
                    "firstPageChars": len(pdf.pages[0].chars) if pdf.pages else 0,
                }
        except Exception as error:  # pragma: no cover
            result["pdfplumber"] = {"error": str(error)}

    if pikepdf is not None:
        try:
            with pikepdf.open(file_path) as pdf:
                result["pikepdf"] = {
                    "objects": len(pdf.objects),
                    "attachments": len(list(pdf.attachments.items())) if hasattr(pdf, "attachments") else 0,
                }
        except Exception as error:  # pragma: no cover
            result["pikepdf"] = {"error": str(error)}

    return result


@app.post("/forensics/image")
def analyze_image(payload: ForensicsRequest):
    file_path = payload.file_path or ""
    if not _exists(file_path):
        return {"status": "error", "error": "file-not-found"}
    stat = Path(file_path).stat()
    return {
        "status": "ok",
        "image": {
            "sizeBytes": stat.st_size,
            "suffix": Path(file_path).suffix.lower(),
            "mtime": stat.st_mtime,
        },
    }


@app.post("/forensics/signatures")
def analyze_signatures(payload: ForensicsRequest):
    file_path = payload.file_path or ""
    if not _exists(file_path):
        return {"status": "error", "error": "file-not-found"}
    if fitz is None:
        return {"status": "ok", "signatures": {"available": False, "reason": "pymupdf-not-installed"}}
    try:
        doc = fitz.open(file_path)
        signatures = []
        for page_index in range(doc.page_count):
            page = doc.load_page(page_index)
            for widget in page.widgets() or []:
                if getattr(widget, "field_type_string", "") == "Signature":
                    signatures.append({"page": page_index + 1, "fieldName": getattr(widget, "field_name", "signature")})
        return {"status": "ok", "signatures": {"available": True, "count": len(signatures), "items": signatures}}
    except Exception as error:  # pragma: no cover
        return {"status": "ok", "signatures": {"available": True, "error": str(error)}}