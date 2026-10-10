import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileText,
  FolderOpen,
  Home,
  ReceiptText,
  RefreshCw,
  UserRound,
  WalletCards,
  Wrench,
} from "lucide-react";

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
) => {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(amount) +
    ` ${currency}`;
};

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

// ============================================================
// STAT CARD
// ============================================================

type StatCardProps = {
  label: string;
  value: string;
  description: string;
  icon:
    React.ComponentType<{
      className?: string;
    }>;
};

const StatCard = ({
  label,
  value,
  description,
  icon: Icon,
}: StatCardProps) => {
  return (
    <div className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 break-words text-2xl font-bold tracking-tight">
            {value}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

// ============================================================
// INFO ROW
// ============================================================

type InfoRowProps = {
  label: string;
  value: string;
};

const InfoRow = ({
  label,
  value,
}: InfoRowProps) => {
  return (
    <div className="flex flex-col gap-1 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="text-sm font-medium text-foreground sm:text-right">
        {value}
      </span>
    </div>
  );
};

// ============================================================
// TENANT HOME
// ============================================================

const TenantHomePage = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } =
    useTenantPortalDashboard();

  // ==========================================================
  // LOADING
  // ==========================================================

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <div>
            <p className="font-medium">
              Chargement de votre espace
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Nous récupérons les informations de votre bail.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    isError ||
    !data
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de charger votre espace locataire.";

    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
        <h1 className="text-xl font-semibold text-destructive">
          Impossible de charger le tableau de bord
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {message}
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-5"
          onClick={() => {
            void refetch();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  // ==========================================================
  // DATA
  // ==========================================================

  const {
    tenant,
    activeLease,
    invoices,
    payments,
    maintenanceCount,
    documentsCount,
  } = data;

  const property =
    activeLease?.property ??
    null;

  const currency =
    invoices.currency ||
    property?.currency ||
    "GNF";

  const tenantName =
    tenant?.fullName?.trim() ||
    "Locataire";

  const firstName =
    tenantName.split(/\s+/)[0] ||
    tenantName;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="space-y-8">
      {/* ==================================================== */}
      {/* HEADER                                               */}
      {/* ==================================================== */}

      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary">
              Espace locataire
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Bonjour {firstName}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Retrouvez ici les informations essentielles de votre location.
            </p>
          </div>

          {activeLease && (
            <div className="inline-flex w-fit items-center rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700">
              Bail actif
            </div>
          )}
        </div>
      </section>

      {/* ==================================================== */}
      {/* KPI                                                  */}
      {/* ==================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Solde à payer"
          value={
            formatMoney(
              invoices.balanceDue,
              currency,
            )
          }
          description={
            invoices.open > 0
              ? `${invoices.open} facture${invoices.open > 1 ? "s" : ""} ouverte${invoices.open > 1 ? "s" : ""}`
              : "Aucune facture ouverte"
          }
          icon={CircleDollarSign}
        />

        <StatCard
          label="Mes factures"
          value={
            String(
              invoices.total,
            )
          }
          description={
            `${invoices.paid} payée${invoices.paid > 1 ? "s" : ""} · ${invoices.partiallyPaid} partiellement payée${invoices.partiallyPaid > 1 ? "s" : ""}`
          }
          icon={FileText}
        />

        <StatCard
          label="Mes paiements"
          value={
            String(
              payments.completed,
            )
          }
          description={
            `${formatMoney(
              payments.totalCompletedAmount,
              currency,
            )} réglés`
          }
          icon={WalletCards}
        />

        <StatCard
          label="Mes demandes"
          value={
            String(
              maintenanceCount,
            )
          }
          description="Demandes de maintenance"
          icon={Wrench}
        />
      </section>

      {/* ==================================================== */}
      {/* MAIN GRID                                            */}
      {/* ==================================================== */}

      <section className="grid gap-6 xl:grid-cols-3">
        {/* ================================================== */}
        {/* PROPERTY                                           */}
        {/* ================================================== */}

        <div className="rounded-2xl border bg-background shadow-sm xl:col-span-2">
          <div className="flex items-center gap-3 border-b p-5 sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Home className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Mon logement
              </h2>

              <p className="text-sm text-muted-foreground">
                Bien associé à votre bail actif
              </p>
            </div>
          </div>

          {property ? (
            <div className="p-5 sm:p-6">
              <div className="mb-6 rounded-xl bg-muted/50 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Logement
                    </p>

                    <h3 className="mt-1 text-xl font-semibold">
                      {property.title ??
                        "Logement"}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {property.reference ??
                        "Référence non renseignée"}
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {translatePropertyStatus(
                      property.status,
                    )}
                  </span>
                </div>
              </div>

              <div className="grid gap-x-8 md:grid-cols-2">
                <InfoRow
                  label="Loyer mensuel"
                  value={
                    formatMoney(
                      activeLease?.monthlyRent ??
                        0,
                      currency,
                    )
                  }
                />

                <InfoRow
                  label="Charges"
                  value={
                    formatMoney(
                      activeLease?.charges ??
                        0,
                      currency,
                    )
                  }
                />

                <InfoRow
                  label="Jour d'échéance"
                  value={
                    activeLease?.dueDay
                      ? `Le ${activeLease.dueDay} du mois`
                      : "—"
                  }
                />

                <InfoRow
                  label="Dépôt de garantie"
                  value={
                    formatMoney(
                      activeLease?.deposit ??
                        0,
                      currency,
                    )
                  }
                />
              </div>
            </div>
          ) : (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Aucun logement associé à un bail actif.
              </p>
            </div>
          )}
        </div>

        {/* ================================================== */}
        {/* TENANT PROFILE                                     */}
        {/* ================================================== */}

        <div className="rounded-2xl border bg-background shadow-sm">
          <div className="flex items-center gap-3 border-b p-5 sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Mon profil
              </h2>

              <p className="text-sm text-muted-foreground">
                Informations du locataire
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <InfoRow
              label="Nom"
              value={
                tenant?.fullName ??
                "—"
              }
            />

            <InfoRow
              label="Email"
              value={
                tenant?.email ??
                "—"
              }
            />

            <InfoRow
              label="Téléphone"
              value={
                tenant?.phone ??
                "—"
              }
            />
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* LEASE + ACTIVITY                                     */}
      {/* ==================================================== */}

      <section className="grid gap-6 lg:grid-cols-2">
        {/* ================================================== */}
        {/* LEASE                                              */}
        {/* ================================================== */}

        <div className="rounded-2xl border bg-background shadow-sm">
          <div className="flex items-center gap-3 border-b p-5 sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Mon bail
              </h2>

              <p className="text-sm text-muted-foreground">
                Informations contractuelles
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {activeLease ? (
              <>
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
                    formatDate(
                      activeLease.endDate,
                    )
                  }
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun bail actif trouvé.
              </p>
            )}
          </div>
        </div>

        {/* ================================================== */}
        {/* ACTIVITY                                           */}
        {/* ================================================== */}

        <div className="rounded-2xl border bg-background shadow-sm">
          <div className="flex items-center gap-3 border-b p-5 sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ReceiptText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Situation locative
              </h2>

              <p className="text-sm text-muted-foreground">
                Résumé de vos opérations
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <InfoRow
              label="Montant facturé"
              value={
                formatMoney(
                  invoices.totalAmount,
                  currency,
                )
              }
            />

            <InfoRow
              label="Montant réglé"
              value={
                formatMoney(
                  invoices.paidAmount,
                  currency,
                )
              }
            />

            <InfoRow
              label="Reste à payer"
              value={
                formatMoney(
                  invoices.balanceDue,
                  currency,
                )
              }
            />

            <InfoRow
              label="Factures en retard"
              value={
                String(
                  invoices.overdue,
                )
              }
            />
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* SECONDARY COUNTERS                                   */}
      {/* ==================================================== */}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border bg-background p-5 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderOpen className="h-5 w-5" />
          </div>

          <div>
            <p className="font-semibold">
              Mes documents
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {documentsCount} document
              {documentsCount !== 1
                ? "s"
                : ""}{" "}
              disponible
              {documentsCount !== 1
                ? "s"
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border bg-background p-5 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>

          <div>
            <p className="font-semibold">
              Prochaine échéance
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {activeLease?.dueDay
                ? `Loyer à régler le ${activeLease.dueDay} de chaque mois`
                : "Échéance non renseignée"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TenantHomePage;