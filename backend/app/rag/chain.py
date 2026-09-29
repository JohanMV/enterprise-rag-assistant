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

Pregunta:
{question}
"""
        )
    ])


def generate_answer(llm, prompt, question, chunks):
    context = "\n\n".join(
        chunk.payload["text"]
        for chunk in chunks
    )

    chain = prompt | llm

    response = chain.invoke({
        "context": context,
        "question": question
    })

    return response.content