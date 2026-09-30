from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.schemas import (
    ChatRequest,
    ChatResponse,
    ConversationResponse,
    MessageResponse,
)
from backend.app.database.connection import get_db
from backend.app.database.crud import (
    create_conversation,
    create_message,
    get_conversation,
    get_conversation_messages,
    get_conversations,
)
from backend.app.services.rag_service import ask_rag


router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    try:
        # 1. Crear o recuperar conversación
        if request.conversation_id is None:
            conversation = create_conversation(db)
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