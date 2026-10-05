# Enterprise RAG Assistant

<p align="center">
  <img src="./docs/images/demoHD.gif" alt="Enterprise RAG Assistant Demo" width="100%">
</p>

![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite%20%2B%20TS-61DAFB?style=flat-square&logo=react&logoColor=black)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-DC244C?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Persistencia-4169E1?style=flat-square&logo=postgresql&logoColor=white)

> **Aplicación empresarial de Generación Aumentada por Recuperación (RAG) para consultar documentación interna mediante respuestas fundamentadas, memoria conversacional, trazabilidad de fuentes y gestión del ciclo de vida de documentos.**

[🇬🇧 English version](README.md)

## Tabla de contenidos

- [Resumen](#resumen)
- [Características principales](#características-principales)
- [Arquitectura](#arquitectura)
- [Pipeline de IA](#pipeline-de-ia)
- [Stack tecnológico](#stack-tecnológico)
- [Gestión de la base de conocimientos](#gestión-de-la-base-de-conocimientos)
- [API principal](#api-principal)
- [Instalación rápida](#instalación-rápida)
- [Validación técnica](#validación-técnica)
- [Roadmap](#roadmap)
- [Autor](#autor)

---

## Resumen

Las empresas acumulan conocimiento crítico en manuales de RR.HH., políticas de seguridad, procedimientos operativos, informes técnicos y documentación interna. Encontrar una respuesta concreta dentro de esa información suele ser lento, repetitivo y difícil de auditar.

**Enterprise RAG Assistant** implementa un pipeline de IA de extremo a extremo que transforma documentos empresariales en una base de conocimientos consultable mediante lenguaje natural. El sistema recupera evidencia desde los documentos indexados, genera respuestas utilizando ese contexto y puede mostrar el documento, la página y un extracto de respaldo.

Esto resulta útil en áreas como **RR.HH., soporte interno, ciberseguridad, operaciones y cumplimiento**, donde es importante acceder rápidamente a información confiable sin reentrenar el modelo cada vez que cambia la documentación.

Ejemplos de consultas:

- “¿Cuántos días de vacaciones corresponden a los empleados?”
- “¿Qué debo hacer si detecto un incidente de seguridad?”
- “¿Cuál es el procedimiento definido para solicitar acceso?”

---

## Características principales

### IA y RAG
- ingesta e indexación de documentos PDF;
- chunking con solapamiento y embeddings multilingües locales;
- búsqueda semántica Top-K en Qdrant;
- reescritura conversacional de consultas;
- generación fundamentada con Gemini;
- comportamiento controlado cuando no existe evidencia suficiente.

### Trazabilidad y gestión documental
- fuentes con documento, página, extracto y puntuación de relevancia;
- persistencia de fuentes junto con el historial de conversación;
- prevención de duplicados mediante SHA-256;
- eliminación coordinada en PostgreSQL, Qdrant y almacenamiento físico;
- base de conocimientos administrable desde la interfaz.

### Conversaciones
- historial persistente y títulos automáticos;
- renombrado, eliminación y búsqueda local;
- memoria conversacional basada en contexto reciente.

---

## Arquitectura

![Enterprise RAG Assistant - Architecture](./docs/images/enterprise_rag_assistant_architecture.png)

La arquitectura separa el **estado estructurado** de la aplicación en PostgreSQL, la **recuperación vectorial** en Qdrant y la **generación de lenguaje** en el proveedor LLM. FastAPI actúa como capa de orquestación entre la interfaz, la persistencia y el pipeline RAG.

---

## Pipeline de IA

El sistema utiliza dos flujos relacionados pero independientes: **ingesta documental** y **consulta RAG**.

```text
INGESTA
PDF
→ Parsing con PyPDFLoader
→ Chunking
→ Embeddings MiniLM
→ Qdrant

CONSULTA
Pregunta + contexto conversacional reciente
→ Reescritura a consulta independiente
→ Embedding de consulta
→ Retrieval semántico en Qdrant
→ Top-K fragmentos relevantes
→ Gemini
→ Respuesta + fuentes
```

### Parámetros técnicos principales

| Componente | Configuración |
|---|---|
| Chunking | `RecursiveCharacterTextSplitter` · `chunk_size=800` · `chunk_overlap=150` |
| Embeddings | `paraphrase-multilingual-MiniLM-L12-v2` · 384 dimensiones |
| Similaridad | Coseno |
| Vector store | Qdrant Local · colección `enterprise_documents` |
| LLM activo | `gemini-2.5-flash` · `temperature=0` |
| Contexto conversacional | 10 mensajes recientes |

El mismo modelo de embeddings se utiliza para documentos y consultas, manteniendo ambas representaciones en el mismo espacio vectorial. El historial completo se conserva en PostgreSQL, pero solo el contexto reciente participa en la conversación para controlar tamaño del prompt, latencia y consumo de tokens.

---

## Stack tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| Backend / IA | Python 3.13 | Lógica de aplicación y pipeline RAG |
| Framework RAG | LangChain | Orquestación RAG e integración con LLM |
| Procesamiento PDF | PyPDFLoader + RecursiveCharacterTextSplitter | Parsing y segmentación documental |
| Embeddings | sentence-transformers / MiniLM multilingüe | Representación vectorial local |
| Base vectorial | Qdrant Local | Indexación y búsqueda semántica |
| LLM | Gemini API · `gemini-2.5-flash` | Generación fundamentada |
| API | FastAPI | Backend REST y orquestación |
| Persistencia | PostgreSQL + SQLAlchemy | Conversaciones, mensajes, fuentes y documentos |
| Frontend | React + Vite + TypeScript | Aplicación web |
| UI | assistant-ui + Tailwind CSS v4 + shadcn/ui | Experiencia conversacional e interfaz |

---

## Gestión de la base de conocimientos

### Prevención de duplicados

Antes del parsing, la generación de embeddings y la indexación se calcula un hash **SHA-256** sobre el contenido binario del archivo.

| Caso | Resultado |
|---|---|
| Mismo archivo + mismo nombre | Rechazado |
| Mismo archivo + nombre diferente | Rechazado |
| Contenido diferente + mismo nombre | Permitido |

Los duplicados devuelven `409 Conflict`, evitando procesamiento innecesario.

### Eliminación consistente

`DELETE /documents/{document_id}` elimina el documento de:

```text
PostgreSQL
Qdrant
data/documents/
```

Esto evita registros, vectores o archivos huérfanos y garantiza que el RAG deje de recuperar información perteneciente al documento eliminado.

### Seguridad básica

Las credenciales de Gemini y PostgreSQL permanecen en el backend y no se exponen al frontend. Los embeddings se generan localmente y la documentación puede actualizarse sin fine-tuning.

---

## API principal

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

La documentación interactiva de la API está disponible mediante Swagger en `/docs` al ejecutar el backend.

---

## Instalación rápida

```bash
# 1. Clonar
git clone https://github.com/JohanMV/enterprise-rag-assistant.git
cd enterprise-rag-assistant

# 2. Backend
py -3.13 -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt

# 3. Variables de entorno
GOOGLE_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key  # opcional
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/enterprise_rag

# 4. Ejecutar backend
python -m uvicorn backend.app.main:app --reload

# 5. Ejecutar frontend
cd frontend
pnpm install
pnpm dev
```

- Swagger: `http://127.0.0.1:8000/docs`
- Frontend: `http://127.0.0.1:5173`

---

## Validación técnica

Se validaron los principales flujos del sistema:

- retrieval sobre documentación de RR.HH. y ciberseguridad;
- cambio de tema y preguntas de seguimiento dentro de una conversación;
- comportamiento de **sin respuesta** cuando no existe evidencia suficiente;
- persistencia de conversaciones, mensajes y fuentes;
- detección de documentos duplicados;
- eliminación consistente y actualización efectiva de la base de conocimientos.

La validación se centró en **calidad de retrieval, groundedness, trazabilidad de fuentes, robustez conversacional y consistencia del ciclo de vida documental**.

---

## Roadmap

- búsqueda híbrida y reranking para mejorar retrieval;
- evaluación RAG automatizada y pruebas de regresión;
- observabilidad con LangSmith o Langfuse, incluyendo latencia y costo por consulta;
- autenticación, RBAC y control de acceso por documento;
- soporte multiformato y evolución hacia Qdrant Server / despliegue productivo.

---

## Autor

**Johan Moreno**  
Ingeniero de Software · IA · Automatización · Ciberseguridad  
GitHub: [JohanMV](https://github.com/JohanMV)
