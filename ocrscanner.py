from rapidocr_onnxruntime import RapidOCR

CONFIDENCE_THRESHOLD = 0.70

_ocr = RapidOCR()


class OCRError(Exception):
    """Raised when the image cannot be scanned."""


def scan(image):
    """Run OCR and return texts whose confidence is at least 70%.

    image: file path or a numpy image (for example from cv2.imread).
    returns: list of accepted text strings. Empty list if nothing qualifies.
    raises: OCRError if the image is missing or RapidOCR cannot read it.
    """
    if image is None or (hasattr(image, "size") and image.size == 0):
        raise OCRError("No image was provided.")

    try:
        result, _elapsed = _ocr(image)
    except Exception as exc:
        raise OCRError("OCR failed to read the image.") from exc

    if not result:
        return []

    texts = []
    for item in result:
        try:
            text = str(item[1]).strip()
            score = float(item[2])
        except (IndexError, TypeError, ValueError):
            continue
        if score >= CONFIDENCE_THRESHOLD and text:
            texts.append(text)
    return texts
