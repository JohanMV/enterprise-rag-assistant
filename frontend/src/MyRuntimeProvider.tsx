import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ExternalStoreThreadListAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  ApiError,
  type ConversationResponse,
  type DocumentResponse,
  type MessageResponse,
  type Source,
} from "@/lib/api";
import {
  EnterpriseRuntimeContext,
  type BackendStatus,
} from "@/enterprise-runtime-context";

const toSourcePart = (source: Source, index: number) => ({
  type: "source" as const,
  sourceType: "document" as const,
  id: source.document_id ?? `${source.document}-${source.page}-${index}`,
  title: source.document,
  filename: source.document,
  mediaType: "application/pdf",
  providerMetadata: {
    rag: {
      documentId: source.document_id,
      page: source.page,
      excerpt: source.excerpt,
      score: source.score,
    },
  },
});

const toThreadMessage = (message: MessageResponse): ThreadMessageLike => {
  const role =
    message.role === "user"
      ? "user"
      : message.role === "system"
        ? "system"
        : "assistant";

  return {
    id: String(message.id),
    role,
    content: [
      { type: "text", text: message.content },
      ...(role === "assistant" ? (message.sources ?? []).map(toSourcePart) : []),
    ],
    createdAt: new Date(message.created_at),
  };
};

const getText = (message: AppendMessage) =>
  message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

const STARTER_SUGGESTIONS = [
  {
    title: "Política de vacaciones",
    description: "Días disponibles y solicitud",
    prompt: "¿Cuántos días de vacaciones tiene un trabajador?",
  },
  {
    title: "Seguridad de contraseñas",
    description: "Requisitos y buenas prácticas",
    prompt: "¿Cuál es la política para crear contraseñas seguras?",
  },
  {
    title: "Respuesta ante incidentes",
    description: "Pasos y canales de reporte",
    prompt: "¿Qué debo hacer ante un incidente de ciberseguridad?",
  },
  {
    title: "Malware y ransomware",
    description: "Definiciones y prevención",
    prompt: "¿Qué es el malware y cómo puedo prevenirlo?",
  },
];

