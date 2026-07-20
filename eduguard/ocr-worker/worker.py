#!/usr/bin/env python3
import sys
import json
from pathlib import Path
try:
    from PIL import Image
    import pytesseract
except Exception as e:
    print(json.dumps({"error": "missing-deps", "detail": str(e)}))
    sys.exit(1)


def extract_text_from_image(path):
    img = Image.open(path)
    try:
        text = pytesseract.image_to_string(img)
    except Exception as e:
        # Fallback for environments without tesseract binary installed
        if 'tesseract is not installed' in str(e).lower() or 'tesseract' in str(e).lower():
            return '<<OCR_NOT_AVAILABLE>>'
        raise
    return text


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "no-file"}))
        sys.exit(1)
    p = Path(sys.argv[1])
    if not p.exists():
        print(json.dumps({"error": "not-found"}))
        sys.exit(1)
    result = {"file": str(p), "text": "", "status": "ok"}
    try:
        text = extract_text_from_image(p)
        result["text"] = text
    except Exception as e:
        result = {"file": str(p), "error": str(e), "status": "failed"}
    print(json.dumps(result, ensure_ascii=False))
