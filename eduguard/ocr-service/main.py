from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

try:
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None

try:
    import pytesseract
except Exception:  # pragma: no cover
    pytesseract = None

try:
    import easyocr  # type: ignore
except Exception:  # pragma: no cover
    easyocr = None

try:
    from paddleocr import PaddleOCR  # type: ignore
except Exception:  # pragma: no cover
    PaddleOCR = None


app = FastAPI(title="EduGuard OCR Service", version="0.1.0")


class OcrRequest(BaseModel):
    file_path: str | None = None
    language: str | None = "por"
    job_id: str | None = None


_easy_reader = None
_paddle_reader = None


def _read_with_tesseract(file_path: str, language: str):
    if not pytesseract or not Image:
        return {"available": False, "engine": "tesseract", "text": "", "error": "tesseract-not-available"}
    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image, lang=language or "por")
        return {"available": True, "engine": "tesseract", "text": text or ""}
    except Exception as error:  # pragma: no cover
        return {"available": True, "engine": "tesseract", "text": "", "error": str(error)}


def _read_with_easyocr(file_path: str):
    global _easy_reader
    if easyocr is None:
        return {"available": False, "engine": "easyocr", "text": "", "error": "easyocr-not-installed"}
    try:
        if _easy_reader is None:
          _easy_reader = easyocr.Reader(["pt", "en"], gpu=False)
        result = _easy_reader.readtext(file_path, detail=0, paragraph=True)
        return {"available": True, "engine": "easyocr", "text": "\n".join(result).strip()}
    except Exception as error:  # pragma: no cover
        return {"available": True, "engine": "easyocr", "text": "", "error": str(error)}


def _read_with_paddle(file_path: str):
    global _paddle_reader
    if PaddleOCR is None:
        return {"available": False, "engine": "paddleocr", "text": "", "error": "paddleocr-not-installed"}
    try:
        if _paddle_reader is None:
            _paddle_reader = PaddleOCR(use_angle_cls=True, lang="en")
        result = _paddle_reader.ocr(file_path, cls=True)
        lines = []
        for page in result or []:
            for item in page or []:
                if len(item) >= 2 and item[1]:
                    lines.append(str(item[1][0]))
        return {"available": True, "engine": "paddleocr", "text": "\n".join(lines).strip()}
    except Exception as error:  # pragma: no cover
        return {"available": True, "engine": "paddleocr", "text": "", "error": str(error)}


def _available_payload(file_path: str):
    return {
        "exists": Path(file_path).exists(),
        "suffix": Path(file_path).suffix.lower(),
    }


def _normalize_text(text: str):
    return " ".join(str(text or "").split()).strip()


def _extract_all(file_path: str, language: str):
    return [
        _read_with_tesseract(file_path, language),
        _read_with_easyocr(file_path),
        _read_with_paddle(file_path),
    ]


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "eduguard-ocr-service",
        "engines": ["paddleocr", "easyocr", "tesseract"],
    }


@app.post("/ocr/extract")
def extract_text(payload: OcrRequest):
    meta = _available_payload(payload.file_path or "")
    runs = _extract_all(payload.file_path or "", payload.language or "por")
    best = max(runs, key=lambda item: len(_normalize_text(item.get("text", "")))) if runs else {"engine": "none", "text": ""}
    return {
        "status": "ok",
        "engine": best.get("engine", "none"),
        "text": best.get("text", ""),
        "meta": meta,
        "engines": runs,
    }


@app.post("/ocr/compare-engines")
def compare_engines(payload: OcrRequest):
    runs = _extract_all(payload.file_path or "", payload.language or "por")
    normalized = [
        {**item, "normalized_text": _normalize_text(item.get("text", ""))}
        for item in runs
    ]
    base = normalized[0]["normalized_text"] if normalized else ""
    agreement = []
    for item in normalized:
        current = item["normalized_text"]
        ratio = 1.0 if current == base and current else 0.0
        if base and current and current != base:
            overlap = len(set(base.split()) & set(current.split()))
            union = max(1, len(set(base.split()) | set(current.split())))
            ratio = overlap / union
        agreement.append({"engine": item.get("engine"), "agreement": round(ratio, 4), "available": item.get("available", False), "error": item.get("error")})
    return {"status": "ok", "comparisons": agreement, "engines": normalized}


@app.post("/ocr/field-alignment")
def align_fields(payload: OcrRequest):
    runs = _extract_all(payload.file_path or "", payload.language or "por")
    texts = [_normalize_text(item.get("text", "")) for item in runs if item.get("text")]
    digits = [sum(char.isdigit() for char in text) for text in texts]
    uppercase = [sum(char.isupper() for char in text) for text in texts]
    return {
        "status": "ok",
        "field_alignment": {
            "engineCount": len(runs),
            "textsAvailable": len(texts),
            "numericDensity": digits,
            "uppercaseDensity": uppercase,
            "consistent": len(set(texts)) <= 1 if texts else False,
        },
        "engines": runs,
    }