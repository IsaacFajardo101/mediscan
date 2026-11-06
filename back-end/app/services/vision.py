import os

os.environ["FLAGS_enable_pir_api"] = "0"
os.environ["FLAGS_use_mkldnn"] = "0"

from paddleocr import PaddleOCR

import io

import numpy as np
from PIL import Image
from starlette.concurrency import run_in_threadpool


class OCRConfigurationError(RuntimeError):
    """Raised when PaddleOCR or its model configuration is unavailable."""


class OCRProcessingError(RuntimeError):
    """Raised when an image cannot be decoded or processed."""


ocr_model = PaddleOCR(lang="en", enable_mkldnn=False)


def _extract_text_sync(image_bytes: bytes) -> str:
    """Run the blocking PaddleOCR operation in a worker thread."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(img)
        max_dimension = max(img_np.shape[:2])
        if max_dimension > 1024:
            scale = 1024 / max_dimension
            resized = img.resize(
                (round(img.width * scale), round(img.height * scale)),
                Image.Resampling.LANCZOS,
            )
            img_np = np.array(resized)
        print(f"IMAGE SHAPE: {img_np.shape}")
    except Exception as exc:
        raise OCRProcessingError(
            "The uploaded image could not be decoded."
        ) from exc

    try:
        print(f"Received {len(image_bytes)} bytes")
        raw_results = ocr_model.ocr(img_np)
    except Exception as exc:
        raise OCRProcessingError(
            "PaddleOCR could not extract text from the uploaded image."
        ) from exc

    text_lines: list[str] = []
    for page in raw_results or []:
        if isinstance(page, dict):
            text_lines.extend(
                text.strip()
                for text in page.get("rec_texts", [])
                if isinstance(text, str) and text.strip()
            )
            continue

        for line in page or []:
            if len(line) > 1:
                text, _confidence = line[1]
                if text and text.strip():
                    text_lines.append(text.strip())

    readable_text = "\n".join(text_lines)
    print(f"\n--- RAW OCR OUTPUT ---\n{readable_text or 'No text detected'}\n")
    return readable_text


async def extract_text(image_bytes: bytes) -> str:
    """Extract and return raw text without blocking the FastAPI event loop."""
    if not image_bytes:
        raise OCRProcessingError("The uploaded image is empty.")

    return await run_in_threadpool(_extract_text_sync, image_bytes)
