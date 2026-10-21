from rapidocr_onnxruntime import RapidOCR

CONFIDENCE_THRESHOLD = 0.70

_ocr = RapidOCR()


def scan(image):
    """Run OCR and return texts whose confidence is at least 70%.

    image: file path or a numpy image (for example from cv2.imread).
    returns: list of accepted text strings. Empty list if nothing qualifies.
    """
    if image is None:
        return []

    result, _elapsed = _ocr(image)
    if not result:
        return []

    texts = []
    for _box, text, score in result:
        if float(score) >= CONFIDENCE_THRESHOLD and text.strip():
            texts.append(text)
    return texts