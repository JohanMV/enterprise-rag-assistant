from backend.app.database.connection import Base, engine
from backend.app.database.models import Conversation, Document, Message


Base.metadata.create_all(bind=engine)

print("Tablas creadas correctamente.")
