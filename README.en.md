# Enterprise RAG Assistant

<p align="center">
  <img src="./docs/images/demoHD.gif" alt="Enterprise RAG Assistant Demo" width="100%">
</p>

![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite%20%2B%20TS-61DAFB?style=flat-square&logo=react&logoColor=black)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-DC244C?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Persistence-4169E1?style=flat-square&logo=postgresql&logoColor=white)

> **Enterprise Retrieval-Augmented Generation (RAG) application for querying internal documentation through grounded answers, conversational memory, source traceability, and document lifecycle management.**

[🇪🇸 Versión en español](README.md)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [AI Pipeline](#ai-pipeline)
- [Technology Stack](#technology-stack)
- [Knowledge Base Management](#knowledge-base-management)
- [Main API](#main-api)
- [Quick Start](#quick-start)
- [Technical Validation](#technical-validation)
- [Roadmap](#roadmap)
- [Author](#author)

---

## Overview

Companies accumulate critical knowledge across HR manuals, security policies, operating procedures, technical reports, and internal documentation. Finding a specific answer across this information is often slow, repetitive, and difficult to audit.

**Enterprise RAG Assistant** implements an end-to-end AI pipeline that transforms business documents into a knowledge base that can be queried using natural language. The system retrieves evidence from indexed documents, generates answers using that context, and can display the source document, page, and supporting excerpt.

This is useful for areas such as **HR, internal support, cybersecurity, operations, and compliance**, where teams need fast access to reliable information without retraining the model whenever documentation changes.

Example queries:

- “How many vacation days are employees entitled to?”
- “What should I do if I detect a security incident?”
- “What is the defined procedure for requesting access?”

---

## Key Features

### AI and RAG
- PDF document ingestion and indexing;
- overlapping chunking and local multilingual embeddings;
- Top-K semantic search with Qdrant;
- conversational query rewriting;
- grounded response generation with Gemini;
- controlled no-answer behavior when sufficient evidence is unavailable.

### Source Traceability and Document Management
- sources include document, page, excerpt, and relevance score;
- sources are persisted together with conversation history;
- duplicate prevention using SHA-256;
- coordinated deletion across PostgreSQL, Qdrant, and physical storage;
- knowledge base management directly from the interface.

### Conversations
- persistent conversation history and automatic titles;
- rename, delete, and local search;
- conversational memory based on recent context.

---

## Architecture

![Enterprise RAG Assistant - Architecture](./docs/images/enterprise_rag_assistant_architecture.png)

The architecture separates **structured application state** in PostgreSQL, **vector retrieval** in Qdrant, and **language generation** in the LLM provider. FastAPI acts as the orchestration layer between the frontend, persistence layer, and RAG pipeline.

---

## AI Pipeline

The system uses two related but independent flows: **document ingestion** and **RAG querying**.

```text
INGESTION
PDF
→ Parsing with PyPDFLoader
→ Chunking
→ MiniLM embeddings
→ Qdrant

QUERY
Question + recent conversational context
→ Standalone query rewriting
→ Query embedding
→ Semantic retrieval in Qdrant
→ Top-K relevant chunks
→ Gemini
→ Answer + sources
```

### Main Technical Parameters

| Component | Configuration |
|---|---|
| Chunking | `RecursiveCharacterTextSplitter` · `chunk_size=800` · `chunk_overlap=150` |
| Embeddings | `paraphrase-multilingual-MiniLM-L12-v2` · 384 dimensions |
| Similarity | Cosine |
| Vector store | Qdrant Local · collection `enterprise_documents` |
| Active LLM | `gemini-2.5-flash` · `temperature=0` |
| Conversational context | 10 most recent messages |

The same embedding model is used for both documents and queries, keeping both representations in the same vector space. Full conversation history is persisted in PostgreSQL, while only recent context is used during the conversation to control prompt size, latency, and token usage.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend / AI | Python 3.13 | Application logic and RAG pipeline |
| RAG framework | LangChain | RAG orchestration and LLM integration |
| PDF processing | PyPDFLoader + RecursiveCharacterTextSplitter | Document parsing and segmentation |
| Embeddings | sentence-transformers / multilingual MiniLM | Local vector representation |
| Vector database | Qdrant Local | Indexing and semantic search |
| LLM | Gemini API · `gemini-2.5-flash` | Grounded response generation |
| API | FastAPI | REST backend and orchestration |
| Persistence | PostgreSQL + SQLAlchemy | Conversations, messages, sources, and documents |
| Frontend | React + Vite + TypeScript | Web application |
| UI | assistant-ui + Tailwind CSS v4 + shadcn/ui | Conversational experience and interface |

---

## Knowledge Base Management

### Duplicate Prevention

Before parsing, embedding generation, or indexing, a **SHA-256** hash is calculated from the binary contents of each file.

| Case | Result |
|---|---|
| Same file + same filename | Rejected |
| Same file + different filename | Rejected |
| Different content + same filename | Allowed |

Duplicates return `409 Conflict`, avoiding unnecessary processing.

### Consistent Deletion

`DELETE /documents/{document_id}` removes the document from:

```text
PostgreSQL
Qdrant
data/documents/
```

This prevents orphaned records, vectors, or files and ensures the RAG pipeline no longer retrieves information from the deleted document.

### Basic Security

Gemini and PostgreSQL credentials remain in the backend and are never exposed to the frontend. Embeddings are generated locally, and the knowledge base can be updated without fine-tuning the model.

---

## Main API

```text
GET    /health
POST   /chat

GET    /conversations
GET    /conversations/{id}/messages
PATCH  /conversations/{id}
DELETE /conversations/{id}

GET    /documents
GET    /documents/{id}
POST   /documents
DELETE /documents/{id}
```

Interactive API documentation is available through Swagger at `/docs` while the backend is running.

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/JohanMV/enterprise-rag-assistant.git
cd enterprise-rag-assistant

# 2. Backend
py -3.13 -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt

# 3. Environment variables
GOOGLE_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key  # optional
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/enterprise_rag

# 4. Run backend
python -m uvicorn backend.app.main:app --reload

# 5. Run frontend
cd frontend
pnpm install
pnpm dev
```

- Swagger: `http://127.0.0.1:8000/docs`
- Frontend: `http://127.0.0.1:5173`

---

## Technical Validation

The main system flows were validated, including:

- retrieval across HR and cybersecurity documentation;
- topic switching and follow-up questions within the same conversation;
- **no-answer behavior** when sufficient evidence is unavailable;
- persistence of conversations, messages, and sources;
- duplicate document detection;
- consistent deletion and effective knowledge base updates.

Validation focused on **retrieval quality, groundedness, source traceability, conversational robustness, and document lifecycle consistency**.

---

## Roadmap

- hybrid search and reranking to improve retrieval quality;
- automated RAG evaluation and regression testing;
- observability with LangSmith or Langfuse, including latency and cost per query;
- authentication, RBAC, and document-level access control;
- multi-format support and evolution toward Qdrant Server / production deployment.

---

## Author

**Johan Moreno**  
Software Engineer · AI · Automation · Cybersecurity  
GitHub: [JohanMV](https://github.com/JohanMV)
