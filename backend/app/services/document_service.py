import hashlib
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database.crud import (
    create_document,
    get_document_by_hash,
    update_document_status,
)
from backend.app.rag.loader import load_pdf
from backend.app.rag.splitter import split_documents
from backend.app.rag.vector_store import create_collection, store_chunks
from backend.app.services.rag_service import embedding_model, qdrant_client


MAX_PDF_SIZE = 20 * 1024 * 1024
DOCUMENTS_DIR = Path("data/documents")


class DocumentIngestionError(Exception):
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


def ingest_pdf(db: Session, upload: UploadFile):
    original_filename = Path(upload.filename or "").name

    if not original_filename or Path(original_filename).suffix.lower() != ".pdf":
        raise DocumentIngestionError("El archivo debe tener extensión .pdf.")

    if upload.content_type not in {
        "application/pdf",
        "application/x-pdf",
        "application/octet-stream",
    }:
        raise DocumentIngestionError("El tipo de contenido debe ser application/pdf.")

    content = upload.file.read(MAX_PDF_SIZE + 1)

    if not content:
        raise DocumentIngestionError("El PDF está vacío.")

    if len(content) > MAX_PDF_SIZE:
        raise DocumentIngestionError("El PDF supera el límite de 20 MB.", 413)

    if not content.startswith(b"%PDF-"):
        raise DocumentIngestionError("El contenido del archivo no corresponde a un PDF válido.")

    file_hash = hashlib.sha256(content).hexdigest()
    if get_document_by_hash(db, file_hash) is not None:
        raise DocumentIngestionError("Document already exists.", 409)

    document_id = str(uuid4())
    stored_filename = f"{document_id}.pdf"

    try:
        document = create_document(
            db=db,
            document_id=document_id,
            filename=stored_filename,
            original_filename=original_filename,
            file_type="application/pdf",
            file_hash=file_hash,
        )
    except IntegrityError as exc:
        db.rollback()
        raise DocumentIngestionError("Document already exists.", 409) from exc

    try:
        DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
        pdf_path = DOCUMENTS_DIR / stored_filename
        pdf_path.write_bytes(content)

        pages = load_pdf(pdf_path)
        if not pages or not any(page.page_content.strip() for page in pages):
            raise ValueError("El PDF no contiene texto extraíble.")

        chunks = [
            chunk
            for chunk in split_documents(pages)
            if chunk.page_content.strip()
        ]
        if not chunks:
            raise ValueError("No se pudieron generar fragmentos del PDF.")

        texts = [chunk.page_content for chunk in chunks]
        vectors = embedding_model.embed_documents(texts)
        if not vectors:
            raise RuntimeError("No se pudieron generar embeddings para el PDF.")

        create_collection(qdrant_client, vector_size=len(vectors[0]))
        store_chunks(
            client=qdrant_client,
            chunks=chunks,
            vectors=vectors,
            document_id=document.id,
            filename=document.original_filename,
        )

        return update_document_status(
            db=db,
            document=document,
            status="indexed",
            chunk_count=len(chunks),
        )
    except Exception as exc:
        message = str(exc) or "No se pudo procesar el PDF."
        update_document_status(
            db=db,
            document=document,
            status="failed",
            error_message=message[:1000],
        )
        raise DocumentIngestionError(f"No se pudo procesar el PDF: {message}") from exc
