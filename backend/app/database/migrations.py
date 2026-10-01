import hashlib
from pathlib import Path

from sqlalchemy import inspect, text

from backend.app.database.connection import Base, engine


DOCUMENTS_DIR = Path("data/documents")


def _backfill_document_hashes() -> None:
    """Populate missing hashes from the stored files without changing documents."""
    with engine.begin() as connection:
        documents = connection.execute(
            text("SELECT id, filename FROM documents WHERE file_hash IS NULL")
        ).mappings().all()

        for document in documents:
            document_path = DOCUMENTS_DIR / document["filename"]
            if not document_path.is_file():
                continue

            file_hash = hashlib.sha256(document_path.read_bytes()).hexdigest()
            duplicate_id = connection.execute(
                text(
                    "SELECT id FROM documents "
                    "WHERE file_hash = :file_hash AND id <> :document_id LIMIT 1"
                ),
                {"file_hash": file_hash, "document_id": document["id"]},
            ).scalar_one_or_none()

            if duplicate_id is None:
                connection.execute(
                    text(
                        "UPDATE documents SET file_hash = :file_hash "
                        "WHERE id = :document_id AND file_hash IS NULL"
                    ),
                    {"file_hash": file_hash, "document_id": document["id"]},
                )


def initialize_database() -> None:
    """Apply the small, additive schema changes required by the application."""
    # Importing the models registers every table in Base.metadata.
    from backend.app.database import models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    conversation_columns = {
        column["name"] for column in inspector.get_columns("conversations")
    }

    if "title" not in conversation_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE conversations ADD COLUMN title VARCHAR(200)")
            )

    message_columns = {
        column["name"] for column in inspector.get_columns("messages")
    }
    if "sources" not in message_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE messages ADD COLUMN sources JSON"))

    document_columns = {
        column["name"] for column in inspector.get_columns("documents")
    }
    if "file_hash" not in document_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE documents ADD COLUMN file_hash VARCHAR(64)")
            )

    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "uq_documents_file_hash ON documents (file_hash)"
            )
        )

    _backfill_document_hashes()
