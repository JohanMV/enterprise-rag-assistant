from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct


COLLECTION_NAME = "enterprise_documents"


def get_qdrant_client():
    return QdrantClient(path="data/qdrant")


def create_collection(client, vector_size=384):
    if not client.collection_exists(COLLECTION_NAME):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE
            )
        )


def store_chunks(client, chunks, vectors):
    points = []

    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        points.append(
            PointStruct(
                id=i,
                vector=vector,
                payload={
                    "text": chunk.page_content,
                    "source": chunk.metadata.get("source"),
                    "page": chunk.metadata.get("page"),
                    "page_label": chunk.metadata.get("page_label")
                }
            )
        )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )