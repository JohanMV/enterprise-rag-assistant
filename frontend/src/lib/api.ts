export type HealthResponse = {
  status: string;
  service: string;
};

export type Source = {
  document: string;
  page: number;
  excerpt: string;
  document_id: string | null;
  score: number | null;
};

export type ChatResponse = {
  conversation_id: number;
  answer: string;
  sources: Source[];
};

export type ConversationResponse = {
  id: number;
  title: string | null;
  created_at: string;
};

export type DocumentResponse = {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  status: "processing" | "indexed" | "failed";
  chunk_count: number;
  error_message: string | null;
  created_at: string;
};

export type MessageResponse = {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  sources: Source[] | null;
  created_at: string;
};

export const API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    const body = await response.text();
    let detail = body;

    try {
      const parsed = JSON.parse(body) as { detail?: string };
      detail = parsed.detail ?? body;
    } catch {
      // Keep the plain-text response when it is not JSON.
    }

    throw new ApiError(
      detail || `La API respondió con ${response.status}.`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
};

export const api = {
  health: (signal?: AbortSignal) =>
    request<HealthResponse>("/health", { signal }),

  conversations: (signal?: AbortSignal) =>
    request<ConversationResponse[]>("/conversations", { signal }),

  messages: (conversationId: number, signal?: AbortSignal) =>
    request<MessageResponse[]>(
      `/conversations/${conversationId}/messages`,
      { signal },
    ),

  renameConversation: (conversationId: number, title: string) =>
    request<ConversationResponse>(`/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),

  deleteConversation: (conversationId: number) =>
    request<void>(`/conversations/${conversationId}`, {
      method: "DELETE",
    }),

  documents: (signal?: AbortSignal) =>
    request<DocumentResponse[]>("/documents", { signal }),

  document: (documentId: string, signal?: AbortSignal) =>
    request<DocumentResponse>(`/documents/${encodeURIComponent(documentId)}`, { signal }),

  deleteDocument: (documentId: string) =>
    request<void>(`/documents/${encodeURIComponent(documentId)}`, {
      method: "DELETE",
    }),

  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return request<DocumentResponse>("/documents", {
      method: "POST",
      body: formData,
    });
  },

  chat: (
    question: string,
    conversationId: number | null,
    signal?: AbortSignal,
  ) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        conversation_id: conversationId,
      }),
      signal,
    }),
};
