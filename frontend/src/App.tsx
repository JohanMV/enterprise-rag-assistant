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
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

const KNOWLEDGE_PANEL_STORAGE_KEY = "enterprise-rag:knowledge-panel-visible";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [title, setTitle] = useState(conversationLabel(conversation));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return;
    await onRename(nextTitle);
    setEditing(false);
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setDeleteDialogOpen(false);
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
    <>
      <div
        className="group relative flex min-h-11 items-center rounded-lg border border-transparent transition-colors hover:bg-neutral-100 aria-[current=page]:border-neutral-200 aria-[current=page]:bg-white aria-[current=page]:shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        aria-current={active ? "page" : undefined}
      >
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 truncate rounded-md px-3 py-2 text-left text-sm text-neutral-700 group-aria-[current=page]:font-medium group-aria-[current=page]:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        >
          {conversationLabel(conversation)}
        </button>
        <Menu.Root>
          <Menu.Trigger
            disabled={deleting}
            aria-label={`Acciones para ${conversationLabel(conversation)}`}
            className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md bg-neutral-100 text-neutral-500 opacity-0 transition-[opacity,background-color,color] duration-150 hover:bg-neutral-200 hover:text-neutral-900 group-hover:opacity-100 group-focus-within:opacity-100 data-popup-open:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-100"
          >
            {deleting ? (
              <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <MoreHorizontalIcon className="size-4" aria-hidden />
            )}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner className="z-50 outline-none" sideOffset={6} align="end">
              <Menu.Popup className="w-48 origin-[var(--transform-origin)] rounded-lg border border-neutral-200 bg-white p-1.5 text-xs text-neutral-700 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.28)] outline-none transition duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
                <Menu.Item
                  onClick={() => {
                    setTitle(conversationLabel(conversation));
                    setEditing(true);
                  }}
                  className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 outline-none select-none data-highlighted:bg-neutral-100 data-highlighted:text-neutral-950"
                >
                  <PencilIcon className="size-3.5" aria-hidden />
                  Renombrar
                </Menu.Item>
                <Menu.Separator className="my-1 h-px bg-neutral-200" />
                <Menu.Item
                  onClick={() => setDeleteDialogOpen(true)}
                  className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-red-700 outline-none select-none data-highlighted:bg-red-50"
                >
                  <Trash2Icon className="size-3.5" aria-hidden />
                  Eliminar conversación
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteDialogOpen(open);
        }}
      >
        <DialogContent showCloseButton={!deleting} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar conversación</DialogTitle>
            <DialogDescription>
              Se eliminará “{conversationLabel(conversation)}” junto con su historial. Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void remove()}
            >
              {deleting ? (
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2Icon className="size-4" aria-hidden />
              )}
              {deleting ? "Eliminando…" : "Eliminar conversación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

type DocumentStatusFilter = "all" | DocumentResponse["status"];

const documentStatusFilters: Array<{
  value: DocumentStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "indexed", label: "Indexados" },
  { value: "processing", label: "Procesando" },
  { value: "failed", label: "Error" },
];

const documentTypeLabel = (value: string) =>
  value === "application/pdf" ? "PDF" : value;

