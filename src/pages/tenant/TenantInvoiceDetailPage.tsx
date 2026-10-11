import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Download,
  FileCheck2,
  FileText,
  Home,
  Receipt,
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
  useTenantPortalInvoiceDetail,
} from "@/hooks/use-tenant-portal";

import {
  canDownloadTenantRentReceipt,
  downloadTenantInvoicePdf,
  downloadTenantRentReceiptPdf,
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
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
      ? new Date(
          `${value}T00:00:00`,
        )
      : new Date(value);

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

const getStatusLabel = (
  status: string,
) => {
  switch (status) {
    case "paid":
      return "Payée";

    case "partially_paid":
      return "Partiellement payée";

    case "overdue":
      return "En retard";

    case "issued":
      return "Émise";

    case "cancelled":
      return "Annulée";

    case "draft":
      return "Brouillon";

    default:
      return status;
  }
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

const TenantInvoiceDetailPage =
  () => {
    const {
      invoiceId,
    } =
      useParams<{
        invoiceId: string;
      }>();

    const {
      data:
        invoice,

      isLoading,

      isError,

      error,

      refetch,
    } =
      useTenantPortalInvoiceDetail(
        invoiceId,
      );

    if (isLoading) {
      return (
        <div className="container flex min-h-[520px] items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

            <p className="mt-4 text-sm text-muted-foreground">
              Chargement de la facture...
            </p>
          </div>
        </div>
      );
    }

    if (
      isError ||
      !invoice
    ) {
      return (
        <div className="container py-12">
          <div className="rounded-3xl border border-destructive/20 bg-card p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-destructive">
              Facture inaccessible
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof
              Error
                ? error.message
                : "Impossible de charger cette facture."}
            </p>

            <div className="mt-5 flex gap-3">
              <Button
                asChild
                variant="outline"
                className="rounded-xl"
              >
                <Link to="/tenant/invoices">
                  <ArrowLeft className="h-4 w-4" />
                  Mes loyers
                </Link>
              </Button>

              <Button
                className="rounded-xl"
                onClick={() => {
                  void refetch();
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const canDownloadQuittance =
      canDownloadTenantRentReceipt(
        invoice,
      );

    const handleInvoicePdf =
      () => {
        try {
          downloadTenantInvoicePdf(
            invoice,
          );

          toast.success(
            "Facture PDF générée.",
          );
        } catch (
          downloadError
        ) {
          toast.error(
            downloadError instanceof
              Error
              ? downloadError.message
              : "Impossible de générer la facture.",
          );
        }
      };

    const handleRentReceipt =
      () => {
        try {
          downloadTenantRentReceiptPdf(
            invoice,
          );

          toast.success(
            "Quittance générée.",
          );
        } catch (
          downloadError
        ) {
          toast.error(
            downloadError instanceof
              Error
              ? downloadError.message
              : "Impossible de générer la quittance.",
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
          <Link to="/tenant/invoices">
            <ArrowLeft className="h-4 w-4" />
            Mes loyers
          </Link>
        </Button>

        {/* HERO */}

        <section className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm ring-1 ring-primary-foreground/15">
                <Receipt className="h-4 w-4 text-secondary" />
                Facture locataire
              </div>

              <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
                {invoice.number}
              </h1>

              <p className="mt-3 text-primary-foreground/75">
                {getStatusLabel(
                  invoice.status,
                )}{" "}
                · Émise le{" "}
                {formatDate(
                  invoice.issueDate,
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                onClick={
                  handleInvoicePdf
                }
              >
                <Download className="h-4 w-4" />
                Télécharger la facture
              </Button>

              {canDownloadQuittance && (
                <Button
                  type="button"
                  className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={
                    handleRentReceipt
                  }
                >
                  <FileCheck2 className="h-4 w-4" />
                  Télécharger la quittance
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* FINANCIAL SUMMARY */}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Montant facturé
            </p>

            <p className="mt-3 text-2xl font-bold">
              {formatMoney(
                invoice.amount,
                invoice.currency,
              )}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              Montant réglé
            </p>

            <p className="mt-3 text-2xl font-bold text-emerald-700">
              {formatMoney(
                invoice.paidAmount,
                invoice.currency,
              )}
            </p>
          </div>

          <div
            className={`rounded-3xl border p-6 shadow-sm ${
              invoice.balanceDue >
              0
                ? "border-amber-200 bg-amber-50/60"
                : "border-emerald-200 bg-emerald-50/60"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Reste à payer
            </p>

            <p className="mt-3 text-2xl font-bold">
              {formatMoney(
                invoice.balanceDue,
                invoice.currency,
              )}
            </p>
          </div>
        </section>

        {/* CONTEXT */}

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
              <User className="h-5 w-5 text-primary" />

              <h2 className="font-display text-xl font-bold">
                Dossier locataire
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Locataire
                </p>

                <p className="mt-1 font-semibold">
                  {invoice.tenant
                    ?.fullName ??
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Bail
                </p>

                <p className="mt-1 font-semibold">
                  {invoice.lease
                    ?.reference ??
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Logement
                </p>

                <p className="mt-1 font-semibold">
                  {invoice.property
                    ?.title ??
                    "—"}
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
              <CalendarDays className="h-5 w-5 text-primary" />

              <h2 className="font-display text-xl font-bold">
                Échéance
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Période
                </p>

                <p className="mt-1 font-semibold">
                  {formatDate(
                    invoice.periodStart,
                  )}{" "}
                  →{" "}
                  {formatDate(
                    invoice.periodEnd,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Date d'échéance
                </p>

                <p className="mt-1 font-semibold">
                  {formatDate(
                    invoice.dueDate,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Statut
                </p>

                <p className="mt-1 font-semibold">
                  {getStatusLabel(
                    invoice.status,
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* QUITTANCE STATUS */}

        {!canDownloadQuittance &&
          invoice.kind ===
            "rent" && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              La quittance de loyer sera disponible lorsque cette facture sera intégralement réglée.
            </section>
          )}

        {/* PAYMENTS */}

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">
                Paiements associés
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {invoice.payments.length} règlement
                {invoice.payments.length !==
                1
                  ? "s"
                  : ""}
              </p>
            </div>

            <WalletCards className="h-6 w-6 text-primary" />
          </div>

          {invoice.payments.length ===
          0 ? (
            <div className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Aucun paiement enregistré pour cette facture.
            </div>
          ) : (
            <div className="space-y-3">
              {invoice.payments.map(
                (payment) => (
                  <div
                    key={
                      payment.id
                    }
                    className="flex flex-col justify-between gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-emerald-600" />

                        <p className="font-semibold">
                          {payment.reference ??
                            "Paiement"}
                        </p>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(
                          payment.paidAt ??
                            payment.createdAt,
                        )}{" "}
                        ·{" "}
                        {getPaymentMethodLabel(
                          payment.method,
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-bold text-emerald-700">
                        {formatMoney(
                          payment.amount,
                          payment.currency,
                        )}
                      </p>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        <Link
                          to={`/tenant/payments/${payment.id}`}
                        >
                          <FileText className="h-4 w-4" />
                          Voir le reçu
                        </Link>
                      </Button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    );
  };

export default TenantInvoiceDetailPage;