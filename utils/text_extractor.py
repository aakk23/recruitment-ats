from functools import lru_cache
from io import BytesIO
from typing import Union


class TextExtractionError(ValueError):
    pass


def _to_bytes(file_obj: Union[bytes, bytearray, BytesIO]) -> bytes:
    if isinstance(file_obj, bytes):
        return file_obj
    if isinstance(file_obj, bytearray):
        return bytes(file_obj)
    if hasattr(file_obj, "read"):
        return file_obj.read()
    raise TextExtractionError("Unsupported file object for text extraction")


def _normalize_whitespace(text: str) -> str:
    lines = [line.strip() for line in (text or "").splitlines()]
    return "\n".join(line for line in lines if line)


@lru_cache(maxsize=128)
def _extract_pdf_cached(file_bytes: bytes) -> str:
    try:
        from pdfminer.high_level import extract_text
    except Exception as exc:
        raise TextExtractionError("pdfminer.six is required for PDF parsing") from exc

    try:
        text = extract_text(BytesIO(file_bytes))
    except Exception as exc:
        raise TextExtractionError("Could not read PDF. The file may be corrupted.") from exc

    normalized = _normalize_whitespace(text)
    if not normalized:
        raise TextExtractionError("No readable text found in PDF")
    return normalized


@lru_cache(maxsize=128)
def _extract_docx_cached(file_bytes: bytes) -> str:
    try:
        from docx import Document
    except Exception as exc:
        raise TextExtractionError("python-docx is required for DOCX parsing") from exc

    try:
        doc = Document(BytesIO(file_bytes))
        text = "\n".join(p.text for p in doc.paragraphs)
    except Exception as exc:
        raise TextExtractionError("Could not read DOCX. The file may be corrupted.") from exc

    normalized = _normalize_whitespace(text)
    if not normalized:
        raise TextExtractionError("No readable text found in DOCX")
    return normalized


def extract_text_from_pdf(file_obj: Union[bytes, bytearray, BytesIO]) -> str:
    file_bytes = _to_bytes(file_obj)
    if not file_bytes:
        raise TextExtractionError("Uploaded PDF is empty")
    return _extract_pdf_cached(file_bytes)


def extract_text_from_docx(file_obj: Union[bytes, bytearray, BytesIO]) -> str:
    file_bytes = _to_bytes(file_obj)
    if not file_bytes:
        raise TextExtractionError("Uploaded DOCX is empty")
    return _extract_docx_cached(file_bytes)
