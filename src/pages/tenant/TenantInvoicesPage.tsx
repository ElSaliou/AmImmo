import type {
  ReactNode,
} from "react";

import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import {
  type TenantPortalInvoice,
  type TenantPortalInvoiceStatus,
  useTenantPortalInvoices,
} from "@/hooks/use-tenant-portal";

import {
  Button,
} from "@/components/ui/button";

// ============================================================
// HELPERS
// ============================================================

const formatMoney = (
  amount: number,
  currency: string,
) =>
  `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(amount)} ${currency}`;

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

const getInvoiceStatusLabel = (
  status: TenantPortalInvoiceStatus,
) => {
  switch (status) {
    case "draft":
      return "Brouillon";

    case "issued":
      return "Émise";

    case "partially_paid":
      return "Partiellement payée";

    case "paid":
      return "Payée";

    case "overdue":
      return "En retard";

    case "cancelled":
      return "Annulée";

    default:
      return status;
  }
};

const getInvoiceKindLabel = (
  kind: string,
) => {
  switch (kind) {
    case "rent":
      return "Loyer";

    case "deposit":
      return "Caution";

    case "charges":
      return "Charges";

    case "service":
      return "Service";

    case "penalty":
      return "Pénalité";

    case "booking":
      return "Séjour";

    case "commission":
      return "Commission";

    default:
      return kind || "Facture";
  }
};

// ============================================================
// STATUS BADGE
// ============================================================

const InvoiceStatusBadge = ({
  status,
}: {
  status:
    TenantPortalInvoiceStatus;
}) => {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold";

  switch (status) {
    case "paid":
      return (
        <span
          className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          Payée
        </span>
      );

    case "partially_paid":
      return (
        <span
          className={`${base} border-amber-200 bg-amber-50 text-amber-700`}
        >
          <Clock3 className="h-3.5 w-3.5" />
          Partiellement payée
        </span>
      );

    case "overdue":
      return (
        <span
          className={`${base} border-red-200 bg-red-50 text-red-700`}
        >
          <Clock3 className="h-3.5 w-3.5" />
          En retard
        </span>
      );

    case "issued":
      return (
        <span
          className={`${base} border-blue-200 bg-blue-50 text-blue-700`}
        >
          <FileText className="h-3.5 w-3.5" />
          Émise
        </span>
      );

    case "cancelled":
      return (
        <span
          className={`${base} border-slate-200 bg-slate-100 text-slate-600`}
        >
          Annulée
        </span>
      );

    default:
      return (
        <span
          className={`${base} border-slate-200 bg-slate-50 text-slate-600`}
        >
          {getInvoiceStatusLabel(
            status,
          )}
        </span>
      );
  }
};

// ============================================================
// STAT CARD
// ============================================================

