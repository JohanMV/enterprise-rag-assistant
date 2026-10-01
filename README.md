# Enterprise RAG Assistant

> **Enterprise-grade Retrieval-Augmented Generation (RAG) application for querying internal business documents with grounded answers, conversational memory, source traceability and document lifecycle management.**

[🇪🇸 Versión en español](README.es.md)

---

## Overview

**Enterprise RAG Assistant** is an AI Engineering project designed to transform internal business documentation into a searchable knowledge base that can be queried using natural language.

The application combines:

- **Retrieval-Augmented Generation (RAG)**
- **semantic search with Qdrant**
- **Gemini-based grounded generation**
- **persistent conversation memory in PostgreSQL**
- **document ingestion and lifecycle management**
- **React + assistant-ui frontend**
- **source citations with document/page traceability**

The project is intentionally built as an **AI Engineering portfolio project**, not only as a chatbot demo.

---

## Business Problem

Companies often store critical knowledge across HR manuals, security policies, technical reports, operational procedures and internal documentation. Finding a specific answer manually can be slow, repetitive and error-prone.

Enterprise RAG Assistant allows users to ask questions such as:

> “How many vacation days are employees entitled to?”

> “What should I do if I detect a security incident?”

> “What is the role of the IT department?”

The system first retrieves evidence from the organization’s indexed documents and then asks the LLM to answer from that evidence.

This improves access to internal knowledge, response speed, consistency, source traceability and control over which documents are available to the assistant.

---

## Current Application

The MVP currently includes:

- persistent chat history;
- automatic conversation titles;
- conversation rename and delete;
- local conversation search in the sidebar;
- PDF upload;
- persistent document metadata;
- SHA-256 duplicate-document prevention;
- document deletion from PostgreSQL, Qdrant and local storage;
- semantic retrieval;
- conversational query rewriting;
- grounded Gemini responses;
- persisted source citations;
- source document, page, excerpt and relevance score;
- three-column enterprise UI: chat history, main conversation and knowledge base.

---

## Architecture

### High-level application architecture

```mermaid
flowchart LR
    UI[React + Vite + assistant-ui] --> API[FastAPI]
    API --> PG[(PostgreSQL)]
    API --> FS[(Local Document Storage)]
    API --> RAG[LangChain RAG Service]
    RAG --> REWRITE[Conversational Query Rewriter]
    REWRITE --> EMB[Multilingual MiniLM Embeddings]
    EMB --> QD[(Qdrant Local)]
    QD --> RET[Top-K Retrieved Chunks]
    RET --> LLM[Gemini 2.5 Flash]
    LLM --> API
    API --> UI
```

### Document ingestion flow

```mermaid
flowchart TD
    A[PDF Upload] --> B[Validate + SHA-256]
    B --> C{Duplicate?}
    C -- Yes --> D[409 Document already exists]
    C -- No --> E[Save PDF]
    E --> F[PyPDFLoader]
    F --> G[Chunking]
    G --> H[384-d Embeddings]
    H --> I[Qdrant]
    I --> J[Persist Metadata in PostgreSQL]
```

### Conversational RAG flow

```mermaid
flowchart TD
    A[User Question] --> B[Recent Conversation History]
    B --> C[Standalone Query Rewriting]
    C --> D[Query Embedding]
    D --> E[Qdrant Similarity Search]
    E --> F[Top-K Relevant Chunks]
    F --> G[Grounded Prompt]
    G --> H[Gemini]
    H --> I[Answer + Sources]
    I --> J[Persist Message + Sources]
```

---

## RAG Pipeline

### 1. PDF ingestion

Documents are currently loaded with **PyPDFLoader** while preserving metadata such as source document, page, document ID and chunk ID.

Current supported upload format:

```text
PDF
```

Support for DOCX, TXT and other formats is planned.

### 2. Chunking

Documents are split using:

```text
RecursiveCharacterTextSplitter
```

Current configuration:

```text
chunk_size    = 800
chunk_overlap = 150
```

The overlap helps preserve context across chunk boundaries.

### 3. Embeddings

The project uses:

