from embeddings import get_embedding_model


embedding_model = get_embedding_model()

text = "Los trabajadores tienen derecho a vacaciones."

vector = embedding_model.embed_query(text)

print(f"Dimensiones: {len(vector)}")
print(f"Primeros valores: {vector[:10]}")