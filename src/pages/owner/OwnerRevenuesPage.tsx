import {
  CircleDollarSign,
  FileText,
  HandCoins,
  Home,
  Landmark,
  Percent,
  ReceiptText,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import PageShell from "@/components/PageShell";

import {
  useMyOwnerRevenues,
  type OwnerRevenue,
} from "@/hooks/use-owner-portal";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================
// FORMATTERS
// ============================================================

function formatMoney(
  value:
    | number
    | null
    | undefined,
  currency = "GNF",
) {
  return `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(
    Number(
      value ?? 0,
    ),
  )} ${currency}`;
}

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

// ============================================================
// COMMISSION SOURCE
// ============================================================

function getCommissionSourceLabel(
  source:
    | string
    | null
    | undefined,
) {
  switch (source) {
    case "mandate":
      return "Mandat";

    case "owner":
      return "Propriétaire";

    default:
      return "Historique";
  }
}

function getCommissionSourceClass(
  source:
    | string
    | null
    | undefined,
) {
  switch (source) {
    case "mandate":
      return "bg-secondary/15 text-secondary";

    case "owner":
      return "bg-info/15 text-info";

    default:
      return "bg-muted text-muted-foreground";
  }
}

// ============================================================
// SETTLEMENT STATUS
// ============================================================

function getSettlementStatus(
  revenue: OwnerRevenue,
) {
  const net =
    Number(
      revenue.net_owner_amount ??
        0,
    );

  const settled =
    Number(
      revenue.settled_amount ??
        0,
    );

  if (
    net > 0 &&
    settled >= net
  ) {
    return {
      label: "Reversé",
      className:
        "bg-success/15 text-success",
    };
  }

  if (settled > 0) {
    return {
      label: "Partiel",
      className:
        "bg-warning/15 text-warning",
    };
  }

  return {
    label: "À reverser",
    className:
      "bg-info/15 text-info",
  };
}

// ============================================================
// KPI CARD
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
    <div className="premium-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground sm:text-sm">
            {title}
          </p>

          <p className="mt-1 break-words text-xl font-bold tracking-tight sm:text-2xl">
            {value}
          </p>

          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
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
// MOBILE INFO ROW
// ============================================================

type MobileInfoRowProps = {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  emphasize?: boolean;
};

const MobileInfoRow = ({
  label,
  value,
  icon,
  emphasize = false,
}: MobileInfoRowProps) => {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        {icon && (
          <div className="shrink-0 text-muted-foreground">
            {icon}
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {label}
        </span>
      </div>

      <div
        className={
          emphasize
            ? "min-w-0 text-right text-sm font-semibold text-foreground"
            : "min-w-0 text-right text-sm text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
};

// ============================================================
// MOBILE REVENUE CARD
// ============================================================

type RevenueMobileCardProps = {
  revenue: OwnerRevenue;
  index: number;
};

const RevenueMobileCard = ({
  revenue,
  index,
}: RevenueMobileCardProps) => {
  const settlement =
    getSettlementStatus(
      revenue,
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
          index * 0.025,
      }}
      className="premium-card overflow-hidden"
    >
      {/* ===================================================== */}
      {/* HEADER                                                */}
      {/* ===================================================== */}

      <div className="border-b bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <Home className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">
                  {revenue.property_title ||
                    "Bien immobilier"}
                </p>

                <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
                  {revenue.property_reference ||
                    "Référence non renseignée"}
                </p>
              </div>
            </div>
          </div>

          <Badge
            className={`${settlement.className} shrink-0 whitespace-nowrap border-0 text-[10px]`}
          >
            {settlement.label}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span>
            {formatDate(
              revenue.collected_at,
            )}
          </span>

          {revenue.lease_reference && (
            <span className="flex min-w-0 items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0" />

              <span className="break-all font-medium text-foreground">
                {
                  revenue.lease_reference
                }
              </span>
            </span>
          )}
        </div>
      </div>

      {/* ===================================================== */}
      {/* MONEY SUMMARY                                         */}
      {/* ===================================================== */}

      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Encaissé
          </p>

          <p className="mt-1 break-words text-base font-bold">
            {formatMoney(
              revenue.gross_collected,
              revenue.currency,
            )}
          </p>
        </div>

        <div className="bg-card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Net propriétaire
          </p>

          <p className="mt-1 break-words text-base font-bold">
            {formatMoney(
              revenue.net_owner_amount,
              revenue.currency,
            )}
          </p>
        </div>
      </div>

      {/* ===================================================== */}
      {/* DETAILS                                               */}
      {/* ===================================================== */}

      <div className="px-4">
        <MobileInfoRow
          label="Commission"
          icon={
            <Percent className="h-3.5 w-3.5" />
          }
          value={
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="font-semibold">
                {Number(
                  revenue.commission_rate ??
                    0,
                )}
                %
              </span>

              <Badge
                className={`${getCommissionSourceClass(
                  revenue.commission_source,
                )} border-0 text-[9px]`}
              >
                {getCommissionSourceLabel(
                  revenue.commission_source,
                )}
              </Badge>
            </div>
          }
        />

        <MobileInfoRow
          label="Montant commission"
          icon={
            <ReceiptText className="h-3.5 w-3.5" />
          }
          value={formatMoney(
            revenue.commission_amount,
            revenue.currency,
          )}
        />

        <MobileInfoRow
          label="Déjà reversé"
          icon={
            <Landmark className="h-3.5 w-3.5" />
          }
          emphasize
          value={formatMoney(
            revenue.settled_amount,
            revenue.currency,
          )}
        />
      </div>
    </motion.article>
  );
};

// ============================================================
// OWNER REVENUES PAGE
// ============================================================

const OwnerRevenuesPage =
  () => {
    const {
      data: revenues,
      isLoading,
      isError,
      error,
      refetch,
    } =
      useMyOwnerRevenues();

    // ========================================================
    // ROWS
    // ========================================================

    const rows =
      revenues ?? [];

    // ========================================================
    // TOTALS
    // ========================================================

    const grossTotal =
      rows.reduce(
        (
          total,
          row,
        ) =>
          total +
          Number(
            row.gross_collected ??
              0,
          ),
        0,
      );

    const commissionTotal =
      rows.reduce(
        (
          total,
          row,
        ) =>
          total +
          Number(
            row.commission_amount ??
              0,
          ),
        0,
      );

    const netTotal =
      rows.reduce(
        (
          total,
          row,
        ) =>
          total +
          Number(
            row.net_owner_amount ??
              0,
          ),
        0,
      );

    const settledTotal =
      rows.reduce(
        (
          total,
          row,
        ) =>
          total +
          Number(
            row.settled_amount ??
              0,
          ),
        0,
      );

    const outstanding =
      Math.max(
        0,
        netTotal -
          settledTotal,
      );

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
            Impossible de charger vos revenus
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Une erreur est survenue pendant la récupération
            de vos encaissements.
          </p>

          {error instanceof Error && (
            <p className="mt-3 break-words text-xs text-destructive">
              {error.message}
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              void refetch()
            }
            className="mt-5 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Réessayer
          </button>
        </div>
      );
    }

    // ========================================================
    // UI
    // ========================================================

    return (
      <PageShell
        title="Mes revenus"
        subtitle="Suivi des loyers encaissés, commissions et montants à vous reverser"
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

        <section className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            title="Loyers encaissés"
            value={formatMoney(
              grossTotal,
            )}
            subtitle={`${rows.length} encaissement${
              rows.length > 1
                ? "s"
                : ""
            }`}
            icon={
              <CircleDollarSign className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Commissions"
            value={formatMoney(
              commissionTotal,
            )}
            subtitle="Frais de gestion appliqués"
            icon={
              <Percent className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Net propriétaire"
            value={formatMoney(
              netTotal,
            )}
            subtitle="Après commissions"
            icon={
              <HandCoins className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Solde à reverser"
            value={formatMoney(
              outstanding,
            )}
            subtitle={`Déjà reversé : ${formatMoney(
              settledTotal,
            )}`}
            icon={
              <Landmark className="h-5 w-5" />
            }
          />
        </section>

        {/* =================================================== */}
        {/* EMPTY                                               */}
        {/* =================================================== */}

        {rows.length === 0 ? (
          <div className="premium-card p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
            </div>

            <h2 className="mt-4 font-semibold">
              Aucun encaissement
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Aucun revenu locatif n'est actuellement enregistré
              pour votre compte propriétaire.
            </p>
          </div>
        ) : (
          <>
            {/* =============================================== */}
            {/* MOBILE CARDS                                    */}
            {/* =============================================== */}

            <section className="space-y-3 md:hidden">
              {rows.map(
                (
                  revenue,
                  index,
                ) => (
                  <RevenueMobileCard
                    key={
                      revenue.id
                    }
                    revenue={
                      revenue
                    }
                    index={
                      index
                    }
                  />
                ),
              )}
            </section>

            {/* =============================================== */}
            {/* DESKTOP TABLE                                   */}
            {/* =============================================== */}

            <div className="premium-card hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">
                        Date
                      </TableHead>

                      <TableHead className="font-semibold">
                        Bien
                      </TableHead>

                      <TableHead className="font-semibold">
                        Contrat
                      </TableHead>

                      <TableHead className="text-right font-semibold">
                        Encaissé
                      </TableHead>

                      <TableHead className="font-semibold">
                        Commission
                      </TableHead>

                      <TableHead className="text-right font-semibold">
                        Net propriétaire
                      </TableHead>

                      <TableHead className="text-right font-semibold">
                        Reversé
                      </TableHead>

                      <TableHead className="font-semibold">
                        Statut
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rows.map(
                      (
                        revenue,
                        index,
                      ) => {
                        const settlement =
                          getSettlementStatus(
                            revenue,
                          );

                        return (
                          <motion.tr
                            key={
                              revenue.id
                            }
                            initial={{
                              opacity: 0,
                            }}
                            animate={{
                              opacity: 1,
                            }}
                            transition={{
                              delay:
                                index *
                                0.02,
                            }}
                            className="transition-colors hover:bg-muted/30"
                          >
                            {/* =============================== */}
                            {/* DATE                            */}
                            {/* =============================== */}

                            <TableCell className="whitespace-nowrap text-sm">
                              {formatDate(
                                revenue.collected_at,
                              )}
                            </TableCell>

                            {/* =============================== */}
                            {/* PROPERTY                        */}
                            {/* =============================== */}

                            <TableCell>
                              <div className="min-w-[180px]">
                                <p className="text-sm font-medium">
                                  {revenue.property_title ||
                                    "Bien immobilier"}
                                </p>

                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {revenue.property_reference ||
                                    "—"}
                                </p>
                              </div>
                            </TableCell>

                            {/* =============================== */}
                            {/* LEASE                           */}
                            {/* =============================== */}

                            <TableCell>
                              {revenue.lease_reference ? (
                                <div className="min-w-[130px]">
                                  <p className="text-sm font-medium text-foreground">
                                    {
                                      revenue.lease_reference
                                    }
                                  </p>

                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    Contrat de location
                                  </p>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>

                            {/* =============================== */}
                            {/* GROSS                           */}
                            {/* =============================== */}

                            <TableCell className="whitespace-nowrap text-right text-sm font-semibold">
                              {formatMoney(
                                revenue.gross_collected,
                                revenue.currency,
                              )}
                            </TableCell>

                            {/* =============================== */}
                            {/* COMMISSION                      */}
                            {/* =============================== */}

                            <TableCell>
                              <div className="min-w-[135px] space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">
                                    {Number(
                                      revenue.commission_rate ??
                                        0,
                                    )}
                                    %
                                  </span>

                                  <Badge
                                    className={`${getCommissionSourceClass(
                                      revenue.commission_source,
                                    )} border-0 text-[10px]`}
                                  >
                                    {getCommissionSourceLabel(
                                      revenue.commission_source,
                                    )}
                                  </Badge>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                  {formatMoney(
                                    revenue.commission_amount,
                                    revenue.currency,
                                  )}
                                </p>
                              </div>
                            </TableCell>

                            {/* =============================== */}
                            {/* NET                             */}
                            {/* =============================== */}

                            <TableCell className="whitespace-nowrap text-right text-sm font-semibold">
                              {formatMoney(
                                revenue.net_owner_amount,
                                revenue.currency,
                              )}
                            </TableCell>

                            {/* =============================== */}
                            {/* SETTLED                         */}
                            {/* =============================== */}

                            <TableCell className="whitespace-nowrap text-right text-sm">
                              {formatMoney(
                                revenue.settled_amount,
                                revenue.currency,
                              )}
                            </TableCell>

                            {/* =============================== */}
                            {/* STATUS                          */}
                            {/* =============================== */}

                            <TableCell>
                              <Badge
                                className={`${settlement.className} whitespace-nowrap border-0 text-xs`}
                              >
                                {
                                  settlement.label
                                }
                              </Badge>
                            </TableCell>
                          </motion.tr>
                        );
                      },
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </PageShell>
    );
  };

export default OwnerRevenuesPage;