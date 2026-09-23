from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader

from splitter import split_documents
from embeddings import get_embedding_model
from vector_store import (
    get_qdrant_client,
    create_collection,
    store_chunks
)


pdf_path = Path("data/sample_docs/manual_rrhh_empresa_demo.pdf")

# 1. Cargar PDF
loader = PyPDFLoader(str(pdf_path))
documents = loader.load()

# 2. Crear chunks
chunks = split_documents(documents)

# 3. Generar embeddings
embedding_model = get_embedding_model()
texts = [chunk.page_content for chunk in chunks]
vectors = embedding_model.embed_documents(texts)

# 4. Conectar con Qdrant
client = get_qdrant_client()

try:
    # 5. Crear colección
    create_collection(client)

    # 6. Guardar chunks + vectores + metadata
    store_chunks(client, chunks, vectors)

    # 7. Verificar cantidad
    info = client.get_collection("enterprise_documents")

    print(f"Chunks: {len(chunks)}")
    print(f"Vectores generados: {len(vectors)}")
    print(f"Puntos almacenados en Qdrant: {info.points_count}")

finally:
    client.close()