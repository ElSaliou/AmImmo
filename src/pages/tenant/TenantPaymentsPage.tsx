import type {
  ReactNode,
} from "react";

import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  Landmark,
  ReceiptText,
  RefreshCw,
  Smartphone,
  WalletCards,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import {
  type TenantPortalPayment,
  useTenantPortalPayments,
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
      maximumFractionDigits:
        0,
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

    case "other":
      return "Autre";

    default:
      return (
        method ||
        "Non renseigné"
      );
  }
};

const getPaymentStatusLabel = (
  status:
    | string
    | null,
) => {
  switch (status) {
    case "completed":
    case "paid":
      return "Effectué";

    case "pending":
      return "En attente";

    case "failed":
      return "Échoué";

    case "cancelled":
      return "Annulé";

    case "refunded":
      return "Remboursé";

    default:
      return (
        status ||
        "Non renseigné"
      );
  }
};

// ============================================================
// METHOD ICON
// ============================================================

const PaymentMethodIcon = ({
  method,
}: {
  method:
    | string
    | null;
}) => {
  switch (method) {
    case "cash":
      return (
        <Banknote className="h-5 w-5" />
      );

    case "transfer":
    case "bank_transfer":
      return (
        <Landmark className="h-5 w-5" />
      );

    case "mobile_money":
      return (
        <Smartphone className="h-5 w-5" />
      );

    case "card":
      return (
        <CreditCard className="h-5 w-5" />
      );

    default:
      return (
        <WalletCards className="h-5 w-5" />
      );
  }
};

// ============================================================
// PAYMENT STATUS
// ============================================================

const PaymentStatusBadge = ({
  status,
}: {
  status:
    | string
    | null;
}) => {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold";

  if (
    status ===
      "completed" ||
    status ===
      "paid"
  ) {
    return (
      <span
        className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}
      >
        <BadgeCheck className="h-3.5 w-3.5" />
        Effectué
      </span>
    );
  }

  if (
    status ===
    "pending"
  ) {
    return (
      <span
        className={`${base} border-amber-200 bg-amber-50 text-amber-700`}
      >
        <Clock3 className="h-3.5 w-3.5" />
        En attente
      </span>
    );
  }

  if (
    status ===
    "refunded"
  ) {
    return (
      <span
        className={`${base} border-violet-200 bg-violet-50 text-violet-700`}
      >
        Remboursé
      </span>
    );
  }

  if (
    status ===
      "failed" ||
    status ===
      "cancelled"
  ) {
    return (
      <span
        className={`${base} border-red-200 bg-red-50 text-red-700`}
      >
        {getPaymentStatusLabel(
          status,
        )}
      </span>
    );
  }

  return (
    <span
      className={`${base} border-slate-200 bg-slate-50 text-slate-600`}
    >
      {getPaymentStatusLabel(
        status,
      )}
    </span>
  );
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
// PAYMENT CARD
// ============================================================

