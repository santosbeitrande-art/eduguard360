from pathlib import Path
import os

import cv2
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

try:
    from ultralytics import YOLO  # type: ignore
except Exception:  # pragma: no cover
    YOLO = None


app = FastAPI(title="EduGuard Vision Service", version="0.1.0")


class VisionRequest(BaseModel):
    file_path: str | None = None
    job_id: str | None = None
    document_type: str | None = None


_yolo_model = None


def _load_yolo_model():
    global _yolo_model
    if _yolo_model is not None:
        return _yolo_model
    model_path = os.getenv("YOLO_MODEL_PATH", "").strip()
    if not model_path or YOLO is None:
        return None
    try:
        _yolo_model = YOLO(model_path)
        return _yolo_model
    except Exception:  # pragma: no cover
        return None


def _load_image(file_path: str):
    image = cv2.imread(file_path)
    if image is None:
        raise ValueError("image-not-readable")
    return image


def _shape_payload(image):
    height, width = image.shape[:2]
    return {"width": int(width), "height": int(height)}


@app.get("/health")
def health():
    yolo_model = _load_yolo_model()
    return {
        "ok": True,
        "service": "eduguard-vision-service",
        "engines": ["opencv", "yolo", "detectron2", "segment-anything", "clip"],
        "availability": {
            "opencv": True,
            "yolo": yolo_model is not None,
            "detectron2": False,
            "segment_anything": False,
            "clip": False,
        },
    }


@app.post("/vision/layout")
def analyze_layout(payload: VisionRequest):
    image = _load_image(payload.file_path or "")
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    blocks = []
    for contour in contours[:50]:
        x, y, w, h = cv2.boundingRect(contour)
        if w * h < 400:
            continue
        blocks.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h)})
    return {"status": "ok", "layout": {"image": _shape_payload(image), "blockCount": len(blocks), "blocks": blocks[:20]}}


@app.post("/vision/tampering")
def detect_tampering(payload: VisionRequest):
    image = _load_image(payload.file_path or "")
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    edges = cv2.Canny(gray, 80, 180)
    edge_ratio = float(np.count_nonzero(edges)) / float(edges.size or 1)
    variance = float(laplacian.var())
    suspicious = edge_ratio > 0.14 or variance < 18
    return {"status": "ok", "tampering": {"edgeRatio": round(edge_ratio, 4), "blurVariance": round(variance, 4), "suspicious": suspicious}}


@app.post("/vision/logo-detection")
def detect_logos(payload: VisionRequest):
    image = _load_image(payload.file_path or "")
    yolo_model = _load_yolo_model()
    if yolo_model is not None:
        try:
            predictions = yolo_model.predict(source=payload.file_path, verbose=False)
            boxes = []
            for pred in predictions[:1]:
                for box in getattr(pred, "boxes", []) or []:
                    cls = int(box.cls[0]) if getattr(box, "cls", None) is not None else -1
                    conf = float(box.conf[0]) if getattr(box, "conf", None) is not None else 0.0
                    boxes.append({"classId": cls, "confidence": round(conf, 4)})
            return {"status": "ok", "logos": {"detector": "yolo", "candidateCount": len(boxes), "boxes": boxes[:20]}}
        except Exception:
            pass
    h, w = image.shape[:2]
    top_band = image[0:max(1, h // 4), :]
    corners = cv2.goodFeaturesToTrack(cv2.cvtColor(top_band, cv2.COLOR_BGR2GRAY), 50, 0.01, 10)
    return {"status": "ok", "logos": {"candidateCount": 0 if corners is None else int(len(corners)), "zone": "top-band", "image": _shape_payload(image)}}


@app.post("/vision/stamp-detection")
def detect_stamps(payload: VisionRequest):
    image = _load_image(payload.file_path or "")
    yolo_model = _load_yolo_model()
    if yolo_model is not None:
        try:
            predictions = yolo_model.predict(source=payload.file_path, verbose=False)
            boxes = []
            for pred in predictions[:1]:
                for box in getattr(pred, "boxes", []) or []:
                    cls = int(box.cls[0]) if getattr(box, "cls", None) is not None else -1
                    conf = float(box.conf[0]) if getattr(box, "conf", None) is not None else 0.0
                    boxes.append({"classId": cls, "confidence": round(conf, 4)})
            if boxes:
                return {"status": "ok", "stamps": {"detector": "yolo", "candidateCount": len(boxes), "boxes": boxes[:20], "detected": True}}
        except Exception:
            pass
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    blue_mask = cv2.inRange(hsv, (90, 50, 50), (140, 255, 255))
    red_mask1 = cv2.inRange(hsv, (0, 50, 50), (10, 255, 255))
    red_mask2 = cv2.inRange(hsv, (170, 50, 50), (180, 255, 255))
    colored = int(np.count_nonzero(blue_mask | red_mask1 | red_mask2))
    return {"status": "ok", "stamps": {"coloredPixelCount": colored, "detected": colored > 1500}}


@app.post("/vision/signature-detection")
def detect_signatures(payload: VisionRequest):
    image = _load_image(payload.file_path or "")
    yolo_model = _load_yolo_model()
    if yolo_model is not None:
        try:
            predictions = yolo_model.predict(source=payload.file_path, verbose=False)
            boxes = []
            for pred in predictions[:1]:
                for box in getattr(pred, "boxes", []) or []:
                    cls = int(box.cls[0]) if getattr(box, "cls", None) is not None else -1
                    conf = float(box.conf[0]) if getattr(box, "conf", None) is not None else 0.0
                    boxes.append({"classId": cls, "confidence": round(conf, 4)})
            if boxes:
                return {"status": "ok", "signatures": {"detector": "yolo", "candidateCount": len(boxes), "boxes": boxes[:20], "signatureLike": True}}
        except Exception:
            pass
    h, w = image.shape[:2]
    bottom_band = image[max(0, h - h // 3):h, :]
    gray = cv2.cvtColor(bottom_band, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 70, 160)
    density = float(np.count_nonzero(edges)) / float(edges.size or 1)
    return {"status": "ok", "signatures": {"bottomEdgeDensity": round(density, 4), "signatureLike": density > 0.04}}


@app.post("/vision/qr-barcode")
def detect_qr_barcode(payload: VisionRequest):
    file_path = payload.file_path or ""
    if not Path(file_path).exists():
        raise ValueError("file-not-found")
    image = _load_image(file_path)
    detector = cv2.QRCodeDetector()
    value, points, _ = detector.detectAndDecode(image)
    barcode_like = bool(points is not None)
    return {"status": "ok", "codes": {"qrDetected": barcode_like, "qrValue": value or None, "barcodeDetected": False}}