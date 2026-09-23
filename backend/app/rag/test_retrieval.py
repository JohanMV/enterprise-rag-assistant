from embeddings import get_embedding_model
from vector_store import get_qdrant_client
from retriever import retrieve_chunks


query = "¿Cuántos días de vacaciones tiene un trabajador?"

embedding_model = get_embedding_model()
client = get_qdrant_client()

try:
    results = retrieve_chunks(
        client=client,
        embedding_model=embedding_model,
        query=query,
        top_k=3
    )

    print(f"Pregunta: {query}")

    for i, result in enumerate(results, start=1):
        print(f"\n--- Resultado {i} ---")
        print(f"Score: {result.score}")
        print(f"Página: {result.payload.get('page_label')}")
        print(f"Fuente: {result.payload.get('source')}")
        print(result.payload.get("text")[:500])

finally:
    client.close()