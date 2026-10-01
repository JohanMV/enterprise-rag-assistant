import { Thread } from "@/components/thread.aui";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MyRuntimeProvider } from "@/MyRuntimeProvider";
import { useEnterpriseRuntime } from "@/enterprise-runtime-context";
import type { ConversationResponse, DocumentResponse } from "@/lib/api";
import {
  BookOpenIcon,
  CheckCircle2Icon,
  FileTextIcon,
  LoaderCircleIcon,
  MenuIcon,
  MessageSquareTextIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";

const conversationLabel = (conversation: ConversationResponse) =>
  conversation.title ?? `Conversación ${conversation.id}`;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));

function ConversationItem({
  conversation,
  active,
  onOpen,
  onRename,
  onDelete,
}: {
  conversation: ConversationResponse;
  active: boolean;
  onOpen: () => void;
  onRename: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(conversationLabel(conversation));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return;
    await onRename(nextTitle);
    setEditing(false);
  };

  const remove = async () => {
    const confirmed = window.confirm(
      `¿Eliminar “${conversationLabel(conversation)}”? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await onDelete();
    } catch {
      // The provider displays the API error in the application banner.
    } finally {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={submit} className="px-1 py-1">
        <input
          autoFocus
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
          }}
          aria-label={`Renombrar conversación ${conversation.id}`}
          className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
        />
      </form>
    );
  }

  return (
    <div
      className="group flex min-h-11 items-center rounded-lg border border-transparent px-1 transition-colors hover:bg-neutral-100 aria-[current=page]:border-neutral-200 aria-[current=page]:bg-white aria-[current=page]:shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      aria-current={active ? "page" : undefined}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm text-neutral-700 group-aria-[current=page]:font-medium group-aria-[current=page]:text-neutral-950 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
      >
        {conversationLabel(conversation)}
      </button>
      <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={() => {
            setTitle(conversationLabel(conversation));
            setEditing(true);
          }}
          aria-label={`Renombrar ${conversationLabel(conversation)}`}
          className="grid size-8 place-items-center rounded-md text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        >
          <PencilIcon className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => void remove()}
          aria-label={`Eliminar ${conversationLabel(conversation)}`}
          className="grid size-8 place-items-center rounded-md text-neutral-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" />
          ) : (
            <Trash2Icon className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

const statusLabel: Record<DocumentResponse["status"], string> = {
  processing: "Procesando",
  indexed: "Indexado",
  failed: "Falló",
};

const statusTone: Record<DocumentResponse["status"], string> = {
  processing: "bg-amber-400",
  indexed: "bg-emerald-500",
  failed: "bg-red-500",
};

function KnowledgePanel() {
  const {
    documents,
    isLoadingDocuments,
    isUploadingDocument,
    documentError,
    uploadDocument,
  } = useEnterpriseRuntime();
  const [notice, setNotice] = useState<string | null>(null);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setNotice(null);
    try {
      await uploadDocument(file);
      setNotice(`${file.name} se indexó correctamente.`);
    } catch {
      // The provider exposes the server error below the upload control.
    }
  };

  return (
    <section
      className="border-t border-neutral-200 bg-neutral-100/60 px-4 py-4"
      aria-labelledby="knowledge-title"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpenIcon className="size-4 text-neutral-500" aria-hidden />
            <h2 id="knowledge-title" className="text-sm font-semibold text-neutral-900">
              Conocimiento
            </h2>
          </div>
          <p className="mt-1 pl-6 text-xs text-neutral-500">
            {documents.length} {documents.length === 1 ? "documento" : "documentos"}
          </p>
        </div>
        <label className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50 focus-within:ring-2 focus-within:ring-neutral-400 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          {isUploadingDocument ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" />
          ) : (
            <UploadIcon className="size-3.5" />
          )}
          {isUploadingDocument ? "Indexando" : "Subir PDF"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={isUploadingDocument}
            onChange={(event) => void handleUpload(event)}
            className="sr-only"
          />
        </label>
      </div>

      {documentError && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {documentError}
        </p>
      )}
      {notice && !documentError && (
        <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {notice}
        </p>
      )}

      {isLoadingDocuments ? (
        <div className="flex items-center gap-2 py-3 text-xs text-neutral-500">
          <LoaderCircleIcon className="size-3.5 animate-spin" />
          Cargando documentos…
        </div>
      ) : documents.length === 0 ? (
        <p className="py-3 text-xs leading-relaxed text-neutral-500">
          Sube un PDF para habilitar respuestas con fuentes internas.
        </p>
      ) : (
        <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto pr-1">
          {documents.map((document) => (
            <li
              key={document.id}
              title={document.error_message ?? undefined}
              className="flex items-start gap-2.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-white"
            >
              <FileTextIcon className="mt-0.5 size-4 shrink-0 text-neutral-500" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-neutral-800">
                  {document.original_filename}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <span className={`size-1.5 rounded-full ${statusTone[document.status]}`} />
                  {statusLabel[document.status]}
                  {document.status === "indexed" && ` · ${document.chunk_count} fragmentos`}
                  <span aria-hidden>·</span>
                  {formatDate(document.created_at)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AssistantApp() {
  const {
    backendStatus,
    conversations,
    activeConversationId,
    isLoadingConversations,
    error,
    loadConversation,
    startNewConversation,
    renameConversation,
    deleteConversation,
  } = useEnterpriseRuntime();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeConversation = conversations.find(
    (conversation) => String(conversation.id) === activeConversationId,
  );

  const openConversation = async (id: string) => {
    setSidebarOpen(false);
    await loadConversation(id);
  };

  const createConversation = () => {
    setSidebarOpen(false);
    startNewConversation();
  };

  return (
    <main className="relative flex h-dvh overflow-hidden bg-white text-neutral-950">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-neutral-950/20 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[18rem] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navegación principal"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-neutral-900 text-xs font-semibold tracking-tight text-white">
              EA
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-950">Enterprise RAG</p>
              <p className="text-xs text-neutral-500">Workspace interno</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar navegación"
            className="grid size-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 lg:hidden"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <button
            type="button"
            onClick={createConversation}
            className="mb-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            <PlusIcon className="size-4" />
            Nueva conversación
          </button>

          <div className="mb-2 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
              <MessageSquareTextIcon className="size-3.5" aria-hidden />
              Historial
            </div>
            <span className="tabular-nums text-xs text-neutral-400">{conversations.length}</span>
          </div>

          {isLoadingConversations ? (
            <div className="flex items-center gap-2 px-2 py-4 text-sm text-neutral-500">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Cargando conversaciones…
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-4 text-sm leading-relaxed text-neutral-500">
              Tus conversaciones aparecerán aquí.
            </p>
          ) : (
            <nav aria-label="Conversaciones" className="flex flex-col gap-1">
              {conversations.map((conversation) => {
                const id = String(conversation.id);
                return (
                  <ConversationItem
                    key={id}
                    conversation={conversation}
                    active={activeConversationId === id}
                    onOpen={() => void openConversation(id)}
                    onRename={(title) => renameConversation(conversation.id, title)}
                    onDelete={() => deleteConversation(conversation.id)}
                  />
                );
              })}
            </nav>
          )}
        </div>

        <KnowledgePanel />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir navegación"
              className="grid size-10 shrink-0 place-items-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 lg:hidden"
            >
              <MenuIcon className="size-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-neutral-950 sm:text-base">
                {activeConversation ? conversationLabel(activeConversation) : "Enterprise RAG Assistant"}
              </h1>
              <p className="hidden text-xs text-neutral-500 sm:block">
                Consulta segura sobre conocimiento interno
              </p>
            </div>
          </div>

          <div
            className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-600"
            role="status"
            aria-live="polite"
          >
            {backendStatus === "checking" ? (
              <LoaderCircleIcon className="size-3.5 animate-spin text-amber-600" />
            ) : backendStatus === "healthy" ? (
              <CheckCircle2Icon className="size-3.5 text-emerald-600" />
            ) : (
              <span className="size-2 rounded-full bg-red-500" />
            )}
            <span className="hidden sm:inline">
              {backendStatus === "healthy"
                ? "API disponible"
                : backendStatus === "checking"
                  ? "Comprobando API"
                  : "API no disponible"}
            </span>
            <span className="sm:hidden">
              {backendStatus === "healthy"
                ? "Online"
                : backendStatus === "checking"
                  ? "Revisando"
                  : "Offline"}
            </span>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-800 sm:px-6"
          >
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
