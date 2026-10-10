import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Home,
  ReceiptText,
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

const translatePropertyStatus = (
  status: string | null,
) => {
  switch (status) {
    case "rented":
      return "Loué";

    case "available":
      return "Disponible";

    case "maintenance":
      return "Maintenance";

    case "unavailable":
      return "Indisponible";

    default:
      return status ?? "—";
  }
};

// ============================================================
// INFO ROW
// ============================================================

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

    <span className="text-sm font-semibold text-foreground sm:text-right">
      {value}
    </span>
  </div>
);

// ============================================================
// TENANT PROPERTY PAGE
// ============================================================

const TenantPropertyPage = () => {
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
            Chargement de votre logement...
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
        <div className="rounded-3xl border bg-card p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-destructive">
            Impossible de charger votre logement
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
  } = data;

  const property =
    activeLease?.property ??
    null;

  if (
    !activeLease ||
    !property
  ) {
    return (
      <div className="container py-12">
        <div className="rounded-3xl border bg-card p-8">
          <Home className="h-10 w-10 text-muted-foreground" />

          <h1 className="mt-4 font-display text-2xl font-bold">
            Aucun logement actif
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Aucun logement n'est actuellement associé à un bail actif.
          </p>
        </div>
      </div>
    );
  }

  const currency =
    property.currency ||
    invoices.currency ||
    "GNF";

  const monthlyTotal =
    activeLease.monthlyRent +
    activeLease.charges;

  return (
    <div className="container space-y-8 py-8 sm:py-10">
      {/* ==================================================== */}
      {/* BACK                                                 */}
      {/* ==================================================== */}

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
        className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-10"
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm ring-1 ring-primary-foreground/15">
            <Home className="h-4 w-4 text-secondary" />
            Mon logement
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
            {property.title ??
              "Mon logement"}
          </h1>

          <p className="mt-2 text-primary-foreground/70">
            {property.reference ??
              "Référence non renseignée"}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-4 py-2 text-sm ring-1 ring-emerald-300/20">
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
              {translatePropertyStatus(
                property.status,
              )}
            </span>

            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm ring-1 ring-primary-foreground/15">
              <Building2 className="h-4 w-4 text-secondary" />
              Bail actif
            </span>
          </div>
        </div>
      </motion.section>

      {/* ==================================================== */}
      {/* KPI                                                  */}
      {/* ==================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/75 p-5 text-white shadow-lg">
          <CircleDollarSign className="h-6 w-6 text-secondary" />

          <p className="mt-5 text-sm text-white/70">
            Loyer mensuel
          </p>

          <p className="mt-1 text-2xl font-bold">
            {formatMoney(
              activeLease.monthlyRent,
              currency,
            )}
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-lg">
          <ReceiptText className="h-6 w-6" />

          <p className="mt-5 text-sm text-white/80">
            Charges
          </p>

          <p className="mt-1 text-2xl font-bold">
            {formatMoney(
              activeLease.charges,
              currency,
            )}
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg">
          <ShieldCheck className="h-6 w-6" />

          <p className="mt-5 text-sm text-white/80">
            Total mensuel
          </p>

          <p className="mt-1 text-2xl font-bold">
            {formatMoney(
              monthlyTotal,
              currency,
            )}
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-700 p-5 text-white shadow-lg">
          <CalendarDays className="h-6 w-6" />

          <p className="mt-5 text-sm text-white/80">
            Échéance
          </p>

          <p className="mt-1 text-2xl font-bold">
            {activeLease.dueDay
              ? `Le ${activeLease.dueDay}`
              : "—"}
          </p>

          <p className="mt-1 text-xs text-white/65">
            de chaque mois
          </p>
        </div>
      </section>

      {/* ==================================================== */}
      {/* DETAILS                                              */}
      {/* ==================================================== */}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b bg-gradient-to-r from-primary/10 to-background p-6">
            <h2 className="font-display text-xl font-bold">
              Informations du logement
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Informations liées au bien occupé
            </p>
          </div>

          <div className="p-6">
            <InfoRow
              label="Nom du logement"
              value={
                property.title ??
                "—"
              }
            />

            <InfoRow
              label="Référence"
              value={
                property.reference ??
                "—"
              }
            />

            <InfoRow
              label="Statut"
              value={
                translatePropertyStatus(
                  property.status,
                )
              }
            />

            <InfoRow
              label="Devise"
              value={currency}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b bg-gradient-to-r from-amber-50 to-background p-6">
            <h2 className="font-display text-xl font-bold">
              Conditions locatives
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Montants et échéances du bail actif
            </p>
          </div>

          <div className="p-6">
            <InfoRow
              label="Loyer"
              value={
                formatMoney(
                  activeLease.monthlyRent,
                  currency,
                )
              }
            />

            <InfoRow
              label="Charges"
              value={
                formatMoney(
                  activeLease.charges,
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
              label="Début d'occupation"
              value={
                formatDate(
                  activeLease.startDate,
                )
              }
            />
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* BAIL CTA                                             */}
      {/* ==================================================== */}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-white/70">
              Contrat associé
            </p>

            <h2 className="mt-1 font-display text-2xl font-bold">
              {activeLease.reference ??
                "Mon bail"}
            </h2>

            <p className="mt-2 text-sm text-white/75">
              Consultez les informations contractuelles de votre location.
            </p>
          </div>

          <Button
            asChild
            variant="secondary"
            className="shrink-0"
          >
            <Link to="/tenant/lease">
              Voir mon bail
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default TenantPropertyPage;