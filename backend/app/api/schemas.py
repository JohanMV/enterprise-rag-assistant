from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="User question for the RAG system",
    )

    conversation_id: Optional[int] = None


class Source(BaseModel):
    document: str
    page: int


class ChatResponse(BaseModel):
    conversation_id: int
    answer: str
    sources: List[Source]


class ConversationResponse(BaseModel):
    id: int
    created_at: datetime


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: datetime