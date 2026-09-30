# Enterprise RAG Assistant

> **Enterprise-grade Retrieval-Augmented Generation (RAG) MVP for querying internal business documents with grounded answers, semantic retrieval and source traceability.**

[🇪🇸 Versión en español](README.es.md)


## Overview

**Enterprise RAG Assistant** is an AI Engineering project designed to transform internal business documentation into a searchable knowledge base that can be queried using natural language.

The system follows a professional **Retrieval-Augmented Generation (RAG)** architecture:

1. Documents are ingested and parsed.
2. Text is split into semantically useful chunks.
3. Chunks are converted into vector embeddings.
4. Embeddings are stored in a vector database.
5. A user query is embedded and matched against the most relevant chunks.
6. Retrieved context is passed to an LLM.
7. The model generates a grounded response with source references.

The goal is to demonstrate an end-to-end RAG pipeline using technologies commonly required in **AI Engineer, Generative AI and LLM Engineer** roles.

---

## Business Problem

Companies usually store critical knowledge across HR manuals, internal policies, technical procedures, security documentation, contracts and operational guides. Finding a specific answer manually can be slow and inefficient.

This project allows users to ask questions such as:

> “How many vacation days are employees entitled to?”

> “What is the procedure for reporting a suspicious email?”

> “Who must approve an access request?”

Instead of answering only from the LLM's general knowledge, the system retrieves relevant internal information first and uses it as evidence for the response.

---

## Architecture

```mermaid
flowchart TD
    A[PDF Documents] --> B[Document Loader]
    B --> C[Text Cleaning]
    C --> D[Chunking]
    D --> E[Embeddings]
    E --> F[(Qdrant Vector DB)]

    U[User Question] --> G[Query Embedding]
    G --> F
    F --> H[Top-K Relevant Chunks]
    H --> I[Prompt + Retrieved Context]
    I --> J[LLM]
    J --> K[Grounded Answer + Sources]

    K --> L[(PostgreSQL)]
```

### Application architecture

```mermaid
flowchart LR
    UI[React + Vite + assistant-ui] --> API[FastAPI]
    API --> RAG[LangChain RAG Service]
    RAG --> VDB[(Qdrant Local)]
    RAG --> LLM[Gemini API]
    API --> PG[(PostgreSQL)]
```

The frontend is implemented as a separate React application and consumes the existing FastAPI REST API. Model execution remains server-side; no LLM API key is exposed to the browser.

---

## RAG Pipeline

### 1. Document ingestion

PDF documents are loaded while preserving metadata such as source file, page number, title and total pages.

```text
PDF
 ↓
Document Loader
 ↓
LangChain Document objects
```

### 2. Chunking

Large documents are divided into smaller overlapping fragments.

Current configuration:

```text
chunk_size    = 800
chunk_overlap = 150
```

The overlap helps preserve context when information crosses chunk boundaries.

```text
Document pages
      ↓
RecursiveCharacterTextSplitter
      ↓
Text chunks + metadata
```

### 3. Embeddings

Each chunk is transformed into a dense vector representation using:

```text
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

The model generates **384-dimensional embeddings** for both document chunks and user queries.

```text
Chunk
  ↓
Multilingual MiniLM Embedding Model
  ↓
384-dimensional vector
```

This allows the system to compare text by **semantic similarity**, not only exact keywords. All document chunks and user queries must use the same embedding model so they are represented in the same vector space.

Current validation result:

```text
18 chunks
   ↓
18 embeddings
   ↓
384 dimensions per vector
```

### 4. Vector storage

Embeddings and metadata are stored locally in **Qdrant Local Mode**, allowing persistent vector storage without requiring Docker.

Current implementation:

```text
18 chunks
   ↓
18 embeddings
   ↓
Qdrant Local
   ↓
18 persisted vector points
```

Each point stores the embedding together with the original text and metadata.

Example metadata:

```json
{
  "document": "manual_rrhh_empresa_demo.pdf",
  "page": 4,
  "chunk_id": 12
}
```

### 5. Retrieval

When a user submits a question:

```text
Question
   ↓