export function MyRuntimeProvider({ children }: { children: ReactNode }) {
  const [backendStatus, setBackendStatus] =
    useState<BackendStatus>("checking");
  const [conversations, setConversations] = useState<ConversationResponse[]>(
    [],
  );
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >();
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const conversationId = useRef<number | null>(null);

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await api.conversations());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar las conversaciones.",
      );
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      setDocuments(await api.documents());
      setDocumentError(null);
    } catch (requestError) {
      setDocumentError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los documentos.",
      );
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  const renameConversation = useCallback(async (id: number, title: string) => {
    setError(null);
    try {
      const updated = await api.renameConversation(id, title);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === id ? updated : conversation,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo renombrar la conversación.",
      );
      throw requestError;
    }
  }, []);

  const uploadDocument = useCallback(
    async (file: File) => {
      setIsUploadingDocument(true);
      setDocumentError(null);
      try {
        await api.uploadDocument(file);
        await refreshDocuments();
      } catch (requestError) {
        const message =
          requestError instanceof ApiError && requestError.status === 409
            ? "Este documento ya fue indexado."
            : requestError instanceof Error
            ? requestError.message
            : "No se pudo subir el documento.";
        await refreshDocuments();
        setDocumentError(message);
        throw requestError;
      } finally {
        setIsUploadingDocument(false);
      }
    },
    [refreshDocuments],
  );

  const deleteDocument = useCallback(async (id: string) => {
    setDocumentError(null);
    try {
      await api.deleteDocument(id);
      setDocuments((current) =>
        current.filter((document) => document.id !== id),
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "No se pudo eliminar el documento. Inténtalo nuevamente.";
      setDocumentError(message);
      throw requestError;
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const numericId = Number(id);

    setActiveConversationId(id);
    conversationId.current = numericId;
    setIsLoading(true);
    setError(null);

    try {
      const history = await api.messages(numericId, controller.signal);
      setMessages(history.map(toThreadMessage));
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar la conversación.",
      );
      setMessages([]);
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setIsLoading(false);
      }
    }
  }, []);

  const startNewConversation = useCallback(() => {
    requestController.current?.abort();
    requestController.current = null;
    conversationId.current = null;
    setActiveConversationId(undefined);
    setMessages([]);
    setIsLoading(false);
    setIsRunning(false);
    setError(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: number) => {
      setError(null);
      try {
        await api.deleteConversation(id);
        setConversations((current) =>
          current.filter((conversation) => conversation.id !== id),
        );

        if (activeConversationId === String(id)) {
          requestController.current?.abort();
          requestController.current = null;
          conversationId.current = null;
          setActiveConversationId(undefined);
          setMessages([]);
          setIsLoading(false);
          setIsRunning(false);
        }

        await refreshConversations();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo eliminar la conversación.",
        );
        throw requestError;
      }
    },
    [activeConversationId, refreshConversations],
  );

  useEffect(() => {
    const controller = new AbortController();

    api.health(controller.signal).then(
      (health) => setBackendStatus(health.status === "ok" ? "healthy" : "unavailable"),
      () => setBackendStatus("unavailable"),
    );
    api.conversations(controller.signal).then(
      setConversations,
      (requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar las conversaciones.",
        );
      },
    ).finally(() => setIsLoadingConversations(false));
    api.documents(controller.signal).then(
      setDocuments,
      (requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setDocumentError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar los documentos.",
        );
      },
    ).finally(() => setIsLoadingDocuments(false));

    return () => controller.abort();
  }, [refreshConversations]);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const question = getText(message);
      if (!question) throw new Error("Escribe una pregunta antes de enviarla.");

      const controller = new AbortController();
      requestController.current?.abort();
      requestController.current = controller;
      setError(null);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: message.content,
          createdAt: new Date(),
        },
      ]);
      setIsRunning(true);

      try {
        const response = await api.chat(
          question,
          conversationId.current,
          controller.signal,
        );
        conversationId.current = response.conversation_id;
        setMessages((current) => [
          ...current,
          {
            id: `assistant-${response.conversation_id}-${Date.now()}`,
            role: "assistant",
            content: [
              {
                type: "text",
                text: response.answer,
              },
              ...response.sources.map(toSourcePart),
            ],
            createdAt: new Date(),
          },
        ]);
        await refreshConversations();
        setActiveConversationId(String(response.conversation_id));
        setBackendStatus("healthy");
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        const messageText =
          requestError instanceof Error
            ? requestError.message
            : "No se pudo obtener una respuesta.";
        setError(messageText);
        throw requestError;
      } finally {
        if (requestController.current === controller) {
          requestController.current = null;
          setIsRunning(false);
        }
      }
    },
    [refreshConversations],
  );

  const threadList = useMemo<ExternalStoreThreadListAdapter>(
    () => ({
      threadId: activeConversationId,
      isLoading: isLoadingConversations,
      threads: conversations.map((conversation) => ({
        status: "regular" as const,
        id: String(conversation.id),
        remoteId: String(conversation.id),
        title: conversation.title ?? `Conversación ${conversation.id}`,
        custom: { createdAt: conversation.created_at },
      })),
      archivedThreads: [],
      onSwitchToNewThread: startNewConversation,
      onSwitchToThread: loadConversation,
    }),
    [
      activeConversationId,
      conversations,
      isLoadingConversations,
      loadConversation,
      startNewConversation,
    ],
  );

  const runtime = useExternalStoreRuntime({
    messages,
    suggestions: STARTER_SUGGESTIONS,
    convertMessage: (message) => message,
    isLoading,
    isRunning,
    onNew,
    onCancel: async () => requestController.current?.abort(),
    onRefetchThread: async () => {
      if (activeConversationId) await loadConversation(activeConversationId);
    },
    adapters: { threadList },
  });

  const contextValue = useMemo(
    () => ({
      backendStatus,
      conversations,
      documents,
      activeConversationId,
      isLoadingConversations,
      isLoadingDocuments,
      isUploadingDocument,
      error,
      documentError,
      refreshConversations,
      refreshDocuments,
      loadConversation,
      startNewConversation,
      renameConversation,
      deleteConversation,
      uploadDocument,
      deleteDocument,
    }),
    [
      activeConversationId,
      backendStatus,
      conversations,
      documents,
      documentError,
      error,
      isLoadingConversations,
      isLoadingDocuments,
      isUploadingDocument,
      loadConversation,
      deleteConversation,
      deleteDocument,
      refreshDocuments,
      refreshConversations,
      renameConversation,
      startNewConversation,
      uploadDocument,
    ],
  );

  return (
    <EnterpriseRuntimeContext.Provider value={contextValue}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </EnterpriseRuntimeContext.Provider>
  );
}
