from vector_store import COLLECTION_NAME


def retrieve_chunks(client, embedding_model, query, top_k=3):
    query_vector = embedding_model.embed_query(query)

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=top_k
    )

    return results.points