Query Embedding
   ↓
Vector Similarity Search
   ↓
Top-K Relevant Chunks
```

The retriever selects the most relevant evidence from the knowledge base using cosine similarity.

Current validation query:

```text
¿Cuántos días de vacaciones tiene un trabajador?
```

Top result:

```text
Score: 0.696
Page: 5
Section: 3. Vacaciones
```

The highest-ranked chunk correctly contains the vacation policy stating that employees are entitled to 30 calendar days of paid vacation after one continuous year of work.

### 6. Generation

The retrieved chunks are combined into a grounded prompt using **LangChain** and sent to **Gemini**, the primary LLM provider for the MVP.

```text
SYSTEM INSTRUCTION
+
RETRIEVED CONTEXT
+
USER QUESTION
↓
LangChain Prompt
↓
Gemini API
↓
GROUNDED ANSWER + SOURCES
```

Current configuration:

```text
Provider: Gemini
Model: gemini-2.5-flash
Temperature: 0
```

`temperature=0` is used to favor consistent, evidence-focused responses.

The system prompt instructs the model to answer only from retrieved context, avoid unsupported information and indicate when the context is insufficient.

The end-to-end RAG flow has been validated with multiple questions, including vacation-policy and code-of-conduct queries.

A **Mistral AI** provider is also implemented as an optional alternative, demonstrating that the generation layer is decoupled from a single LLM provider. **Gemini remains the active provider for the MVP**.

> Note: source output currently reflects the retrieved Top-K chunks. Source deduplication and relevance filtering can be refined in later application layers.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Language | Python | Core application and AI logic |
| RAG framework | LangChain | RAG orchestration, prompt composition and LLM integration |
| Document parsing | PyPDFLoader | PDF ingestion |
| Text splitting | RecursiveCharacterTextSplitter | Chunk generation |
| Embeddings | Hugging Face · paraphrase-multilingual-MiniLM-L12-v2 | 384-dimensional semantic vector representation |
| Vector database | Qdrant Local | Persistent vector storage and cosine similarity search |
| LLM provider | Gemini API · gemini-2.5-flash | Grounded answer generation from retrieved context |
| Optional LLM provider | Mistral AI | Alternative LLM provider integrated through LangChain |
| API | FastAPI | REST backend |
| Relational database | PostgreSQL | Persistent conversations, messages and conversational memory |
| Frontend | React + Vite + TypeScript | Web application shell and client-side UI |
| AI chat UI | assistant-ui | Thread, message, composer and conversation UI primitives |
| Styling | Tailwind CSS v4 + shadcn/ui | Responsive interface and reusable UI components |
| Containers | Docker / Docker Compose | Reproducible local environment |
| Version control | Git / GitHub | Source code and project history |

---

## Current Project Status

| Phase | Description | Status |
|---|---|---|
| 0 | Project setup | ✅ Completed |
| 1 | PDF Loader | ✅ Completed |
| 2 | Chunking | ✅ Completed |
| 3 | Embeddings | ✅ Completed |
| 4 | Qdrant vector storage | ✅ Completed |
| 5 | Semantic retrieval | ✅ Completed |
| 6 | RAG + LLM generation | ✅ Completed |
| 7 | FastAPI REST API | ✅ Completed |
| 8 | PostgreSQL persistence + conversational memory | ✅ Completed |
| 9 | React + assistant-ui frontend | ✅ Completed |
| 10 | Final hardening / deployment | ⏳ Next |

### Current result

```text
10 PDF pages
      ↓
PDF Loader
      ↓
18 text chunks
      ↓
Hugging Face embedding model
      ↓
18 vectors × 384 dimensions
      ↓
Qdrant Local
      ↓
18 persisted vector points
      ↓
Semantic retrieval
      ↓
LangChain prompt
      ↓
Gemini API
      ↓
Grounded answer + sources
      ↓
FastAPI REST API
      ↓
