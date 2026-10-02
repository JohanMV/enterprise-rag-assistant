# Enterprise RAG Assistant

> **Aplicación empresarial de Generación Aumentada por Recuperación (RAG) para consultar documentos internos de negocio mediante respuestas fundamentadas, memoria conversacional, trazabilidad de fuentes y gestión del ciclo de vida de documentos.**

[🇬🇧 English version](README.md)

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Importancia para las empresas](#importancia-para-las-empresas)
- [Características principales](#características-principales)
- [Arquitectura](#arquitectura)
- [Pipeline de IA de extremo a extremo](#pipeline-de-ia-de-extremo-a-extremo)
- [Cómo funciona](#cómo-funciona)
- [Gestión de la base de conocimientos](#gestión-de-la-base-de-conocimientos)
- [Stack tecnológico](#stack-tecnológico)
- [Competencias de AI Engineering demostradas](#competencias-de-ai-engineering-demostradas)
- [Seguridad, control y eficiencia](#seguridad-control-y-eficiencia)
- [API REST](#api-rest)
- [Configuración local](#configuración-local)
- [Validación técnica](#validación-técnica)
- [Roadmap](#roadmap)
- [Autor](#autor)

---

## Descripción general

**Enterprise RAG Assistant** transforma documentación interna de una organización en una base de conocimientos consultable mediante lenguaje natural.

El sistema combina recuperación semántica, memoria conversacional y generación con LLM para responder preguntas a partir de documentos reales de la empresa, mostrando además el documento fuente, la página y un extracto de respaldo cuando corresponde.

La solución está orientada a casos de uso como:

- manuales de RR.HH.;
- políticas de seguridad;
- procedimientos operativos;
- informes técnicos;
- documentación interna;
- guías y normas empresariales.

---

## Importancia para las empresas

En muchas organizaciones, la información crítica está distribuida entre múltiples documentos, carpetas, manuales y procedimientos. Esto genera problemas frecuentes:

- tiempo perdido buscando información;
- respuestas inconsistentes entre áreas;
- dependencia de conocimiento informal;
- dificultad para consultar documentos extensos;
- riesgo de utilizar información desactualizada;
- baja trazabilidad sobre la fuente de una respuesta.

Un sistema RAG empresarial ayuda a centralizar y consultar ese conocimiento sin entrenar nuevamente el modelo cada vez que cambia la documentación.

Entre sus beneficios se encuentran:

- **acceso más rápido al conocimiento interno**;
- **respuestas fundamentadas en documentos reales**;
- **trazabilidad por documento y página**;
- **reducción de respuestas inventadas** mediante grounding;
- **actualización del conocimiento sin fine-tuning**;
- **mejor control sobre qué información está disponible para el asistente**;
- **separación entre la base documental y el modelo generativo**.

Este tipo de arquitectura se utiliza en escenarios empresariales donde es necesario consultar información interna de forma controlada, como soporte, operaciones, RR.HH., cumplimiento, seguridad, documentación técnica y gestión del conocimiento.

---

## Características principales

### RAG y recuperación semántica

- búsqueda semántica sobre documentos indexados;
- embeddings multilingües generados localmente;
- almacenamiento vectorial persistente con Qdrant;
- reescritura conversacional de consultas;
- respuestas fundamentadas con Gemini;
- comportamiento controlado cuando no existe evidencia suficiente.

### Trazabilidad de fuentes

Cada respuesta puede incluir:

- documento fuente;
- página;
- extracto;
- puntuación de relevancia.

Las fuentes se persisten junto con el historial de conversación.

### Gestión documental

- carga de documentos PDF;
- indexación automática;
- metadata persistente;
- detección de duplicados mediante SHA-256;
- eliminación segura de documentos;
- limpieza coordinada de PostgreSQL, Qdrant y almacenamiento local.

### Gestión de conversaciones

- historial persistente;
- títulos automáticos;
- renombrado;
- eliminación;
- búsqueda local de conversaciones;
- memoria conversacional basada en los mensajes recientes.

### Interfaz

La aplicación utiliza una interfaz empresarial de tres columnas:

```text
┌─────────────────┬───────────────────────────┬──────────────────────┐
│ Historial       │ Chat principal            │ Base de conocimientos│
│                 │                           │                      │
│ Nuevo chat      │ Mensajes                  │ Documentos           │
│ Buscar chats    │ Fuentes                   │ Acciones             │
│ Conversaciones  │ Composer                  │ Carga / gestión      │
└─────────────────┴───────────────────────────┴──────────────────────┘
```

---

## Arquitectura

```mermaid
flowchart LR
    UI[React + Vite + assistant-ui] --> API[FastAPI]
    API --> PG[(PostgreSQL)]
    API --> FS[(Almacenamiento local)]
    API --> RAG[Servicio RAG con LangChain]
    RAG --> REWRITE[Reescritura conversacional]
    REWRITE --> EMB[Embeddings MiniLM]
    EMB --> QD[(Qdrant Local)]
    QD --> RET[Top-K fragmentos]
    RET --> LLM[Gemini 2.5 Flash]
    LLM --> API
    API --> UI
```

### Responsabilidades por capa

| Capa | Responsabilidad |
|---|---|
| React + assistant-ui | Interfaz, chat, historial y gestión documental |
| FastAPI | API REST y orquestación |
| LangChain | Pipeline RAG y generación |
| MiniLM | Embeddings multilingües |
| Qdrant | Recuperación semántica |
| PostgreSQL | Conversaciones, mensajes, fuentes y documentos |
| Gemini | Generación de respuestas fundamentadas |

<details>
<summary><strong>Ver flujo detallado de ingesta de documentos</strong></summary>

```text
PDF
↓
Validación
↓
SHA-256
↓
Persistencia del archivo
↓
PyPDFLoader
↓
Chunking
↓
Embeddings
↓
Qdrant
↓
Metadata en PostgreSQL
```

Configuración actual de chunking:

```text
chunk_size    = 800
chunk_overlap = 150
```

Modelo de embeddings:

```text
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

Dimensionalidad:

```text
384
```

</details>

<details>
<summary><strong>Ver flujo conversacional RAG</strong></summary>

```text
Pregunta del usuario
↓
Historial reciente
↓
Reescritura a consulta independiente
↓
Embedding de consulta
↓
Búsqueda semántica en Qdrant
↓
Top-K fragmentos
↓
Prompt fundamentado
↓
Gemini
↓
Respuesta + fuentes
↓
Persistencia en PostgreSQL
```

La reescritura conversacional evita que temas anteriores no relacionados contaminen la búsqueda semántica.

</details>

---


## Pipeline de IA de extremo a extremo

El proyecto implementa un **pipeline de IA completo**, desde la ingesta de documentos hasta la generación y persistencia de respuestas.

```text
Documentos PDF
      ↓
Parsing con PyPDFLoader
      ↓
Chunking + overlap
      ↓
Embeddings multilingües
      ↓
Indexación vectorial en Qdrant
      ↓
Pregunta del usuario
      ↓
Reescritura conversacional de la consulta
      ↓
Embedding de consulta
      ↓
Recuperación semántica Top-K
      ↓
Contexto + Prompt Grounding
      ↓
Gemini 2.5 Flash
      ↓
Respuesta fundamentada + fuentes
      ↓
Persistencia en PostgreSQL
```

Este flujo cubre varias etapas habituales en sistemas modernos de IA generativa:

- **ingesta y preprocesamiento de datos**;
- **segmentación documental**;
- **generación de embeddings**;
- **almacenamiento vectorial**;
- **semantic search / retrieval**;
- **query rewriting** para conversaciones;
- **orquestación RAG**;
- **prompt grounding**;
- **integración con LLM**;
- **trazabilidad de evidencia**;
- **persistencia de conversaciones y fuentes**.

La arquitectura mantiene desacopladas las principales responsabilidades, permitiendo evolucionar el modelo generativo, la estrategia de retrieval o la capa de persistencia sin rediseñar todo el sistema.

---

## Cómo funciona

### 1. Ingesta

Los documentos se cargan mediante **PyPDFLoader** y se transforman en fragmentos con metadata.

### 2. Chunking

Los documentos se dividen en fragmentos superpuestos para conservar contexto entre secciones cercanas.

### 3. Embeddings

Cada fragmento se transforma en un vector de 384 dimensiones usando:

```text
paraphrase-multilingual-MiniLM-L12-v2
```

### 4. Recuperación

La pregunta del usuario se convierte en un embedding y se compara con los fragmentos almacenados en Qdrant usando similitud coseno.

### 5. Generación

Los fragmentos más relevantes se envían a Gemini mediante LangChain.

Configuración actual:

```text
Proveedor: Gemini
Modelo: gemini-2.5-flash
Temperatura: 0
```

El sistema solicita responder únicamente a partir del contexto recuperado y señalar cuando la información no está disponible.

---

## Gestión de la base de conocimientos

### Carga de documentos

Actualmente se admite:

```text
PDF
```

Los archivos subidos se almacenan bajo:

```text
data/documents/
```

y se indexan automáticamente en Qdrant.

### Prevención de duplicados

La aplicación calcula un hash **SHA-256** sobre el contenido binario.

Esto permite detectar duplicados incluso si el archivo fue renombrado.

```text
mismo contenido + mismo nombre
→ duplicado

mismo contenido + nombre diferente
→ duplicado

contenido diferente + mismo nombre
→ permitido
```

### Eliminación segura

Al eliminar un documento, se limpian las tres capas asociadas:

```text
PostgreSQL
Qdrant
data/documents/
```

Esto evita registros, archivos o vectores huérfanos.

Endpoint:

```http
DELETE /documents/{document_id}
```

<details>
<summary><strong>Ver validación realizada sobre eliminación documental</strong></summary>

La eliminación fue verificada manualmente en las tres capas:

```text
PostgreSQL
→ registro eliminado

data/documents/
→ archivo eliminado

Qdrant
→ 0 puntos encontrados para el document_id eliminado
```

También se comprobó que el RAG dejara de recuperar información procedente del documento eliminado.

</details>

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Python 3.13 |
| RAG | LangChain |
| API | FastAPI |
| Base relacional | PostgreSQL |
| ORM | SQLAlchemy |
| Driver PostgreSQL | psycopg |
| Vector DB | Qdrant Local |
| Embeddings | sentence-transformers / MiniLM multilingüe |
| LLM | Gemini 2.5 Flash |
| Proveedor LLM opcional | Mistral AI |
| Frontend | React + Vite + TypeScript |
| UI conversacional | assistant-ui |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Gestor de paquetes | pnpm |
| Control de versiones | Git / GitHub |

---


## Competencias de AI Engineering demostradas

Este proyecto pone en práctica competencias habituales en roles de **AI Engineer, Generative AI Engineer y LLM Engineer**:

### Diseño de sistemas RAG

- construcción de un pipeline Retrieval-Augmented Generation;
- grounding de respuestas sobre evidencia recuperada;
- separación entre retrieval y generación;
- manejo explícito de casos sin evidencia suficiente.

### Embeddings y búsqueda vectorial

- generación local de embeddings multilingües;
- consistencia entre embeddings de documentos y consultas;
- búsqueda por similitud coseno;
- uso de metadata para trazabilidad y futuras estrategias de filtrado.

### Ingeniería de prompts y contexto

- prompts orientados a respuestas fundamentadas;
- control del contexto enviado al modelo;
- reescritura de consultas conversacionales;
- limitación del historial reciente para evitar crecimiento innecesario del prompt.

### Integración y orquestación de LLM

- integración de Gemini mediante LangChain;
- configuración determinista con `temperature=0`;
- abstracción para cambiar proveedor de generación;
- separación de credenciales y ejecución del modelo respecto al frontend.

### Persistencia y ciclo de vida del conocimiento

- persistencia de conversaciones y fuentes;
- gestión documental coordinada;
- detección de duplicados mediante SHA-256;
- eliminación consistente entre almacenamiento relacional, vectorial y filesystem.

### Evaluación de sistemas RAG

El sistema se valida considerando:

- calidad del retrieval;
- groundedness;
- trazabilidad;
- comportamiento sin respuesta;
- robustez conversacional;
- consistencia del ciclo de vida documental;
- latencia.

La evaluación automatizada y el reranking permanecen en el roadmap y no se presentan como funcionalidades ya implementadas.

---

## Seguridad, control y eficiencia

El proyecto incorpora varias decisiones relevantes para aplicaciones empresariales de IA:

- las claves de API y credenciales permanecen en el backend;
- el frontend no recibe secretos de Gemini ni de PostgreSQL;
- los embeddings se generan localmente, evitando costo por llamada para esta etapa;
- el conocimiento permanece desacoplado del LLM y puede añadirse o eliminarse sin reentrenamiento;
- las respuestas pueden incluir documento y página de origen;
- los documentos duplicados se detectan antes de ejecutar operaciones costosas de parsing y embedding;
- el historial completo se conserva en PostgreSQL, pero solo los **10 mensajes más recientes** se utilizan como contexto conversacional;
- la eliminación documental limpia PostgreSQL, Qdrant y almacenamiento físico para evitar datos huérfanos.

Estas medidas no sustituyen controles de producción como autenticación, RBAC o permisos por documento, que se mantienen explícitamente en el roadmap.

---

## API REST

Principales endpoints:

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

<details>
<summary><strong>Ver ejemplo de POST /chat</strong></summary>

```json
{
  "question": "¿Cuántos días de vacaciones corresponden después de un año?",
  "conversation_id": 3
}
```

`conversation_id` es opcional.

Sin `conversation_id`:

```text
se crea una nueva conversación
```

Con `conversation_id`:

```text
se reutiliza la conversación existente
```

La respuesta incluye:

- ID de conversación;
- respuesta fundamentada;
- fuentes recuperadas.

</details>

---

## Configuración local

### 1. Clonar el repositorio

```bash
git clone https://github.com/JohanMV/enterprise-rag-assistant.git
cd enterprise-rag-assistant
```

### 2. Crear entorno virtual

```bash
py -3.13 -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

### 3. Instalar dependencias del backend

```bash
pip install -r backend/requirements.txt
```

### 4. Variables de entorno

Crear `.env`:

```env
GOOGLE_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/enterprise_rag
```

Las credenciales permanecen del lado del servidor y no se exponen al frontend.

### 5. PostgreSQL

Crear la base:

```text
enterprise_rag
```

Tablas principales:

```text
conversations
messages
documents
```

### 6. Ejecutar backend

```bash
python -m uvicorn backend.app.main:app --reload
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

### 7. Ejecutar frontend

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend:

```text
http://127.0.0.1:5173
```

<details>
<summary><strong>Ver estructura principal del proyecto</strong></summary>

```text
enterprise-rag-assistant/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── database/
│   │   ├── rag/
│   │   ├── services/
│   │   └── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── data/
│   ├── documents/
│   ├── qdrant/
│   └── sample_docs/
│
├── tests/
├── .env.example
├── README.es.md
└── README.md
```

</details>

---

## Validación técnica

Se validaron los principales flujos de la aplicación:

- recuperación correcta sobre documentos de RR.HH.;
- recuperación correcta sobre documentación de ciberseguridad;
- cambio de tema dentro de una misma conversación;
- resolución de preguntas de seguimiento;
- comportamiento de “sin respuesta” cuando no existe evidencia;
- persistencia de conversaciones y citas;
- detección de documentos duplicados;
- eliminación consistente de documentos;
- actualización de la base de conocimientos tras eliminar contenido.

<details>
<summary><strong>Ver criterios técnicos utilizados para evaluar el sistema</strong></summary>

- **Calidad del retrieval:** si los fragmentos recuperados contienen la evidencia correcta.
- **Groundedness:** si la respuesta está respaldada por el contexto.
- **Trazabilidad:** si la respuesta identifica correctamente documento y página.
- **No-answer behavior:** si el sistema evita inventar información cuando no hay evidencia.
- **Robustez conversacional:** si preguntas de seguimiento se resuelven sin degradar retrieval.
- **Consistencia documental:** si un documento eliminado desaparece de todas las capas.
- **Latencia:** si la respuesta es adecuada para interacción en tiempo real.

</details>

---

## Roadmap

Próximas mejoras técnicas:

- soporte multiformato: DOCX, TXT y Markdown;
- retrieval consciente del documento mediante metadata filtering;
- búsqueda híbrida;
- reranking;
- evaluación RAG automatizada con métricas de retrieval y groundedness;
- datasets de evaluación y pruebas de regresión del pipeline;
- observabilidad de prompts, retrieval, latencia y uso del LLM con LangSmith o Langfuse;
- medición de costo y latencia por consulta;
- autenticación;
- RBAC;
- control de acceso por documento;
- Qdrant Server para despliegue concurrente;
- despliegue en producción.

<details>
<summary><strong>Ver consideraciones técnicas pendientes</strong></summary>

Actualmente:

- los prompts sugeridos del frontend todavía son estáticos;
- las consultas explícitas sobre un documento específico pueden beneficiarse de filtrado por `document_id`;
- las preguntas de administración de la base de conocimientos, como “¿Qué documentos tienes?”, se responderán mejor mediante routing a PostgreSQL;
- el Top-K puede incluir fragmentos secundarios con menor relevancia.

Estas mejoras forman parte del hardening progresivo del sistema.

</details>

---

## Autor

**Johan Moreno**  
Ingeniero de Software · IA · Automatización · Ciberseguridad  
GitHub: [JohanMV](https://github.com/JohanMV)
