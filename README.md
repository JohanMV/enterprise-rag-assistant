# Enterprise RAG Assistant

<p align="center">
  <img src="./docs/images/demoHD.gif" alt="Enterprise RAG Assistant Demo" width="100%">
</p>

![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite%20%2B%20TS-61DAFB?style=flat-square&logo=react&logoColor=black)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-DC244C?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Persistencia-4169E1?style=flat-square&logo=postgresql&logoColor=white)

> **Aplicación empresarial de Generación Aumentada por Recuperación (RAG) para consultar documentos internos de negocio mediante respuestas fundamentadas, memoria conversacional, trazabilidad de fuentes y gestión del ciclo de vida de documentos.**


[🇬🇧 English version](README.md)


## Tabla de contenidos

- [Resumen](#resumen)
- [Por qué importa para una empresa](#por-qué-importa-para-una-empresa)
- [Características principales](#características-principales)
- [Pipeline de IA](#pipeline-de-ia)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Decisiones de diseño clave](#decisiones-de-diseño-clave)
- [Gestión de la base de conocimientos](#gestión-de-la-base-de-conocimientos)
- [API principal](#api-principal)
- [Instalación rápida](#instalación-rápida)
- [Validación técnica](#validación-técnica)
- [Roadmap](#roadmap)
- [Autor](#autor)

---

## Resumen

Las empresas acumulan conocimiento crítico en manuales de RR.HH., políticas de seguridad, procedimientos operativos, informes técnicos y documentación interna. Encontrar una respuesta concreta dentro de esa información suele ser lento, repetitivo y difícil de auditar.

**Enterprise RAG Assistant** implementa un **pipeline de IA de extremo a extremo** que transforma esa documentación en una base de conocimientos consultable mediante lenguaje natural:

```text
Ingesta
→ Chunking
→ Embeddings
→ Recuperación semántica
→ Generación fundamentada
→ Respuesta + fuentes
```

El sistema recupera evidencia desde los documentos indexados y genera la respuesta a partir de ese contexto, mostrando además el documento fuente, la página y un extracto de respaldo cuando corresponde.

Ejemplos de preguntas:

- “¿Cuántos días de vacaciones corresponden a los empleados?”
- “¿Qué debo hacer si detecto un incidente de seguridad?”
- “¿Cuál es el procedimiento definido para solicitar acceso?”
- “¿Qué indica el documento sobre este proceso?”

---

## Por qué importa para una empresa

Un sistema RAG empresarial ayuda a resolver problemas frecuentes de gestión del conocimiento:

- **Información dispersa:** documentos distribuidos entre manuales, carpetas y procedimientos.
- **Tiempo perdido:** usuarios que buscan manualmente respuestas que ya existen en documentación interna.
- **Respuestas inconsistentes:** diferentes personas pueden interpretar o consultar versiones distintas de una misma política.
- **Baja trazabilidad:** sin fuente y página es difícil auditar de dónde salió una respuesta.
- **Riesgo de alucinaciones:** un LLM general puede responder con información plausible pero no respaldada por la documentación de la empresa.
- **Actualización costosa:** el conocimiento cambia constantemente y no debería requerir reentrenar un modelo.

Esta arquitectura permite:

- consultar conocimiento interno en lenguaje natural;
- responder utilizando evidencia documental;
- mantener trazabilidad hacia la fuente;
- añadir o eliminar conocimiento sin fine-tuning;
- desacoplar la base documental del modelo generativo;
- controlar mejor qué información forma parte del contexto disponible para el asistente.

Es aplicable a escenarios como RR.HH., soporte interno, ciberseguridad, operaciones, cumplimiento, documentación técnica y gestión del conocimiento.

---

## Características principales

### Pipeline de IA y RAG

- ingesta de documentos PDF;
- chunking con solapamiento;
- embeddings multilingües generados localmente;
- almacenamiento vectorial persistente;
- búsqueda semántica Top-K;
- reescritura conversacional de consultas;
- generación fundamentada con Gemini;
- comportamiento controlado cuando no existe evidencia suficiente.

### Trazabilidad de fuentes

Las respuestas pueden incluir:

- documento fuente;
- página;
- extracto;
- puntuación de relevancia.

Las fuentes se persisten junto con el historial de conversación.

### Gestión documental

- carga e indexación automática;
- metadata persistente;
- prevención de duplicados mediante SHA-256;
- eliminación consistente en PostgreSQL, Qdrant y almacenamiento físico;
- base de conocimientos administrable desde la interfaz.

### Conversaciones

- historial persistente;
- títulos automáticos;
- renombrado;
- eliminación;
- búsqueda local de conversaciones;
- memoria conversacional basada en contexto reciente.

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
![Enterprise RAG Assistant](./docs/images/demo.png)

---

## Pipeline de IA

El núcleo técnico del proyecto es un **pipeline de IA end-to-end** para procesamiento documental, recuperación semántica y generación con LLM.

```mermaid
flowchart LR
    A[PDF] --> B[Parsing]
    B --> C[Chunking]
    C --> D[Embeddings 384D]
    D --> E[(Qdrant)]
    E --> F[Query Rewriting]
    F --> G[Semantic Retrieval]
    G --> H[Prompt Grounding]
    H --> I[Gemini]
    I --> J[Respuesta + Fuentes]
    J --> K[(PostgreSQL)]
```

Este flujo cubre competencias habituales en roles de **AI Engineer, Generative AI Engineer y LLM Engineer**:

- ingestión y preprocesamiento documental;
- segmentación de texto;
- generación de embeddings;
- vector search;
- query rewriting;
- retrieval orchestration;
- prompt grounding;
- integración con LLM;
- persistencia;
- trazabilidad;
- evaluación de comportamiento RAG.

<details>
<summary><strong>Ver detalle técnico del pipeline</strong></summary>

### 1. Ingesta

Los documentos se cargan con `PyPDFLoader`, preservando metadata como documento, página, `document_id` y `chunk_id`.

Formato soportado actualmente:

```text
PDF
```

### 2. Chunking

```text
RecursiveCharacterTextSplitter
chunk_size    = 800
chunk_overlap = 150
```

El solapamiento ayuda a conservar contexto cuando una sección relevante cruza los límites entre fragmentos.

### 3. Embeddings

Modelo:

```text
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

Dimensionalidad:

```text
384
```

El mismo modelo se utiliza para documentos y consultas para mantener ambas representaciones en el mismo espacio vectorial.

### 4. Almacenamiento vectorial

Qdrant se utiliza para almacenar vectores y metadata asociada.

Colección:

```text
enterprise_documents
```

Métrica:

```text
COSINE
```

Persistencia local:

```text
data/qdrant/
```

### 5. Reescritura conversacional

El historial no se concatena directamente a la consulta de retrieval.

En su lugar:

```text
Historial reciente + pregunta actual
↓
Consulta independiente
↓
Retrieval
```

Esto reduce contaminación semántica cuando la conversación cambia de tema.

### 6. Recuperación

La consulta reescrita se convierte en embedding y se compara con los fragmentos de Qdrant mediante similitud coseno.

### 7. Generación fundamentada

Proveedor activo:

```text
Gemini
gemini-2.5-flash
temperature = 0
```

El prompt instruye al modelo a responder únicamente usando el contexto recuperado y a indicar cuando la información es insuficiente.

Existe además una abstracción para Mistral como proveedor alternativo.

### 8. Persistencia

PostgreSQL almacena:

- conversaciones;
- mensajes;
- fuentes;
- metadata documental.

El historial completo se conserva, mientras que los **10 mensajes más recientes** se utilizan como contexto conversacional para controlar tamaño del prompt, latencia y consumo de tokens.

</details>

---

## Arquitectura

```mermaid
flowchart LR
    UI[React + Vite + assistant-ui] --> API[FastAPI]
    API --> PG[(PostgreSQL)]
    API --> FS[(Almacenamiento de documentos)]
    API --> RAG[Servicio RAG con LangChain]
    RAG --> REWRITE[Query Rewriting]
    REWRITE --> EMB[MiniLM Embeddings]
    EMB --> QD[(Qdrant)]
    QD --> RET[Top-K Chunks]
    RET --> LLM[Gemini 2.5 Flash]
    LLM --> API
    API --> UI
```

### Responsabilidades por capa

| Capa | Responsabilidad |
|---|---|
| React + assistant-ui | Interfaz, chat, historial y gestión documental |
| FastAPI | API REST y orquestación |
| LangChain | Pipeline RAG e integración con LLM |
| MiniLM | Generación de embeddings |
| Qdrant | Búsqueda vectorial |
| PostgreSQL | Estado estructurado y persistencia |
| Gemini | Generación de respuestas fundamentadas |

<details>
<summary><strong>Ver flujos detallados de ingesta y conversación</strong></summary>

### Ingesta documental

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

### Flujo conversacional

```text
Pregunta del usuario
↓
Historial reciente
↓
Query rewriting
↓
Embedding de consulta
↓
Qdrant
↓
Top-K fragmentos
↓
Prompt grounding
↓
Gemini
↓
Respuesta + fuentes
↓
Persistencia
```

</details>

---

## Stack tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| Lenguaje | Python 3.13 | Backend y lógica de IA |
| Framework RAG | LangChain | Orquestación RAG e integración LLM |
| Parseo documental | PyPDFLoader | Ingesta de PDF |
| Chunking | RecursiveCharacterTextSplitter | Segmentación de documentos |
| Embeddings | sentence-transformers / MiniLM multilingüe | Embeddings locales de 384 dimensiones |
| Base vectorial | Qdrant Local | Almacenamiento y búsqueda semántica |
| LLM | Gemini API · gemini-2.5-flash | Generación fundamentada |
| LLM alternativo | Mistral AI | Proveedor intercambiable |
| API | FastAPI | Backend REST |
| ORM | SQLAlchemy | Persistencia de modelos |
| PostgreSQL driver | psycopg | Conectividad |
| Base relacional | PostgreSQL | Conversaciones, mensajes, fuentes y documentos |
| Frontend | React + Vite + TypeScript | Aplicación web |
| UI conversacional | assistant-ui | Thread, mensajes y composer |
| Estilos | Tailwind CSS v4 + shadcn/ui | Interfaz empresarial |
| Gestor de paquetes | pnpm | Dependencias frontend |

---

## Decisiones de diseño clave

**¿Por qué RAG y no fine-tuning?**  
La documentación empresarial cambia con frecuencia. RAG permite actualizar el conocimiento sin reentrenar el modelo, mantener el material fuente gestionado externamente y citar evidencia.

**¿Por qué LangChain y no una arquitectura agentic?**  
El flujo actual es principalmente lineal: cargar → dividir → generar embeddings → recuperar → generar. LangChain cubre esa necesidad sin añadir complejidad innecesaria.

**¿Por qué Qdrant?**  
Permite búsqueda vectorial, payloads de metadata, filtrado y una ruta clara hacia Qdrant Server cuando el sistema requiera concurrencia.

**¿Por qué MiniLM multilingüe?**  
Permite embeddings multilingües, ejecución local, menor dependencia de APIs externas y costo nulo por llamada de embedding.

**¿Por qué separar PostgreSQL de Qdrant?**  
PostgreSQL gestiona estado estructurado; Qdrant se especializa en recuperación vectorial. Cada tecnología mantiene una responsabilidad clara.

**¿Por qué assistant-ui?**  
Permite construir una experiencia de chat moderna sin sustituir el backend, el RAG ni los contratos de API propios.

---

## Gestión de la base de conocimientos

### Prevención de duplicados

Se calcula un hash **SHA-256** sobre el contenido binario antes del parsing, los embeddings o la indexación.

| Caso | Resultado |
|---|---|
| Mismo archivo + mismo nombre | Rechazado |
| Mismo archivo + nombre diferente | Rechazado |
| Contenido diferente + mismo nombre | Permitido |

Respuesta:

```http
409 Conflict
```

### Eliminación segura

`DELETE /documents/{document_id}` elimina el documento de:

```text
PostgreSQL
Qdrant
data/documents/
```

Esto evita metadata, vectores o archivos huérfanos.

<details>
<summary><strong>Ver validación de eliminación</strong></summary>

Se comprobó:

```text
PostgreSQL
→ registro eliminado

data/documents/
→ archivo eliminado

Qdrant
→ 0 puntos para el document_id eliminado
```

Además, el RAG dejó de recuperar información del documento eliminado.

</details>

### Seguridad y control

- las claves de API permanecen en backend;
- el frontend no expone credenciales de Gemini ni PostgreSQL;
- los embeddings se generan localmente;
- la base documental puede actualizarse sin fine-tuning;
- las respuestas pueden mantener trazabilidad documental;
- los duplicados se detectan antes de operaciones costosas;
- el contexto conversacional se limita para controlar tokens y latencia.

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

<details>
<summary><strong>Ver ejemplo de POST /chat</strong></summary>

```json
{
  "question": "¿Cuántos días de vacaciones corresponden después de un año?",
  "conversation_id": 3
}
```

`conversation_id` es opcional:

```text
sin conversation_id
→ crea una nueva conversación

con conversation_id
→ reutiliza la conversación existente
```

La respuesta incluye:

- `conversation_id`;
- respuesta fundamentada;
- fuentes.

</details>

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
MISTRAL_API_KEY=your_mistral_api_key
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/enterprise_rag

# 4. Backend
python -m uvicorn backend.app.main:app --reload

# 5. Frontend
cd frontend
pnpm install
pnpm dev
```

Swagger:

```text
http://127.0.0.1:8000/docs
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
- comportamiento de “sin respuesta”;
- persistencia de conversaciones y fuentes;
- detección de duplicados;
- eliminación consistente de documentos;
- actualización de la base de conocimientos tras eliminación.

<details>
<summary><strong>Ver criterios de evaluación</strong></summary>

- **Retrieval quality:** los fragmentos recuperados deben contener evidencia relevante.
- **Groundedness:** la respuesta debe estar respaldada por el contexto.
- **Source traceability:** debe ser posible identificar documento y página.
- **No-answer behavior:** el sistema debe evitar inventar respuestas sin evidencia.
- **Conversational robustness:** los follow-ups no deben degradar retrieval.
- **Document lifecycle correctness:** la eliminación debe propagarse a todas las capas.
- **Latency:** la respuesta debe ser adecuada para interacción en tiempo real.

</details>

---

## Roadmap

Próximas mejoras técnicas:

- soporte multiformato: DOCX, TXT y Markdown;
- retrieval consciente de metadata;
- búsqueda híbrida;
- reranking;
- evaluación RAG automatizada;
- datasets de evaluación y pruebas de regresión;
- observabilidad con LangSmith o Langfuse;
- medición de latencia y costo por consulta;
- autenticación;
- RBAC;
- control de acceso por documento;
- Qdrant Server para concurrencia;
- despliegue en producción.

<details>
<summary><strong>Ver consideraciones técnicas pendientes</strong></summary>

Actualmente:

- los prompts sugeridos del frontend aún son estáticos;
- las consultas dirigidas a un documento específico pueden beneficiarse de filtrado por `document_id`;
- las preguntas administrativas sobre la base de conocimientos pueden resolverse mejor mediante routing a PostgreSQL;
- el Top-K todavía puede incluir fragmentos secundarios de menor relevancia.

Estas mejoras forman parte del hardening progresivo del sistema.

</details>

---

## Autor

**Johan Moreno**  
Ingeniero de Software · IA · Automatización · Ciberseguridad  
GitHub: [JohanMV](https://github.com/JohanMV)
