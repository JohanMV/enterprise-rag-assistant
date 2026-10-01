from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader


def load_pdf(pdf_path: str | Path):
    """Load a PDF into LangChain page documents."""
    return PyPDFLoader(str(pdf_path)).load()
