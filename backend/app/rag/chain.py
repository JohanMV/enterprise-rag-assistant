from dotenv import load_dotenv

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_mistralai import ChatMistralAI


load_dotenv()


def get_llm(provider="gemini"):
    if provider == "gemini":
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0
        )

    if provider == "mistral":
        return ChatMistralAI(
            #model="mistral-small-latest",
            model="mistral-small-2603",
            temperature=0
        )

    raise ValueError(f"Proveedor no soportado: {provider}")


def build_rag_prompt():
    return ChatPromptTemplate.from_messages([
        (
            "system",
            """
Eres un asistente empresarial.

Responde únicamente utilizando el contexto proporcionado.
Si el contexto no contiene información suficiente, indícalo claramente.
No inventes información.
"""
        ),
        (
            "human",
            """
Contexto:
{context}

Historial reciente de la conversación:
{history}

Pregunta actual:
{question}
"""
        )
    ])


def build_query_rewrite_prompt():
    return ChatPromptTemplate.from_messages([
        (
            "system",
            """
Convierte la pregunta actual en una consulta de búsqueda breve y autosuficiente.

Reglas obligatorias:
- No respondas la pregunta; devuelve únicamente la consulta reescrita.
- Usa el historial solo para resolver referencias de la pregunta actual, por ejemplo
  "eso", "ellas", "pedirlas" o "y cuánto antes".
- Conserva exactamente la intención, entidades y restricciones del usuario.
- No mezcles temas anteriores que no sean necesarios para resolver una referencia.
- Si la pregunta ya es autosuficiente, mantenla prácticamente igual.
- No añadas explicaciones, comillas, etiquetas ni formato Markdown.
"""
        ),
        (
            "human",
            """
Historial reciente:
{history}

Pregunta actual:
{question}
"""
        ),
    ])


def rewrite_query(llm, prompt, question, history):
    if not history.strip():
        return question.strip()

    chain = prompt | llm
    response = chain.invoke({
        "history": history,
        "question": question,
    })

    standalone_query = str(response.content).strip()
    if not standalone_query:
        return question.strip()

    if (
        len(standalone_query) >= 2
        and standalone_query[0] == standalone_query[-1]
        and standalone_query[0] in {'"', "'"}
    ):
        standalone_query = standalone_query[1:-1].strip()

    return standalone_query or question.strip()


def generate_answer(llm, prompt, question, chunks, history=""):
    context = "\n\n".join(
        chunk.payload["text"]
        for chunk in chunks
    )

    chain = prompt | llm

    response = chain.invoke({
        "context": context,
        "history": history or "Sin historial previo.",
        "question": question,
    })

    return response.content
