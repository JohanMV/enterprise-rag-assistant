from embeddings import get_embedding_model
from vector_store import get_qdrant_client
from retriever import retrieve_chunks
from chain import get_llm, build_rag_prompt, generate_answer


query = "¿De de forma breve cuáles son los códigos de conducta principales?"

embedding_model = get_embedding_model()
client = get_qdrant_client()

try:
    chunks = retrieve_chunks(
        client=client,
        embedding_model=embedding_model,
        query=query,
        top_k=3
    )

    llm = get_llm(provider="gemini")
    ##llm = get_llm(provider="mistral")
    prompt = build_rag_prompt()

    answer = generate_answer(
        llm=llm,
        prompt=prompt,
        question=query,
        chunks=chunks
    )

    print("\nPregunta:")
    print(query)

    print("\nRespuesta:")
    print(answer)

    print("\nFuentes:")
    for chunk in chunks:
        print(
            f"- {chunk.payload.get('source')} "
            f"(página {chunk.payload.get('page_label')})"
        )

finally:
    client.close()