from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader

from splitter import split_documents
from embeddings import get_embedding_model


pdf_path = Path("data/sample_docs/manual_rrhh_empresa_demo.pdf")

# 1. Cargar PDF
loader = PyPDFLoader(str(pdf_path))
documents = loader.load()

# 2. Dividir en chunks
chunks = split_documents(documents)

# 3. Obtener modelo de embeddings
embedding_model = get_embedding_model()

# 4. Extraer solo el texto de cada chunk
texts = [chunk.page_content for chunk in chunks]

# 5. Generar embeddings
vectors = embedding_model.embed_documents(texts)

print(f"Páginas: {len(documents)}")
print(f"Chunks: {len(chunks)}")
print(f"Vectores generados: {len(vectors)}")
print(f"Dimensión de cada vector: {len(vectors[0])}")

print("\nPrimer chunk:")
print(chunks[0].page_content[:300])

print("\nPrimeros valores de su embedding:")
print(vectors[0][:10])