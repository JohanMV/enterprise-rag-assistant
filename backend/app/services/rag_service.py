from pathlib import Path

from backend.app.rag.embeddings import get_embedding_model
from backend.app.rag.vector_store import get_qdrant_client
from backend.app.rag.retriever import retrieve_chunks
from backend.app.rag.chain import (
    get_llm,
    build_rag_prompt,
    build_query_rewrite_prompt,
    generate_answer,
    rewrite_query,
)


# RELEVANCE_THRESHOLD = 0.55


embedding_model = get_embedding_model()
qdrant_client = get_qdrant_client()
llm = get_llm(provider="gemini")
prompt = build_rag_prompt()
query_rewrite_prompt = build_query_rewrite_prompt()


def ask_rag(
    question: str,
    history: list | None = None,
):
    history = history or []

    history_text = "\n".join(
        f"{message['role']}: {message['content']}"
        for message in history
    )

    try:
        standalone_query = rewrite_query(
            llm=llm,
            prompt=query_rewrite_prompt,
            question=question,
            history=history_text,
        )
    except Exception:
        # Retrieval must never fall back to embedding the full conversation.
        standalone_query = question.strip()

    chunks = retrieve_chunks(
        client=qdrant_client,
        embedding_model=embedding_model,
        query=standalone_query,
        top_k=3,
    )

    answer = generate_answer(
        llm=llm,
        prompt=prompt,
        question=question,
        chunks=chunks,
        history=history_text,
    )

    sources = []
    source_indexes = {}

    for chunk in chunks:
        # if chunk.score < RELEVANCE_THRESHOLD:
        #     continue

        source = chunk.payload.get("source")
        filename = chunk.payload.get("filename")
        page_label = chunk.payload.get("page_label")

        document = filename or (Path(source).name if source else "unknown")
        page = int(page_label) if page_label else 0
        excerpt = " ".join(chunk.payload.get("text", "").split())[:320]
        document_id = chunk.payload.get("document_id")
        score = float(chunk.score) if chunk.score is not None else None

        key = (document, page)

        source_data = {
            "document": document,
            "page": page,
            "excerpt": excerpt,
            "document_id": document_id,
            "score": score,
        }

        if key not in source_indexes:
            source_indexes[key] = len(sources)
            sources.append(source_data)
        elif document_id and not sources[source_indexes[key]]["document_id"]:
            # Duplicate legacy/new chunks can coexist. Prefer the richer metadata.
            sources[source_indexes[key]] = source_data

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
