from fastapi import FastAPI

from backend.app.api.routes import router


app = FastAPI(
    title="Enterprise RAG Assistant API",
    description="REST API for querying enterprise documents using RAG.",
    version="1.0.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Enterprise RAG Assistant",
    }


app.include_router(router)