PostgreSQL conversational persistence
      ↓
React + assistant-ui frontend
```

Validation query:

```text
¿Cuántos días de vacaciones tiene un trabajador?
```

Best match:

```text
Score: 0.696
Source: manual_rrhh_empresa_demo.pdf
Page: 5
Section: 3. Vacaciones
```

### End-to-end RAG validation

```text
Query 1:
¿Cuántos días de vacaciones tiene un trabajador?

Result:
Gemini correctly generated the 30 / 33 / 35-day vacation policy
from the retrieved page 5 context.

Query 2:
¿De forma breve cuáles son los códigos de conducta principales?

Result:
Gemini correctly summarized the main conduct principles
from the retrieved page 8 context.
```


### Application-layer validation

The API and conversational layer are also validated end to end:

```text
POST /chat
→ creates or reuses a conversation
→ stores user and assistant messages
→ retrieves recent conversation history
→ executes RAG
→ returns answer + sources + conversation_id

GET /conversations
→ lists persisted conversations

GET /conversations/{conversation_id}/messages
→ returns the full persisted history for a conversation

GET /health
→ reports API availability
```

PostgreSQL stores the complete chat history, while only the most recent **10 messages** are passed as conversational context to the RAG pipeline.

The no-answer behavior was also validated: when the retrieved context does not contain the requested information, the assistant states that the information is unavailable and returns an empty source list.

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
│   │   │   ├── chain.py
│   │   │   ├── test_rag.py
│   │   │   ├── test_embeddings.py
│   │   │   ├── test_chunk_embeddings.py
│   │   │   ├── test_qdrant.py
│   │   │   └── test_retrieval.py
│   │   ├── services/
│   │   │   └── rag_service.py
│   │   └── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
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
│   ├── qdrant/
│   └── sample_docs/
│       └── manual_rrhh_empresa_demo.pdf
│
├── tests/
├── .env
├── .gitignore
├── README.es.md
└── README.md
```

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/JohanMV/enterprise-rag-assistant.git
cd enterprise-rag-assistant
```

### 2. Backend virtual environment

```bash
py -3.13 -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

### 3. Configure backend environment variables

Create a `.env` file in the project root:

```env
GOOGLE_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/enterprise_rag
```

The `.env` file is excluded from Git.

### 4. PostgreSQL

Create a local PostgreSQL database:

```text
enterprise_rag
```

Then create the application tables:

```bash
python -m backend.app.database.create_tables
```

Expected tables:

```text
conversations
messages
```

### 5. Run the FastAPI backend

```bash
python -m uvicorn backend.app.main:app --reload
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

Available endpoints:

```text
GET  /health
POST /chat
GET  /conversations
GET  /conversations/{conversation_id}/messages
```

### 6. Configure and run the frontend

The frontend uses a separate public configuration variable:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

No Gemini or database secrets are exposed to the browser.

From the `frontend/` directory:

```bash
pnpm install
pnpm dev
```

Development URL:

```text
http://127.0.0.1:5173
```

During local development, Vite proxies frontend API calls to FastAPI.

### 7. Validated application flow

```text
React + assistant-ui
        ↓
FastAPI
        ↓
Conversation history from PostgreSQL
        ↓
Semantic retrieval from Qdrant
        ↓
Gemini generation
        ↓
Answer + source references
        ↓
