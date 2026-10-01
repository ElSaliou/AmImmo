import {
  Banknote,
  CheckCircle2,
  Landmark,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import PageShell from "@/components/PageShell";

import {
  useMyOwnerSettlements,
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
    Number(value ?? 0),
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
// STATUS
// ============================================================

function getStatusUi(
  status:
    | string
    | null
    | undefined,
) {
  switch (status) {
    case "completed":
    case "paid":
    case "completed_payment":
      return {
        label: "Effectué",
        className:
          "bg-success/15 text-success",
      };

    case "cancelled":
      return {
        label: "Annulé",
        className:
          "bg-destructive/15 text-destructive",
      };

    case "pending":
      return {
        label: "En attente",
        className:
          "bg-warning/15 text-warning",
      };

    default:
      return {
        label:
          status ||
          "Effectué",

        className:
          "bg-success/15 text-success",
      };
  }
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
            ? "min-w-0 break-words text-right text-sm font-semibold text-foreground"
            : "min-w-0 break-words text-right text-sm text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
};

// ============================================================
// MOBILE SETTLEMENT CARD
// ============================================================

type SettlementMobileCardProps = {
  settlement: any;
  index: number;
};

const SettlementMobileCard = ({
  settlement,
  index,
}: SettlementMobileCardProps) => {
  const status =
    getStatusUi(
      settlement.status,
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
              <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

              <div className="min-w-0">
                <p className="break-all text-sm font-semibold">
                  {settlement.reference ||
                    "Reversement"}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(
                    settlement.settlement_date,
                  )}
                </p>
              </div>
            </div>
          </div>

          <Badge
            className={`${status.className} shrink-0 whitespace-nowrap border-0 text-[10px]`}
          >
            {status.label}
          </Badge>
        </div>
      </div>

      {/* ===================================================== */}
      {/* AMOUNT                                                */}
      {/* ===================================================== */}

      <div className="border-b bg-card p-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Montant reversé
        </p>

        <p className="mt-1 break-words text-xl font-bold tracking-tight">
          {formatMoney(
            settlement.amount,
            settlement.currency,
          )}
        </p>
      </div>

      {/* ===================================================== */}
      {/* DETAILS                                               */}
      {/* ===================================================== */}

      <div className="px-4">
        <MobileInfoRow
          label="Compte de paiement"
          icon={
            <Landmark className="h-3.5 w-3.5" />
          }
          emphasize
          value={
            settlement.treasury_account_name ??
            "Compte de trésorerie"
          }
        />

        <MobileInfoRow
          label="Référence externe"
          icon={
            <ReceiptText className="h-3.5 w-3.5" />
          }
          value={
            settlement.external_reference ||
            "—"
          }
        />
      </div>
    </motion.article>
  );
};

// ============================================================
// PAGE
// ============================================================

const OwnerSettlementsPage =
  () => {
    const {
      data: settlements,
      isLoading,
      isError,
      error,
      refetch,
    } =
      useMyOwnerSettlements();

    const rows =
      settlements ?? [];

    const completedRows =
      rows.filter(
        (row) =>
          row.status !==
          "cancelled",
      );

    const total =
      completedRows.reduce(
        (
          sum,
          row,
        ) =>
          sum +
          Number(
            row.amount ?? 0,
          ),
        0,
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
            Impossible de charger vos reversements
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Une erreur est survenue pendant
            la récupération de vos reversements.
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
        title="Mes reversements"
        subtitle="Historique des montants reversés sur votre compte propriétaire"
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

        <section className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          <KpiCard
            title="Total reversé"
            value={formatMoney(
              total,
            )}
            subtitle="Reversements effectués"
            icon={
              <Banknote className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Nombre de reversements"
            value={String(
              completedRows.length,
            )}
            subtitle="Opérations enregistrées"
            icon={
              <ReceiptText className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Dernier reversement"
            value={
              completedRows[0]
                ? formatDate(
                    completedRows[0]
                      .settlement_date,
                  )
                : "—"
            }
            subtitle={
              completedRows[0]
                ? formatMoney(
                    completedRows[0]
                      .amount,
                    completedRows[0]
                      .currency,
                  )
                : "Aucun reversement"
            }
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />
        </section>

        {/* =================================================== */}
        {/* EMPTY                                               */}
        {/* =================================================== */}

        {rows.length === 0 ? (
          <div className="premium-card p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <WalletCards className="h-5 w-5 text-muted-foreground" />
            </div>

            <h2 className="mt-4 font-semibold">
              Aucun reversement
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Aucun reversement propriétaire
              n'est actuellement enregistré.
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
                  settlement,
                  index,
                ) => (
                  <SettlementMobileCard
                    key={
                      settlement.id
                    }
                    settlement={
                      settlement
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
                        Référence
                      </TableHead>

                      <TableHead className="text-right font-semibold">
                        Montant
                      </TableHead>

                      <TableHead className="font-semibold">
                        Compte de paiement
                      </TableHead>

                      <TableHead className="font-semibold">
                        Référence externe
                      </TableHead>

                      <TableHead className="font-semibold">
                        Statut
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rows.map(
                      (
                        settlement,
                        index,
                      ) => {
                        const status =
                          getStatusUi(
                            settlement.status,
                          );

                        return (
                          <motion.tr
                            key={
                              settlement.id
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
                                settlement
                                  .settlement_date,
                              )}
                            </TableCell>

                            {/* =============================== */}
                            {/* REFERENCE                       */}
                            {/* =============================== */}

                            <TableCell>
                              <div className="min-w-[180px]">
                                <p className="break-all text-sm font-medium">
                                  {
                                    settlement.reference
                                  }
                                </p>
                              </div>
                            </TableCell>

                            {/* =============================== */}
                            {/* AMOUNT                          */}
                            {/* =============================== */}

                            <TableCell className="whitespace-nowrap text-right text-sm font-semibold">
                              {formatMoney(
                                settlement.amount,
                                settlement.currency,
                              )}
                            </TableCell>

                            {/* =============================== */}
                            {/* TREASURY ACCOUNT                */}
                            {/* =============================== */}

                            <TableCell>
                              <div className="flex min-w-[160px] items-center gap-2">
                                <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />

                                <span className="text-sm">
                                  {settlement
                                    .treasury_account_name ??
                                    "Compte de trésorerie"}
                                </span>
                              </div>
                            </TableCell>

                            {/* =============================== */}
                            {/* EXTERNAL REFERENCE              */}
                            {/* =============================== */}

                            <TableCell className="text-sm text-muted-foreground">
                              <div className="max-w-[180px] break-all">
                                {settlement
                                  .external_reference ||
                                  "—"}
                              </div>
                            </TableCell>

                            {/* =============================== */}
                            {/* STATUS                          */}
                            {/* =============================== */}

                            <TableCell>
                              <Badge
                                className={`${status.className} whitespace-nowrap border-0 text-xs`}
                              >
                                {
                                  status.label
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

export default OwnerSettlementsPage;