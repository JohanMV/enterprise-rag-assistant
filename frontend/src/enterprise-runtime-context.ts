import { createContext, useContext } from "react";
import type { ConversationResponse } from "@/lib/api";

export type BackendStatus = "checking" | "healthy" | "unavailable";

export type EnterpriseRuntimeState = {
  backendStatus: BackendStatus;
  conversations: ConversationResponse[];
  activeConversationId: string | undefined;
  isLoadingConversations: boolean;
  error: string | null;
  refreshConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
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
