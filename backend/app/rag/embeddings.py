from langchain_huggingface import HuggingFaceEmbeddings


MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def get_embedding_model():
    return HuggingFaceEmbeddings(
        model_name=MODEL_NAME
    )