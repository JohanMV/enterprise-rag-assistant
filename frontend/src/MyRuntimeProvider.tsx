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
  type ConversationResponse,
  type MessageResponse,
  type Source,
} from "@/lib/api";
import {
  EnterpriseRuntimeContext,
  type BackendStatus,
} from "@/enterprise-runtime-context";

const formatSources = (sources: Source[]) => {
  if (sources.length === 0) return "";

  const items = sources.map(
    ({ document, page }, index) =>
      `${index + 1}. **${document}** — página ${page}`,
  );

  return `\n\n---\n**Fuentes**\n\n${items.join("\n")}`;
};

const toThreadMessage = (message: MessageResponse): ThreadMessageLike => ({
  id: String(message.id),
  role:
    message.role === "user"
      ? "user"
      : message.role === "system"
        ? "system"
        : "assistant",
  content: [{ type: "text", text: message.content }],
  createdAt: new Date(message.created_at),
});

const getText = (message: AppendMessage) =>
  message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

export function MyRuntimeProvider({ children }: { children: ReactNode }) {
  const [backendStatus, setBackendStatus] =
    useState<BackendStatus>("checking");
  const [conversations, setConversations] = useState<ConversationResponse[]>(
    [],
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >();
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
                text: `${response.answer}${formatSources(response.sources)}`,
              },
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
        title: `Conversación ${conversation.id}`,
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
      activeConversationId,
      isLoadingConversations,
      error,
      refreshConversations,
      loadConversation,
      startNewConversation,
    }),
    [
      activeConversationId,
      backendStatus,
      conversations,
      error,
      isLoadingConversations,
      loadConversation,
      refreshConversations,
      startNewConversation,
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