```text
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

Embedding size:

```text
384 dimensions
```

The model runs locally and is used for both document chunks and user retrieval queries.

### 4. Vector storage

Vectors are stored in **Qdrant Local Mode**.

Current collection:

```text
enterprise_documents
```

Similarity metric:

```text
COSINE
```

Persistent local storage:

```text
data/qdrant/
```

Each indexed chunk contains metadata such as:

```json
{
  "document_id": "uuid",
  "document": "manual_rrhh_empresa_demo.pdf",
  "page": 5,
  "chunk_id": 12,
  "text": "..."
}
```

Qdrant Local is used because the MVP currently runs without Docker.

> Qdrant Local locks its storage directory to a single active client process. For concurrent or multi-process deployment, Qdrant Server is the appropriate next step.

### 5. Conversational query rewriting

The application does **not** concatenate raw conversation history directly into the retrieval query.

Instead:

```text
Recent History + Current Question
            ↓
Standalone Query Rewriter
            ↓
Retrieval Query
```

This prevents unrelated previous topics from polluting semantic retrieval.

The rewritten query is used for vector retrieval, while conversational history remains available separately for answer generation.

### 6. Semantic retrieval

The retriever embeds the standalone query and searches Qdrant using cosine similarity.

```text
Standalone Question
        ↓
384-d Query Embedding
        ↓
Qdrant Similarity Search
        ↓
Top-K Chunks
```

A fixed relevance threshold is intentionally not enforced yet because it may remove useful evidence. Relevance filtering and reranking should be evaluation-driven.

### 7. Grounded generation

Retrieved chunks are passed to Gemini through LangChain.

Current configuration:

```text
Provider: Gemini
Model: gemini-2.5-flash
Temperature: 0
```

The system prompt instructs the model to answer only from supplied context, avoid unsupported claims and explicitly indicate when context is insufficient.

The no-answer behavior has been validated: when evidence is unavailable, the assistant states that the information is not present and returns an empty source list.

A Mistral provider abstraction also exists as an optional alternative, but **Gemini is the active provider for the current MVP**.

---

## Knowledge Base Management

### Upload documents

Users can upload PDFs from the Knowledge panel.

```text
PDF
↓
Validation
↓
SHA-256 hash
↓
Persist file
↓
Parse
↓
Chunk
↓
Embed
↓
Index in Qdrant
↓
Save document metadata
```

Uploaded files are stored under:

```text
data/documents/
```

This directory is excluded from Git.

### Duplicate prevention

Document duplication is prevented using **SHA-256 over the binary file content**.

This means:

```text
same file + same filename
→ duplicate

same file + renamed filename
→ duplicate

different content + same filename
→ allowed
```

Duplicate response:

```http
409 Conflict
```

```json
{
  "detail": "Document already exists."
}
```

The duplicate check occurs before expensive parsing, embedding and Qdrant ingestion.

### Delete documents

Documents can be deleted directly from the Knowledge panel.

Deletion removes the document from all persistence layers:

```text
Document
├── PostgreSQL metadata
├── Qdrant vectors/chunks
└── data/documents/ physical PDF
```

Endpoint:

```http
DELETE /documents/{document_id}
```

Successful response:

```text
204 No Content
```

Missing document:

```text
404 Not Found
```

The deletion flow has been validated by confirming:

- the PostgreSQL record disappears;
- the physical PDF disappears;
- Qdrant returns **0 points** for the deleted `document_id`;
- the deleted document is no longer returned by RAG.

---

## Conversational Memory

PostgreSQL stores the complete conversation history.

The LLM does not receive the entire conversation indefinitely.

Current strategy:

```text
Full history
→ persisted in PostgreSQL

