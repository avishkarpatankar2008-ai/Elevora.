"""Resume/JD text extraction (PyMuPDF for PDF, python-docx for .docx).

Parsing runs entirely locally, so this is one of the few modules covered by
tests that use real files rather than mocks. Every failure raises
:class:`DocumentParseError` with a message that is safe to show a user: the
underlying parser exception is logged, never returned.
"""

import io

import docx
import pymupdf

from app.core.logging import get_logger

logger = get_logger(__name__)

MAX_DOCUMENT_BYTES = 8 * 1024 * 1024  # 8MB — resumes/JDs are text, not media
MAX_EXTRACTED_CHARS = 15_000  # keep extraction-call context (and cost) bounded

ALLOWED_DOCUMENT_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
}

PDF_MAGIC = b"%PDF-"
DOCX_MAGIC = b"PK\x03\x04"  # docx is a zip archive


class DocumentParseError(Exception):
    """Raised for any file-validation or extraction failure. The message is
    always safe to show to the user — it never contains extracted content or
    parser internals."""


def _looks_like_pdf(raw: bytes) -> bool:
    return raw.startswith(PDF_MAGIC)


def _looks_like_docx(raw: bytes) -> bool:
    return raw.startswith(DOCX_MAGIC)


def extract_text_from_pdf(raw: bytes) -> str:
    if not _looks_like_pdf(raw):
        raise DocumentParseError(
            "This doesn't look like a real PDF file (wrong file signature) — "
            "it may be corrupted or renamed from another format."
        )
    try:
        with pymupdf.open(stream=raw, filetype="pdf") as pdf:
            if pdf.needs_pass:
                raise DocumentParseError(
                    "That PDF is password-protected, so its text can't be read. "
                    "Upload an unprotected copy."
                )
            return "\n".join(page.get_text() for page in pdf)
    except DocumentParseError:
        raise
    except Exception as exc:  # pymupdf raises its own exception types for malformed PDFs
        logger.warning("PDF extraction failed: %s: %s", type(exc).__name__, exc)
        raise DocumentParseError(
            "Couldn't read that PDF — it may be corrupted or in an unsupported format. "
            "Try re-saving it, or upload a .docx instead."
        ) from exc


def extract_text_from_docx(raw: bytes) -> str:
    if not _looks_like_docx(raw):
        raise DocumentParseError(
            "This doesn't look like a real .docx file (wrong file signature) — "
            "it may be corrupted, an old .doc file, or renamed from another format."
        )
    try:
        document = docx.Document(io.BytesIO(raw))
        return "\n".join(p.text for p in document.paragraphs)
    except Exception as exc:  # python-docx raises various errors for malformed zips/XML
        logger.warning("DOCX extraction failed: %s: %s", type(exc).__name__, exc)
        raise DocumentParseError(
            "Couldn't read that Word document — it may be corrupted, or saved in the "
            "older .doc format (which isn't supported). Try re-saving it as .docx."
        ) from exc


def extract_text(*, filename: str, content_type: str | None, raw: bytes) -> str:
    """Dispatch to the right parser based on the declared content type, then
    validate that the bytes actually match (magic-byte check) rather than
    trusting the client-supplied header — a renamed .exe claiming to be a PDF
    fails here, not silently inside PyMuPDF."""
    if len(raw) == 0:
        raise DocumentParseError("The uploaded file is empty.")
    if len(raw) > MAX_DOCUMENT_BYTES:
        raise DocumentParseError("That file is too large — resumes and JDs should be under 8MB.")

    if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
        text = extract_text_from_pdf(raw)
    elif (
        content_type
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        or filename.lower().endswith(".docx")
    ):
        text = extract_text_from_docx(raw)
    else:
        raise DocumentParseError(
            f"Unsupported file type: {content_type or 'unknown'}. Upload a PDF or .docx file."
        )

    cleaned = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    if not cleaned:
        raise DocumentParseError(
            "Couldn't find any readable text in that file — it may be a scanned "
            "image with no text layer. Upload a text-based PDF or .docx instead."
        )

    return cleaned[:MAX_EXTRACTED_CHARS]