const StatCard = ({
  label,
  value,
  description,
  icon,
  className,
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  className: string;
}) => (
  <motion.div
    initial={{
      opacity: 0,
      y: 20,
    }}
    animate={{
      opacity: 1,
      y: 0,
    }}
    className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-lg ${className}`}
  >
    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

    <div className="relative">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-white/80">
          {label}
        </p>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
          {icon}
        </div>
      </div>

      <p className="mt-5 text-2xl font-bold sm:text-3xl">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-white/70">
        {description}
      </p>
    </div>
  </motion.div>
);

// ============================================================
// INVOICE CARD
// ============================================================

const InvoiceCard = ({
  invoice,
}: {
  invoice:
    TenantPortalInvoice;
}) => {
  const progress =
    invoice.amount > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (
                invoice.paidAmount /
                invoice.amount
              ) * 100,
            ),
          ),
        )
      : 0;

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 18,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
      }}
      className="overflow-hidden rounded-3xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="border-b bg-gradient-to-r from-primary/5 via-background to-secondary/5 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {getInvoiceKindLabel(
                  invoice.kind,
                )}
              </span>

              <InvoiceStatusBadge
                status={
                  invoice.status
                }
              />
            </div>

            <h2 className="mt-4 font-display text-xl font-bold text-foreground">
              {invoice.number}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Émise le{" "}
              {formatDate(
                invoice.issueDate,
              )}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Montant
            </p>

            <p className="mt-1 text-2xl font-bold text-foreground">
              {formatMoney(
                invoice.amount,
                invoice.currency,
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Montant payé
            </p>

            <p className="mt-1 font-semibold text-emerald-700">
              {formatMoney(
                invoice.paidAmount,
                invoice.currency,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Reste à payer
            </p>

            <p
              className={`mt-1 font-semibold ${
                invoice.balanceDue > 0
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              {formatMoney(
                invoice.balanceDue,
                invoice.currency,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Échéance
            </p>

            <p className="mt-1 font-semibold text-foreground">
              {formatDate(
                invoice.dueDate,
              )}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">
              Progression du règlement
            </span>

            <span className="font-semibold text-foreground">
              {progress}%
            </span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>
        </div>

        {(invoice.periodStart ||
          invoice.periodEnd) && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-muted/50 p-4">
            <CalendarDays className="h-5 w-5 shrink-0 text-primary" />

            <div>
              <p className="text-xs text-muted-foreground">
                Période facturée
              </p>

              <p className="mt-0.5 text-sm font-medium">
                {formatDate(
                  invoice.periodStart,
                )}{" "}
                →{" "}
                {formatDate(
                  invoice.periodEnd,
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.article>
  );
};

// ============================================================
// PAGE
// ============================================================

const TenantInvoicesPage = () => {
  const {
    data:
      invoices = [],
    isLoading,
    isError,
    error,
    refetch,
  } =
    useTenantPortalInvoices();

  if (isLoading) {
    return (
      <div className="container flex min-h-[520px] items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <p className="mt-4 text-sm text-muted-foreground">
            Chargement de vos loyers...
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
            Impossible de charger vos factures
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error
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

  const totalAmount =
    invoices.reduce(
      (
        total,
        invoice,
      ) =>
        total +
        invoice.amount,
      0,
    );

  const totalPaid =
    invoices.reduce(
      (
        total,
        invoice,
      ) =>
        total +
        invoice.paidAmount,
      0,
    );

  const totalBalance =
    invoices.reduce(
      (
        total,
        invoice,
      ) =>
        total +
        invoice.balanceDue,
      0,
    );

  const paidCount =
    invoices.filter(
      (invoice) =>
        invoice.status ===
        "paid",
    ).length;

  const openCount =
    invoices.filter(
      (invoice) =>
        invoice.status !==
          "paid" &&
        invoice.status !==
          "cancelled",
    ).length;

  const currency =
    invoices[0]
      ?.currency ??
    "GNF";

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

      {/* ==================================================== */}
      {/* HERO                                                 */}
      {/* ==================================================== */}

      <section className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm ring-1 ring-primary-foreground/15">
            <ReceiptText className="h-4 w-4 text-secondary" />
            Espace financier
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
            Mes loyers
          </h1>

          <p className="mt-3 max-w-2xl text-primary-foreground/75">
            Retrouvez vos factures locatives, les montants déjà réglés
            et le solde restant pour chaque échéance.
          </p>
        </div>
      </section>

      {/* ==================================================== */}
      {/* KPI                                                  */}
      {/* ==================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Montant facturé"
          value={
            formatMoney(
              totalAmount,
              currency,
            )
          }
          description={`${invoices.length} facture${invoices.length !== 1 ? "s" : ""}`}
          icon={
            <FileText className="h-5 w-5" />
          }
          className="from-primary via-primary/95 to-primary/75 shadow-primary/20"
        />

        <StatCard
          label="Montant réglé"
          value={
            formatMoney(
              totalPaid,
              currency,
            )
          }
          description={`${paidCount} facture${paidCount !== 1 ? "s" : ""} entièrement payée${paidCount !== 1 ? "s" : ""}`}
          icon={
            <FileCheck2 className="h-5 w-5" />
          }
          className="from-emerald-500 via-emerald-600 to-emerald-700 shadow-emerald-500/20"
        />

        <StatCard
          label="Reste à payer"
          value={
            formatMoney(
              totalBalance,
              currency,
            )
          }
          description={`${openCount} facture${openCount !== 1 ? "s" : ""} ouverte${openCount !== 1 ? "s" : ""}`}
          icon={
            <CircleDollarSign className="h-5 w-5" />
          }
          className="from-amber-400 via-amber-500 to-orange-500 shadow-amber-500/20"
        />

        <StatCard
          label="Factures"
          value={
            String(
              invoices.length,
            )
          }
          description="Historique de votre dossier locatif"
          icon={
            <ReceiptText className="h-5 w-5" />
          }
          className="from-violet-500 via-purple-600 to-indigo-700 shadow-violet-500/20"
        />
      </section>

      {/* ==================================================== */}
      {/* INVOICES                                             */}
      {/* ==================================================== */}

      <section>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold">
              Historique des factures
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Factures visibles sur votre espace locataire.
            </p>
          </div>

          <Button
            asChild
            variant="outline"
            className="rounded-xl"
          >
            <Link to="/tenant/payments">
              <WalletCards className="h-4 w-4" />
              Voir mes paiements
            </Link>
          </Button>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-3xl border bg-card p-10 text-center shadow-sm">
            <ReceiptText className="mx-auto h-12 w-12 text-muted-foreground/30" />

            <h3 className="mt-4 font-display text-xl font-bold">
              Aucune facture
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Aucune facture locative n'est disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {invoices.map(
              (invoice) => (
                <InvoiceCard
                  key={
                    invoice.id
                  }
                  invoice={
                    invoice
                  }
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default TenantInvoicesPage;