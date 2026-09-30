from pathlib import Path

from backend.app.rag.embeddings import get_embedding_model
from backend.app.rag.vector_store import get_qdrant_client
from backend.app.rag.retriever import retrieve_chunks
from backend.app.rag.chain import (
    get_llm,
    build_rag_prompt,
    generate_answer,
)


# RELEVANCE_THRESHOLD = 0.55


embedding_model = get_embedding_model()
qdrant_client = get_qdrant_client()
llm = get_llm(provider="gemini")
prompt = build_rag_prompt()


def ask_rag(
    question: str,
    history: list | None = None,
):
    history = history or []

    history_text = "\n".join(
        f"{message['role']}: {message['content']}"
        for message in history
    )

    retrieval_query = question

    if history_text:
        retrieval_query = f"""
Historial de conversación:
{history_text}

Pregunta actual:
{question}
"""

    chunks = retrieve_chunks(
        client=qdrant_client,
        embedding_model=embedding_model,
        query=retrieval_query,
        top_k=3,
    )

    answer = generate_answer(
        llm=llm,
        prompt=prompt,
        question=retrieval_query,
        chunks=chunks,
    )

    sources = []
    seen = set()

    for chunk in chunks:
        # if chunk.score < RELEVANCE_THRESHOLD:
        #     continue

        source = chunk.payload.get("source")
        page_label = chunk.payload.get("page_label")

        document = Path(source).name if source else "unknown"
        page = int(page_label) if page_label else 0

        key = (document, page)

        if key not in seen:
            seen.add(key)

            sources.append({
                "document": document,
                "page": page,
            })

    no_answer_phrases = [
        "no contiene información",
        "no hay información suficiente",
        "no encontré información suficiente",
        "no se encuentra información",
    ]

    if any(
        phrase in answer.lower()
        for phrase in no_answer_phrases
    ):
        sources = []

    return {
        "answer": answer,
        "sources": sources,
    }