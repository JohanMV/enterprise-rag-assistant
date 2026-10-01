import { createContext, useContext } from "react";
import type { ConversationResponse, DocumentResponse } from "@/lib/api";

export type BackendStatus = "checking" | "healthy" | "unavailable";

export type EnterpriseRuntimeState = {
  backendStatus: BackendStatus;
  conversations: ConversationResponse[];
  documents: DocumentResponse[];
  activeConversationId: string | undefined;
  isLoadingConversations: boolean;
  isLoadingDocuments: boolean;
  isUploadingDocument: boolean;
  error: string | null;
  documentError: string | null;
  refreshConversations: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
  renameConversation: (id: number, title: string) => Promise<void>;
  deleteConversation: (id: number) => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
};

export const EnterpriseRuntimeContext =
  createContext<EnterpriseRuntimeState | null>(null);

export function useEnterpriseRuntime() {
  const context = useContext(EnterpriseRuntimeContext);
  if (!context) {
    throw new Error("useEnterpriseRuntime debe usarse dentro de MyRuntimeProvider.");
  }
  return context;
}
