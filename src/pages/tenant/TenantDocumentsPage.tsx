import {
  useState,
} from "react";

import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  ShieldCheck,
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
  createTenantDocumentAccessUrl,
  type TenantPortalDocument,
  useTenantPortalDocuments,
} from "@/hooks/use-tenant-portal";

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

const getDocumentContextLabel = (
  entityType: string,
) => {
  switch (
    entityType.toLowerCase()
  ) {
    case "tenant":
    case "tenants":
      return "Dossier locataire";

    case "lease":
    case "leases":
      return "Bail";

    default:
      return "Document";
  }
};

const getFileIcon = (
  document:
    TenantPortalDocument,
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
    TenantPortalDocument;

  isOpening:
    boolean;

  onOpen:
    (
      document:
        TenantPortalDocument,
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

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
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
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {getDocumentContextLabel(
                  document.entityType,
                )}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Sécurisé
              </span>
            </div>

            <h2 className="mt-4 truncate font-display text-lg font-bold text-foreground">
              {document.name}
            </h2>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">
              Ajouté le
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
        documents = [],
      isLoading,
      isError,
      error,
      refetch,
    } =
      useTenantPortalDocuments();

    const [
      openingDocumentId,
      setOpeningDocumentId,
    ] =
      useState<
        string | null
      >(null);

    const handleOpen =
      async (
        document:
          TenantPortalDocument,
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
            await createTenantDocumentAccessUrl(
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

    if (isLoading) {
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

    if (isError) {
      return (
        <div className="container py-12">
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
      <div className="container space-y-8 py-8 sm:py-10">
        <Button
          asChild
          variant="ghost"
          className="-ml-3"
        >
          <Link to="/tenant">
            <ArrowLeft className="h-4 w-4" />
            Tableau de bord
          </Link>
        </Button>

        {/* HERO */}

        <section className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm ring-1 ring-primary-foreground/15">
              <FolderOpen className="h-4 w-4 text-secondary" />
              Coffre documentaire
            </div>

            <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
              Mes documents
            </h1>

            <p className="mt-3 max-w-2xl text-primary-foreground/75">
              Consultez les documents mis à votre disposition
              pour votre dossier locataire et votre bail.
            </p>
          </div>
        </section>

        {/* SUMMARY */}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Documents disponibles
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
                <ShieldCheck className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Accès
                </p>

                <p className="mt-1 font-semibold text-foreground">
                  Privé et sécurisé
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DOCUMENTS */}

        {documents.length ===
        0 ? (
          <section className="rounded-3xl border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>

            <h2 className="mt-5 font-display text-xl font-bold">
              Aucun document disponible
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Les documents que l'agence rend visibles dans votre
              dossier ou votre bail apparaîtront ici.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {documents.map(
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

        <div className="flex items-start gap-3 rounded-3xl border bg-muted/30 p-5">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <p className="text-sm leading-6 text-muted-foreground">
            Les liens d'accès aux fichiers stockés de manière privée
            sont générés temporairement au moment de leur consultation.
          </p>
        </div>
      </div>
    );
  };

export default TenantDocumentsPage;