import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Percent,
  ShieldCheck,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import PageShell from "@/components/PageShell";

import {
  useMyOwnerMandates,
  type OwnerMandate,
} from "@/hooks/use-owner-portal";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

// ============================================================
// FORMATTERS
// ============================================================

function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

function formatMoney(
  value:
    | number
    | null
    | undefined,
  currency = "GNF",
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(
    Number(value),
  )} ${currency}`;
}

// ============================================================
// TYPE
// ============================================================

function getMandateTypeLabel(
  type:
    | string
    | null
    | undefined,
) {
  switch (type) {
    case "management":
      return "Gestion";

    case "rental":
      return "Location";

    case "sale":
      return "Vente";

    default:
      return type || "—";
  }
}

// ============================================================
// STATUS
// ============================================================

function getStatusUi(
  status:
    | string
    | null
    | undefined,
) {
  switch (status) {
    case "active":
      return {
        label: "Actif",
        className:
          "bg-success/15 text-success",
      };

    case "draft":
      return {
        label: "Brouillon",
        className:
          "bg-muted text-muted-foreground",
      };

    case "expired":
      return {
        label: "Expiré",
        className:
          "bg-warning/15 text-warning",
      };

    case "terminated":
      return {
        label: "Résilié",
        className:
          "bg-destructive/15 text-destructive",
      };

    default:
      return {
        label:
          status || "—",
        className:
          "bg-muted text-muted-foreground",
      };
  }
}

// ============================================================
// CURRENT STATUS
// ============================================================

function isMandateCurrentlyActive(
  mandate: OwnerMandate,
) {
  if (
    mandate.status !==
    "active"
  ) {
    return false;
  }

  const now =
    new Date();

  const start =
    new Date(
      `${mandate.start_date}T00:00:00`,
    );

  if (
    start > now
  ) {
    return false;
  }

  if (
    mandate.end_date
  ) {
    const end =
      new Date(
        `${mandate.end_date}T23:59:59`,
      );

    if (
      end < now
    ) {
      return false;
    }
  }

  return true;
}

// ============================================================
// KPI
// ============================================================

type KpiCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
};

const KpiCard = ({
  title,
  value,
  subtitle,
  icon,
}: KpiCardProps) => {
  return (
    <div className="premium-card min-w-0 p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground sm:text-sm">
            {title}
          </p>

          <p className="mt-1 break-words text-xl font-bold tracking-tight sm:text-2xl">
            {value}
          </p>

          <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            {subtitle}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10">
          {icon}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// INFO BLOCK
// ============================================================

type InfoBlockProps = {
  label: string;
  children: React.ReactNode;
};

const InfoBlock = ({
  label,
  children,
}: InfoBlockProps) => {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </p>

      <div className="mt-1 min-w-0">
        {children}
      </div>
    </div>
  );
};

// ============================================================
// MANDATE CARD
// ============================================================

type MandateCardProps = {
  mandate: OwnerMandate;
  index: number;
};

const MandateCard = ({
  mandate,
  index,
}: MandateCardProps) => {
  const status =
    getStatusUi(
      mandate.status,
    );

  const active =
    isMandateCurrentlyActive(
      mandate,
    );

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay:
          index * 0.03,
      }}
      className="premium-card min-w-0 overflow-hidden"
    >
      {/* ===================================================== */}
      {/* HEADER                                                */}
      {/* ===================================================== */}

      <div className="flex min-w-0 flex-col gap-4 border-b bg-muted/20 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <FileCheck2 className="h-5 w-5 shrink-0 text-primary" />

            <h2 className="min-w-0 break-all text-sm font-semibold sm:text-base">
              {mandate.reference}
            </h2>

            <Badge
              className={`${status.className} shrink-0 whitespace-nowrap border-0 text-[10px] sm:text-xs`}
            >
              {status.label}
            </Badge>

            {active && (
              <Badge
                variant="outline"
                className="shrink-0 whitespace-nowrap border-success/30 bg-success/5 text-[10px] text-success sm:text-xs"
              >
                En cours
              </Badge>
            )}
          </div>

          <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">
            Mandat de{" "}
            <span className="font-medium text-foreground">
              {getMandateTypeLabel(
                mandate.mandate_type,
              ).toLowerCase()}
            </span>
          </p>
        </div>

        {mandate.document_url && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full shrink-0 gap-2 sm:w-fit"
            asChild
          >
            <a
              href={
                mandate.document_url
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="h-4 w-4" />

              Document

              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>

      {/* ===================================================== */}
      {/* CONTENT                                               */}
      {/* ===================================================== */}

      <div className="grid min-w-0 gap-5 p-4 sm:gap-6 sm:p-5 lg:grid-cols-3">
        {/* =================================================== */}
        {/* TYPE / EXCLUSIVITY                                  */}
        {/* =================================================== */}

        <div className="min-w-0 space-y-4">
          <InfoBlock label="Type de mandat">
            <p className="break-words text-sm font-semibold">
              {getMandateTypeLabel(
                mandate.mandate_type,
              )}
            </p>
          </InfoBlock>

          <InfoBlock label="Exclusivité">
            <div className="flex min-w-0 items-start gap-2">
              <ShieldCheck
                className={
                  mandate.exclusive
                    ? "mt-0.5 h-4 w-4 shrink-0 text-success"
                    : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                }
              />

              <span className="min-w-0 break-words text-sm font-medium leading-relaxed">
                {mandate.exclusive
                  ? "Mandat exclusif"
                  : "Mandat non exclusif"}
              </span>
            </div>
          </InfoBlock>
        </div>

        {/* =================================================== */}
        {/* PERIOD                                              */}
        {/* =================================================== */}

        <div className="min-w-0 space-y-4">
          <InfoBlock label="Date de début">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />

              <span className="text-sm font-medium">
                {formatDate(
                  mandate.start_date,
                )}
              </span>
            </div>
          </InfoBlock>

          <InfoBlock label="Date de fin">
            <div className="flex min-w-0 items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <span className="min-w-0 break-words text-sm font-medium leading-relaxed">
                {mandate.end_date
                  ? formatDate(
                      mandate.end_date,
                    )
                  : "Durée indéterminée"}
              </span>
            </div>
          </InfoBlock>
        </div>

        {/* =================================================== */}
        {/* COMMISSION                                          */}
        {/* =================================================== */}

        <div className="min-w-0 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 shrink-0 text-primary" />

            <p className="text-sm font-semibold">
              Rémunération
            </p>
          </div>

          {mandate.commission_rate !==
          null ? (
            <div className="mt-4 min-w-0">
              <p className="break-words text-2xl font-bold tracking-tight">
                {mandate.commission_rate}%
              </p>

              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Commission contractuelle
              </p>
            </div>
          ) : mandate.commission_fixed !==
              null &&
            mandate.commission_fixed >
              0 ? (
            <div className="mt-4 min-w-0">
              <p className="break-words text-lg font-bold tracking-tight sm:text-xl">
                {formatMoney(
                  mandate.commission_fixed,
                )}
              </p>

              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Commission fixe
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Aucune commission renseignée
              </p>
            </div>
          )}

          {mandate.commission_rate !==
            null &&
            mandate.commission_fixed !==
              null &&
            mandate.commission_fixed >
              0 && (
              <p className="mt-3 break-words text-xs leading-relaxed text-muted-foreground">
                Commission fixe complémentaire :{" "}
                <span className="font-medium text-foreground">
                  {formatMoney(
                    mandate.commission_fixed,
                  )}
                </span>
              </p>
            )}
        </div>
      </div>

      {/* ===================================================== */}
      {/* CONDITIONS                                            */}
      {/* ===================================================== */}

      {mandate.conditions && (
        <div className="border-t bg-muted/10 px-4 py-4 sm:px-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
            Conditions
          </p>

          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/80">
            {mandate.conditions}
          </p>
        </div>
      )}
    </motion.article>
  );
};

// ============================================================
// PAGE
// ============================================================

const OwnerMandatesPage =
  () => {
    const {
      data: mandates,
      isLoading,
      isError,
      error,
      refetch,
    } =
      useMyOwnerMandates();

    const rows =
      mandates ?? [];

    const activeRows =
      rows.filter(
        isMandateCurrentlyActive,
      );

    const exclusiveRows =
      rows.filter(
        (mandate) =>
          mandate.exclusive,
      );

    const percentageRates =
      activeRows
        .map(
          (mandate) =>
            mandate.commission_rate,
        )
        .filter(
          (
            value,
          ): value is number =>
            value !== null,
        );

    const averageRate =
      percentageRates.length > 0
        ? percentageRates.reduce(
            (
              total,
              value,
            ) =>
              total +
              value,
            0,
          ) /
          percentageRates.length
        : null;

    // ========================================================
    // LOADING
    // ========================================================

    if (isLoading) {
      return (
        <div className="flex min-h-[20rem] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }

    // ========================================================
    // ERROR
    // ========================================================

    if (isError) {
      return (
        <div className="premium-card border-destructive/20 bg-destructive/5 p-5 sm:p-6">
          <h1 className="font-semibold text-destructive">
            Impossible de charger vos mandats
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Une erreur est survenue pendant la récupération de vos mandats.
          </p>

          {error instanceof
            Error && (
            <p className="mt-3 break-words text-xs text-destructive">
              {error.message}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="mt-5 w-full sm:w-auto"
            onClick={() =>
              void refetch()
            }
          >
            Réessayer
          </Button>
        </div>
      );
    }

    return (
      <PageShell
        title="Mes mandats"
        subtitle="Consultez vos mandats de gestion, location et vente"
        actions={
          <Badge
            variant="outline"
            className="bg-background"
          >
            Lecture seule
          </Badge>
        }
      >
        {/* =================================================== */}
        {/* KPI                                                 */}
        {/* =================================================== */}

        <section className="mb-5 grid min-w-0 grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            title="Mandats"
            value={String(
              rows.length,
            )}
            subtitle="Mandats enregistrés"
            icon={
              <FileCheck2 className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Mandats actifs"
            value={String(
              activeRows.length,
            )}
            subtitle="Actuellement en cours"
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Mandats exclusifs"
            value={String(
              exclusiveRows.length,
            )}
            subtitle="Avec clause d'exclusivité"
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Commission moyenne"
            value={
              averageRate !== null
                ? `${new Intl.NumberFormat(
                    "fr-FR",
                    {
                      maximumFractionDigits: 2,
                    },
                  ).format(
                    averageRate,
                  )}%`
                : "—"
            }
            subtitle="Sur les mandats actifs"
            icon={
              <Percent className="h-5 w-5" />
            }
          />
        </section>

        {/* =================================================== */}
        {/* EMPTY                                               */}
        {/* =================================================== */}

        {rows.length === 0 ? (
          <div className="premium-card p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>

            <h2 className="mt-4 font-semibold">
              Aucun mandat
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Aucun mandat immobilier n'est actuellement rattaché à votre compte propriétaire.
            </p>
          </div>
        ) : (
          <section className="min-w-0 space-y-4">
            {rows.map(
              (
                mandate,
                index,
              ) => (
                <MandateCard
                  key={
                    mandate.id
                  }
                  mandate={
                    mandate
                  }
                  index={
                    index
                  }
                />
              ),
            )}
          </section>
        )}
      </PageShell>
    );
  };

export default OwnerMandatesPage;