Recent 10 messages
→ used as conversational context
```

This controls prompt size, latency and token consumption.

---

## Conversation Management

The frontend currently supports:

- new conversation;
- automatic title generation;
- manual rename;
- conversation deletion;
- persisted history;
- local search by conversation title.

Conversation search is performed client-side over conversations already loaded by the frontend. It does **not** call Gemini or consume LLM tokens.

---

## Sources and Citations

Assistant answers can include source cards with:

- document name;
- page;
- relevance score;
- excerpt;
- document ID when available.

Sources are persisted with assistant messages in PostgreSQL, so reopening a conversation does not lose its citations.

---

## Frontend

The frontend uses:

```text
React
Vite
TypeScript
assistant-ui
Tailwind CSS v4
shadcn/ui
```

The current desktop layout uses three main columns:

```text
┌─────────────────┬───────────────────────────┬──────────────────────┐
│ Chat History    │ Main Chat                 │ Knowledge Base       │
│                 │                           │                      │
│ New Chat        │ Messages                  │ Upload PDF           │
│ Search Chats    │ Sources                   │ Indexed Documents    │
│ Conversations   │ Composer                  │ Document Actions     │
└─────────────────┴───────────────────────────┴──────────────────────┘
```

This keeps chat history and the knowledge base independent as both grow.

The UI follows a restrained enterprise visual style with a white background, neutral gray hierarchy, subtle borders and independent scroll areas.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Language | Python 3.13 | Backend and AI logic |
| RAG framework | LangChain | Prompting, retrieval and LLM integration |
| Document parsing | PyPDFLoader | PDF ingestion |
| Chunking | RecursiveCharacterTextSplitter | Overlapping chunk generation |
| Embeddings | sentence-transformers / multilingual MiniLM | 384-d local embeddings |
| Vector database | Qdrant Local | Persistent semantic vector storage |
| LLM | Gemini API · gemini-2.5-flash | Grounded answer generation |
| Optional LLM | Mistral AI | Alternative provider abstraction |
| API | FastAPI | REST backend |
| ORM | SQLAlchemy | Database models and persistence |
| PostgreSQL driver | psycopg | PostgreSQL connectivity |
| Relational database | PostgreSQL | Conversations, messages, sources and documents |
| Frontend | React + Vite + TypeScript | Web application |
| AI chat UI | assistant-ui | Thread, message and composer primitives |
| Styling | Tailwind CSS v4 + shadcn/ui | Enterprise UI |
| Package manager | pnpm | Frontend dependency management |
| Version control | Git / GitHub | Source control |

---

## PostgreSQL Data Model

Current persisted entities include:

### `conversations`

Stores conversation ID, generated/manual title and timestamps.

### `messages`

Stores conversation relationship, role, content, persisted sources/citations and timestamps.

### `documents`

Stores document lifecycle metadata including:

- ID;
- stored filename;
- original filename;
- MIME/file type;
- status;
- chunk count;
- error message;
- SHA-256 file hash;
- creation timestamp.

---

## REST API

Current major endpoints:

```text
GET    /health

POST   /chat

GET    /conversations
GET    /conversations/{conversation_id}/messages
PATCH  /conversations/{conversation_id}
DELETE /conversations/{conversation_id}

GET    /documents
GET    /documents/{document_id}
POST   /documents
DELETE /documents/{document_id}
```

### `POST /chat`

Example request:

```json
{
  "question": "¿Cuántos días de vacaciones corresponden después de un año?",
  "conversation_id": 3
}
```

`conversation_id` is optional. Without it, a new conversation is created; with it, the existing conversation is reused.

The response includes the conversation ID, grounded answer and sources.

---

## Current Project Status

| Phase | Description | Status |
|---|---|---|
| 0 | Project setup | ✅ Completed |
| 1 | PDF loader | ✅ Completed |
| 2 | Chunking | ✅ Completed |
| 3 | Local embeddings | ✅ Completed |
| 4 | Qdrant vector persistence | ✅ Completed |
| 5 | Semantic retrieval | ✅ Completed |
| 6 | Gemini RAG generation | ✅ Completed |
| 7 | FastAPI API | ✅ Completed |
| 8 | PostgreSQL persistence | ✅ Completed |
| 9 | Conversational memory | ✅ Completed |
| 10 | Query rewriting | ✅ Completed |
| 11 | React + assistant-ui frontend | ✅ Completed |
| 12 | Conversation titles / rename / delete | ✅ Completed |
| 13 | Knowledge panel | ✅ Completed |
| 14 | PDF upload and ingestion | ✅ Completed |
| 15 | Persistent source citations | ✅ Completed |
| 16 | SHA-256 duplicate prevention | ✅ Completed |
| 17 | Safe document deletion | ✅ Completed |
| 18 | Three-column enterprise UI | ✅ Completed |
| 19 | Conversation search | ✅ Completed |
| 20 | Retrieval hardening / evaluation / deployment | ⏳ In progress |

---

## Project Structure

```text
enterprise-rag-assistant/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes.py
│   │   │   └── schemas.py
│   │   ├── database/
│   │   │   ├── connection.py
│   │   │   ├── models.py
│   │   │   ├── crud.py
│   │   │   └── create_tables.py
│   │   ├── rag/
│   │   │   ├── loader.py
│   │   │   ├── splitter.py
│   │   │   ├── embeddings.py
│   │   │   ├── vector_store.py
│   │   │   ├── retriever.py
│   │   │   └── chain.py
│   │   ├── services/
│   │   │   └── rag_service.py
│   │   └── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── MyRuntimeProvider.tsx
│   ├── .env.example
│   ├── .env.local
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── data/
│   ├── documents/       # uploaded PDFs - ignored by Git
│   ├── qdrant/          # local vector persistence
│   └── sample_docs/     # bundled demo documents
│
├── tests/
├── .env
├── .env.example
├── .gitignore
├── README.es.md
└── README.md
```

The exact internal file organization may evolve as the MVP is hardened.

---

## Local Setup

### 1. Clone

```bash
git clone https://github.com/JohanMV/enterprise-rag-assistant.git
cd enterprise-rag-assistant
```

### 2. Create the backend environment

```bash
py -3.13 -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

