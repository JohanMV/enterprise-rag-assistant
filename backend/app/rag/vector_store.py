from uuid import uuid4

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)


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


def delete_document_points(client, document_id: str):
    """Delete and verify only the vectors that belong to one document."""
    if not client.collection_exists(COLLECTION_NAME):
        return

    document_filter = Filter(
        must=[
            FieldCondition(
                key="document_id",
                match=MatchValue(value=document_id),
            )
        ]
    )

    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=document_filter,
        wait=True,
    )

    remaining = client.count(
        collection_name=COLLECTION_NAME,
        count_filter=document_filter,
        exact=True,
    ).count
    if remaining:
        raise RuntimeError(
            f"Qdrant still contains {remaining} point(s) for document {document_id}."
        )


def store_chunks(
    client,
    chunks,
    vectors,
    document_id: str | None = None,
    filename: str | None = None,
):
    points = []

    for chunk, vector in zip(chunks, vectors):
        point_id = str(uuid4())
        source = chunk.metadata.get("source")
        page = chunk.metadata.get("page")
        page_label = chunk.metadata.get("page_label")

        if not page_label and page is not None:
            page_label = str(int(page) + 1)

        points.append(
            PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "text": chunk.page_content,
                    "source": source,
                    "document_id": document_id,
                    "filename": filename,
                    "page": page,
                    "page_label": page_label,
                    "chunk_id": point_id,
                }
            )
        )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )
