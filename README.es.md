# Enterprise RAG Assistant

> **Aplicación empresarial de Generación Aumentada por Recuperación (RAG) para consultar documentos internos de negocio mediante respuestas fundamentadas, memoria conversacional, trazabilidad de fuentes y gestión del ciclo de vida de documentos.**

[🇬🇧 English version](README.md)

---

## Descripción general

**Enterprise RAG Assistant** es un proyecto de Ingeniería de IA diseñado para transformar documentación interna de empresas en una base de conocimientos consultable mediante lenguaje natural.

La aplicación combina:

- **Generación Aumentada por Recuperación (RAG)**
- **búsqueda semántica con Qdrant**
- **generación fundamentada con Gemini**
- **memoria conversacional persistente en PostgreSQL**
- **ingesta y gestión del ciclo de vida de documentos**
- **frontend con React + assistant-ui**
- **citas de fuentes con trazabilidad por documento y página**

El proyecto está construido intencionalmente como un **proyecto de portafolio de Ingeniería de IA**, no solo como una demostración de chatbot.

---

## Problema de negocio

Las empresas suelen almacenar conocimiento crítico en manuales de RR.HH., políticas de seguridad, informes técnicos, procedimientos operativos y documentación interna. Encontrar una respuesta concreta de forma manual puede ser lento, repetitivo y propenso a errores.

Enterprise RAG Assistant permite realizar preguntas como:

> “¿Cuántos días de vacaciones corresponden a los empleados?”

> “¿Qué debo hacer si detecto un incidente de seguridad?”

> “¿Cuál es el rol del área de TI?”

El sistema primero recupera evidencia desde los documentos indexados de la organización y luego solicita al LLM que responda basándose en dicha evidencia.

Esto mejora el acceso al conocimiento interno, la velocidad de respuesta, la consistencia, la trazabilidad de fuentes y el control sobre qué documentos están disponibles para el asistente.

---

## Aplicación actual

El MVP incluye actualmente:

- historial de chats persistente;
- títulos automáticos de conversaciones;
- renombrado y eliminación de conversaciones;
- búsqueda local de conversaciones en la barra lateral;
- carga de archivos PDF;
- metadata persistente de documentos;
- prevención de documentos duplicados mediante SHA-256;
- eliminación de documentos en PostgreSQL, Qdrant y almacenamiento local;
- recuperación semántica;
- reescritura conversacional de consultas;
- respuestas fundamentadas con Gemini;
- citas de fuentes persistentes;
- documento fuente, página, extracto y puntuación de relevancia;
- interfaz empresarial de tres columnas: historial de chats, conversación principal y base de conocimientos.

---

## Arquitectura

### Arquitectura general de la aplicación

```mermaid
flowchart LR
    UI[React + Vite + assistant-ui] --> API[FastAPI]
    API --> PG[(PostgreSQL)]
    API --> FS[(Almacenamiento local de documentos)]
    API --> RAG[Servicio RAG con LangChain]
    RAG --> REWRITE[Reescritura conversacional de consultas]
    REWRITE --> EMB[Embeddings MiniLM multilingüe]
    EMB --> QD[(Qdrant Local)]
    QD --> RET[Top-K fragmentos recuperados]
    RET --> LLM[Gemini 2.5 Flash]
    LLM --> API
    API --> UI
```

### Flujo de ingesta de documentos

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

### Flujo RAG conversacional

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

---

## Pipeline RAG

### 1. Ingesta de PDF

Los documentos se cargan actualmente con **PyPDFLoader**, preservando metadata como documento fuente, página, ID del documento e ID del fragmento.

Formato de carga soportado actualmente:

```text
PDF
```

El soporte para DOCX, TXT y otros formatos está planificado.

### 2. Chunking

Los documentos se dividen utilizando:

```text
RecursiveCharacterTextSplitter
```

Configuración actual:

```text
chunk_size    = 800
chunk_overlap = 150
```

El solapamiento ayuda a preservar contexto cuando la información atraviesa los límites entre fragmentos.

### 3. Embeddings

El proyecto utiliza:

```text
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

Tamaño del embedding:

```text
384 dimensiones
```

El modelo se ejecuta localmente y se utiliza tanto para los fragmentos de documentos como para las consultas de recuperación del usuario.

### 4. Almacenamiento vectorial

Los vectores se almacenan en **Qdrant Local Mode**.

Colección actual:

```text
enterprise_documents
```

Métrica de similitud:

```text
COSINE
```

Almacenamiento local persistente:

```text
data/qdrant/
```

Cada fragmento indexado contiene metadata como:

```json
{
  "document_id": "uuid",
  "document": "manual_rrhh_empresa_demo.pdf",
  "page": 5,
  "chunk_id": 12,
  "text": "..."
}
```

Se utiliza Qdrant Local porque el MVP actualmente funciona sin Docker.

> Qdrant Local bloquea su directorio de almacenamiento para un único proceso cliente activo. Para despliegues concurrentes o multiproceso, Qdrant Server es el siguiente paso recomendado.

### 5. Reescritura conversacional de consultas

La aplicación **no** concatena directamente el historial de conversación dentro de la consulta de recuperación.

En su lugar:

```text
Historial reciente + Pregunta actual
            ↓
Reescritor de consulta independiente
            ↓
Consulta de recuperación
```

Esto evita que temas anteriores no relacionados contaminen la recuperación semántica.

La consulta reescrita se utiliza para la recuperación vectorial, mientras que el historial conversacional sigue disponible por separado para la generación de la respuesta.

### 6. Recuperación semántica

El retriever genera el embedding de la consulta independiente y busca en Qdrant mediante similitud coseno.

```text
Pregunta independiente
        ↓
Embedding de consulta de 384 dimensiones
        ↓
Búsqueda por similitud en Qdrant
        ↓
Top-K fragmentos
```

Todavía no se aplica un umbral fijo de relevancia porque podría eliminar evidencia útil. El filtrado por relevancia y el reranking deben definirse a partir de evaluación.

### 7. Generación fundamentada

Los fragmentos recuperados se envían a Gemini mediante LangChain.

Configuración actual:

```text
Proveedor: Gemini
Modelo: gemini-2.5-flash
Temperatura: 0
```

El prompt del sistema indica al modelo que responda únicamente a partir del contexto proporcionado, evite afirmaciones no respaldadas e indique explícitamente cuando el contexto sea insuficiente.

El comportamiento de “sin respuesta” ha sido validado: cuando no existe evidencia suficiente, el asistente indica que la información no está presente y devuelve una lista de fuentes vacía.

También existe una abstracción para Mistral como proveedor alternativo, pero **Gemini es el proveedor activo del MVP actual**.

---

## Gestión de la base de conocimientos

### Carga de documentos

Los usuarios pueden subir archivos PDF desde el panel de Base de conocimientos.

```text
PDF
↓
Validación
↓
Hash SHA-256
↓
Persistir archivo
↓
Parsear
↓
Fragmentar
↓
Generar embeddings
↓
Indexar en Qdrant
↓
Guardar metadata del documento
```

Los archivos subidos se almacenan en:

```text
data/documents/
```

Este directorio está excluido de Git.

### Prevención de duplicados

La duplicación de documentos se evita utilizando **SHA-256 sobre el contenido binario del archivo**.

Esto significa:

```text
mismo archivo + mismo nombre
→ duplicado

mismo archivo + nombre diferente
→ duplicado

contenido diferente + mismo nombre
→ permitido
```

Respuesta ante duplicado:

```http
409 Conflict
```

```json
{
  "detail": "Document already exists."
}
```

La verificación de duplicados ocurre antes del parseo, la generación de embeddings y la ingesta en Qdrant.

### Eliminación de documentos

Los documentos pueden eliminarse directamente desde el panel de Base de conocimientos.

La eliminación remueve el documento de todas las capas de persistencia:

```text
Documento
├── metadata en PostgreSQL
├── vectores/fragmentos en Qdrant
└── PDF físico en data/documents/
```

Endpoint:

```http
DELETE /documents/{document_id}
```

Respuesta exitosa:

```text
204 No Content
```

Documento inexistente:

```text
404 Not Found
```

El flujo de eliminación fue validado confirmando que:

- el registro desaparece de PostgreSQL;
- el PDF físico desaparece;
- Qdrant devuelve **0 puntos** para el `document_id` eliminado;
- el documento eliminado deja de ser recuperado por el RAG.

---

## Memoria conversacional

PostgreSQL almacena el historial completo de conversación.

El LLM no recibe indefinidamente toda la conversación.

Estrategia actual:

```text
Historial completo
→ persistido en PostgreSQL

10 mensajes más recientes
→ utilizados como contexto conversacional
```

Esto permite controlar el tamaño del prompt, la latencia y el consumo de tokens.

---

## Gestión de conversaciones

El frontend soporta actualmente:

- nueva conversación;
- generación automática de títulos;
- renombrado manual;
- eliminación de conversaciones;
- historial persistente;
- búsqueda local por título de conversación.

La búsqueda de conversaciones se realiza del lado del cliente sobre las conversaciones ya cargadas por el frontend. **No llama a Gemini ni consume tokens del LLM.**

---

## Fuentes y citas

Las respuestas del asistente pueden incluir tarjetas de fuentes con:

- nombre del documento;
- página;
- puntuación de relevancia;
- extracto;
- ID del documento cuando está disponible.

Las fuentes se persisten junto con los mensajes del asistente en PostgreSQL, por lo que al volver a abrir una conversación no se pierden las citas.

---

## Frontend

El frontend utiliza:

```text
React
Vite
TypeScript
assistant-ui
Tailwind CSS v4
shadcn/ui
```

El layout de escritorio actual utiliza tres columnas principales:

```text
┌─────────────────┬───────────────────────────┬──────────────────────┐
│ Historial       │ Chat principal            │ Base de conocimientos│
│                 │                           │                      │
│ Nuevo chat      │ Mensajes                  │ Añadir PDF           │
│ Buscar chats    │ Fuentes                   │ Docs. indexados      │
│ Conversaciones  │ Composer                  │ Acciones de documento│
└─────────────────┴───────────────────────────┴──────────────────────┘
```

Esto mantiene separados el historial de conversaciones y la base de conocimientos a medida que ambos crecen.

La interfaz sigue un estilo empresarial sobrio, con fondo blanco, jerarquía en tonos neutros, bordes sutiles y áreas de scroll independientes.

---

## Stack tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| Lenguaje | Python 3.13 | Backend y lógica de IA |
| Framework RAG | LangChain | Prompting, recuperación e integración con LLM |
| Parseo de documentos | PyPDFLoader | Ingesta de PDF |
| Chunking | RecursiveCharacterTextSplitter | Generación de fragmentos superpuestos |
| Embeddings | sentence-transformers / multilingual MiniLM | Embeddings locales de 384 dimensiones |
| Base vectorial | Qdrant Local | Almacenamiento vectorial semántico persistente |
| LLM | Gemini API · gemini-2.5-flash | Generación de respuestas fundamentadas |
| LLM opcional | Mistral AI | Abstracción de proveedor alternativo |
| API | FastAPI | Backend REST |
| ORM | SQLAlchemy | Modelos y persistencia de base de datos |
| Driver PostgreSQL | psycopg | Conectividad con PostgreSQL |
| Base relacional | PostgreSQL | Conversaciones, mensajes, fuentes y documentos |
| Frontend | React + Vite + TypeScript | Aplicación web |
| UI de chat IA | assistant-ui | Primitivas de thread, mensajes y composer |
| Estilos | Tailwind CSS v4 + shadcn/ui | Interfaz empresarial |
| Gestor de paquetes | pnpm | Gestión de dependencias del frontend |
| Control de versiones | Git / GitHub | Control de código fuente |

---

## Modelo de datos en PostgreSQL

Las entidades persistidas actuales incluyen:

### `conversations`

Almacena ID de conversación, título generado/manual y timestamps.

### `messages`

Almacena relación con la conversación, rol, contenido, fuentes/citas persistidas y timestamps.

### `documents`

Almacena metadata del ciclo de vida del documento, incluyendo:

- ID;
- nombre almacenado;
- nombre original;
- tipo MIME/archivo;
- estado;
- cantidad de fragmentos;
- mensaje de error;
- hash SHA-256;
- fecha de creación.

---

## API REST

Principales endpoints actuales:

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

Ejemplo de solicitud:

```json
{
  "question": "¿Cuántos días de vacaciones corresponden después de un año?",
  "conversation_id": 3
}
```

`conversation_id` es opcional. Si no se envía, se crea una nueva conversación; si se envía, se reutiliza la conversación existente.

La respuesta incluye el ID de conversación, la respuesta fundamentada y las fuentes.

---

## Estado actual del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Configuración inicial del proyecto | ✅ Completado |
| 1 | Carga de PDF | ✅ Completado |
| 2 | Chunking | ✅ Completado |
| 3 | Embeddings locales | ✅ Completado |
| 4 | Persistencia vectorial en Qdrant | ✅ Completado |
| 5 | Recuperación semántica | ✅ Completado |
| 6 | Generación RAG con Gemini | ✅ Completado |
| 7 | API FastAPI | ✅ Completado |
| 8 | Persistencia PostgreSQL | ✅ Completado |
| 9 | Memoria conversacional | ✅ Completado |
| 10 | Reescritura de consultas | ✅ Completado |
| 11 | Frontend React + assistant-ui | ✅ Completado |
| 12 | Títulos / renombrado / eliminación de conversaciones | ✅ Completado |
| 13 | Panel de Base de conocimientos | ✅ Completado |
| 14 | Carga e ingesta de PDF | ✅ Completado |
| 15 | Citas de fuentes persistentes | ✅ Completado |
| 16 | Prevención de duplicados con SHA-256 | ✅ Completado |
| 17 | Eliminación segura de documentos | ✅ Completado |
| 18 | Interfaz empresarial de tres columnas | ✅ Completado |
| 19 | Búsqueda de conversaciones | ✅ Completado |
| 20 | Hardening de retrieval / evaluación / despliegue | ⏳ En progreso |

---

## Estructura del proyecto

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
│   ├── documents/       # PDFs subidos - ignorados por Git
│   ├── qdrant/          # persistencia vectorial local
│   └── sample_docs/     # documentos demo incluidos
│
├── tests/
├── .env
├── .env.example
├── .gitignore
├── README.es.md
└── README.md
```

La organización interna exacta puede evolucionar a medida que el MVP se fortalece.

---

## Configuración local

### 1. Clonar el repositorio

```bash
git clone https://github.com/JohanMV/enterprise-rag-assistant.git
cd enterprise-rag-assistant
```

### 2. Crear el entorno del backend

```bash
py -3.13 -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Instalar dependencias:

```bash
pip install -r backend/requirements.txt
```

### 3. Variables de entorno

Crear `.env` en la raíz del proyecto:

```env
GOOGLE_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/enterprise_rag
```

Los secretos permanecen del lado del servidor. El frontend nunca debe exponer `GOOGLE_API_KEY`, `MISTRAL_API_KEY` o `DATABASE_URL` como variables `VITE_*`.

### 4. PostgreSQL

Crear:

```text
enterprise_rag
```

Crear/migrar las tablas de la aplicación utilizando los scripts de configuración de base de datos del proyecto.

Tablas actuales:

```text
conversations
messages
documents
```

### 5. Ejecutar el backend

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

### 6. Ejecutar el frontend

Variable de entorno del frontend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Luego:

```bash
cd frontend
pnpm install
pnpm dev
```

URL de desarrollo:

```text
http://127.0.0.1:5173
```

---

## Comportamientos validados

### RAG

- recuperación correcta para preguntas sobre políticas de RR.HH.;
- recuperación correcta para preguntas de ciberseguridad;
- cambio de tema dentro de la misma conversación;
- resolución de preguntas de seguimiento;
- comportamiento de “sin respuesta” cuando no existe evidencia;
- referencias de fuente con página e información de relevancia.

### Persistencia

- las conversaciones sobreviven a recargas de página;
- se almacena el historial completo de mensajes;
- las citas de fuentes sobreviven a recargas;
- la metadata de documentos persiste.

### Ingesta de documentos

- carga de PDF;
- generación de fragmentos;
- indexación vectorial;
- rechazo de contenido duplicado;
- rechazo de archivos duplicados renombrados.

### Eliminación de documentos

Un documento eliminado fue verificado en las tres capas:

```text
PostgreSQL
→ registro eliminado

data/documents/
→ archivo eliminado

Qdrant
→ 0 puntos encontrados para el document_id eliminado
```

El pipeline RAG también dejó de recuperar el documento eliminado.

### Gestión de conversaciones

- títulos automáticos;
- renombrado;
- eliminación;
- eliminación en cascada de mensajes;
- búsqueda local de conversaciones.

---

## Decisiones de diseño

### ¿Por qué RAG en lugar de fine-tuning?

RAG es adecuado para conocimiento empresarial porque los documentos pueden cambiar sin volver a entrenar el LLM, el material fuente permanece gestionado externamente, las respuestas pueden citar evidencia y el conocimiento puede añadirse o eliminarse de forma independiente.

### ¿Por qué LangChain?

El pipeline actual es principalmente lineal:

```text
Cargar → Dividir → Embeddings → Recuperar → Generar
```

LangChain ofrece las abstracciones necesarias sin requerir un framework de agentes más complejo. LangGraph podría considerarse más adelante si el sistema evoluciona hacia flujos con bifurcaciones, reintentos, estado, aprobaciones o múltiples agentes especializados.

### ¿Por qué Qdrant?

Qdrant ofrece búsqueda por similitud vectorial, payloads de metadata, filtrado, almacenamiento persistente y una ruta de despliegue orientada a producción mediante servidor. El MVP utiliza Qdrant Local para un desarrollo local ligero.

### ¿Por qué MiniLM multilingüe?

`paraphrase-multilingual-MiniLM-L12-v2` ofrece embeddings semánticos multilingües, ejecución local, cero costo por consulta de embeddings, inferencia amigable con CPU y vectores de 384 dimensiones.

### ¿Por qué Gemini?

Gemini es el LLM activo porque se integra de forma limpia con LangChain y satisface los requerimientos de generación del MVP. La capa de generación está separada del retrieval, por lo que el proveedor del modelo puede cambiarse sin rediseñar embeddings, Qdrant o la ingesta.

### ¿Por qué PostgreSQL?

PostgreSQL almacena el estado estructurado de la aplicación, mientras que Qdrant gestiona la recuperación semántica vectorial.

```text
PostgreSQL
→ conversaciones, mensajes, citas, metadata de documentos

Qdrant
→ recuperación semántica vectorial
```

### ¿Por qué assistant-ui?

assistant-ui proporciona primitivas reutilizables para chat con IA y permite mantener el backend FastAPI, la arquitectura RAG, la persistencia y los contratos API propios del proyecto. Ninguna API key del LLM se expone directamente al navegador.

---

## Limitaciones actuales

El MVP actual es funcional, pero varias áreas siguen en desarrollo de forma intencional.

### Ingesta únicamente de PDF

Actualmente las cargas soportan PDF. Los formatos planificados incluyen DOCX, TXT y Markdown, además de CSV/XLSX/PPTX dependiendo del caso de uso.

### Las sugerencias iniciales son estáticas

Los prompts sugeridos visibles en el composer son actualmente ejemplos estáticos definidos en la UI. **Todavía no se generan dinámicamente a partir de la base de conocimientos actual.**

### La recuperación específica por documento requiere mayor hardening

La recuperación semántica general funciona, pero solicitudes explícitas como:

```text
"Resume el Informe Técnico del Proyecto"
```

todavía pueden beneficiarse de routing o filtrado por documento. Una futura mejora consiste en detectar un documento nombrado explícitamente y restringir la recuperación mediante su `document_id`.

### Preguntas de gestión de la base de conocimientos

Preguntas como:

```text
"¿Qué documentos tienes?"
```

se responden mejor desde la metadata de documentos almacenada en PostgreSQL que mediante RAG semántico. Está planificado añadir routing específico para este tipo de consultas.

### Calidad del retrieval

El Top-K todavía puede devolver fragmentos secundarios con menor relevancia. El trabajo futuro incluye reranking, búsqueda híbrida, filtrado por relevancia basado en evaluación y recuperación consciente de metadata.

### Autenticación y autorización

El MVP todavía no incluye autenticación, RBAC, permisos a nivel de documento ni workspaces multi-tenant.

---

## Estrategia de evaluación

El proyecto se evalúa en:

- **Calidad del retrieval:** ¿la recuperación devuelve evidencia que realmente responde la pregunta?
- **Fundamentación:** ¿la respuesta generada está respaldada por el contexto recuperado?
- **Trazabilidad de fuentes:** ¿el sistema puede identificar de dónde salió la respuesta?
- **Comportamiento sin respuesta:** ¿el asistente evita inventar información cuando falta evidencia?
- **Robustez conversacional:** ¿las preguntas de seguimiento se resuelven sin que el historial irrelevante degrade la recuperación?
- **Corrección del ciclo de vida documental:** al eliminar un documento, ¿se elimina de metadata, vectores, filesystem y futuras recuperaciones?
- **Latencia:** ¿el tiempo de respuesta es adecuado para uso interactivo?

---

## Mejoras planificadas

Trabajo a corto plazo:

- prompts sugeridos dinámicos basados en conocimiento indexado;
- retrieval/filtrado consciente del documento;
- enrutar preguntas de metadata directamente a PostgreSQL;
- mejorar relevancia de fuentes;
- evaluación RAG automatizada;
- pruebas de integración de API;
- búsqueda híbrida;
- reranking;
- observabilidad con LangSmith o Langfuse;
- soporte para DOCX/TXT;
- autenticación;
- RBAC;
- control de acceso por documento;
- despliegue con Qdrant Server;
- despliegue a producción;
- empaquetado con Docker / Docker Compose;
- flujos agentic RAG opcionales con LangGraph.

---

## Ejemplo de uso

### Conocimiento de RR.HH.

**Pregunta**

```text
¿Cuántos días de vacaciones corresponden después de un año?
```

**Flujo**

```text
React / assistant-ui
        ↓
POST /chat
        ↓
Contexto reciente desde PostgreSQL
        ↓
Reescritura a consulta independiente
        ↓
Embedding de consulta
        ↓
Recuperación semántica en Qdrant
        ↓
Fragmento relevante de política de RR.HH.
        ↓
Generación fundamentada con Gemini
        ↓
Respuesta + fuente
        ↓
Persistir mensaje + cita
```

---

## Objetivo de ingeniería

Este repositorio demuestra conocimientos prácticos de Ingeniería de IA en:

- Generación Aumentada por Recuperación;
- ingesta de documentos;
- chunking semántico;
- embeddings;
- bases de datos vectoriales;
- recuperación semántica;
- reescritura conversacional de consultas;
- grounding de prompts;
- integración con LLM;
- FastAPI;
- persistencia con PostgreSQL;
- gestión del ciclo de vida de una base de conocimientos;
- prevención de duplicados;
- trazabilidad de fuentes;
- interfaces de IA con React;
- integración de assistant-ui;
- diseño de API frontend/backend;
- evaluación de sistemas RAG.

---

## Autor

**Johan Moreno**  
Ingeniero de Software · IA · Automatización · Ciberseguridad  
GitHub: [JohanMV](https://github.com/JohanMV)
