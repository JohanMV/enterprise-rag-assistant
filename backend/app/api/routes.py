import re
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.api.schemas import (
    ChatRequest,
    ChatResponse,
    ConversationResponse,
    ConversationUpdate,
    DocumentResponse,
    MessageResponse,
)
from backend.app.database.connection import get_db
from backend.app.database.crud import (
    create_conversation,
    create_message,
    delete_conversation,
    get_document,
    get_documents,
    get_conversation,
    get_conversation_messages,
    get_conversations,
    update_conversation_title,
)
from backend.app.services.document_service import (
    DocumentIngestionError,
    ingest_pdf,
)
from backend.app.services.rag_service import ask_rag


router = APIRouter()


def build_conversation_title(question: str) -> str:
    words = re.findall(r"[\wÀ-ÿ]+", question, flags=re.UNICODE)[:7]

    if len(words) < 3:
        words = (["Consulta", "sobre"] + words)[:7]

    if len(words) < 3:
        return "Nueva conversación empresarial"

    title = " ".join(words)
    return title[0].upper() + title[1:]


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    try:
        # 1. Crear o recuperar conversación
        if request.conversation_id is None:
            conversation = create_conversation(
                db,
                title=build_conversation_title(request.question),
            )
        else:
            conversation = get_conversation(
                db,
                request.conversation_id,
            )

            if conversation is None:
                raise HTTPException(
                    status_code=404,
                    detail="Conversation not found.",
                )

        # 2. Recuperar solo los últimos 10 mensajes
        messages = get_conversation_messages(
            db,
            conversation.id,
            limit=10,
        )

        history = [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in messages
        ]

        # 3. Guardar pregunta actual
        create_message(
            db=db,
            conversation_id=conversation.id,
            role="user",
            content=request.question,
        )

        # 4. Ejecutar RAG usando historial reciente
        result = ask_rag(
            question=request.question,
            history=history,
        )

        # 5. Guardar respuesta
        create_message(
            db=db,
            conversation_id=conversation.id,
            role="assistant",
            content=result["answer"],
            sources=result["sources"],
        )

        # 6. Responder al cliente
        return {
            "conversation_id": conversation.id,
            "answer": result["answer"],
            "sources": result["sources"],
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing the RAG request.",
        ) from exc


@router.get(
    "/conversations",
    response_model=List[ConversationResponse],
)
def list_conversations(
    db: Session = Depends(get_db),
):
    return get_conversations(db)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=List[MessageResponse],
)
def list_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    conversation = get_conversation(
        db,
        conversation_id,
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    return get_conversation_messages(
        db,
        conversation_id,
    )


@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
)
def rename_conversation(
    conversation_id: int,
    request: ConversationUpdate,
    db: Session = Depends(get_db),
):
    conversation = get_conversation(db, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    title = request.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="El título no puede estar vacío.")

    return update_conversation_title(db, conversation, title)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    conversation = get_conversation(db, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    delete_conversation(db, conversation)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/documents", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    return get_documents(db)


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def document_detail(document_id: str, db: Session = Depends(get_db)):
    document = get_document(db, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document


@router.post("/documents", response_model=DocumentResponse, status_code=201)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        return ingest_pdf(db, file)
    except DocumentIngestionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    finally:
        file.file.close()
