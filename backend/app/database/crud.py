from sqlalchemy.orm import Session

from backend.app.database.models import Conversation, Document, Message


def create_conversation(db: Session, title: str | None = None):
    conversation = Conversation(title=title)

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return conversation


def update_conversation_title(
    db: Session,
    conversation: Conversation,
    title: str,
):
    conversation.title = title
    db.commit()
    db.refresh(conversation)

    return conversation


def get_conversation(db: Session, conversation_id: int):
    return (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )


def get_conversations(db: Session):
    return (
        db.query(Conversation)
        .order_by(Conversation.created_at.desc())
        .all()
    )


def delete_conversation(db: Session, conversation: Conversation):
    db.delete(conversation)
    db.commit()


def create_message(
    db: Session,
    conversation_id: int,
    role: str,
    content: str,
    sources: list | None = None,
):
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        sources=sources,
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    return message


def get_conversation_messages(
    db: Session,
    conversation_id: int,
    limit: int | None = None,
):
    query = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
    )

    if limit is not None:
        query = query.limit(limit)

    messages = query.all()

    return list(reversed(messages))


def create_document(
    db: Session,
    document_id: str,
    filename: str,
    original_filename: str,
    file_type: str,
    file_hash: str,
):
    document = Document(
        id=document_id,
        filename=filename,
        original_filename=original_filename,
        file_type=file_type,
        file_hash=file_hash,
        status="processing",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return document


def get_documents(db: Session):
    return db.query(Document).order_by(Document.created_at.desc()).all()


def get_document(db: Session, document_id: str):
    return db.query(Document).filter(Document.id == document_id).first()


def get_document_by_hash(db: Session, file_hash: str):
    return db.query(Document).filter(Document.file_hash == file_hash).first()


def delete_document_record(db: Session, document: Document):
    db.delete(document)
    db.commit()


def update_document_status(
    db: Session,
    document: Document,
    status: str,
    chunk_count: int = 0,
    error_message: str | None = None,
):
    document.status = status
    document.chunk_count = chunk_count
    document.error_message = error_message
    db.commit()
    db.refresh(document)

    return document
