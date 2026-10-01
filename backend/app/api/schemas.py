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
    excerpt: str
    document_id: Optional[str] = None
    score: Optional[float] = None


class ChatResponse(BaseModel):
    conversation_id: int
    answer: str
    sources: List[Source]


class ConversationResponse(BaseModel):
    id: int
    title: Optional[str] = None
    created_at: datetime


class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    sources: Optional[List[Source]] = None
    created_at: datetime


class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_type: str
    status: str
    chunk_count: int
    error_message: Optional[str] = None
    created_at: datetime
