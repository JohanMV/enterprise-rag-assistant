from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from splitter import split_documents

pdf_path = Path("data/sample_docs/manual_rrhh_empresa_demo.pdf")

loader = PyPDFLoader(str(pdf_path))
documents = loader.load()

chunks = split_documents(documents)

print(f"Páginas cargadas: {len(documents)}")
print(f"Chunks generados: {len(chunks)}")

for i, chunk in enumerate(chunks[:3]):
    print(f"\n--- Chunk {i + 1} ---")
    print(chunk.page_content)
    print("Metadata:", chunk.metadata)