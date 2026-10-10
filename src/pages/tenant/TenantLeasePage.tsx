import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Home,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import {
  useTenantPortalDashboard,
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

const translateLeaseStatus = (
  status: string | null,
) => {
  switch (status) {
    case "active":
      return "Actif";

    case "pending":
      return "En attente";

    case "terminated":
      return "Résilié";

    case "expired":
      return "Expiré";

    default:
      return status ?? "—";
  }
};

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex flex-col gap-1 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    <span className="text-sm text-muted-foreground">
      {label}
    </span>

    <span className="text-sm font-semibold sm:text-right">
      {value}
    </span>
  </div>
);

// ============================================================
// TENANT LEASE PAGE
// ============================================================

const TenantLeasePage = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } =
    useTenantPortalDashboard();

  if (isLoading) {
    return (
      <div className="container flex min-h-[500px] items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <p className="mt-4 text-sm text-muted-foreground">
            Chargement de votre bail...
          </p>
        </div>
      </div>
    );
  }

  if (
    isError ||
    !data
  ) {
    return (
      <div className="container py-12">
        <div className="rounded-3xl border bg-card p-8">
          <h1 className="text-xl font-semibold text-destructive">
            Impossible de charger votre bail
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Une erreur est survenue."}
          </p>

          <Button
            variant="outline"
            className="mt-5"
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
    activeLease,
    invoices,
    payments,
  } = data;

  if (!activeLease) {
    return (
      <div className="container py-12">
        <div className="rounded-3xl border bg-card p-8">
          <FileText className="h-10 w-10 text-muted-foreground" />

          <h1 className="mt-4 font-display text-2xl font-bold">
            Aucun bail actif
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Aucun contrat de location actif n'a été trouvé.
          </p>
        </div>
      </div>
    );
  }

  const currency =
    invoices.currency ||
    activeLease.property
      ?.currency ||
    "GNF";

  const monthlyTotal =
    activeLease.monthlyRent +
    activeLease.charges;

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

      <motion.section
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-indigo-700 to-primary p-7 text-white shadow-xl sm:p-10"
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15">
            <FileText className="h-4 w-4 text-secondary" />
            Mon bail
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
            {activeLease.reference ??
              "Contrat de location"}
          </h1>

          <p className="mt-2 text-white/70">
            Contrat actuellement associé à votre logement
          </p>

          <div className="mt-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-4 py-2 text-sm ring-1 ring-emerald-300/20">
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
              {translateLeaseStatus(
                activeLease.status,
              )}
            </span>
          </div>
        </div>
      </motion.section>

      {/* ==================================================== */}
      {/* KPI                                                  */}
      {/* ==================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <CircleDollarSign className="h-6 w-6 text-primary" />

          <p className="mt-4 text-sm text-muted-foreground">
            Loyer
          </p>

          <p className="mt-1 text-xl font-bold">
            {formatMoney(
              activeLease.monthlyRent,
              currency,
            )}
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <ReceiptText className="h-6 w-6 text-amber-500" />

          <p className="mt-4 text-sm text-muted-foreground">
            Charges
          </p>

          <p className="mt-1 text-xl font-bold">
            {formatMoney(
              activeLease.charges,
              currency,
            )}
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <WalletCards className="h-6 w-6 text-emerald-600" />

          <p className="mt-4 text-sm text-muted-foreground">
            Total mensuel
          </p>

          <p className="mt-1 text-xl font-bold">
            {formatMoney(
              monthlyTotal,
              currency,
            )}
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <CalendarDays className="h-6 w-6 text-violet-600" />

          <p className="mt-4 text-sm text-muted-foreground">
            Échéance
          </p>

          <p className="mt-1 text-xl font-bold">
            {activeLease.dueDay
              ? `Le ${activeLease.dueDay}`
              : "—"}
          </p>
        </div>
      </section>

      {/* ==================================================== */}
      {/* CONTRACT                                             */}
      {/* ==================================================== */}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b bg-gradient-to-r from-violet-50 to-background p-6">
            <h2 className="font-display text-xl font-bold">
              Informations contractuelles
            </h2>
          </div>

          <div className="p-6">
            <InfoRow
              label="Référence"
              value={
                activeLease.reference ??
                "—"
              }
            />

            <InfoRow
              label="Statut"
              value={
                translateLeaseStatus(
                  activeLease.status,
                )
              }
            />

            <InfoRow
              label="Date de début"
              value={
                formatDate(
                  activeLease.startDate,
                )
              }
            />

            <InfoRow
              label="Date de fin"
              value={
                activeLease.endDate
                  ? formatDate(
                      activeLease.endDate,
                    )
                  : "Non renseignée"
              }
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b bg-gradient-to-r from-amber-50 to-background p-6">
            <h2 className="font-display text-xl font-bold">
              Conditions financières
            </h2>
          </div>

          <div className="p-6">
            <InfoRow
              label="Loyer mensuel"
              value={
                formatMoney(
                  activeLease.monthlyRent,
                  currency,
                )
              }
            />

            <InfoRow
              label="Charges mensuelles"
              value={
                formatMoney(
                  activeLease.charges,
                  currency,
                )
              }
            />

            <InfoRow
              label="Total mensuel"
              value={
                formatMoney(
                  monthlyTotal,
                  currency,
                )
              }
            />

            <InfoRow
              label="Dépôt de garantie"
              value={
                formatMoney(
                  activeLease.deposit,
                  currency,
                )
              }
            />

            <InfoRow
              label="Jour d'échéance"
              value={
                activeLease.dueDay
                  ? `Le ${activeLease.dueDay} de chaque mois`
                  : "—"
              }
            />
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* STATUS                                               */}
      {/* ==================================================== */}

      <section className="rounded-3xl border bg-gradient-to-r from-emerald-50 via-card to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h2 className="font-display text-xl font-bold">
                Bail actif
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {payments.completed} paiement
                {payments.completed !== 1
                  ? "s"
                  : ""} enregistré
                {payments.completed !== 1
                  ? "s"
                  : ""} sur votre dossier.
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
          >
            <Link to="/tenant/property">
              Voir mon logement
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default TenantLeasePage;