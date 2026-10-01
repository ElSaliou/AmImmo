// src/pages/admin/FinanceReportsPage.tsx

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Landmark,
  Loader2,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  useFinanceReport,
  type FinanceReport,
} from "@/hooks/use-finance-reports";

import { useToast } from "@/hooks/use-toast";

const formatMoney = (
  value: number | null | undefined,
  currency = "GNF",
) => {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))} ${currency}`;
};

const formatNumber = (value: number | null | undefined) => {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
};

const formatDate = (value: string) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
};

const formatShortDate = (value: string) => {
  if (!value) return "";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
};

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMonthStart = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");

  return `${year}-${month}-01`;
};

const calculateVariation = (
  current: number,
  previous: number,
): number | null => {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
};

function Variation({
  current,
  previous,
  inverse = false,
}: {
  current: number;
  previous: number;
  inverse?: boolean;
}) {
  const variation = calculateVariation(current, previous);

  if (variation === null) {
    return (
      <span className="text-xs text-muted-foreground">
        Pas de comparaison disponible
      </span>
    );
  }

  if (variation === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Stable vs période précédente
      </span>
    );
  }

  const positive = variation > 0;

  const good = inverse ? !positive : positive;

  return (
    <div
      className={`flex items-center gap-1 text-xs font-medium ${
        good ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {positive ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      )}

      {positive ? "+" : ""}
      {variation.toFixed(1)} %

      <span className="font-normal text-muted-foreground">
        vs période précédente
      </span>
    </div>
  );
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  current,
  previous,
  inverseVariation = false,
}: {
  title: string;
  value: string;
  description?: string;
  icon: React.ElementType;
  current?: number;
  previous?: number;
  inverseVariation?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>

            <p className="truncate text-2xl font-bold">
              {value}
            </p>

            {current !== undefined &&
            previous !== undefined ? (
              <Variation
                current={current}
                previous={previous}
                inverse={inverseVariation}
              />
            ) : description ? (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg bg-muted p-2.5">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinanceReportsPage() {
  const { toast } = useToast();

  const [startDate, setStartDate] = useState(
    getMonthStart(),
  );

  const [endDate, setEndDate] = useState(getToday());

  const {
    data: report,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useFinanceReport(startDate, endDate);

  const treasuryEvolution = useMemo(() => {
    if (!report) return [];

    const openingBalance =
      report.summary.treasury_balance -
      report.summary.net_cash_flow;

    let runningBalance = openingBalance;

    return report.cashflow_daily.map((row) => {
      runningBalance += row.net_cash_flow;

      return {
        ...row,
        label: formatShortDate(row.report_date),
        balance: runningBalance,
      };
    });
  }, [report]);

  const setCurrentMonth = () => {
    setStartDate(getMonthStart());
    setEndDate(getToday());
  };

  const setCurrentYear = () => {
    const today = new Date();

    setStartDate(`${today.getFullYear()}-01-01`);
    setEndDate(getToday());
  };

  const exportExcel = async () => {
    if (!report) return;

    try {
      const XLSX = await import("xlsx");

      const workbook = XLSX.utils.book_new();

      const summary = [
        {
          Indicateur: "Revenus",
          Montant: report.summary.revenue,
        },
        {
          Indicateur: "Charges",
          Montant: report.summary.expenses,
        },
        {
          Indicateur: "Résultat net",
          Montant: report.summary.net_result,
        },
        {
          Indicateur: "Entrées trésorerie",
          Montant: report.summary.cash_in,
        },
        {
          Indicateur: "Sorties trésorerie",
          Montant: report.summary.cash_out,
        },
        {
          Indicateur: "Flux net de trésorerie",
          Montant: report.summary.net_cash_flow,
        },
        {
          Indicateur: "Solde trésorerie",
          Montant: report.summary.treasury_balance,
        },
        {
          Indicateur: "Dettes fournisseurs",
          Montant: report.payables.total,
        },
        {
          Indicateur: "Créances",
          Montant: report.summary.receivables,
        },
        {
          Indicateur: "Commissions attendues",
          Montant:
            report.commissions.expected_commission,
        },
        {
          Indicateur: "Commissions encaissées",
          Montant:
            report.commissions.collected_commission,
        },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(summary),
        "Synthèse",
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          report.cashflow_daily.map((row) => ({
            Date: row.report_date,
            Entrées: row.cash_in,
            Sorties: row.cash_out,
            "Flux net": row.net_cash_flow,
          })),
        ),
        "Trésorerie",
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          report.treasury_accounts.map((row) => ({
            Code: row.treasury_account_code,
            Compte: row.treasury_account_name,
            Entrées: row.cash_in,
            Sorties: row.cash_out,
            "Flux net": row.net_cash_flow,
            Solde: row.closing_balance,
            Devise: row.currency,
          })),
        ),
        "Comptes trésorerie",
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          report.expenses_by_category.map((row) => ({
            Catégorie: row.category_name,
            "Nb dépenses": row.expense_count,
            Montant: row.amount,
            Payé: row.amount_paid,
            "Reste à payer": row.balance_due,
          })),
        ),
        "Dépenses catégories",
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          report.expenses_by_property.map((row) => ({
            Bien: row.property_title,
            "Nb dépenses": row.expense_count,
            Montant: row.amount,
            Payé: row.amount_paid,
            "Reste à payer": row.balance_due,
          })),
        ),
        "Dépenses biens",
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          report.expenses_by_owner.map((row) => ({
            Propriétaire: row.owner_name,
            "Nb dépenses": row.expense_count,
            Montant: row.amount,
            "Imputable propriétaire":
              row.owner_chargeable_amount,
            Payé: row.amount_paid,
            "Reste à payer": row.balance_due,
          })),
        ),
        "Dépenses propriétaires",
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([
          {
            "Nombre de ventes":
              report.commissions.sales_count,
            "Commission attendue":
              report.commissions.expected_commission,
            "Commission encaissée":
              report.commissions.collected_commission,
            "Commission restante":
              report.commissions.remaining_commission,
          },
        ]),
        "Commissions",
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          report.receivables.map((row) => ({
            Code: row.account_code,
            Compte: row.account_name,
            Débit: row.debit,
            Crédit: row.credit,
            Solde: row.balance,
          })),
        ),
        "Créances",
      );

      XLSX.writeFile(
        workbook,
        `rapport-financier-${startDate}-${endDate}.xlsx`,
      );

      toast({
        title: "Export Excel terminé",
        description:
          "Le rapport financier a été exporté avec succès.",
      });
    } catch (exportError) {
      console.error(exportError);

      toast({
        title: "Erreur d'export Excel",
        description:
          "Impossible de générer le fichier Excel.",
        variant: "destructive",
      });
    }
  };

  const exportPdf = async () => {
    if (!report) return;

    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import(
        "jspdf-autotable"
      );

      const autoTable =
        autoTableModule.default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(18);
      doc.text("Rapport financier", 14, 18);

      doc.setFontSize(10);
      doc.text(
        `Période : ${formatDate(
          startDate,
        )} au ${formatDate(endDate)}`,
        14,
        25,
      );

      doc.text(
        `Généré le : ${new Intl.DateTimeFormat(
          "fr-FR",
          {
            dateStyle: "short",
            timeStyle: "short",
          },
        ).format(new Date())}`,
        14,
        31,
      );

      autoTable(doc, {
        startY: 38,

        head: [["Indicateur", "Montant"]],

        body: [
          [
            "Revenus",
            formatMoney(report.summary.revenue),
          ],
          [
            "Charges",
            formatMoney(report.summary.expenses),
          ],
          [
            "Résultat net",
            formatMoney(report.summary.net_result),
          ],
          [
            "Solde trésorerie",
            formatMoney(
              report.summary.treasury_balance,
            ),
          ],
          [
            "Dettes fournisseurs",
            formatMoney(report.payables.total),
          ],
          [
            "Créances",
            formatMoney(report.summary.receivables),
          ],
          [
            "Commissions encaissées",
            formatMoney(
              report.commissions
                .collected_commission,
            ),
          ],
          [
            "Commissions restantes",
            formatMoney(
              report.commissions
                .remaining_commission,
            ),
          ],
        ],

        styles: {
          fontSize: 9,
        },
      });

      const afterSummary =
        (doc as any).lastAutoTable?.finalY ?? 95;

      doc.setFontSize(13);
      doc.text(
        "Trésorerie par compte",
        14,
        afterSummary + 10,
      );

      autoTable(doc, {
        startY: afterSummary + 14,

        head: [
          [
            "Compte",
            "Entrées",
            "Sorties",
            "Solde",
          ],
        ],

        body: report.treasury_accounts.map(
          (row) => [
            row.treasury_account_name,
            formatMoney(row.cash_in, row.currency),
            formatMoney(
              row.cash_out,
              row.currency,
            ),
            formatMoney(
              row.closing_balance,
              row.currency,
            ),
          ],
        ),

        styles: {
          fontSize: 8,
        },
      });

      doc.addPage();

      doc.setFontSize(13);
      doc.text("Dépenses par catégorie", 14, 16);

      autoTable(doc, {
        startY: 21,

        head: [
          [
            "Catégorie",
            "Nombre",
            "Montant",
            "Payé",
            "Reste",
          ],
        ],

        body: report.expenses_by_category.map(
          (row) => [
            row.category_name,
            formatNumber(row.expense_count),
            formatMoney(row.amount),
            formatMoney(row.amount_paid),
            formatMoney(row.balance_due),
          ],
        ),

        styles: {
          fontSize: 8,
        },
      });

      const fileName =
        `rapport-financier-${startDate}-${endDate}.pdf`;

      doc.save(fileName);

      toast({
        title: "Export PDF terminé",
        description:
          "Le rapport financier a été exporté avec succès.",
      });
    } catch (exportError) {
      console.error(exportError);

      toast({
        title: "Erreur d'export PDF",
        description:
          "Impossible de générer le fichier PDF.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement du rapport financier...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">
          Rapports financiers
        </h1>

        <Card>
          <CardContent className="p-6">
            <p className="font-medium text-red-600">
              Impossible de charger le rapport financier.
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Erreur inconnue"}
            </p>

            <Button
              className="mt-4"
              variant="outline"
              onClick={() => refetch()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const resultPositive =
    report.summary.net_result >= 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Rapports financiers
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Résultat, trésorerie, dépenses, commissions,
            dettes et créances
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportExcel}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>

          <Button
            variant="outline"
            onClick={exportPdf}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* FILTRES */}

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="finance-start-date">
                  Date de début
                </Label>

                <Input
                  id="finance-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="finance-end-date">
                  Date de fin
                </Label>

                <Input
                  id="finance-end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={setCurrentMonth}
              >
                Mois en cours
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={setCurrentYear}
              >
                Année en cours
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={isFetching}
                onClick={() => refetch()}
              >
                {isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}

                Actualiser
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-4 w-4" />

            Période analysée :{" "}
            {formatDate(report.period.start_date)} au{" "}
            {formatDate(report.period.end_date)}
          </div>
        </CardContent>
      </Card>

      {/* KPI RESULTAT */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Revenus"
          value={formatMoney(report.summary.revenue)}
          icon={ArrowUpRight}
          current={report.summary.revenue}
          previous={
            report.summary.previous_revenue
          }
        />

        <KpiCard
          title="Charges"
          value={formatMoney(report.summary.expenses)}
          icon={ArrowDownRight}
          current={report.summary.expenses}
          previous={
            report.summary.previous_expenses
          }
          inverseVariation
        />

        <KpiCard
          title="Résultat net"
          value={formatMoney(
            report.summary.net_result,
          )}
          icon={
            resultPositive
              ? TrendingUp
              : TrendingDown
          }
          current={report.summary.net_result}
          previous={
            report.summary.previous_net_result
          }
        />

        <KpiCard
          title="Trésorerie"
          value={formatMoney(
            report.summary.treasury_balance,
          )}
          icon={Wallet}
          description={`Flux net : ${formatMoney(
            report.summary.net_cash_flow,
          )}`}
        />
      </div>

      {/* KPI FINANCIERS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Entrées de trésorerie"
          value={formatMoney(report.summary.cash_in)}
          icon={ArrowUpRight}
        />

        <KpiCard
          title="Sorties de trésorerie"
          value={formatMoney(report.summary.cash_out)}
          icon={ArrowDownRight}
        />

        <KpiCard
          title="Dettes fournisseurs"
          value={formatMoney(report.payables.total)}
          icon={Landmark}
          description={`${report.payables.open_expenses} dépense(s) ouverte(s)`}
        />

        <KpiCard
          title="Créances"
          value={formatMoney(
            report.summary.receivables,
          )}
          icon={Banknote}
          description="Créances comptables ouvertes"
        />
      </div>

      {/* GRAPHIQUES */}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Évolution de la trésorerie
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={treasuryEvolution}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 10,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat(
                        "fr-FR",
                        {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        },
                      ).format(value)
                    }
                  />

                  <Tooltip
                    formatter={(value) =>
                      formatMoney(Number(value))
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Trésorerie"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Dépenses par catégorie
            </CardTitle>
          </CardHeader>

          <CardContent>
            {report.expenses_by_category.length ===
            0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                Aucune dépense sur cette période.
              </div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      report.expenses_by_category
                    }
                    margin={{
                      top: 10,
                      right: 10,
                      left: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="category_name"
                      tick={{ fontSize: 11 }}
                    />

                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) =>
                        new Intl.NumberFormat(
                          "fr-FR",
                          {
                            notation: "compact",
                            maximumFractionDigits: 1,
                          },
                        ).format(value)
                      }
                    />

                    <Tooltip
                      formatter={(value) =>
                        formatMoney(Number(value))
                      }
                    />

                    <Bar
                      dataKey="amount"
                      name="Dépenses"
                      fill="currentColor"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TABS DETAIL */}

      <Tabs
        defaultValue="treasury"
        className="space-y-4"
      >
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="treasury">
            Trésorerie
          </TabsTrigger>

          <TabsTrigger value="categories">
            Catégories
          </TabsTrigger>

          <TabsTrigger value="properties">
            Biens
          </TabsTrigger>

          <TabsTrigger value="owners">
            Propriétaires
          </TabsTrigger>

          <TabsTrigger value="commissions">
            Commissions
          </TabsTrigger>

          <TabsTrigger value="payables">
            Dettes
          </TabsTrigger>

          <TabsTrigger value="receivables">
            Créances
          </TabsTrigger>
        </TabsList>

        {/* TRESORERIE */}

        <TabsContent value="treasury">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Trésorerie par compte
              </CardTitle>
            </CardHeader>

            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">
                      Compte
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Entrées
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Sorties
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Flux net
                    </th>
                    <th className="py-3 text-right">
                      Solde
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.treasury_accounts.map(
                    (row) => (
                      <tr
                        key={row.treasury_account_id}
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <div className="font-medium">
                            {row.treasury_account_name}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {row.treasury_account_code}
                          </div>
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {formatMoney(
                            row.cash_in,
                            row.currency,
                          )}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {formatMoney(
                            row.cash_out,
                            row.currency,
                          )}
                        </td>

                        <td className="py-3 pr-4 text-right font-medium">
                          {formatMoney(
                            row.net_cash_flow,
                            row.currency,
                          )}
                        </td>

                        <td className="py-3 text-right font-semibold">
                          {formatMoney(
                            row.closing_balance,
                            row.currency,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATEGORIES */}

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Dépenses par catégorie
              </CardTitle>
            </CardHeader>

            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">
                      Catégorie
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Nb.
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Montant
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Payé
                    </th>
                    <th className="py-3 text-right">
                      Reste
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.expenses_by_category.map(
                    (row) => (
                      <tr
                        key={
                          row.category_id ??
                          row.category_name
                        }
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {row.category_name}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {formatNumber(
                            row.expense_count,
                          )}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {formatMoney(row.amount)}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {formatMoney(
                            row.amount_paid,
                          )}
                        </td>

                        <td className="py-3 text-right font-medium">
                          {formatMoney(
                            row.balance_due,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BIENS */}

        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Dépenses par bien
              </CardTitle>
            </CardHeader>

            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">
                      Bien
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Nb.
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Montant
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Payé
                    </th>
                    <th className="py-3 text-right">
                      Reste
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.expenses_by_property.map(
                    (row) => (
                      <tr
                        key={
                          row.property_id ??
                          row.property_title
                        }
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {row.property_title}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {row.expense_count}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {formatMoney(row.amount)}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {formatMoney(
                            row.amount_paid,
                          )}
                        </td>

                        <td className="py-3 text-right">
                          {formatMoney(
                            row.balance_due,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROPRIETAIRES */}

        <TabsContent value="owners">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Dépenses par propriétaire
              </CardTitle>
            </CardHeader>

            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">
                      Propriétaire
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Nb.
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Montant
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Imputable
                    </th>
                    <th className="py-3 pr-4 text-right">
                      Payé
                    </th>
                    <th className="py-3 text-right">
                      Reste
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.expenses_by_owner.map(
                    (row) => (
                      <tr
                        key={
                          row.owner_id ??
                          row.owner_name
                        }
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {row.owner_name}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {row.expense_count}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {formatMoney(row.amount)}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {formatMoney(
                            row.owner_chargeable_amount,
                          )}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          {formatMoney(
                            row.amount_paid,
                          )}
                        </td>

                        <td className="py-3 text-right">
                          {formatMoney(
                            row.balance_due,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMISSIONS */}

        <TabsContent value="commissions">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Ventes"
              value={formatNumber(
                report.commissions.sales_count,
              )}
              icon={Banknote}
            />

            <KpiCard
              title="Commission attendue"
              value={formatMoney(
                report.commissions
                  .expected_commission,
              )}
              icon={TrendingUp}
            />

            <KpiCard
              title="Commission encaissée"
              value={formatMoney(
                report.commissions
                  .collected_commission,
              )}
              icon={ArrowUpRight}
            />

            <KpiCard
              title="Reste à encaisser"
              value={formatMoney(
                report.commissions
                  .remaining_commission,
              )}
              icon={ArrowDownRight}
            />
          </div>
        </TabsContent>

        {/* DETTES */}

        <TabsContent value="payables">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Dette totale"
              value={formatMoney(
                report.payables.total,
              )}
              icon={Landmark}
            />

            <KpiCard
              title="En retard"
              value={formatMoney(
                report.payables.overdue,
              )}
              icon={TrendingDown}
            />

            <KpiCard
              title="Sous 7 jours"
              value={formatMoney(
                report.payables.due_soon,
              )}
              icon={CalendarDays}
            />

            <KpiCard
              title="Fournisseurs concernés"
              value={formatNumber(
                report.payables.suppliers,
              )}
              icon={Banknote}
              description={`${report.payables.open_expenses} dette(s) ouverte(s)`}
            />
          </div>
        </TabsContent>

        {/* CREANCES */}

        <TabsContent value="receivables">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Créances clients
              </CardTitle>
            </CardHeader>

            <CardContent>
              {report.receivables.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Aucune créance comptable ouverte sur la
                  période.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 pr-4">
                          Compte
                        </th>
                        <th className="py-3 pr-4">
                          Libellé
                        </th>
                        <th className="py-3 pr-4 text-right">
                          Débit
                        </th>
                        <th className="py-3 pr-4 text-right">
                          Crédit
                        </th>
                        <th className="py-3 text-right">
                          Solde
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {report.receivables.map(
                        (row) => (
                          <tr
                            key={row.account_id}
                            className="border-b last:border-0"
                          >
                            <td className="py-3 pr-4 font-medium">
                              {row.account_code}
                            </td>

                            <td className="py-3 pr-4">
                              {row.account_name}
                            </td>

                            <td className="py-3 pr-4 text-right">
                              {formatMoney(row.debit)}
                            </td>

                            <td className="py-3 pr-4 text-right">
                              {formatMoney(row.credit)}
                            </td>

                            <td className="py-3 text-right font-semibold">
                              {formatMoney(row.balance)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}