const PaymentCard = ({
  payment,
}: {
  payment:
    TenantPortalPayment;
}) => (
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
    <div className="p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-500/20">
            <PaymentMethodIcon
              method={
                payment.method
              }
            />
          </div>

          <div>
            <PaymentStatusBadge
              status={
                payment.status
              }
            />

            <h2 className="mt-3 font-display text-lg font-bold">
              {payment.reference ??
                "Paiement"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {getPaymentMethodLabel(
                payment.method,
              )}
            </p>
          </div>
        </div>

        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Montant
          </p>

          <p
            className={`mt-1 text-2xl font-bold ${
              payment.isRefund
                ? "text-violet-700"
                : "text-emerald-700"
            }`}
          >
            {payment.isRefund
              ? "− "
              : ""}

            {formatMoney(
              payment.amount,
              payment.currency,
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t pt-5 md:grid-cols-3">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />

          <div>
            <p className="text-xs text-muted-foreground">
              Date du paiement
            </p>

            <p className="mt-1 text-sm font-semibold">
              {formatDate(
                payment.paidAt ??
                  payment.createdAt,
              )}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-4 w-4 text-primary" />

          <div>
            <p className="text-xs text-muted-foreground">
              Facture liée
            </p>

            <p className="mt-1 text-sm font-semibold">
              {payment.invoiceNumber ??
                "—"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <WalletCards className="mt-0.5 h-4 w-4 text-primary" />

          <div>
            <p className="text-xs text-muted-foreground">
              Moyen de paiement
            </p>

            <p className="mt-1 text-sm font-semibold">
              {getPaymentMethodLabel(
                payment.method,
              )}
            </p>
          </div>
        </div>
      </div>

      {payment.isRefund && (
        <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-700">
          Cette opération correspond à un remboursement.
        </div>
      )}

      <div className="mt-6 flex justify-end border-t pt-5">
        <Button
          asChild
          variant="outline"
          className="rounded-xl"
        >
          <Link
            to={`/tenant/payments/${payment.id}`}
          >
            <Eye className="h-4 w-4" />
            Voir le détail
          </Link>
        </Button>
      </div>
    </div>
  </motion.article>
);

// ============================================================
// PAGE
// ============================================================

const TenantPaymentsPage =
  () => {
    const {
      data:
        payments = [],

      isLoading,

      isError,

      error,

      refetch,
    } =
      useTenantPortalPayments();

    if (isLoading) {
      return (
        <div className="container flex min-h-[520px] items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

            <p className="mt-4 text-sm text-muted-foreground">
              Chargement de vos paiements...
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
              Impossible de charger vos paiements
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

    const completedPayments =
      payments.filter(
        (payment) =>
          (
            payment.status ===
              "completed" ||
            payment.status ===
              "paid"
          ) &&
          !payment.isRefund,
      );

    const completedAmount =
      completedPayments.reduce(
        (
          total,
          payment,
        ) =>
          total +
          payment.amount,
        0,
      );

    const pendingCount =
      payments.filter(
        (payment) =>
          payment.status ===
          "pending",
      ).length;

    const refundAmount =
      payments
        .filter(
          (payment) =>
            payment.isRefund ||
            payment.status ===
              "refunded",
        )
        .reduce(
          (
            total,
            payment,
          ) =>
            total +
            payment.amount,
          0,
        );

    const currency =
      payments[0]
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

        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-700 via-emerald-700 to-primary p-7 text-white shadow-xl sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15">
              <WalletCards className="h-4 w-4 text-secondary" />
              Historique financier
            </div>

            <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
              Mes paiements
            </h1>

            <p className="mt-3 max-w-2xl text-white/75">
              Consultez les règlements enregistrés sur votre dossier
              et les factures auxquelles ils sont associés.
            </p>
          </div>
        </section>

        {/* ==================================================== */}
        {/* KPI                                                  */}
        {/* ==================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total réglé"
            value={
              formatMoney(
                completedAmount,
                currency,
              )
            }
            description="Paiements effectivement enregistrés"
            icon={
              <CircleDollarSign className="h-5 w-5" />
            }
            className="from-emerald-500 via-emerald-600 to-emerald-700 shadow-emerald-500/20"
          />

          <StatCard
            label="Paiements effectués"
            value={
              String(
                completedPayments.length,
              )
            }
            description={`${payments.length} opération${payments.length !== 1 ? "s" : ""} au total`}
            icon={
              <BadgeCheck className="h-5 w-5" />
            }
            className="from-primary via-primary/95 to-primary/75 shadow-primary/20"
          />

          <StatCard
            label="En attente"
            value={
              String(
                pendingCount,
              )
            }
            description="Paiements non encore finalisés"
            icon={
              <Clock3 className="h-5 w-5" />
            }
            className="from-amber-400 via-amber-500 to-orange-500 shadow-amber-500/20"
          />

          <StatCard
            label="Remboursements"
            value={
              formatMoney(
                refundAmount,
                currency,
              )
            }
            description="Montants remboursés ou extournés"
            icon={
              <ReceiptText className="h-5 w-5" />
            }
            className="from-violet-500 via-purple-600 to-indigo-700 shadow-violet-500/20"
          />
        </section>

        {/* ==================================================== */}
        {/* PAYMENTS                                             */}
        {/* ==================================================== */}

        <section>
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-2xl font-bold">
                Historique des règlements
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Toutes les opérations visibles sur votre dossier.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="rounded-xl"
            >
              <Link to="/tenant/invoices">
                <ReceiptText className="h-4 w-4" />
                Voir mes loyers
              </Link>
            </Button>
          </div>

          {payments.length ===
          0 ? (
            <div className="rounded-3xl border bg-card p-10 text-center shadow-sm">
              <WalletCards className="mx-auto h-12 w-12 text-muted-foreground/30" />

              <h3 className="mt-4 font-display text-xl font-bold">
                Aucun paiement
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                Aucun règlement n'est disponible pour le moment.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {payments.map(
                (payment) => (
                  <PaymentCard
                    key={
                      payment.id
                    }
                    payment={
                      payment
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

export default TenantPaymentsPage;