function IndeterminateProgress({ label }: { label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuetext="En progreso"
      className="h-1 overflow-hidden rounded-full bg-neutral-200"
    >
      <span className="knowledge-progress-indicator block h-full w-2/5 rounded-full bg-neutral-600" />
    </div>
  );
}

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
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [documentSearch, setDocumentSearch] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] =
    useState<DocumentStatusFilter>("all");
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
  const adminDocuments = useMemo(() => {
    const query = normalizeSearchText(adminSearch.trim());

    return documents.filter((document) => {
      const matchesName =
        !query || normalizeSearchText(document.original_filename).includes(query);
      const matchesStatus =
        adminStatusFilter === "all" || document.status === adminStatusFilter;

      return matchesName && matchesStatus;
    });
  }, [adminSearch, adminStatusFilter, documents]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setNotice(null);
    setUploadingFileName(file.name);
    try {
      await uploadDocument(file);
      setNotice(`${file.name} se indexó correctamente.`);
    } catch {
      // The provider exposes the server error below the upload control.
    } finally {
      setUploadingFileName(null);
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

        <div className="relative mt-4">
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

        {isUploadingDocument && uploadingFileName && (
          <div
            className="mt-3 rounded-lg border border-neutral-200 bg-white px-3 py-3"
            role="status"
            aria-live="polite"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <FileTextIcon className="mt-0.5 size-4 shrink-0 text-neutral-500" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-neutral-800">
                  {uploadingFileName}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-neutral-600">
                  Subiendo y procesando el documento…
                </p>
              </div>
            </div>
            <div className="mt-2.5">
              <IndeterminateProgress label={`Procesando ${uploadingFileName}`} />
            </div>
            <p className="mt-2 text-[11px] leading-4 text-neutral-500">
              Validando, extrayendo contenido, generando embeddings e indexando.
            </p>
          </div>
        )}
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
                      {document.status === "processing"
                        ? "Procesando e indexando…"
                        : statusLabel[document.status]}
                      {document.status === "indexed" && ` · ${document.chunk_count} fragmentos`}
                      <span aria-hidden>·</span>
                      {formatDate(document.created_at)}
                    </span>
                    {document.status === "processing" && (
                      <span className="mt-2 block">
                        <IndeterminateProgress
                          label={`Procesando ${document.original_filename}`}
                        />
                      </span>
                    )}
                    {document.status === "failed" && document.error_message && (
                      <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-red-700">
                        {document.error_message}
                      </span>
                    )}
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

      <div className="mt-3 shrink-0 border-t border-neutral-200 pt-3">
        <label className="flex min-h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:border-neutral-800 hover:bg-neutral-800 focus-within:ring-2 focus-within:ring-neutral-500 focus-within:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          {isUploadingDocument ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <PlusIcon className="size-3.5" aria-hidden />
          )}
          {isUploadingDocument ? "Procesando documento" : "Añadir documento"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={isUploadingDocument}
            onChange={(event) => void handleUpload(event)}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          className="mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition duration-150 hover:border-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        >
          <Settings2Icon className="size-3.5" aria-hidden />
          Administrar documentos
        </button>
      </div>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="flex h-[calc(100dvh-2rem)] max-h-[46rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <div className="flex shrink-0 flex-col gap-4 border-b border-neutral-200 px-4 py-4 pr-12 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5 sm:pr-14">
            <DialogHeader className="min-w-0 gap-1.5">
              <DialogTitle className="text-lg">Administrar documentos</DialogTitle>
              <DialogDescription>
                Consulta el estado y gestiona los documentos de la Base de conocimientos.
              </DialogDescription>
            </DialogHeader>
            <label className="flex min-h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition duration-150 hover:border-neutral-400 hover:bg-neutral-100 focus-within:ring-2 focus-within:ring-neutral-400 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
              {isUploadingDocument ? (
                <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <PlusIcon className="size-3.5" aria-hidden />
              )}
              {isUploadingDocument ? "Procesando documento" : "Añadir documento"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={isUploadingDocument}
                onChange={(event) => void handleUpload(event)}
                className="sr-only"
              />
            </label>
          </div>

          <div className="shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <SearchIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500"
                  aria-hidden
                />
                <input
                  type="search"
                  value={adminSearch}
                  onChange={(event) => setAdminSearch(event.target.value)}
                  placeholder="Buscar documentos por nombre..."
                  aria-label="Buscar documentos en el panel"
                  className="min-h-10 w-full appearance-none rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-9 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-500 hover:border-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-300 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {adminSearch && (
                  <button
                    type="button"
                    onClick={() => setAdminSearch("")}
                    aria-label="Limpiar búsqueda del panel"
                    className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                  >
                    <XIcon className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5" aria-label="Filtrar documentos por estado">
                {documentStatusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={adminStatusFilter === filter.value}
                    onClick={() => setAdminStatusFilter(filter.value)}
                    className="min-h-8 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 transition duration-150 hover:bg-neutral-100 hover:text-neutral-900 aria-pressed:border-neutral-900 aria-pressed:bg-neutral-900 aria-pressed:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {isUploadingDocument && uploadingFileName && (
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3" role="status">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-800">
                      {uploadingFileName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-600">
                      Validando, extrayendo contenido, generando embeddings e indexando.
                    </p>
                  </div>
                  <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-neutral-500" aria-hidden />
                </div>
                <div className="mt-2.5">
                  <IndeterminateProgress label={`Procesando ${uploadingFileName}`} />
                </div>
              </div>
            )}

            {documentError && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {documentError}
              </p>
            )}
            {notice && !documentError && (
              <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {notice}
              </p>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex shrink-0 items-center justify-between gap-4 py-3 text-xs text-neutral-500">
              <span>
                {adminDocuments.length === documents.length
                  ? `${documents.length} ${documents.length === 1 ? "documento" : "documentos"}`
                  : `Mostrando ${adminDocuments.length} de ${documents.length}`}
              </span>
              {(adminSearch || adminStatusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setAdminSearch("");
                    setAdminStatusFilter("all");
                  }}
                  className="font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-4 transition hover:text-neutral-950 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {isLoadingDocuments ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-500" role="status">
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
                Cargando documentos…
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
                <span className="grid size-11 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500">
                  <FileTextIcon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-neutral-900">Aún no hay documentos</h3>
                <p className="mt-1 max-w-sm text-sm leading-6 text-neutral-500">
                  Añade el primer PDF para comenzar a construir la Base de conocimientos.
                </p>
                <label className="mt-4 flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 focus-within:ring-2 focus-within:ring-neutral-500 focus-within:ring-offset-2">
                  <PlusIcon className="size-3.5" aria-hidden />
                  Añadir primer documento
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    disabled={isUploadingDocument}
                    onChange={(event) => void handleUpload(event)}
                    className="sr-only"
                  />
                </label>
              </div>
            ) : adminDocuments.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
                <SearchIcon className="size-5 text-neutral-400" aria-hidden />
                <h3 className="mt-3 text-sm font-semibold text-neutral-900">
                  No se encontraron documentos
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Prueba con otro nombre o cambia el filtro de estado.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAdminSearch("");
                    setAdminStatusFilter("all");
                  }}
                  className="mt-4 min-h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                >
                  Ver todos los documentos
                </button>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto border-y border-neutral-200">
                <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,2fr)_7rem_5rem_8rem_5rem_2rem] items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-neutral-500 md:grid">
                  <span>Documento</span>
                  <span>Estado</span>
                  <span>Fragmentos</span>
                  <span>Fecha de carga</span>
                  <span>Tipo</span>
                  <span className="sr-only">Acciones</span>
                </div>
                <ul className="divide-y divide-neutral-200">
                  {adminDocuments.map((document) => (
                    <li
                      key={document.id}
                      className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-3 px-2 py-3 transition-colors hover:bg-neutral-50 md:grid-cols-[minmax(0,2fr)_7rem_5rem_8rem_5rem_2rem] md:px-3"
                    >
                      <button
                        type="button"
                        onClick={() => void openDocumentDetails(document)}
                        title={document.original_filename}
                        className="flex min-w-0 items-center gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      >
                        <FileTextIcon className="size-4 shrink-0 text-neutral-500" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-neutral-800">
                            {document.original_filename}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-neutral-500 md:hidden">
                            <span className={`size-1.5 rounded-full ${statusTone[document.status]}`} aria-hidden />
                            {statusLabel[document.status]}
                            <span aria-hidden>·</span>
                            {document.chunk_count} fragmentos
                            <span aria-hidden>·</span>
                            {formatDate(document.created_at)}
                            <span aria-hidden>·</span>
                            {documentTypeLabel(document.file_type)}
                          </span>
                        </span>
                      </button>

                      <span className="hidden items-center gap-2 text-xs font-medium text-neutral-700 md:flex">
                        <span className={`size-1.5 rounded-full ${statusTone[document.status]}`} aria-hidden />
                        {statusLabel[document.status]}
                      </span>
                      <span className="hidden text-xs tabular-nums text-neutral-600 md:block">
                        {document.chunk_count}
                      </span>
                      <span className="hidden text-xs text-neutral-600 md:block">
                        {formatFullDate(document.created_at)}
                      </span>
                      <span className="hidden text-xs text-neutral-600 md:block">
                        {documentTypeLabel(document.file_type)}
                      </span>

                      <Menu.Root>
                        <Menu.Trigger
                          aria-label={`Acciones para ${document.original_filename}`}
                          className="grid size-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 data-pressed:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                        >
                          <MoreHorizontalIcon className="size-4" aria-hidden />
                        </Menu.Trigger>
                        <Menu.Portal>
                          <Menu.Positioner className="z-[70] outline-none" sideOffset={6} align="end">
                            <Menu.Popup className="w-44 origin-[var(--transform-origin)] rounded-lg border border-neutral-200 bg-white p-1.5 text-xs text-neutral-700 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.28)] outline-none transition duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
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
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
  const [isWideLayout, setIsWideLayout] = useState(() =>
    window.matchMedia("(min-width: 1280px)").matches,
  );
  const [knowledgePanelVisible, setKnowledgePanelVisible] = useState(() => {
    try {
      return localStorage.getItem(KNOWLEDGE_PANEL_STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  });
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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const handleLayoutChange = (event: MediaQueryListEvent) => {
      setIsWideLayout(event.matches);
      if (event.matches) setKnowledgeOpen(false);
    };

    mediaQuery.addEventListener("change", handleLayoutChange);
    return () => mediaQuery.removeEventListener("change", handleLayoutChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        KNOWLEDGE_PANEL_STORAGE_KEY,
        String(knowledgePanelVisible),
      );
    } catch {
      // The layout still works when browser storage is unavailable.
    }
  }, [knowledgePanelVisible]);

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

            <button
              type="button"
              onClick={() => setKnowledgePanelVisible((visible) => !visible)}
              aria-label={
                knowledgePanelVisible
                  ? "Ocultar Base de conocimientos"
                  : "Mostrar Base de conocimientos"
              }
              aria-controls="knowledge-panel"
              aria-expanded={knowledgePanelVisible}
              title={
                knowledgePanelVisible
                  ? "Ocultar Base de conocimientos"
                  : "Mostrar Base de conocimientos"
              }
              className="hidden size-9 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 transition duration-150 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 xl:grid"
            >
              {knowledgePanelVisible ? (
                <PanelRightCloseIcon className="size-4" aria-hidden />
              ) : (
                <PanelRightOpenIcon className="size-4" aria-hidden />
              )}
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
        id="knowledge-panel"
        className={`fixed inset-y-0 right-0 z-30 w-[20rem] shrink-0 overflow-hidden border-l bg-neutral-50 transition-[width,transform,opacity,border-color] duration-200 ease-out ${
          knowledgeOpen ? "translate-x-0" : "translate-x-full"
        } ${
          knowledgePanelVisible
            ? "xl:static xl:w-[20rem] xl:translate-x-0 xl:border-neutral-200 xl:opacity-100"
            : "xl:pointer-events-none xl:static xl:w-0 xl:translate-x-0 xl:border-transparent xl:opacity-0"
        }`}
        aria-label="Base de conocimientos"
        aria-hidden={isWideLayout ? !knowledgePanelVisible : !knowledgeOpen}
        inert={isWideLayout ? !knowledgePanelVisible : !knowledgeOpen}
      >
        <div className="h-full w-[20rem]">
          <KnowledgePanel onClose={() => setKnowledgeOpen(false)} />
        </div>
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
