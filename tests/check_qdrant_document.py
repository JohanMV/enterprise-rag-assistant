from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

DOCUMENT_ID = "PON_AQUI_EL_ID_ELIMINADO"

client = QdrantClient(path="data/qdrant")

points, _ = client.scroll(
    collection_name="enterprise_documents",
    scroll_filter=Filter(
        must=[
            FieldCondition(
                key="document_id",
                match=MatchValue(value=DOCUMENT_ID),
            )
        ]
    ),
    limit=100,
)

print(f"Puntos encontrados: {len(points)}")

for point in points:
    print(point.id, point.payload)

client.close()