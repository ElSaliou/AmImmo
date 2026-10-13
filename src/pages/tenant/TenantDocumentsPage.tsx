import {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  ExternalLink,
  FileImage,
  FileText,
  FolderOpen,
  Inbox,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

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
  useSendTenantDocument,
  useTenantDocumentExchange,
} from "@/hooks/use-document-exchange";

// ============================================================
// TYPES
// ============================================================

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
  if (
    !value
  ) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

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
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  ).format(
    date,
  );
};

const formatFileSize = (
  value: number | null,
) => {
  if (
    value ===
      null ||
    value <=
      0
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
      value /
        1024,
    )} Ko`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(
    1,
  )} Mo`;
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

  const fileSize =
    formatFileSize(
      document.fileSize,
    );

  const sent =
    document.direction ===
    "sent";

  return (
    <motion.article
      initial={{
        opacity:
          0,

        y:
          18,
      }}
      animate={{
        opacity:
          1,

        y:
          0,
      }}
      className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
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
              {
                document.contextLabel
              }
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
// PAGE
// ============================================================

const TenantDocumentsPage =
  () => {
    const {
      data:
        exchange,

      isLoading,

      isError,

      error,

      refetch,
    } =
      useTenantDocumentExchange();

    const sendDocument =
      useSendTenantDocument();

    const fileInputRef =
      useRef<HTMLInputElement | null>(
        null,
      );

    const [
      activeTab,
      setActiveTab,
    ] =
      useState<DocumentTab>(
        "all",
      );

    const [
      dialogOpen,
      setDialogOpen,
    ] =
      useState(
        false,
      );

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
      useState(
        "",
      );

    const [
      openingDocumentId,
      setOpeningDocumentId,
    ] =
      useState<
        string | null
      >(
        null,
      );

    const documents =
      exchange
        ?.documents ??
      [];

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
            activeTab ===
            "received"
          ) {
            return receivedDocuments;
          }

          if (
            activeTab ===
            "sent"
          ) {
            return sentDocuments;
          }

          return documents;
        },
        [
          activeTab,
          documents,
          receivedDocuments,
          sentDocuments,
        ],
      );

    const resetForm =
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

        if (
          !popup
        ) {
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

    const handleSend =
      async () => {
        if (
          !exchange
            ?.activeLease
        ) {
          toast.error(
            "Aucun bail actif n'est disponible pour cet envoi.",
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
            "Document envoyé à votre agence.",
          );

          resetForm();

          setDialogOpen(
            false,
          );

          setActiveTab(
            "sent",
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

    if (
      isLoading
    ) {
      return (
        <div className="container flex min-h-[520px] items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

            <p className="mt-4 text-sm text-muted-foreground">
              Chargement de vos documents...
            </p>
          </div>
        </div>
      );
    }

    if (
      isError
    ) {
      return (
        <div className="container py-8">
          <div className="rounded-3xl border border-destructive/20 bg-card p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-destructive">
              Impossible de charger vos documents
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof
              Error
                ? error.message
                : "Une erreur est survenue."}
            </p>

            <Button
              type="button"
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
      <div className="container space-y-8 py-6 sm:py-8">
        <Button
          asChild
          variant="ghost"
          className="rounded-xl"
        >
          <Link to="/tenant">
            <ArrowLeft className="h-4 w-4" />
            Tableau de bord
          </Link>
        </Button>

        {/* HERO */}

        <section className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm ring-1 ring-primary-foreground/15">
                <FolderOpen className="h-4 w-4 text-secondary" />
                Coffre documentaire
              </div>

              <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
                Mes documents
              </h1>

              <p className="mt-3 max-w-2xl text-primary-foreground/75">
                Consultez les documents reçus et transmettez vos justificatifs directement à votre agence de gestion.
              </p>

              {exchange
                ?.activeLease && (
                <p className="mt-4 text-sm text-primary-foreground/70">
                  Bail actif :{" "}
                  <span className="font-semibold text-primary-foreground">
                    {exchange.activeLease.reference ??
                      "Bail en cours"}
                  </span>

                  {exchange.activeLease.property
                    ?.title
                    ? ` • ${exchange.activeLease.property.title}`
                    : ""}
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
                  resetForm();
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
                    !exchange
                      ?.activeLease
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
                    Le document sera rattaché à votre bail actif et transmis à votre agence de gestion.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="tenant-document-file"
                      className="text-sm font-medium text-foreground"
                    >
                      Fichier *
                    </label>

                    <input
                      ref={
                        fileInputRef
                      }
                      id="tenant-document-file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      disabled={
                        sendDocument.isPending
                      }
                      onChange={(
                        event,
                      ) => {
                        setSelectedFile(
                          event.target
                            .files?.[0] ??
                            null,
                        );
                      }}
                      className="block w-full rounded-xl border bg-background px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-medium file:text-primary"
                    />

                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, JPEG, PNG ou WEBP — maximum 10 Mo.
                    </p>

                    {selectedFile && (
                      <p className="text-xs font-medium text-foreground">
                        {selectedFile.name}

                        {formatFileSize(
                          selectedFile.size,
                        )
                          ? ` • ${formatFileSize(
                              selectedFile.size,
                            )}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="tenant-document-category"
                      className="text-sm font-medium text-foreground"
                    >
                      Catégorie
                    </label>

                    <select
                      id="tenant-document-category"
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
                          event.target
                            .value as
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
                      htmlFor="tenant-document-message"
                      className="text-sm font-medium text-foreground"
                    >
                      Message{" "}
                      <span className="font-normal text-muted-foreground">
                        (facultatif)
                      </span>
                    </label>

                    <textarea
                      id="tenant-document-message"
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
                          event.target
                            .value,
                        )
                      }
                      placeholder="Ajoutez une précision pour votre agence..."
                      className="flex min-h-[110px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />

                    <p className="text-right text-xs text-muted-foreground">
                      {message.length}
                      /2000
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
                      void handleSend();
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

        {/* SUMMARY */}

        <section className="grid gap-4 sm:grid-cols-3">
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

        {/* FILTERS */}

        <section className="flex flex-wrap gap-2 rounded-2xl border bg-card p-2 shadow-sm">
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
                  setActiveTab(
                    tab.value,
                  )
                }
                className={
                  activeTab ===
                  tab.value
                    ? "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
                    : "rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                }
              >
                {tab.label}{" "}

                <span className="ml-1 opacity-75">
                  {tab.count}
                </span>
              </button>
            ),
          )}
        </section>

        {/* DOCUMENTS */}

        {filteredDocuments.length ===
        0 ? (
          <section className="rounded-3xl border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>

            <h2 className="mt-5 font-display text-xl font-bold">
              {activeTab ===
              "sent"
                ? "Aucun document envoyé"
                : activeTab ===
                    "received"
                  ? "Aucun document reçu"
                  : "Aucun document disponible"}
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              {activeTab ===
              "sent"
                ? "Les documents transmis à votre agence apparaîtront ici."
                : activeTab ===
                    "received"
                  ? "Les documents mis à votre disposition par votre agence apparaîtront ici."
                  : "Vos documents et vos échanges documentaires liés à votre dossier locataire apparaîtront ici."}
            </p>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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

        {!exchange
          ?.activeLease && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            L'envoi de nouveaux documents est désactivé car aucun bail actif n'est actuellement associé à votre compte. Les documents historiques restent consultables.
          </div>
        )}

        <div className="flex items-start gap-3 rounded-3xl border bg-muted/30 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <p className="text-sm leading-6 text-muted-foreground">
            Vos échanges documentaires sont centralisés par votre agence de gestion. Les fichiers privés sont accessibles au moyen de liens temporaires et restent protégés par les règles de sécurité de votre compte.
          </p>
        </div>
      </div>
    );
  };

export default TenantDocumentsPage;