### 3. Environment variables

Create `.env` in the project root:

```env
GOOGLE_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/enterprise_rag
```

Secrets remain server-side. The frontend must never expose `GOOGLE_API_KEY`, `MISTRAL_API_KEY` or `DATABASE_URL` as `VITE_*` variables.

### 4. PostgreSQL

Create:

```text
enterprise_rag
```

Create/migrate the application tables using the project database setup scripts.

Current tables include:

```text
conversations
messages
documents
```

### 5. Run the backend

```bash
python -m uvicorn backend.app.main:app --reload
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

Health:

```text
http://127.0.0.1:8000/health
```

### 6. Run the frontend

Frontend environment:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Then:

```bash
cd frontend
pnpm install
pnpm dev
```

Development URL:

```text
http://127.0.0.1:5173
```

---

## Validated Behaviors

### RAG

- correct retrieval for HR policy questions;
- correct retrieval for cybersecurity questions;
- topic switching within the same conversation;
- conversational follow-up resolution;
- no-answer behavior when evidence is unavailable;
- source references with page and relevance information.

### Persistence

- conversations survive page reloads;
- complete message history is stored;
- source citations survive page reloads;
- document metadata persists.

### Document ingestion

- PDF upload;
- chunk generation;
- vector indexing;
- duplicate-content rejection;
- renamed duplicate rejection.

### Document deletion

A deleted document was verified across all three layers:

```text
PostgreSQL
→ record removed

data/documents/
→ file removed

Qdrant
→ 0 points found for deleted document_id
```

The RAG pipeline also stopped retrieving the deleted document.

### Conversation management

- automatic titles;
- rename;
- delete;
- cascade message deletion;
- local conversation search.

---

## Design Decisions

### Why RAG instead of fine-tuning?

RAG is well suited for business knowledge because documents can change without retraining the LLM, source material remains externally managed, answers can reference evidence and knowledge can be added or removed independently.

### Why LangChain?

The current pipeline is primarily linear:

```text
Load → Split → Embed → Retrieve → Generate
```

LangChain provides the abstractions needed without requiring a more complex agent framework. LangGraph may be considered later if the system evolves toward branching workflows, retries, state, approval flows or multiple specialized agents.

### Why Qdrant?

Qdrant provides vector similarity search, metadata payloads, filtering, persistent storage and a production-oriented server deployment path. The MVP uses Qdrant Local for lightweight local development.

### Why multilingual MiniLM?

`paraphrase-multilingual-MiniLM-L12-v2` provides multilingual semantic embeddings, local execution, no per-query embedding API cost, CPU-friendly inference and 384-dimensional vectors.

### Why Gemini?

Gemini is the active LLM because it integrates cleanly with LangChain and satisfies the generation requirements of the MVP. The generation layer is separated from retrieval so the model provider can be replaced without redesigning embeddings, Qdrant or ingestion.

### Why PostgreSQL?

PostgreSQL stores structured application state while Qdrant handles semantic vector retrieval.

```text
PostgreSQL
→ conversations, messages, citations, document metadata

