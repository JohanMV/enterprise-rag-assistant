# Enterprise RAG Assistant

![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite%20%2B%20TS-61DAFB?style=flat-square&logo=react&logoColor=black)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-DC244C?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Persistencia-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/Licencia-MIT-lightgrey?style=flat-square)

> **Aplicación empresarial de Generación Aumentada por Recuperación (RAG) para consultar documentos internos de negocio mediante respuestas fundamentadas, memoria conversacional, trazabilidad de fuentes y gestión del ciclo de vida de documentos.**

[🇬🇧 English version](README.md)

---

## Demo

> _Agrega aquí una captura de pantalla o un GIF corto (10-15 s) mostrando una pregunta, la respuesta fundamentada y la tarjeta de fuentes._

---

## Tabla de contenidos

- [Resumen](#resumen)
- [Por qué importa para una empresa](#por-qué-importa-para-una-empresa)
- [Características principales](#características-principales)
- [Pipeline de IA](#pipeline-de-ia)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Decisiones de diseño clave](#decisiones-de-diseño-clave)
- [Modelo de datos](#modelo-de-datos)
- [API principal](#api-principal)
- [Instalación rápida](#instalación-rápida)
- [Comportamientos validados](#comportamientos-validados)
- [Estrategia de evaluación](#estrategia-de-evaluación)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Roadmap](#roadmap)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Licencia](#licencia)
- [Autor](#autor)

---

## Resumen

Las empresas acumulan conocimiento crítico en manuales de RR.HH., políticas de seguridad, procedimientos operativos e informes técnicos. Encontrar una respuesta concreta dentro de esa documentación suele ser lento, repetitivo y propenso a errores.

**Enterprise RAG Assistant** implementa un **pipeline de IA completo** (ingesta → chunking → embeddings → recuperación semántica → generación fundamentada) que convierte esa documentación en una base de conocimiento consultable en lenguaje natural. El sistema recupera evidencia desde los documentos indexados y genera la respuesta a partir de esa evidencia, no de memoria del modelo, lo que mejora la velocidad de acceso al conocimiento interno, la consistencia de las respuestas y la trazabilidad de cada afirmación hasta su fuente.

Ejemplos de preguntas que resuelve:

- "¿Cuántos días de vacaciones corresponden a los empleados?"
- "¿Qué debo hacer si detecto un incidente de seguridad?"
- "¿Cuál es el RTO del sistema de facturación?"

---

## Por qué importa para una empresa

Un asistente de este tipo ataca puntos de dolor muy concretos y transversales a cualquier organización:

- **Tiempo perdido buscando información dispersa.** Colaboradores que interrumpen a RR.HH. o a TI con preguntas que ya están respondidas en un manual que nadie lee completo.
- **Inconsistencia en las respuestas.** Dos personas distintas del mismo equipo dando información diferente sobre la misma política porque consultaron versiones o secciones distintas.
- **Pérdida de trazabilidad.** Sin citar la fuente exacta (documento y página), no hay forma de auditar de dónde salió una respuesta ni de detectar información desactualizada.
- **Riesgo de alucinación de un LLM genérico.** Un chatbot sin fundamentación documental puede inventar una política de vacaciones o un procedimiento de seguridad que no existe — un riesgo real cuando la respuesta puede tener implicancias legales o de cumplimiento.

Este es el mismo problema que resuelven categorías de producto ya consolidadas en el mercado empresarial, como **Microsoft 365 Copilot**, **Glean** o **Notion AI** aplicado a bases de conocimiento interno: todas combinan recuperación semántica sobre documentación propia con generación fundamentada, en lugar de depender del conocimiento general del modelo.

Los beneficios concretos de esta arquitectura frente a alternativas más simples:

- **Gobernanza del conocimiento:** los documentos pueden añadirse o retirarse del índice sin reentrenar nada, y un documento eliminado deja de ser recuperado de inmediato.
- **Auditabilidad:** cada respuesta es trazable a un documento y página específicos, un requisito habitual en sectores regulados.
- **Control de alucinaciones:** el sistema declara explícitamente cuando no hay evidencia suficiente, en vez de inventar una respuesta plausible.
- **Costo controlado:** los embeddings corren localmente y el LLM solo se invoca para generación, no para cada búsqueda.

---

## Características principales

- Recuperación semántica sobre documentos PDF indexados, con reescritura conversacional de consultas para resolver preguntas de seguimiento sin perder precisión.
- Respuestas fundamentadas (grounded) con Gemini: el modelo responde solo a partir del contexto recuperado y declara explícitamente cuando no hay evidencia suficiente.
- Citas de fuentes persistentes — documento, página, extracto y puntuación de relevancia — visibles incluso al reabrir una conversación.
- Memoria conversacional persistente en PostgreSQL, con historial, títulos automáticos, renombrado, eliminación y búsqueda local de conversaciones.
- Gestión completa del ciclo de vida de documentos: carga, prevención de duplicados por hash SHA-256, y eliminación verificada en las tres capas de persistencia (PostgreSQL, Qdrant y almacenamiento de archivos).
- Interfaz empresarial de tres columnas (historial, conversación, base de conocimientos) construida con React, Vite y assistant-ui.

---

## Pipeline de IA

El núcleo técnico del proyecto es un **pipeline de IA end-to-end** de cinco etapas: **ingesta → chunking → embeddings → recuperación semántica → generación fundamentada**. Es intencionalmente lineal (no agentic) porque el caso de uso no requiere bifurcaciones, reintentos ni múltiples agentes especializados.

```mermaid
flowchart LR
    A[Ingesta de PDF] --> B[Chunking]
    B --> C[Embeddings 384D]
    C --> D[(Qdrant)]
    D --> E[Recuperación semántica]
    E --> F[Generación fundamentada - Gemini]
```

<details>
<summary><strong>Ver detalle técnico de cada etapa del pipeline</strong></summary>

### 1. Ingesta de PDF

Los documentos se cargan con `PyPDFLoader`, preservando metadata de documento fuente, página, ID de documento e ID de fragmento. Formato soportado actualmente: PDF. DOCX, TXT y Markdown están en el roadmap.

### 2. Chunking

Se usa `RecursiveCharacterTextSplitter` con `chunk_size = 800` y `chunk_overlap = 150`. El solapamiento preserva contexto cuando la información relevante atraviesa el límite entre dos fragmentos.

### 3. Embeddings

Se usa `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, con vectores de **384 dimensiones**. El modelo corre localmente (sin costo por consulta) y se aplica tanto a los fragmentos de documentos como a las consultas de recuperación del usuario.

### 4. Almacenamiento y recuperación vectorial

Qdrant en modo local, colección `enterprise_documents`, métrica de similitud `COSINE`, persistencia en `data/qdrant/`. Cada fragmento indexado incluye metadata:

```json
{
  "document_id": "uuid",
  "document": "manual_rrhh_empresa_demo.pdf",
  "page": 5,
  "chunk_id": 12,
  "text": "..."
}
```

El retriever genera el embedding de la consulta y busca en Qdrant por similitud coseno, devolviendo el Top-K de fragmentos. Todavía no se aplica un umbral fijo de relevancia porque podría descartar evidencia útil; el filtrado por relevancia y el reranking están pendientes de definirse a partir de evaluación formal.

> Qdrant Local bloquea su directorio de almacenamiento para un único proceso cliente activo. Para despliegues concurrentes o multiproceso, Qdrant Server es el siguiente paso recomendado.

### 5. Reescritura conversacional de consultas

La aplicación no concatena el historial directamente a la consulta de recuperación — eso contaminaría la búsqueda semántica con temas ya cerrados de la conversación. En su lugar, el historial reciente y la pregunta actual pasan por un reescritor que produce una consulta autocontenida; esa consulta reescrita se usa solo para la recuperación vectorial, mientras que el historial completo sigue disponible por separado para la generación de la respuesta.

### 6. Generación fundamentada

Los fragmentos recuperados se envían a Gemini (`gemini-2.5-flash`, temperatura 0) a través de LangChain. El prompt de sistema instruye al modelo a responder únicamente a partir del contexto proporcionado, evitar afirmaciones no respaldadas, y declarar explícitamente cuando el contexto es insuficiente. Existe además una abstracción de proveedor para Mistral como alternativa, aunque Gemini es el proveedor activo.

### Prevención de duplicados

Se calcula un hash SHA-256 sobre el contenido binario del archivo, antes del parseo, los embeddings o la indexación en Qdrant:

| Caso | Resultado |
|---|---|
| Mismo archivo + mismo nombre | Duplicado — rechazado |
| Mismo archivo + nombre diferente | Duplicado — rechazado |
| Contenido diferente + mismo nombre | Permitido |

Respuesta ante duplicado: `409 Conflict`, `{"detail": "Document already exists."}`.

### Eliminación de documentos

`DELETE /documents/{document_id}` remueve el documento de las tres capas de persistencia: metadata en PostgreSQL, vectores/fragmentos en Qdrant y el PDF físico en `data/documents/`. Respuesta exitosa: `204 No Content`; documento inexistente: `404 Not Found`.

### Memoria conversacional

PostgreSQL almacena el historial completo de cada conversación. Para controlar el tamaño del prompt, la latencia y el consumo de tokens, el LLM no recibe la conversación completa: se usan los 10 mensajes más recientes como contexto conversacional, mientras el historial completo permanece persistido y disponible al recargar la página.

</details>

---

## Arquitectura

```mermaid
flowchart LR
    UI[React + Vite + assistant-ui] --> API[FastAPI]
    API --> PG[(PostgreSQL)]
    API --> FS[(Almacenamiento de documentos)]
    API --> RAG[Servicio RAG con LangChain]
    RAG --> REWRITE[Reescritura conversacional de consultas]
    REWRITE --> EMB[Embeddings MiniLM multilingüe]
    EMB --> QD[(Qdrant)]
    QD --> RET[Top-K fragmentos recuperados]
    RET --> LLM[Gemini 2.5 Flash]
    LLM --> API
    API --> UI
```

<details>
<summary><strong>Ver diagramas detallados de flujo (ingesta y conversación)</strong></summary>

**Flujo de ingesta de documentos**

```mermaid
flowchart TD
    A[Carga de PDF] --> B[Validación + SHA-256]
    B --> C{¿Duplicado?}
    C -- Sí --> D[409 El documento ya existe]
    C -- No --> E[Guardar PDF]
    E --> F[PyPDFLoader]
    F --> G[Chunking]
    G --> H[Embeddings de 384 dimensiones]
    H --> I[Qdrant]
    I --> J[Persistir metadata en PostgreSQL]
```

**Flujo RAG conversacional**

```mermaid
flowchart TD
    A[Pregunta del usuario] --> B[Historial reciente de conversación]
    B --> C[Reescritura a consulta independiente]
    C --> D[Embedding de la consulta]
    D --> E[Búsqueda por similitud en Qdrant]
    E --> F[Top-K fragmentos relevantes]
    F --> G[Prompt fundamentado]
    G --> H[Gemini]
    H --> I[Respuesta + fuentes]
    I --> J[Persistir mensaje + fuentes]
```

</details>

**Frontend.** React + Vite + TypeScript, con assistant-ui como capa de primitivas de chat (thread, mensajes, composer) y Tailwind CSS v4 + shadcn/ui para estilos. Ninguna API key del LLM se expone al navegador — todas las llamadas a Gemini/Mistral ocurren en el backend FastAPI. Layout de escritorio de tres columnas: historial de conversaciones, chat principal y base de conocimientos.

---

## Stack tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| Lenguaje | Python 3.13 | Backend y lógica de IA |
| Framework RAG | LangChain | Prompting, recuperación e integración con LLM |
| Parseo de documentos | PyPDFLoader | Ingesta de PDF |
| Embeddings | sentence-transformers / multilingual MiniLM | Embeddings locales de 384 dimensiones |
| Base vectorial | Qdrant | Almacenamiento y búsqueda semántica |
| LLM | Gemini API (gemini-2.5-flash) | Generación de respuestas fundamentadas |
| LLM alternativo | Mistral AI | Abstracción de proveedor intercambiable |
| API | FastAPI | Backend REST |
| ORM / Driver | SQLAlchemy + psycopg | Persistencia en PostgreSQL |
| Base relacional | PostgreSQL | Conversaciones, mensajes, fuentes y documentos |
| Frontend | React + Vite + TypeScript | Aplicación web |
| UI de chat IA | assistant-ui | Primitivas de thread, mensajes y composer |
| Estilos | Tailwind CSS v4 + shadcn/ui | Interfaz empresarial |
| Gestor de paquetes | pnpm | Dependencias del frontend |

---

## Decisiones de diseño clave

**¿Por qué RAG y no fine-tuning?** La documentación empresarial cambia constantemente. RAG permite actualizar el conocimiento sin reentrenar el modelo, mantiene el material fuente gestionado externamente y permite citar evidencia en cada respuesta.

**¿Por qué LangChain y no un framework de agentes?** El pipeline actual es lineal (cargar → dividir → embeddings → recuperar → generar). LangChain ofrece las abstracciones necesarias sin la complejidad de un framework de agentes. LangGraph se evaluará si el sistema evoluciona hacia flujos con bifurcaciones, reintentos, estado o múltiples agentes especializados.

**¿Por qué Qdrant?** Ofrece búsqueda vectorial por similitud, payloads de metadata, filtrado y una ruta de despliegue clara hacia producción (Qdrant Server) cuando el uso concurrente lo requiera.

**¿Por qué MiniLM multilingüe?** Embeddings semánticos multilingües, ejecución local sin costo por consulta, inferencia amigable con CPU y vectores de 384 dimensiones — suficiente calidad para el caso de uso sin depender de una API externa de embeddings.

**¿Por qué Gemini?** Se integra de forma limpia con LangChain y cubre los requisitos de generación actuales. La capa de generación está desacoplada del retrieval, por lo que el proveedor del modelo puede cambiarse sin rediseñar embeddings, Qdrant o la ingesta.

**¿Por qué separar PostgreSQL de Qdrant?** PostgreSQL gestiona el estado estructurado de la aplicación (conversaciones, mensajes, metadata de documentos); Qdrant se especializa exclusivamente en recuperación semántica vectorial. Cada base de datos hace lo que mejor sabe hacer.

**¿Por qué assistant-ui?** Proporciona primitivas reutilizables para chat con IA, manteniendo el backend FastAPI, la arquitectura RAG, la persistencia y los contratos de API propios del proyecto.

---

## Modelo de datos

**`conversations`** — ID, título (generado o manual), timestamps.

**`messages`** — relación con la conversación, rol, contenido, fuentes/citas persistidas, timestamps.

**`documents`** — ID, nombre almacenado, nombre original, tipo MIME, estado, cantidad de fragmentos, mensaje de error, hash SHA-256, fecha de creación.

---

## API principal

```text
POST   /chat                              Pregunta + respuesta fundamentada + fuentes
GET    /conversations                     Listar conversaciones
GET    /conversations/{id}/messages       Historial de una conversación
PATCH  /conversations/{id}                Renombrar conversación
DELETE /conversations/{id}                Eliminar conversación

GET    /documents                         Listar documentos indexados
POST   /documents                         Subir e indexar un PDF
DELETE /documents/{id}                    Eliminar documento (PostgreSQL + Qdrant + archivo)
```

<details>
<summary><strong>Ver ejemplo de solicitud a <code>POST /chat</code></strong></summary>

```json
{
  "question": "¿Cuántos días de vacaciones corresponden después de un año?",
  "conversation_id": 3
}
```

`conversation_id` es opcional: si se omite, se crea una nueva conversación; si se envía, se reutiliza la conversación existente. La respuesta incluye el ID de conversación, la respuesta fundamentada y las fuentes.

</details>

---

## Instalación rápida

```bash
# 1. Clonar
git clone https://github.com/JohanMV/enterprise-rag-assistant.git
cd enterprise-rag-assistant

# 2. Backend
py -3.13 -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r backend/requirements.txt

# 3. Variables de entorno (.env en la raíz)
GOOGLE_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/enterprise_rag

# 4. Base de datos
# Crear la base "enterprise_rag" y ejecutar los scripts de creación de tablas del proyecto

# 5. Backend
python -m uvicorn backend.app.main:app --reload
# Swagger: http://127.0.0.1:8000/docs

# 6. Frontend
cd frontend
pnpm install
pnpm dev
# http://127.0.0.1:5173
```

Los secretos permanecen del lado del servidor: el frontend nunca expone `GOOGLE_API_KEY`, `MISTRAL_API_KEY` ni `DATABASE_URL`.

---

## Comportamientos validados

<details>
<summary><strong>Ver el detalle de pruebas realizadas</strong></summary>

**RAG** — recuperación correcta para preguntas de RR.HH. y de ciberseguridad; cambio de tema dentro de la misma conversación; resolución de preguntas de seguimiento; comportamiento de "sin respuesta" verificado cuando no existe evidencia (el asistente lo declara y devuelve una lista de fuentes vacía); referencias de fuente con página e información de relevancia.

**Persistencia** — las conversaciones y el historial completo de mensajes sobreviven a recargas de página; las citas de fuentes persisten; la metadata de documentos persiste.

**Ingesta y eliminación de documentos** — carga de PDF, generación de fragmentos e indexación vectorial correctas; rechazo de contenido duplicado y de archivos duplicados renombrados; eliminación verificada en las tres capas (registro eliminado en PostgreSQL, archivo eliminado de `data/documents/`, 0 puntos encontrados en Qdrant para el `document_id` eliminado, y el documento deja de ser recuperado por el RAG).

**Gestión de conversaciones** — títulos automáticos, renombrado, eliminación con cascada de mensajes, búsqueda local.

</details>

---

## Estrategia de evaluación

<details>
<summary><strong>Ver las dimensiones de evaluación del sistema</strong></summary>

1. **Calidad del retrieval** — ¿la recuperación devuelve evidencia que realmente responde la pregunta?
2. **Fundamentación** — ¿la respuesta generada está respaldada por el contexto recuperado?
3. **Trazabilidad de fuentes** — ¿el sistema puede identificar de dónde salió la respuesta?
4. **Comportamiento sin respuesta** — ¿el asistente evita inventar información cuando falta evidencia?
5. **Robustez conversacional** — ¿las preguntas de seguimiento se resuelven sin que historial irrelevante degrade la recuperación?
6. **Corrección del ciclo de vida documental** — al eliminar un documento, ¿desaparece de metadata, vectores, filesystem y futuras recuperaciones?
7. **Latencia** — ¿el tiempo de respuesta es adecuado para uso interactivo?

</details>

---

## Limitaciones conocidas

<details>
<summary><strong>Ver limitaciones y mejoras en curso</strong></summary>

- **Ingesta solo de PDF.** DOCX, TXT, Markdown, y eventualmente CSV/XLSX/PPTX, están planificados.
- **Prompts sugeridos estáticos.** Los ejemplos visibles en el composer aún no se generan dinámicamente a partir de la base de conocimientos indexada.
- **Recuperación por documento específico sin hardening.** Una solicitud como "resume el Informe Técnico del Proyecto" se beneficiaría de detectar el documento nombrado y restringir la recuperación por su `document_id`, en vez de depender solo de similitud semántica general.
- **Preguntas de metadata de la base de conocimientos** (p. ej. "¿qué documentos tienes?") se responden mejor consultando directamente PostgreSQL que vía RAG semántico; el routing específico para este tipo de consulta está pendiente.
- **Calidad del Top-K.** Puede devolver fragmentos secundarios de menor relevancia; reranking, búsqueda híbrida y filtrado basado en evaluación formal están en el roadmap.
- **Sin autenticación.** No hay todavía RBAC, permisos a nivel de documento, ni soporte multi-tenant.

</details>

---

## Roadmap

- Búsqueda híbrida (BM25 + vectorial) y reranking para mejorar la precisión del retrieval.
- Retrieval consciente de metadata (filtrado explícito por documento).
- Soporte de ingesta para DOCX, TXT y Markdown.
- Observabilidad con LangSmith o Langfuse.
- Autenticación, RBAC y control de acceso por documento.
- Despliegue en producción con Docker Compose y Qdrant Server.

---

## Estructura del proyecto

<details>
<summary><strong>Ver árbol de directorios completo</strong></summary>

```text
enterprise-rag-assistant/
├── backend/
│   ├── app/
│   │   ├── api/            # routes.py, schemas.py
│   │   ├── database/       # connection.py, models.py, crud.py, create_tables.py
│   │   ├── rag/             # loader.py, splitter.py, embeddings.py, vector_store.py, retriever.py, chain.py
│   │   ├── services/        # rag_service.py
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/api.ts
│   │   ├── App.tsx
│   │   └── MyRuntimeProvider.tsx
│   ├── .env.example
│   └── package.json
├── data/
│   ├── documents/        # PDFs subidos — ignorado por Git
│   ├── qdrant/            # persistencia vectorial local
│   └── sample_docs/       # documentos demo incluidos
├── tests/
├── .env.example
├── README.es.md
└── README.md
```

</details>

---

## Licencia

Este proyecto se distribuye bajo licencia MIT. Ver [LICENSE](LICENSE).

---

## Autor

**Johan Moreno**
Ingeniero de Software · IA · Automatización · Ciberseguridad
GitHub: [JohanMV](https://github.com/JohanMV)
