import { Thread } from "@/components/thread.aui";
import { Menu } from "@base-ui/react/menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MyRuntimeProvider } from "@/MyRuntimeProvider";
import { useEnterpriseRuntime } from "@/enterprise-runtime-context";
import { api, type ConversationResponse, type DocumentResponse } from "@/lib/api";
import {
  BookOpenIcon,
  CheckCircle2Icon,
  EyeIcon,
  FileTextIcon,
  LoaderCircleIcon,
  MenuIcon,
  MessageSquareTextIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

const conversationLabel = (conversation: ConversationResponse) =>
  conversation.title ?? `Conversación ${conversation.id}`;

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-PE");

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));

const formatFullDate = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
          className="grid size-8 place-items-center rounded-md text-neutral-500 transition hover:bg-neutral-200 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
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
  failed: "Error",
};

const statusTone: Record<DocumentResponse["status"], string> = {
  processing: "bg-amber-400",
  indexed: "bg-emerald-500",
  failed: "bg-red-500",
};

function KnowledgePanel({ onClose }: { onClose?: () => void }) {
  const {
    documents,
    isLoadingDocuments,
    isUploadingDocument,
    documentError,
    uploadDocument,
    deleteDocument,
  } = useEnterpriseRuntime();
  const [notice, setNotice] = useState<string | null>(null);
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentResponse | null>(null);
  const [isLoadingDocumentDetails, setIsLoadingDocumentDetails] = useState(false);
  const [documentDetailsError, setDocumentDetailsError] = useState<string | null>(null);
  const documentDetailsRequestId = useRef(0);
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentResponse | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const visibleDocuments = useMemo(() => {
    const query = normalizeSearchText(documentSearch.trim());
    if (!query) return documents;

    return documents.filter((document) =>
      normalizeSearchText(document.original_filename).includes(query),
    );
  }, [documentSearch, documents]);

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

  const handleDelete = async () => {
    if (!documentToDelete || deletingDocumentId) return;

    setNotice(null);
    setDeleteError(null);
    setDeletingDocumentId(documentToDelete.id);
    try {
      await deleteDocument(documentToDelete.id);
      setNotice(`${documentToDelete.original_filename} se eliminó correctamente.`);
      if (selectedDocument?.id === documentToDelete.id) {
        setSelectedDocument(null);
      }
      setDocumentToDelete(null);
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo eliminar el documento. Inténtalo nuevamente.",
      );
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const openDocumentDetails = async (document: DocumentResponse) => {
    const requestId = ++documentDetailsRequestId.current;
    setSelectedDocument(document);
    setDocumentDetailsError(null);
    setIsLoadingDocumentDetails(true);

    try {
      const details = await api.document(document.id);
      if (documentDetailsRequestId.current === requestId) {
        setSelectedDocument(details);
      }
    } catch (requestError) {
      if (documentDetailsRequestId.current === requestId) {
        setDocumentDetailsError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron actualizar los detalles del documento.",
        );
      }
    } finally {
      if (documentDetailsRequestId.current === requestId) {
        setIsLoadingDocumentDetails(false);
      }
    }
  };

  const requestDocumentDeletion = (document: DocumentResponse) => {
    documentDetailsRequestId.current += 1;
    setSelectedDocument(null);
    setIsLoadingDocumentDetails(false);
    setDocumentDetailsError(null);
    setDeleteError(null);
    setDocumentToDelete(document);
  };

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-neutral-50 px-4 py-4"
      aria-labelledby="knowledge-title"
    >
      <div className="shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="size-4 text-neutral-500" aria-hidden />
              <h2 id="knowledge-title" className="text-sm font-semibold text-neutral-900">
                Base de conocimientos
              </h2>
            </div>
            <p className="mt-1 pl-6 text-xs text-neutral-500">
              {documents.length} {documents.length === 1 ? "documento" : "documentos"}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar base de conocimientos"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 xl:hidden"
            >
              <XIcon className="size-4" aria-hidden />
            </button>
          )}
        </div>

        <label className="mt-4 flex min-h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-100 focus-within:ring-2 focus-within:ring-neutral-400 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          {isUploadingDocument ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <PlusIcon className="size-3.5" aria-hidden />
          )}
          {isUploadingDocument ? "Indexando" : "Añadir documento"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={isUploadingDocument}
            onChange={(event) => void handleUpload(event)}
            className="sr-only"
          />
        </label>

        <div className="relative mt-3">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500"
            aria-hidden
          />
          <input
            type="search"
            value={documentSearch}
            onChange={(event) => setDocumentSearch(event.target.value)}
            placeholder="Buscar documentos..."
            aria-label="Buscar documentos"
            className="min-h-9 w-full appearance-none rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-9 text-xs text-neutral-900 outline-none transition placeholder:text-neutral-500 hover:border-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-300 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {documentSearch && (
            <button
              type="button"
              onClick={() => setDocumentSearch("")}
              aria-label="Limpiar búsqueda de documentos"
              title="Limpiar búsqueda"
              className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
            >
              <XIcon className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-neutral-200 pt-3">
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
            Añade un PDF para habilitar respuestas con fuentes internas.
          </p>
        ) : visibleDocuments.length === 0 ? (
          <p className="py-3 text-xs leading-relaxed text-neutral-500">
            No se encontraron documentos.
          </p>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {visibleDocuments.map((document) => (
              <li
                key={document.id}
                title={document.error_message ?? undefined}
                className="group flex items-start gap-1 rounded-lg px-1 py-1 transition-colors hover:bg-white focus-within:bg-white"
              >
                <button
                  type="button"
                  onClick={() => void openDocumentDetails(document)}
                  className="flex min-w-0 flex-1 items-start gap-2.5 rounded-md px-1 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                >
                  <FileTextIcon className="mt-0.5 size-4 shrink-0 text-neutral-500" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-2 break-words text-xs font-medium leading-4 text-neutral-800">
                      {document.original_filename}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-neutral-500">
                      <span
                        className={`size-1.5 rounded-full ${statusTone[document.status]}`}
                        aria-hidden
                      />
                      {statusLabel[document.status]}
                      {document.status === "indexed" && ` · ${document.chunk_count} fragmentos`}
                      <span aria-hidden>·</span>
                      {formatDate(document.created_at)}
                    </span>
                  </span>
                </button>

                <Menu.Root>
                  <Menu.Trigger
                    aria-label={`Acciones para ${document.original_filename}`}
                    className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 data-pressed:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                  >
                    <MoreHorizontalIcon className="size-4" aria-hidden />
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner className="z-50 outline-none" sideOffset={6} align="end">
                      <Menu.Popup className="w-44 origin-[var(--transform-origin)] rounded-lg border border-neutral-200 bg-white p-1.5 text-xs text-neutral-700 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.28)] outline-none transition data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
                        <Menu.Item
                          onClick={() => void openDocumentDetails(document)}
                          className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 outline-none select-none data-highlighted:bg-neutral-100 data-highlighted:text-neutral-950"
                        >
                          <EyeIcon className="size-3.5" aria-hidden />
                          Ver detalles
                        </Menu.Item>
                        <Menu.Separator className="my-1 h-px bg-neutral-200" />
                        <Menu.Item
                          onClick={() => requestDocumentDeletion(document)}
                          className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-red-700 outline-none select-none data-highlighted:bg-red-50"
                        >
                          <Trash2Icon className="size-3.5" aria-hidden />
                          Eliminar documento
                        </Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={selectedDocument !== null}
        onOpenChange={(open) => {
          if (!open) {
            documentDetailsRequestId.current += 1;
            setSelectedDocument(null);
            setIsLoadingDocumentDetails(false);
            setDocumentDetailsError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles del documento</DialogTitle>
            <DialogDescription className="break-words pr-6 text-neutral-700">
              {selectedDocument?.original_filename}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDocumentDetails && (
            <div className="flex items-center gap-2 text-xs text-neutral-500" role="status">
              <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
              Actualizando detalles…
            </div>
          )}
          {documentDetailsError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {documentDetailsError}
            </p>
          )}

          {selectedDocument && (
            <dl className="divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                <dt className="text-xs text-neutral-500">Estado</dt>
                <dd className="flex items-center gap-2 text-xs font-medium text-neutral-800">
                  <span
                    className={`size-1.5 rounded-full ${statusTone[selectedDocument.status]}`}
                    aria-hidden
                  />
                  {statusLabel[selectedDocument.status]}
                </dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                <dt className="text-xs text-neutral-500">Tipo</dt>
                <dd className="break-words text-xs text-neutral-800">
                  {selectedDocument.file_type}
                </dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                <dt className="text-xs text-neutral-500">Fragmentos</dt>
                <dd className="text-xs tabular-nums text-neutral-800">
                  {selectedDocument.chunk_count}
                </dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                <dt className="text-xs text-neutral-500">Fecha de carga</dt>
                <dd className="text-xs text-neutral-800">
                  {formatFullDate(selectedDocument.created_at)}
                </dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
                <dt className="text-xs text-neutral-500">ID</dt>
                <dd className="break-all text-xs text-neutral-800">
                  {selectedDocument.id}
                </dd>
              </div>
            </dl>
          )}

          {selectedDocument && (
            <DialogFooter className="border-t-0 bg-transparent pt-0">
              <Button
                type="button"
                variant="destructive"
                onClick={() => requestDocumentDeletion(selectedDocument)}
              >
                <Trash2Icon className="size-4" aria-hidden />
                Eliminar documento
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={documentToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingDocumentId) {
            setDocumentToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent showCloseButton={!deletingDocumentId}>
          <DialogHeader>
            <DialogTitle>Eliminar documento</DialogTitle>
            <DialogDescription>
              {documentToDelete
                ? `Se eliminará “${documentToDelete.original_filename}” de la base de conocimiento. Esta acción no se puede deshacer.`
                : "Esta acción no se puede deshacer."}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {deleteError} Puedes intentarlo nuevamente.
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(deletingDocumentId)}
              onClick={() => setDocumentToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(deletingDocumentId)}
              onClick={() => void handleDelete()}
            >
              {deletingDocumentId ? (
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2Icon className="size-4" aria-hidden />
              )}
              {deletingDocumentId ? "Eliminando…" : "Eliminar documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const activeConversation = conversations.find(
    (conversation) => String(conversation.id) === activeConversationId,
  );
  const visibleConversations = useMemo(() => {
    const query = normalizeSearchText(conversationSearch.trim());
    if (!query) return conversations;

    return conversations.filter((conversation) =>
      normalizeSearchText(conversationLabel(conversation)).includes(query),
    );
  }, [conversationSearch, conversations]);

  const openConversation = async (id: string) => {
    setSidebarOpen(false);
    setKnowledgeOpen(false);
    await loadConversation(id);
  };

  const createConversation = () => {
    setSidebarOpen(false);
    setKnowledgeOpen(false);
    startNewConversation();
  };

  return (
    <main className="relative flex h-dvh overflow-hidden bg-white text-neutral-950">
      {(sidebarOpen || knowledgeOpen) && (
        <button
          type="button"
          aria-label="Cerrar panel"
          onClick={() => {
            setSidebarOpen(false);
            setKnowledgeOpen(false);
          }}
          className={`fixed inset-0 z-20 bg-neutral-950/20 backdrop-blur-[1px] ${
            sidebarOpen ? "lg:hidden" : "xl:hidden"
          }`}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[17rem] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
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
            className="mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            <PlusIcon className="size-4" />
            Nueva conversación
          </button>

          <div className="relative mb-5">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500"
              aria-hidden
            />
            <input
              type="search"
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder="Buscar conversaciones..."
              aria-label="Buscar conversaciones"
              className="min-h-9 w-full appearance-none rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-9 text-xs text-neutral-900 outline-none transition placeholder:text-neutral-500 hover:border-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-300 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {conversationSearch && (
              <button
                type="button"
                onClick={() => setConversationSearch("")}
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
                className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          <div className="mb-2 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
              <MessageSquareTextIcon className="size-3.5" aria-hidden />
              Historial
            </div>
            <span className="tabular-nums text-xs text-neutral-400">
              {visibleConversations.length}
            </span>
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
          ) : visibleConversations.length === 0 ? (
            <p className="px-2 py-4 text-sm leading-relaxed text-neutral-500">
              No se encontraron conversaciones.
            </p>
          ) : (
            <nav aria-label="Conversaciones" className="flex flex-col gap-1">
              {visibleConversations.map((conversation) => {
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

      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setKnowledgeOpen(false);
                setSidebarOpen(true);
              }}
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

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                setKnowledgeOpen(true);
              }}
              aria-label="Abrir conocimiento"
              aria-expanded={knowledgeOpen}
              className="flex min-h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 xl:hidden"
            >
              <BookOpenIcon className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Conocimiento</span>
            </button>

            <div
              className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-600"
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

      <aside
        className={`fixed inset-y-0 right-0 z-30 w-[20rem] shrink-0 border-l border-neutral-200 bg-neutral-50 transition-transform duration-200 ease-out xl:static xl:translate-x-0 ${
          knowledgeOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Base de conocimientos"
      >
        <KnowledgePanel onClose={() => setKnowledgeOpen(false)} />
      </aside>
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