Qdrant
→ semantic vector retrieval
```

### Why assistant-ui?

assistant-ui provides reusable AI-chat primitives while allowing the project to keep its own FastAPI backend, RAG architecture, persistence and API contracts. No LLM API key is exposed directly to the browser.

---

## Current Limitations

The current MVP is functional, but several areas are intentionally still under development.

### PDF-only ingestion

Uploads currently support PDFs. Planned formats include DOCX, TXT and Markdown, with CSV/XLSX/PPTX depending on use case.

### Starter suggestions are currently static

The suggested prompts visible in the composer are currently UI-level static examples. They are **not yet generated dynamically from the current knowledge base**.

### Document-specific retrieval needs further hardening

General semantic retrieval works, but explicit requests such as:

```text
"Resume el Informe Técnico del Proyecto"
```

can still benefit from document-aware routing/filtering. A future improvement is to detect an explicitly named document and restrict retrieval using its `document_id`.

### Knowledge-management questions

Questions such as:

```text
"¿Qué documentos tienes?"
```

are better answered from PostgreSQL document metadata than through semantic RAG. Dedicated routing for this type of request is planned.

### Retrieval quality

Top-K retrieval may still return secondary chunks with weaker relevance. Future work includes reranking, hybrid search, evaluation-driven relevance filtering and metadata-aware retrieval.

### Authentication and authorization

The MVP does not yet include authentication, RBAC, document-level permissions or multi-tenant workspaces.

---

## Evaluation Strategy

The project is evaluated across:

- **Retrieval quality:** does retrieval return evidence that answers the question?
- **Groundedness:** is the generated response supported by retrieved context?
- **Source traceability:** can the system identify where the answer came from?
- **No-answer behavior:** does the assistant avoid inventing information when evidence is missing?
- **Conversation robustness:** can follow-up questions be resolved without unrelated history degrading retrieval?
- **Document lifecycle correctness:** when a document is deleted, is it removed from metadata, vectors, filesystem and future retrieval?
- **Latency:** is response time acceptable for interactive use?

---

## Planned Improvements

Near-term work:

- dynamic suggested prompts based on indexed knowledge;
- document-aware retrieval/filtering;
- route metadata questions directly to PostgreSQL;
- improved source relevance;
- automated RAG evaluation;
- API integration tests;
- hybrid search;
- reranking;
- observability with LangSmith or Langfuse;
- DOCX/TXT support;
- authentication;
- RBAC;
- document-level access control;
- Qdrant Server deployment;
- production deployment;
- Docker / Docker Compose packaging;
- optional LangGraph-based agentic workflows.

---

## Example Use Case

### HR knowledge

**Question**

```text
¿Cuántos días de vacaciones corresponden después de un año?
```

**Flow**

```text
React / assistant-ui
        ↓
POST /chat
        ↓
Recent PostgreSQL conversation context
        ↓
Standalone query rewriting
        ↓
Query embedding
        ↓
Qdrant semantic retrieval
        ↓
Relevant HR policy chunk
        ↓
Gemini grounded generation
        ↓
Answer + source
        ↓
Persist message + citation
```

---

## Engineering Goal

This repository demonstrates practical AI Engineering knowledge across:

- Retrieval-Augmented Generation;
- document ingestion;
- semantic chunking;
- embeddings;
- vector databases;
- semantic retrieval;
- conversational query rewriting;
- prompt grounding;
- LLM integration;
- FastAPI;
- PostgreSQL persistence;
- knowledge-base lifecycle management;
- duplicate prevention;
- source traceability;
- React AI interfaces;
- assistant-ui integration;
- frontend/backend API design;
- evaluation of RAG systems.

---

## Author

**Johan Moreno**  
Software Engineer · AI · Automation · Cybersecurity  
GitHub: [JohanMV](https://github.com/JohanMV)