Persist user/assistant messages
```

The backend stores the complete conversation history in PostgreSQL while limiting LLM conversational context to the most recent 10 messages.

---

## Design Decisions

### Why RAG instead of fine-tuning?

RAG is better suited for private and frequently changing business knowledge because:

- documents can be updated without retraining the model;
- answers can reference source material;
- the knowledge base remains external to the LLM;
- implementation cost is lower;
- enterprise data can be managed independently.

### Why LangChain?

The MVP follows a mostly linear workflow:

```text
Load → Split → Embed → Retrieve → Generate
```

LangChain provides the abstractions required to integrate these components without introducing unnecessary orchestration complexity.

**LangGraph** may be added later if the system evolves toward agentic workflows with branching, retries, state, human approval or multiple agents.

### Why Qdrant?

Qdrant provides vector indexing, similarity search, metadata filtering, persistent storage and production-oriented APIs.

For the MVP, the project uses **Qdrant Local Mode** with persistent storage under `data/qdrant/`. This keeps the vector layer lightweight and reproducible without requiring Docker during local development.


### Why a multilingual MiniLM embedding model?

The MVP currently uses `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` because it provides multilingual semantic representations, works locally without requiring a paid API and is lightweight enough for development on modest hardware.

The embedding dimensionality (**384**) is defined by the model architecture. The same model is used for both document chunks and future user queries so their vectors can be compared in the same semantic space.


### Why Gemini as the primary LLM?

Gemini is used as the primary generation provider because it integrates cleanly with LangChain and satisfies the MVP's generation requirements.

The generation layer is intentionally decoupled from retrieval, allowing the LLM provider to be replaced without changing the embedding, Qdrant or retrieval pipeline.

Mistral AI is also implemented as an alternative provider, demonstrating provider flexibility within the same RAG architecture.


### Why assistant-ui?

The project uses **assistant-ui** on top of React because it provides production-oriented AI chat primitives such as threads, messages, composer state and conversation interactions without replacing the existing backend architecture.

The frontend consumes the existing FastAPI REST contract instead of creating a new model route or exposing an LLM provider directly in the browser.

### Why PostgreSQL for conversational memory?

PostgreSQL persists conversations and messages independently from the LLM. This allows conversation history to survive backend restarts and enables dedicated history endpoints.

The complete history is stored, while only the latest 10 messages are injected into the conversational RAG context to control prompt size and latency.

---

## Evaluation Strategy

The project will not be considered complete only because it produces an answer. The pipeline will be evaluated using:

### Retrieval quality
Does the retriever return chunks containing the correct evidence?

### Groundedness
Is the generated answer supported by retrieved context?

### Source traceability
Can the system identify the source document and page?

### No-answer behavior
Does the system avoid inventing an answer when evidence is missing?

### Latency
Is response time acceptable for an interactive application?

---

## Planned Improvements

The core MVP is now functional end to end. Remaining work is primarily hardening, UX refinement and deployment:

- frontend visual polish and responsive refinement
- conversation titles instead of numeric labels
- improved source presentation and source relevance filtering
- API integration tests
- automated RAG evaluation
- Hybrid Search
- metadata filtering
- reranking
- LangSmith / Langfuse observability
- support for DOCX and TXT
- authentication
- document-level access control
- production deployment
- Docker / Docker Compose packaging
- LangGraph-based Agentic RAG
- human-in-the-loop workflows

---

## Example Use Case

**Document:** `manual_rrhh_empresa_demo.pdf`

**Question:**

```text
¿Cuántos días de vacaciones corresponden a un trabajador?
```

Current validated end-to-end application flow:

```text
User Question in assistant-ui
      ↓
POST /chat
      ↓
Conversation history from PostgreSQL
      ↓
Query Embedding
      ↓
Qdrant Search
      ↓
Top-K Relevant Chunks
      ↓
LangChain Prompt
      ↓
Gemini API
      ↓
Grounded Answer + Sources
      ↓
Persist conversation messages in PostgreSQL
      ↓
Render response in React UI
```

---

## Engineering Goal

This repository is intentionally built as an **AI Engineering project**, not only as a chatbot demo.

The objective is to demonstrate practical knowledge of:

- Retrieval-Augmented Generation
- document ingestion pipelines
- chunking strategies
- embeddings
- vector databases
- semantic retrieval
- prompt grounding
- LLM integration
- REST APIs
- PostgreSQL persistence
- conversational memory
- React-based AI interfaces
- assistant-ui integration
- containerization
- evaluation of AI systems

---

## Author

**Johan Moreno**  
Software Engineer · AI · Automation · Cybersecurity  
GitHub: [JohanMV](https://github.com/JohanMV)
