import { Thread } from "@/components/thread.aui";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlusIcon } from "lucide-react";
import {
  MyRuntimeProvider,
} from "@/MyRuntimeProvider";
import { useEnterpriseRuntime } from "@/enterprise-runtime-context";

function AssistantApp() {
  const {
    backendStatus,
    conversations,
    activeConversationId,
    isLoadingConversations,
    error,
    loadConversation,
    startNewConversation,
  } = useEnterpriseRuntime();

  return (
    <main className="flex h-dvh bg-background text-foreground">
      <aside className="w-64 shrink-0 overflow-y-auto border-r bg-muted/20 p-3">
        <div className="px-2.5 pb-3 pt-1 text-sm font-semibold">
          Conversaciones
        </div>
        <button
          type="button"
          onClick={startNewConversation}
          className="mb-2 flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlusIcon className="size-4" />
          Nueva conversación
        </button>

        {isLoadingConversations ? (
          <p className="px-2.5 py-3 text-sm text-muted-foreground">
            Cargando conversaciones…
          </p>
        ) : (
          <nav aria-label="Conversaciones" className="flex flex-col gap-0.5">
            {conversations.map((conversation) => {
              const id = String(conversation.id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => void loadConversation(id)}
                  aria-current={activeConversationId === id ? "page" : undefined}
                  className="h-9 truncate rounded-md px-2.5 text-left text-sm hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Conversación {conversation.id}
                </button>
              );
            })}
          </nav>
        )}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-4 text-sm">
          <span className="font-medium">Enterprise RAG Assistant</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span
              className={`size-2 rounded-full ${
                backendStatus === "healthy"
                  ? "bg-emerald-500"
                  : backendStatus === "checking"
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
            />
            {backendStatus === "healthy"
              ? "API disponible"
              : backendStatus === "checking"
                ? "Comprobando API"
                : "API no disponible"}
          </span>
        </header>

        {error && (
          <div role="alert" className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1">
          <Thread />
        </div>
      </section>
    </main>
  );
}

function App() {
  return (
    <TooltipProvider>
      <MyRuntimeProvider>
        <AssistantApp />
      </MyRuntimeProvider>
    </TooltipProvider>
  );
}

export default App;
