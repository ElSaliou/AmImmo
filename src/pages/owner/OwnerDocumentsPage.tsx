import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  ExternalLink,
  FileImage,
  FileText,
  FolderOpen,
  Inbox,
  Loader2,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import {
  toast,
} from "sonner";

import {
  Button,
} from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  createDocumentExchangeAccessUrl,
  DOCUMENT_EXCHANGE_CATEGORY_OPTIONS,
  type DocumentExchangeCategory,
  type DocumentExchangeDocument,
  type OwnerExchangeMessage,
  useMarkOwnerAgencyConversationRead,
  useOwnerDocumentExchange,
  useSendOwnerAgencyMessage,
  useSendOwnerDocument,
} from "@/hooks/use-document-exchange";

// ============================================================
// TYPES
// ============================================================

type MainTab =
  | "conversation"
  | "documents";

type DocumentTab =
  | "all"
  | "received"
  | "sent";

// ============================================================
// HELPERS
// ============================================================

const formatDate = (
  value: string | null,
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const formatMessageDate = (
  value: string,
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const formatFileSize = (
  value: number | null,
) => {
  if (
    value === null ||
    value <= 0
  ) {
    return null;
  }

  if (
    value <
    1024
  ) {
    return `${value} o`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${Math.round(
      value / 1024,
    )} Ko`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} Mo`;
};

const getCategoryLabel = (
  category:
    DocumentExchangeCategory,
) =>
  DOCUMENT_EXCHANGE_CATEGORY_OPTIONS.find(
    (
      option,
    ) =>
      option.value ===
      category,
  )?.label ??
  "Autre";

const getFileIcon = (
  document:
    DocumentExchangeDocument,
) => {
  const type =
    (
      document.fileType ??
      document.mimeType ??
      ""
    ).toLowerCase();

  if (
    type.includes(
      "image",
    ) ||
    [
      "png",
      "jpg",
      "jpeg",
      "webp",
    ].includes(
      type,
    )
  ) {
    return FileImage;
  }

  return FileText;
};

// ============================================================
// DOCUMENT CARD
// ============================================================

const DocumentCard = ({
  document,
  isOpening,
  onOpen,
}: {
  document:
    DocumentExchangeDocument;

  isOpening:
    boolean;

  onOpen:
    (
      document:
        DocumentExchangeDocument,
    ) => void;
}) => {
  const Icon =
    getFileIcon(
      document,
    );

  const sent =
    document.direction ===
    "sent";

  const fileSize =
    formatFileSize(
      document.fileSize,
    );

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="overflow-hidden rounded-3xl border bg-card shadow-sm transition hover:shadow-md"
    >
      <div className="border-b bg-gradient-to-r from-primary/5 via-background to-secondary/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  sent
                    ? "inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                    : "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                }
              >
                {sent ? (
                  <Send className="h-3.5 w-3.5" />
                ) : (
                  <Inbox className="h-3.5 w-3.5" />
                )}

                {sent
                  ? "Envoyé"
                  : "Reçu"}
              </span>

              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {getCategoryLabel(
                  document.category,
                )}
              </span>
            </div>

            <h2 className="mt-4 truncate font-display text-lg font-bold text-foreground">
              {document.name}
            </h2>

            <p className="mt-1 truncate text-xs text-muted-foreground">
              {document.contextLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">
              {sent
                ? "Envoyé le"
                : "Reçu le"}
            </p>

            <p className="mt-1 text-sm font-medium text-foreground">
              {formatDate(
                document.uploadedAt,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Type de fichier
            </p>

            <p className="mt-1 text-sm font-medium uppercase text-foreground">
              {document.fileType ??
                document.mimeType ??
                "Document"}
            </p>
          </div>
        </div>

        {document.message && (
          <div className="rounded-2xl bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Message
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
              {document.message}
            </p>
          </div>
        )}

        {fileSize && (
          <div className="rounded-2xl bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Taille
            </p>

            <p className="mt-1 text-sm font-semibold text-foreground">
              {fileSize}
            </p>
          </div>
        )}

        <Button
          type="button"
          className="w-full rounded-xl"
          disabled={
            isOpening
          }
          onClick={() =>
            onOpen(
              document,
            )
          }
        >
          {isOpening ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Ouverture...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              Consulter le document
            </>
          )}
        </Button>
      </div>
    </motion.article>
  );
};

// ============================================================
// THREAD ATTACHMENT
// ============================================================

const MessageAttachment = ({
  document,
  ownerMessage,
  onOpen,
}: {
  document:
    DocumentExchangeDocument;

  ownerMessage:
    boolean;

  onOpen:
    (
      document:
        DocumentExchangeDocument,
    ) => void;
}) => {
  const Icon =
    getFileIcon(
      document,
    );

  return (
    <button
      type="button"
      onClick={() =>
        onOpen(
          document,
        )
      }
      className={
        ownerMessage
          ? "mt-3 flex w-full items-center gap-3 rounded-xl bg-primary-foreground/10 p-3 text-left transition hover:bg-primary-foreground/15"
          : "mt-3 flex w-full items-center gap-3 rounded-xl bg-muted p-3 text-left transition hover:bg-muted/70"
      }
    >
      <Icon className="h-5 w-5 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {document.name}
        </p>

        <p className="mt-0.5 text-xs opacity-70">
          {formatFileSize(
            document.fileSize,
          ) ??
            getCategoryLabel(
              document.category,
            )}
        </p>
      </div>

      <ExternalLink className="h-4 w-4 shrink-0" />
    </button>
  );
};

// ============================================================
// PAGE
// ============================================================

const OwnerDocumentsPage =
  () => {
    const [
      searchParams,
    ] =
      useSearchParams();

    const deepLinkConversationId =
      searchParams.get(
        "conversation",
      );

    const {
      data:
        exchange,
      isLoading,
      isError,
      error,
      refetch,
    } =
      useOwnerDocumentExchange();

    const sendDocument =
      useSendOwnerDocument();

    const sendThreadMessage =
      useSendOwnerAgencyMessage();

    const markConversationRead =
      useMarkOwnerAgencyConversationRead();

    const [
      mainTab,
      setMainTab,
    ] =
      useState<MainTab>(
        deepLinkConversationId
          ? "conversation"
          : "documents",
      );

    const [
      documentTab,
      setDocumentTab,
    ] =
      useState<DocumentTab>(
        "all",
      );

    const [
      dialogOpen,
      setDialogOpen,
    ] =
      useState(false);

    const [
      selectedFile,
      setSelectedFile,
    ] =
      useState<File | null>(
        null,
      );

    const [
      category,
      setCategory,
    ] =
      useState<DocumentExchangeCategory>(
        "other",
      );

    const [
      message,
      setMessage,
    ] =
      useState("");

    const [
      openingDocumentId,
      setOpeningDocumentId,
    ] =
      useState<
        string | null
      >(
        null,
      );

    const [
      threadMessage,
      setThreadMessage,
    ] =
      useState("");

    const [
      threadFile,
      setThreadFile,
    ] =
      useState<File | null>(
        null,
      );

    const [
      threadCategory,
      setThreadCategory,
    ] =
      useState<DocumentExchangeCategory>(
        "other",
      );

    const fileInputRef =
      useRef<HTMLInputElement | null>(
        null,
      );

    const threadFileInputRef =
      useRef<HTMLInputElement | null>(
        null,
      );

    const threadEndRef =
      useRef<HTMLDivElement | null>(
        null,
      );

    const conversationSectionRef =
      useRef<HTMLDivElement | null>(
        null,
      );

    const deepLinkHandledRef =
      useRef<string | null>(
        null,
      );

    const markReadKeyRef =
      useRef<string | null>(
        null,
      );

    const documents =
      exchange?.documents ??
      [];

    const messages =
      exchange?.messages ??
      [];

    const agencyName =
      exchange?.organizationName ??
      "votre agence";

    const receivedDocuments =
      useMemo(
        () =>
          documents.filter(
            (
              document,
            ) =>
              document.direction ===
              "received",
          ),
        [
          documents,
        ],
      );

    const sentDocuments =
      useMemo(
        () =>
          documents.filter(
            (
              document,
            ) =>
              document.direction ===
              "sent",
          ),
        [
          documents,
        ],
      );

    const filteredDocuments =
      useMemo(
        () => {
          if (
            documentTab ===
            "received"
          ) {
            return receivedDocuments;
          }

          if (
            documentTab ===
            "sent"
          ) {
            return sentDocuments;
          }

          return documents;
        },
        [
          documentTab,
          documents,
          receivedDocuments,
          sentDocuments,
        ],
      );

    // ========================================================
    // DEEP LINK
    // /owner/documents?conversation=<uuid>
    // ========================================================

    useEffect(
      () => {
        if (
          !deepLinkConversationId ||
          !exchange
        ) {
          return;
        }

        if (
          deepLinkHandledRef.current ===
          deepLinkConversationId
        ) {
          return;
        }

        if (
          exchange.conversation?.id ===
          deepLinkConversationId
        ) {
          setMainTab(
            "conversation",
          );

          deepLinkHandledRef.current =
            deepLinkConversationId;

          window.setTimeout(
            () => {
              conversationSectionRef.current?.scrollIntoView(
                {
                  behavior:
                    "smooth",
                  block:
                    "start",
                },
              );
            },
            0,
          );

          return;
        }

        deepLinkHandledRef.current =
          deepLinkConversationId;

        toast.error(
          "Cette conversation est introuvable ou n'est pas accessible depuis votre compte.",
        );
      },
      [
        deepLinkConversationId,
        exchange,
      ],
    );

    // ========================================================
    // MARK OWNER CONVERSATION AS READ
    // ========================================================

    useEffect(
      () => {
        if (
          mainTab !==
            "conversation" ||
          !exchange?.conversation
        ) {
          return;
        }

        const key =
          `${exchange.conversation.id}:${exchange.conversation.lastMessageAt ?? ""}`;

        if (
          markReadKeyRef.current ===
          key
        ) {
          return;
        }

        markReadKeyRef.current =
          key;

        markConversationRead.mutate(
          exchange.conversation.id,
        );
      },
      [
        mainTab,
        exchange?.conversation?.id,
        exchange?.conversation?.lastMessageAt,
      ],
    );

    // ========================================================
    // KEEP THREAD AT THE LATEST MESSAGE
    // ========================================================

    useEffect(
      () => {
        if (
          mainTab !==
          "conversation"
        ) {
          return;
        }

        window.setTimeout(
          () => {
            threadEndRef.current?.scrollIntoView(
              {
                block:
                  "nearest",
              },
            );
          },
          0,
        );
      },
      [
        mainTab,
        messages.length,
      ],
    );

    // ========================================================
    // RESET UPLOAD DIALOG
    // ========================================================

    const resetDocumentForm =
      () => {
        setSelectedFile(
          null,
        );

        setCategory(
          "other",
        );

        setMessage(
          "",
        );

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }
      };

    // ========================================================
    // OPEN DOCUMENT
    // ========================================================

    const handleOpen =
      async (
        document:
          DocumentExchangeDocument,
      ) => {
        const popup =
          window.open(
            "about:blank",
            "_blank",
          );

        if (!popup) {
          toast.error(
            "Autorisez les fenêtres contextuelles pour ouvrir ce document.",
          );

          return;
        }

        popup.opener =
          null;

        setOpeningDocumentId(
          document.id,
        );

        try {
          const url =
            await createDocumentExchangeAccessUrl(
              document,
            );

          popup.location.href =
            url;
        } catch (
          openingError:
            unknown
        ) {
          popup.close();

          toast.error(
            openingError instanceof
              Error
              ? openingError.message
              : "Impossible d'ouvrir le document.",
          );
        } finally {
          setOpeningDocumentId(
            null,
          );
        }
      };

    // ========================================================
    // SEND DOCUMENT FROM DIALOG
    // ========================================================

    const handleSendDocument =
      async () => {
        if (
          !exchange?.organizationId
        ) {
          toast.error(
            "Aucun mandat de gestion actif n'est associé à votre compte.",
          );

          return;
        }

        if (
          !selectedFile
        ) {
          toast.error(
            "Sélectionnez un document à envoyer.",
          );

          return;
        }

        try {
          await sendDocument.mutateAsync(
            {
              file:
                selectedFile,

              category,

              message,
            },
          );

          toast.success(
            `Document envoyé à ${agencyName}.`,
          );

          resetDocumentForm();

          setDialogOpen(
            false,
          );

          setDocumentTab(
            "sent",
          );

          setMainTab(
            "documents",
          );
        } catch (
          sendError:
            unknown
        ) {
          toast.error(
            sendError instanceof
              Error
              ? sendError.message
              : "Impossible d'envoyer le document.",
          );
        }
      };

    // ========================================================
    // SEND THREAD MESSAGE / ATTACHMENT
    // ========================================================

    const handleSendThreadMessage =
      async () => {
        const normalizedMessage =
          threadMessage.trim();

        if (
          !normalizedMessage &&
          !threadFile
        ) {
          toast.error(
            "Ajoutez un message ou un document.",
          );

          return;
        }

        try {
          await sendThreadMessage.mutateAsync(
            {
              message:
                normalizedMessage,

              file:
                threadFile,

              category:
                threadCategory,
            },
          );

          setThreadMessage(
            "",
          );

          setThreadFile(
            null,
          );

          setThreadCategory(
            "other",
          );

          if (
            threadFileInputRef.current
          ) {
            threadFileInputRef.current.value =
              "";
          }

          toast.success(
            `Message envoyé à ${agencyName}.`,
          );
        } catch (
          sendError:
            unknown
        ) {
          toast.error(
            sendError instanceof
              Error
              ? sendError.message
              : "Impossible d'envoyer le message.",
          );
        }
      };

    // ========================================================
    // PAGE STATES
    // ========================================================

    if (isLoading) {
      return (
        <div className="flex min-h-[520px] items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

            <p className="mt-4 text-sm text-muted-foreground">
              Chargement de vos échanges...
            </p>
          </div>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="p-4 sm:p-6">
          <div className="rounded-3xl border border-destructive/20 bg-card p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-destructive">
              Impossible de charger vos échanges
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof
              Error
                ? error.message
                : "Une erreur est survenue."}
            </p>

            <Button
              variant="outline"
              className="mt-5 rounded-xl"
              onClick={() => {
                void refetch();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* ================================================= */}
        {/* HERO                                              */}
        {/* ================================================= */}

        <section className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-9">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm ring-1 ring-primary-foreground/15">
                <MessageCircle className="h-4 w-4 text-secondary" />
                Échange sécurisé avec votre agence
              </div>

              <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
                Mes documents et messages
              </h1>

              <p className="mt-3 max-w-2xl text-primary-foreground/75">
                Échangez directement avec votre agence de gestion. Les messages et pièces jointes restent centralisés dans votre espace propriétaire.
              </p>

              {exchange?.organizationName && (
                <p className="mt-4 text-sm text-primary-foreground/70">
                  Agence de gestion :{" "}
                  <span className="font-semibold text-primary-foreground">
                    {
                      exchange.organizationName
                    }
                  </span>
                </p>
              )}
            </div>

            <Dialog
              open={
                dialogOpen
              }
              onOpenChange={(
                open,
              ) => {
                setDialogOpen(
                  open,
                );

                if (
                  !open &&
                  !sendDocument.isPending
                ) {
                  resetDocumentForm();
                }
              }}
            >
              <DialogTrigger
                asChild
              >
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  className="rounded-xl"
                  disabled={
                    !exchange?.organizationId
                  }
                >
                  <Upload className="h-4 w-4" />
                  Envoyer un document
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>
                    Envoyer un document
                  </DialogTitle>

                  <DialogDescription>
                    Le document sera transmis directement à votre agence de gestion et ajouté à votre échange sécurisé.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  <div className="rounded-2xl border bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Destinataire
                    </p>

                    <p className="mt-1 font-semibold text-foreground">
                      {agencyName}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="owner-document-file"
                      className="text-sm font-medium text-foreground"
                    >
                      Fichier *
                    </label>

                    <input
                      ref={
                        fileInputRef
                      }
                      id="owner-document-file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      disabled={
                        sendDocument.isPending
                      }
                      onChange={(
                        event,
                      ) =>
                        setSelectedFile(
                          event.target.files?.[0] ??
                            null,
                        )
                      }
                      className="block w-full rounded-xl border bg-background px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-medium file:text-primary"
                    />

                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, JPEG, PNG ou WEBP — maximum 10 Mo.
                    </p>

                    {selectedFile && (
                      <p className="text-xs font-medium text-foreground">
                        {selectedFile.name} •{" "}
                        {formatFileSize(
                          selectedFile.size,
                        )}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="owner-document-category"
                      className="text-sm font-medium text-foreground"
                    >
                      Catégorie
                    </label>

                    <select
                      id="owner-document-category"
                      value={
                        category
                      }
                      disabled={
                        sendDocument.isPending
                      }
                      onChange={(
                        event,
                      ) =>
                        setCategory(
                          event.target.value as
                            DocumentExchangeCategory,
                        )
                      }
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {DOCUMENT_EXCHANGE_CATEGORY_OPTIONS.map(
                        (
                          option,
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="owner-document-message"
                      className="text-sm font-medium text-foreground"
                    >
                      Message{" "}
                      <span className="font-normal text-muted-foreground">
                        (facultatif)
                      </span>
                    </label>

                    <textarea
                      id="owner-document-message"
                      value={
                        message
                      }
                      maxLength={
                        2000
                      }
                      rows={
                        4
                      }
                      disabled={
                        sendDocument.isPending
                      }
                      onChange={(
                        event,
                      ) =>
                        setMessage(
                          event.target.value,
                        )
                      }
                      placeholder="Ajoutez une précision pour votre agence..."
                      className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />

                    <p className="text-right text-xs text-muted-foreground">
                      {message.length}/2000
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={
                      sendDocument.isPending
                    }
                    onClick={() =>
                      setDialogOpen(
                        false,
                      )
                    }
                  >
                    Annuler
                  </Button>

                  <Button
                    type="button"
                    className="rounded-xl"
                    disabled={
                      sendDocument.isPending ||
                      !selectedFile
                    }
                    onClick={() => {
                      void handleSendDocument();
                    }}
                  >
                    {sendDocument.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* ================================================= */}
        {/* MAIN TABS                                         */}
        {/* ================================================= */}

        <section
          ref={
            conversationSectionRef
          }
          className="overflow-hidden rounded-3xl border bg-card shadow-sm"
        >
          <div className="flex border-b bg-muted/20 p-2">
            <button
              type="button"
              onClick={() =>
                setMainTab(
                  "conversation",
                )
              }
              className={
                mainTab ===
                "conversation"
                  ? "flex items-center gap-2 rounded-2xl bg-background px-5 py-3 text-sm font-semibold text-primary shadow-sm"
                  : "flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              }
            >
              <MessageCircle className="h-4 w-4" />
              Conversation
              {messages.length >
                0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  {
                    messages.length
                  }
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setMainTab(
                  "documents",
                )
              }
              className={
                mainTab ===
                "documents"
                  ? "flex items-center gap-2 rounded-2xl bg-background px-5 py-3 text-sm font-semibold text-primary shadow-sm"
                  : "flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              }
            >
              <FolderOpen className="h-4 w-4" />
              Documents
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                {documents.length}
              </span>
            </button>

            <div className="ml-auto flex items-center pr-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Actualiser"
                onClick={() => {
                  void refetch();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* =============================================== */}
          {/* CONVERSATION                                    */}
          {/* =============================================== */}

          {mainTab ===
            "conversation" && (
            <div className="flex min-h-[620px] flex-col">
              <div className="border-b px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-semibold text-foreground">
                      {agencyName}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Canal sécurisé Propriétaire ⇄ Agence
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6">
                {messages.length ===
                0 ? (
                  <div className="flex min-h-[320px] items-center justify-center text-center">
                    <div>
                      <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" />

                      <p className="mt-4 font-semibold">
                        Aucun message pour le moment
                      </p>

                      <p className="mt-1 max-w-md text-sm text-muted-foreground">
                        Envoyez un message ou un document à votre agence pour démarrer l'échange.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-4xl space-y-4">
                    {messages.map(
                      (
                        threadItem:
                          OwnerExchangeMessage,
                      ) => {
                        const ownerMessage =
                          threadItem.senderRole ===
                          "owner";

                        return (
                          <div
                            key={
                              threadItem.id
                            }
                            className={
                              ownerMessage
                                ? "flex justify-end"
                                : "flex justify-start"
                            }
                          >
                            <div
                              className={
                                ownerMessage
                                  ? "max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground sm:max-w-[72%]"
                                  : "max-w-[88%] rounded-2xl rounded-bl-md border bg-background px-4 py-3 text-foreground shadow-sm sm:max-w-[72%]"
                              }
                            >
                              <div className="flex items-center justify-between gap-4">
                                <p
                                  className={
                                    ownerMessage
                                      ? "text-xs font-semibold text-primary-foreground/75"
                                      : "text-xs font-semibold text-muted-foreground"
                                  }
                                >
                                  {ownerMessage
                                    ? "Vous"
                                    : agencyName}
                                </p>

                                <p
                                  className={
                                    ownerMessage
                                      ? "text-[10px] text-primary-foreground/60"
                                      : "text-[10px] text-muted-foreground"
                                  }
                                >
                                  {formatMessageDate(
                                    threadItem.createdAt,
                                  )}
                                </p>
                              </div>

                              {threadItem.body && (
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                                  {
                                    threadItem.body
                                  }
                                </p>
                              )}

                              {threadItem.document && (
                                <MessageAttachment
                                  document={
                                    threadItem.document
                                  }
                                  ownerMessage={
                                    ownerMessage
                                  }
                                  onOpen={
                                    handleOpen
                                  }
                                />
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}

                    <div
                      ref={
                        threadEndRef
                      }
                    />
                  </div>
                )}
              </div>

              {/* THREAD COMPOSER */}

              <div className="border-t bg-background p-4 sm:p-5">
                <div className="mx-auto max-w-4xl space-y-3">
                  <textarea
                    value={
                      threadMessage
                    }
                    onChange={(
                      event,
                    ) =>
                      setThreadMessage(
                        event.target.value,
                      )
                    }
                    maxLength={
                      2000
                    }
                    rows={
                      3
                    }
                    disabled={
                      sendThreadMessage.isPending ||
                      !exchange?.organizationId
                    }
                    placeholder={`Écrire à ${agencyName}...`}
                    className="w-full resize-none rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      ref={
                        threadFileInputRef
                      }
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      disabled={
                        sendThreadMessage.isPending ||
                        !exchange?.organizationId
                      }
                      onChange={(
                        event,
                      ) =>
                        setThreadFile(
                          event.target.files?.[0] ??
                            null,
                        )
                      }
                      className="min-w-0 flex-1 text-sm"
                    />

                    {threadFile && (
                      <select
                        value={
                          threadCategory
                        }
                        disabled={
                          sendThreadMessage.isPending
                        }
                        onChange={(
                          event,
                        ) =>
                          setThreadCategory(
                            event.target.value as
                              DocumentExchangeCategory,
                          )
                        }
                        className="h-10 rounded-xl border bg-background px-3 text-sm"
                      >
                        {DOCUMENT_EXCHANGE_CATEGORY_OPTIONS.map(
                          (
                            option,
                          ) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {
                                option.label
                              }
                            </option>
                          ),
                        )}
                      </select>
                    )}

                    <Button
                      type="button"
                      className="rounded-xl"
                      disabled={
                        sendThreadMessage.isPending ||
                        !exchange?.organizationId ||
                        (
                          !threadMessage.trim() &&
                          !threadFile
                        )
                      }
                      onClick={() => {
                        void handleSendThreadMessage();
                      }}
                    >
                      {sendThreadMessage.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : threadFile ? (
                        <Paperclip className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}

                      Envoyer
                    </Button>
                  </div>

                  {threadFile && (
                    <p className="text-xs text-muted-foreground">
                      Pièce jointe : {threadFile.name} •{" "}
                      {formatFileSize(
                        threadFile.size,
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =============================================== */}
          {/* DOCUMENTS                                       */}
          {/* =============================================== */}

          {mainTab ===
            "documents" && (
            <div className="space-y-6 p-4 sm:p-6">
              {/* KPI */}

              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" />
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Tous
                      </p>

                      <p className="mt-1 text-2xl font-bold">
                        {documents.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <Inbox className="h-6 w-6" />
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Reçus
                      </p>

                      <p className="mt-1 text-2xl font-bold">
                        {receivedDocuments.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Send className="h-6 w-6" />
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Envoyés
                      </p>

                      <p className="mt-1 text-2xl font-bold">
                        {sentDocuments.length}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* DOCUMENT FILTERS */}

              <section className="flex flex-wrap gap-2 rounded-3xl border bg-card p-3 shadow-sm">
                {(
                  [
                    {
                      value:
                        "all",
                      label:
                        "Tous",
                      count:
                        documents.length,
                    },
                    {
                      value:
                        "received",
                      label:
                        "Reçus",
                      count:
                        receivedDocuments.length,
                    },
                    {
                      value:
                        "sent",
                      label:
                        "Envoyés",
                      count:
                        sentDocuments.length,
                    },
                  ] as const
                ).map(
                  (
                    tab,
                  ) => (
                    <button
                      key={
                        tab.value
                      }
                      type="button"
                      onClick={() =>
                        setDocumentTab(
                          tab.value,
                        )
                      }
                      className={
                        documentTab ===
                        tab.value
                          ? "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                          : "rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      }
                    >
                      {tab.label}{" "}
                      <span className="ml-1 opacity-70">
                        {tab.count}
                      </span>
                    </button>
                  ),
                )}
              </section>

              {/* DOCUMENT CARDS */}

              {filteredDocuments.length ===
              0 ? (
                <section className="rounded-3xl border bg-card p-10 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                  </div>

                  <h2 className="mt-5 font-display text-xl font-bold">
                    {documentTab ===
                    "sent"
                      ? "Aucun document envoyé"
                      : documentTab ===
                          "received"
                        ? "Aucun document reçu"
                        : "Aucun document disponible"}
                  </h2>

                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    {documentTab ===
                    "sent"
                      ? "Les documents transmis à votre agence apparaîtront ici."
                      : documentTab ===
                          "received"
                        ? "Les documents reçus de votre agence apparaîtront ici."
                        : "Vos échanges documentaires avec votre agence apparaîtront ici."}
                  </p>
                </section>
              ) : (
                <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredDocuments.map(
                    (
                      document,
                    ) => (
                      <DocumentCard
                        key={
                          document.id
                        }
                        document={
                          document
                        }
                        isOpening={
                          openingDocumentId ===
                          document.id
                        }
                        onOpen={
                          handleOpen
                        }
                      />
                    ),
                  )}
                </section>
              )}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* SECURITY NOTE                                     */}
        {/* ================================================= */}

        <div className="flex items-start gap-3 rounded-3xl border bg-muted/30 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <p className="text-sm leading-6 text-muted-foreground">
            Cet espace est réservé aux échanges entre vous et votre agence de gestion. Les fichiers privés sont accessibles au moyen de liens temporaires sécurisés.
          </p>
        </div>
      </div>
    );
  };

export default OwnerDocumentsPage;
