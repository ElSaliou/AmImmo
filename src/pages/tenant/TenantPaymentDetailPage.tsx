import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Download,
  FileText,
  Home,
  ReceiptText,
  RefreshCw,
  User,
  WalletCards,
} from "lucide-react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  toast,
} from "sonner";

import {
  motion,
} from "framer-motion";

import {
  useTenantPortalPaymentDetail,
} from "@/hooks/use-tenant-portal";

import {
  canDownloadTenantPaymentReceipt,
  downloadTenantPaymentReceiptPdf,
} from "@/lib/tenant-finance-pdf";

import {
  Button,
} from "@/components/ui/button";

// ============================================================
// HELPERS
// ============================================================

const formatMoney = (
  value: number,
  currency: string,
) =>
  `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits:
        0,
    },
  ).format(value)} ${currency}`;

const formatDate = (
  value:
    | string
    | null,
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

const getPaymentMethodLabel = (
  method:
    | string
    | null,
) => {
  switch (method) {
    case "cash":
      return "Espèces";

    case "transfer":
    case "bank_transfer":
      return "Virement bancaire";

    case "mobile_money":
      return "Mobile Money";

    case "card":
      return "Carte bancaire";

    case "cheque":
      return "Chèque";

    default:
      return (
        method ??
        "Non renseigné"
      );
  }
};

// ============================================================
// PAGE
// ============================================================

const TenantPaymentDetailPage =
  () => {
    const {
      paymentId,
    } =
      useParams<{
        paymentId: string;
      }>();

    const {
      data:
        detail,

      isLoading,

      isError,

      error,

      refetch,
    } =
      useTenantPortalPaymentDetail(
        paymentId,
      );

    if (isLoading) {
      return (
        <div className="container flex min-h-[520px] items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

            <p className="mt-4 text-sm text-muted-foreground">
              Chargement du paiement...
            </p>
          </div>
        </div>
      );
    }

    if (
      isError ||
      !detail
    ) {
      return (
        <div className="container py-12">
          <div className="rounded-3xl border border-destructive/20 bg-card p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-destructive">
              Paiement inaccessible
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof
              Error
                ? error.message
                : "Impossible de charger ce paiement."}
            </p>

            <Button
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

    const {
      payment,
      invoice,
      tenant,
      lease,
      property,
    } =
      detail;

    const canDownloadReceipt =
      canDownloadTenantPaymentReceipt(
        payment,
      );

    const handleReceipt =
      () => {
        try {
          downloadTenantPaymentReceiptPdf(
            detail,
          );

          toast.success(
            "Reçu de paiement généré.",
          );
        } catch (
          downloadError
        ) {
          toast.error(
            downloadError instanceof
              Error
              ? downloadError.message
              : "Impossible de générer le reçu.",
          );
        }
      };

    return (
      <div className="container space-y-8 py-8 sm:py-10">
        <Button
          asChild
          variant="ghost"
          className="-ml-3"
        >
          <Link to="/tenant/payments">
            <ArrowLeft className="h-4 w-4" />
            Mes paiements
          </Link>
        </Button>

        {/* HERO */}

        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-700 via-emerald-700 to-primary p-7 text-white shadow-xl sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15">
                <WalletCards className="h-4 w-4 text-secondary" />
                Paiement locataire
              </div>

              <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
                {payment.reference ??
                  "Paiement"}
              </h1>

              <p className="mt-3 text-white/75">
                {formatDate(
                  payment.paidAt ??
                    payment.createdAt,
                )}
              </p>
            </div>

            {canDownloadReceipt && (
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                onClick={
                  handleReceipt
                }
              >
                <Download className="h-4 w-4" />
                Télécharger le reçu
              </Button>
            )}
          </div>
        </section>

        {/* AMOUNT */}

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-7 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">
            Montant réglé
          </p>

          <p className="mt-3 text-4xl font-bold text-emerald-700">
            {formatMoney(
              payment.amount,
              payment.currency,
            )}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <BadgeCheck className="h-4 w-4" />

            {payment.status ===
              "completed" ||
            payment.status ===
              "paid"
              ? "Paiement effectué"
              : payment.status ??
                "Statut inconnu"}
          </div>
        </section>

        {/* INFO */}

        <section className="grid gap-5 lg:grid-cols-2">
          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="rounded-3xl border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <ReceiptText className="h-5 w-5 text-primary" />

              <h2 className="font-display text-xl font-bold">
                Paiement
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Référence
                </p>

                <p className="mt-1 font-semibold">
                  {payment.reference ??
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Moyen
                </p>

                <p className="mt-1 font-semibold">
                  {getPaymentMethodLabel(
                    payment.method,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Date
                </p>

                <p className="mt-1 font-semibold">
                  {formatDate(
                    payment.paidAt ??
                      payment.createdAt,
                  )}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="rounded-3xl border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />

              <h2 className="font-display text-xl font-bold">
                Location
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Locataire
                </p>

                <p className="mt-1 font-semibold">
                  {tenant?.fullName ??
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Bail
                </p>

                <p className="mt-1 font-semibold">
                  {lease?.reference ??
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Logement
                </p>

                <p className="mt-1 font-semibold">
                  {property?.title ??
                    "—"}
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* INVOICE */}

        {invoice && (
          <section className="rounded-3xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Facture associée
                  </p>

                  <h2 className="mt-1 font-display text-xl font-bold">
                    {invoice.number}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatMoney(
                      invoice.amount,
                      invoice.currency,
                    )}
                  </p>
                </div>
              </div>

              <Button
                asChild
                variant="outline"
                className="rounded-xl"
              >
                <Link
                  to={`/tenant/invoices/${invoice.id}`}
                >
                  <FileText className="h-4 w-4" />
                  Voir la facture
                </Link>
              </Button>
            </div>
          </section>
        )}

        {!canDownloadReceipt && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            Un reçu définitif est disponible uniquement pour un paiement effectué et non remboursé.
          </section>
        )}

        {payment.notes && (
          <section className="rounded-3xl border bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold">
              Notes
            </h2>

            <p className="mt-3 text-sm text-muted-foreground">
              {payment.notes}
            </p>
          </section>
        )}
      </div>
    );
  };

export default TenantPaymentDetailPage;