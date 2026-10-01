import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  ArrowDownCircle,
  ArrowRightLeft,
  ArrowUpCircle,
  Banknote,
  CircleMinus,
  CirclePlus,
  Eye,
  FileText,
  Landmark,
  Loader2,
  ReceiptText,
  Search,
  Smartphone,
  Vault,
  WalletCards,
} from "lucide-react";

import {
  toast,
} from "sonner";

import PageShell from "@/components/PageShell";
import EmptyState from "@/components/admin/EmptyState";
import TableSkeleton from "@/components/admin/TableSkeleton";

import {
  useFinanceTransaction,
  useFinanceTransactions,
  useRecordTreasuryDeposit,
  useRecordTreasuryOpeningBalance,
  useRecordTreasuryTransfer,
  useRecordTreasuryWithdrawal,
  useTreasuryAccountBalances,
  useTreasuryAccounts,
  useTreasuryJournal,
  useTreasuryJournalEntry,
  useTreasuryMovements,
  type FinanceTransaction,
  type TreasuryMovementType,
} from "@/hooks/use-finance";

import {
  Button,
} from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Input,
} from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================
// HELPERS
// ============================================================

const formatAmount = (
  amount:
    number |
    null |
    undefined,
  currency = "GNF",
) =>
  `${Number(
    amount ?? 0,
  ).toLocaleString(
    "fr-FR",
  )} ${currency}`;

const formatDateTime = (
  value:
    string |
    null |
    undefined,
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "fr-FR",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    },
  );
};

const paymentMethodLabel = (
  value:
    string | null,
) => {
  switch (
    value
  ) {
    case "cash":
      return "Espèces";

    case "bank_transfer":
      return "Virement bancaire";

    case "mobile_money":
      return "Mobile Money";

    case "cheque":
      return "Chèque";

    case "card":
      return "Carte bancaire";

    case "other":
      return "Autre";

    default:
      return value || "Non renseigné";
  }
};

const treasuryJournalTypeLabel =
  (
    movementType:
      TreasuryMovementType |
      null,

    financeType:
      string | null,

    financeSource:
      string | null,
  ) => {
    if (
      movementType ===
      "opening_balance"
    ) {
      return "Solde initial";
    }

    if (
      movementType ===
      "deposit"
    ) {
      return "Entrée";
    }

    if (
      movementType ===
      "withdrawal"
    ) {
      return "Sortie";
    }

    if (
      movementType ===
      "transfer"
    ) {
      return "Transfert";
    }

    if (
      financeSource ===
      "sale_commission_payment"
    ) {
      return "Commission";
    }

    if (
      financeType ===
      "expense"
    ) {
      return "Dépense";
    }

    if (
      financeType ===
      "income"
    ) {
      return "Revenu";
    }

    return "Mouvement";
  };

const getLocalDateTimeValue =
  () => {
    const now =
      new Date();

    const offset =
      now.getTimezoneOffset();

    return new Date(
      now.getTime() -
        offset *
          60_000,
    )
      .toISOString()
      .slice(
        0,
        16,
      );
  };

// ============================================================
// FORMULAIRES
// ============================================================

interface OpeningBalanceFormState {
  accountId: string;
  amount: string;
  date: string;
  notes: string;
}

interface TransferFormState {
  sourceAccountId: string;
  destinationAccountId: string;

  amount: string;
  date: string;

  label: string;
  externalReference: string;
  notes: string;
}

interface TreasuryFlowFormState {
  accountId: string;
  amount: string;
  date: string;

  label: string;
  externalReference: string;
  notes: string;
}

const createInitialOpeningBalanceForm =
  (): OpeningBalanceFormState => ({
    accountId: "",
    amount: "",
    date:
      getLocalDateTimeValue(),
    notes: "",
  });

const createInitialTransferForm =
  (): TransferFormState => ({
    sourceAccountId: "",
    destinationAccountId: "",
    amount: "",
    date:
      getLocalDateTimeValue(),
    label: "",
    externalReference: "",
    notes: "",
  });

const createInitialTreasuryFlowForm =
  (): TreasuryFlowFormState => ({
    accountId: "",
    amount: "",
    date:
      getLocalDateTimeValue(),
    label: "",
    externalReference: "",
    notes: "",
  });

// ============================================================
// PAGE
// ============================================================

const FinancePage =
  () => {
    // ========================================================
    // DATA
    // ========================================================

    const {
      data:
        transactions,
      isLoading,
    } =
      useFinanceTransactions();

    const {
      data:
        treasuryBalances,
      isLoading:
        treasuryBalancesLoading,
    } =
      useTreasuryAccountBalances();

    const {
      data:
        treasuryAccounts,
      isLoading:
        treasuryAccountsLoading,
    } =
      useTreasuryAccounts();

    const {
      data:
        treasuryMovements,
    } =
      useTreasuryMovements();

    const {
      data:
        treasuryJournal,
      isLoading:
        treasuryJournalLoading,
    } =
      useTreasuryJournal();

    // ========================================================
    // MUTATIONS
    // ========================================================

    const recordOpeningBalance =
      useRecordTreasuryOpeningBalance();

    const recordTransfer =
      useRecordTreasuryTransfer();

    const recordDeposit =
      useRecordTreasuryDeposit();

    const recordWithdrawal =
      useRecordTreasuryWithdrawal();

    // ========================================================
    // FILTRES
    // ========================================================

    const [
      search,
      setSearch,
    ] =
      useState("");

    const [
      typeFilter,
      setTypeFilter,
    ] =
      useState(
        "__all__",
      );

    const [
      statusFilter,
      setStatusFilter,
    ] =
      useState(
        "__all__",
      );

    // ========================================================
    // DETAIL TRANSACTION FINANCE
    // ========================================================

    const [
      detailOpen,
      setDetailOpen,
    ] =
      useState(
        false,
      );

    const [
      selectedTransactionId,
      setSelectedTransactionId,
    ] =
      useState<
        string |
        null
      >(null);

    const {
      data:
        detail,
      isLoading:
        detailLoading,
    } =
      useFinanceTransaction(
        selectedTransactionId,
      );

    // ========================================================
    // DETAIL JOURNAL TRESORERIE
    // ========================================================

    const [
      treasuryDetailOpen,
      setTreasuryDetailOpen,
    ] =
      useState(
        false,
      );

    const [
      selectedTreasuryLineId,
      setSelectedTreasuryLineId,
    ] =
      useState<
        string |
        null
      >(null);

    const {
      data:
        treasuryDetail,
      isLoading:
        treasuryDetailLoading,
    } =
      useTreasuryJournalEntry(
        selectedTreasuryLineId,
      );

    // ========================================================
    // DIALOGS
    // ========================================================

    const [
      openingBalanceOpen,
      setOpeningBalanceOpen,
    ] =
      useState(false);

    const [
      transferOpen,
      setTransferOpen,
    ] =
      useState(false);

    const [
      depositOpen,
      setDepositOpen,
    ] =
      useState(false);

    const [
      withdrawalOpen,
      setWithdrawalOpen,
    ] =
      useState(false);

    // ========================================================
    // FORM STATES
    // ========================================================

    const [
      openingBalanceForm,
      setOpeningBalanceForm,
    ] =
      useState<OpeningBalanceFormState>(
        createInitialOpeningBalanceForm(),
      );

    const [
      transferForm,
      setTransferForm,
    ] =
      useState<TransferFormState>(
        createInitialTransferForm(),
      );

    const [
      depositForm,
      setDepositForm,
    ] =
      useState<TreasuryFlowFormState>(
        createInitialTreasuryFlowForm(),
      );

    const [
      withdrawalForm,
      setWithdrawalForm,
    ] =
      useState<TreasuryFlowFormState>(
        createInitialTreasuryFlowForm(),
      );

    // ========================================================
    // SOLDE INITIAL DEJA ENREGISTRE
    // ========================================================

    const openingBalanceAccountIds =
      useMemo(() => {
        return new Set(
          (
            treasuryMovements ??
            []
          )
            .filter(
              (
                movement,
              ) =>
                movement.movement_type ===
                "opening_balance",
            )
            .map(
              (
                movement,
              ) =>
                movement.destination_account_id,
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(
                  value,
                ),
            ),
        );
      }, [
        treasuryMovements,
      ]);

    // ========================================================
    // SOLDES
    // ========================================================

    const getTreasuryBalance =
      (
        accountId:
          string,
      ) =>
        Number(
          treasuryBalances?.find(
            (
              item,
            ) =>
              item.id ===
              accountId,
          )?.balance ??
            0,
        );

    const cashBalance =
      treasuryBalances?.find(
        (
          item,
        ) =>
          item.account_type ===
          "cash",
      );

    const bankBalance =
      treasuryBalances?.find(
        (
          item,
        ) =>
          item.account_type ===
          "bank",
      );

    const mobileBalance =
      treasuryBalances?.find(
        (
          item,
        ) =>
          item.account_type ===
          "mobile_money",
      );

    const treasuryTotal =
      (
        treasuryBalances ??
        []
      ).reduce(
        (
          total,
          item,
        ) =>
          total +
          Number(
            item.balance,
          ),
        0,
      );

    // ========================================================
    // KPI
    // ========================================================

    const totals =
      useMemo(() => {
        const rows =
          transactions ??
          [];

        const income =
          rows
            .filter(
              (
                row,
              ) =>
                row.transaction_type ===
                  "income" &&
                row.status ===
                  "posted",
            )
            .reduce(
              (
                total,
                row,
              ) =>
                total +
                Number(
                  row.amount,
                ),
              0,
            );

        const expenses =
          rows
            .filter(
              (
                row,
              ) =>
                row.transaction_type ===
                  "expense" &&
                row.status ===
                  "posted",
            )
            .reduce(
              (
                total,
                row,
              ) =>
                total +
                Number(
                  row.amount,
                ),
              0,
            );

        return {
          income,
          expenses,
          balance:
            income -
            expenses,
          count:
            rows.length,
        };
      }, [
        transactions,
      ]);

    // ========================================================
    // FILTRAGE FINANCE
    // ========================================================

    const filtered =
      useMemo(() => {
        const q =
          search
            .trim()
            .toLowerCase();

        return (
          transactions ??
          []
        ).filter(
          (
            transaction,
          ) => {
            if (
              typeFilter !==
                "__all__" &&
              transaction.transaction_type !==
                typeFilter
            ) {
              return false;
            }

            if (
              statusFilter !==
                "__all__" &&
              transaction.status !==
                statusFilter
            ) {
              return false;
            }

            if (!q) {
              return true;
            }

            return [
              transaction.reference,
              transaction.label,
              transaction.external_reference,
              transaction.expense_category
                ?.name,
              transaction.sale
                ?.reference,
              transaction.sale
                ?.property
                ?.title,
              transaction.sale
                ?.buyer
                ?.full_name,
              transaction.sale
                ?.buyer_name,
            ]
              .filter(Boolean)
              .some(
                (
                  value,
                ) =>
                  String(
                    value,
                  )
                    .toLowerCase()
                    .includes(q),
              );
          },
        );
      }, [
        transactions,
        search,
        typeFilter,
        statusFilter,
      ]);

    // ========================================================
    // DETAIL HANDLERS
    // ========================================================

    const openDetail =
      (
        transaction:
          FinanceTransaction,
      ) => {
        setSelectedTransactionId(
          transaction.id,
        );

        setDetailOpen(
          true,
        );
      };

    const closeDetail =
      () => {
        setDetailOpen(
          false,
        );

        setSelectedTransactionId(
          null,
        );
      };

    const openTreasuryDetail =
      (
        lineId:
          string,
      ) => {
        setSelectedTreasuryLineId(
          lineId,
        );

        setTreasuryDetailOpen(
          true,
        );
      };

    const closeTreasuryDetail =
      () => {
        setTreasuryDetailOpen(
          false,
        );

        setSelectedTreasuryLineId(
          null,
        );
      };

    // ========================================================
    // SOLDE INITIAL
    // ========================================================

    const handleOpeningBalanceSubmit =
      async (
        event:
          FormEvent<HTMLFormElement>,
      ) => {
        event.preventDefault();

        const amount =
          Number(
            openingBalanceForm.amount,
          );

        if (
          !openingBalanceForm.accountId
        ) {
          toast.error(
            "Sélectionnez un compte.",
          );

          return;
        }

        if (
          openingBalanceAccountIds.has(
            openingBalanceForm.accountId,
          )
        ) {
          toast.error(
            "Le solde initial de ce compte a déjà été enregistré.",
          );

          return;
        }

        if (
          !Number.isFinite(
            amount,
          ) ||
          amount <=
            0
        ) {
          toast.error(
            "Le montant doit être supérieur à zéro.",
          );

          return;
        }

        try {
          await recordOpeningBalance.mutateAsync(
            {
              accountId:
                openingBalanceForm.accountId,

              amount,

              date:
                new Date(
                  openingBalanceForm.date,
                ).toISOString(),

              notes:
                openingBalanceForm.notes,
            },
          );

          toast.success(
            "Solde initial enregistré.",
          );

          setOpeningBalanceOpen(
            false,
          );

          setOpeningBalanceForm(
            createInitialOpeningBalanceForm(),
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ||
              "Impossible d'enregistrer le solde initial.",
          );
        }
      };

    // ========================================================
    // TRANSFERT
    // ========================================================

    const handleTransferSubmit =
      async (
        event:
          FormEvent<HTMLFormElement>,
      ) => {
        event.preventDefault();

        const amount =
          Number(
            transferForm.amount,
          );

        if (
          !transferForm.sourceAccountId ||
          !transferForm.destinationAccountId
        ) {
          toast.error(
            "Sélectionnez les comptes source et destination.",
          );

          return;
        }

        if (
          transferForm.sourceAccountId ===
          transferForm.destinationAccountId
        ) {
          toast.error(
            "Les comptes doivent être différents.",
          );

          return;
        }

        if (
          !Number.isFinite(
            amount,
          ) ||
          amount <=
            0
        ) {
          toast.error(
            "Le montant doit être supérieur à zéro.",
          );

          return;
        }

        try {
          await recordTransfer.mutateAsync(
            {
              sourceAccountId:
                transferForm.sourceAccountId,

              destinationAccountId:
                transferForm.destinationAccountId,

              amount,

              date:
                new Date(
                  transferForm.date,
                ).toISOString(),

              label:
                transferForm.label,

              externalReference:
                transferForm.externalReference,

              notes:
                transferForm.notes,
            },
          );

          toast.success(
            "Transfert enregistré.",
          );

          setTransferOpen(
            false,
          );

          setTransferForm(
            createInitialTransferForm(),
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ||
              "Impossible d'enregistrer le transfert.",
          );
        }
      };

    // ========================================================
    // ENTREE
    // ========================================================

    const handleDepositSubmit =
      async (
        event:
          FormEvent<HTMLFormElement>,
      ) => {
        event.preventDefault();

        const amount =
          Number(
            depositForm.amount,
          );

        if (
          !depositForm.accountId
        ) {
          toast.error(
            "Sélectionnez un compte de trésorerie.",
          );

          return;
        }

        if (
          !Number.isFinite(
            amount,
          ) ||
          amount <=
            0
        ) {
          toast.error(
            "Le montant doit être supérieur à zéro.",
          );

          return;
        }

        try {
          await recordDeposit.mutateAsync(
            {
              accountId:
                depositForm.accountId,

              amount,

              date:
                new Date(
                  depositForm.date,
                ).toISOString(),

              label:
                depositForm.label,

              externalReference:
                depositForm.externalReference,

              notes:
                depositForm.notes,
            },
          );

          toast.success(
            "Entrée de trésorerie enregistrée.",
          );

          setDepositOpen(
            false,
          );

          setDepositForm(
            createInitialTreasuryFlowForm(),
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ||
              "Impossible d'enregistrer l'entrée de trésorerie.",
          );
        }
      };

    // ========================================================
    // SORTIE
    // ========================================================

    const handleWithdrawalSubmit =
      async (
        event:
          FormEvent<HTMLFormElement>,
      ) => {
        event.preventDefault();

        const amount =
          Number(
            withdrawalForm.amount,
          );

        if (
          !withdrawalForm.accountId
        ) {
          toast.error(
            "Sélectionnez un compte de trésorerie.",
          );

          return;
        }

        if (
          !Number.isFinite(
            amount,
          ) ||
          amount <=
            0
        ) {
          toast.error(
            "Le montant doit être supérieur à zéro.",
          );

          return;
        }

        const currentBalance =
          getTreasuryBalance(
            withdrawalForm.accountId,
          );

        if (
          amount >
          currentBalance
        ) {
          toast.error(
            `Solde insuffisant. Disponible : ${formatAmount(
              currentBalance,
            )}`,
          );

          return;
        }

        try {
          await recordWithdrawal.mutateAsync(
            {
              accountId:
                withdrawalForm.accountId,

              amount,

              date:
                new Date(
                  withdrawalForm.date,
                ).toISOString(),

              label:
                withdrawalForm.label,

              externalReference:
                withdrawalForm.externalReference,

              notes:
                withdrawalForm.notes,
            },
          );

          toast.success(
            "Sortie de trésorerie enregistrée.",
          );

          setWithdrawalOpen(
            false,
          );

          setWithdrawalForm(
            createInitialTreasuryFlowForm(),
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ||
              "Impossible d'enregistrer la sortie de trésorerie.",
          );
        }
      };

    // ========================================================
    // RENDER
    // ========================================================

    return (
      <PageShell
        title="Finance"
        subtitle="Revenus, trésorerie et écritures comptables"
      >
        {/* ================================================= */}
        {/* ACTIONS                                          */}
        {/* ================================================= */}

        <div className="flex flex-wrap justify-end gap-2 mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setOpeningBalanceForm(
                createInitialOpeningBalanceForm(),
              );

              setOpeningBalanceOpen(
                true,
              );
            }}
          >
            <Vault className="h-4 w-4 mr-2" />

            Solde initial
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setDepositForm(
                createInitialTreasuryFlowForm(),
              );

              setDepositOpen(
                true,
              );
            }}
          >
            <CirclePlus className="h-4 w-4 mr-2" />

            Entrée
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setWithdrawalForm(
                createInitialTreasuryFlowForm(),
              );

              setWithdrawalOpen(
                true,
              );
            }}
          >
            <CircleMinus className="h-4 w-4 mr-2" />

            Sortie
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setTransferForm(
                createInitialTransferForm(),
              );

              setTransferOpen(
                true,
              );
            }}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />

            Transfert
          </Button>

          <Button
            asChild
          >
            <Link
              to="/admin/expenses"
            >
              <ReceiptText className="h-4 w-4 mr-2" />

              Voir les dépenses
            </Link>
          </Button>
        </div>

        {/* ================================================= */}
        {/* KPI                                               */}
        {/* ================================================= */}

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="premium-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2">
                <ArrowUpCircle className="h-5 w-5 text-success" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Revenus
                </p>

                <p className="font-semibold">
                  {formatAmount(
                    totals.income,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="premium-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2">
                <ArrowDownCircle className="h-5 w-5 text-destructive" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Dépenses payées
                </p>

                <p className="font-semibold">
                  {formatAmount(
                    totals.expenses,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="premium-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <WalletCards className="h-5 w-5 text-primary" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Solde financier
                </p>

                <p className="font-semibold">
                  {formatAmount(
                    totals.balance,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="premium-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Banknote className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Mouvements financiers
                </p>

                <p className="font-semibold">
                  {
                    totals.count
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* SOLDES TRESORERIE                                */}
        {/* ================================================= */}

        <div className="mb-6">
          <div className="flex items-end justify-between gap-4 mb-3">
            <div>
              <h2 className="font-semibold text-lg">
                Trésorerie
              </h2>

              <p className="text-sm text-muted-foreground">
                Soldes réels issus des écritures comptables.
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Total trésorerie
              </p>

              <p className="font-semibold">
                {formatAmount(
                  treasuryTotal,
                )}
              </p>
            </div>
          </div>

          {treasuryBalancesLoading ? (
            <TableSkeleton
              rows={1}
              columns={3}
            />
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="premium-card p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Vault className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Caisse
                    </p>

                    <p
                      className={
                        Number(
                          cashBalance?.balance ??
                            0,
                        ) <
                        0
                          ? "font-semibold text-destructive"
                          : "font-semibold"
                      }
                    >
                      {formatAmount(
                        cashBalance?.balance ??
                          0,
                        cashBalance?.currency ??
                          "GNF",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="premium-card p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Landmark className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Banque
                    </p>

                    <p className="font-semibold">
                      {formatAmount(
                        bankBalance?.balance ??
                          0,
                        bankBalance?.currency ??
                          "GNF",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="premium-card p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Smartphone className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Mobile Money
                    </p>

                    <p className="font-semibold">
                      {formatAmount(
                        mobileBalance?.balance ??
                          0,
                        mobileBalance?.currency ??
                          "GNF",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* JOURNAL TRESORERIE                               */}
        {/* ================================================= */}

        <div className="premium-card overflow-hidden mb-6">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">
                  Journal de trésorerie
                </h2>

                <p className="text-sm text-muted-foreground">
                  Cliquez sur une ligne pour afficher son détail.
                </p>
              </div>

              <Badge variant="secondary">
                {
                  treasuryJournal?.length ??
                  0
                }{" "}
                mouvements
              </Badge>
            </div>
          </div>

          {treasuryJournalLoading ? (
            <div className="p-4">
              <TableSkeleton
                rows={6}
                columns={8}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>
                      Date
                    </TableHead>

                    <TableHead>
                      Compte
                    </TableHead>

                    <TableHead>
                      Type
                    </TableHead>

                    <TableHead>
                      Référence
                    </TableHead>

                    <TableHead>
                      Libellé
                    </TableHead>

                    <TableHead className="text-right">
                      Entrée
                    </TableHead>

                    <TableHead className="text-right">
                      Sortie
                    </TableHead>

                    <TableHead className="text-right">
                      Solde après
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {(treasuryJournal ??
                    []).length ===
                  0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-10 text-muted-foreground"
                      >
                        Aucun mouvement de trésorerie.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (
                      treasuryJournal ??
                      []
                    ).map(
                      (
                        movement,
                      ) => {
                        const typeLabel =
                          treasuryJournalTypeLabel(
                            movement.movement_type,
                            movement.finance_transaction_type,
                            movement.finance_source_type,
                          );

                        const reference =
                          movement.treasury_reference ??
                          movement.finance_reference ??
                          movement.accounting_reference;

                        return (
                          <TableRow
                            key={
                              movement.line_id
                            }
                            className="cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() =>
                              openTreasuryDetail(
                                movement.line_id,
                              )
                            }
                          >
                            <TableCell className="whitespace-nowrap">
                              {formatDateTime(
                                movement.entry_date,
                              )}
                            </TableCell>

                            <TableCell>
                              <p className="font-medium">
                                {
                                  movement.treasury_account_name
                                }
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {
                                  movement.treasury_account_code
                                }
                              </p>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={
                                  movement.direction ===
                                  "out"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {
                                  typeLabel
                                }
                              </Badge>
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {
                                reference
                              }
                            </TableCell>

                            <TableCell>
                              <p className="font-medium text-sm">
                                {
                                  movement.entry_label
                                }
                              </p>

                              {movement.movement_type ===
                                "transfer" && (
                                <p className="text-xs text-muted-foreground">
                                  Transfert interne
                                </p>
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              {movement.direction ===
                              "in" ? (
                                <span className="font-semibold text-success whitespace-nowrap">
                                  +
                                  {formatAmount(
                                    movement.debit,
                                    movement.currency,
                                  )}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              {movement.direction ===
                              "out" ? (
                                <span className="font-semibold text-destructive whitespace-nowrap">
                                  -
                                  {formatAmount(
                                    movement.credit,
                                    movement.currency,
                                  )}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              <span
                                className={
                                  Number(
                                    movement.balance_after,
                                  ) <
                                  0
                                    ? "font-semibold text-destructive whitespace-nowrap"
                                    : "font-semibold whitespace-nowrap"
                                }
                              >
                                {formatAmount(
                                  movement.balance_after,
                                  movement.currency,
                                )}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      },
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* FILTRES FINANCE                                  */}
        {/* ================================================= */}

        <div className="premium-card p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Référence, libellé, catégorie, vente, bien, acquéreur..."
                value={
                  search
                }
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
              />
            </div>

            <Select
              value={
                typeFilter
              }
              onValueChange={
                setTypeFilter
              }
            >
              <SelectTrigger className="lg:w-44">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__all__">
                  Tous les types
                </SelectItem>

                <SelectItem value="income">
                  Revenus
                </SelectItem>

                <SelectItem value="expense">
                  Dépenses
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={
                statusFilter
              }
              onValueChange={
                setStatusFilter
              }
            >
              <SelectTrigger className="lg:w-44">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__all__">
                  Tous les statuts
                </SelectItem>

                <SelectItem value="posted">
                  Comptabilisé
                </SelectItem>

                <SelectItem value="draft">
                  Brouillon
                </SelectItem>

                <SelectItem value="cancelled">
                  Annulé
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ================================================= */}
        {/* TRANSACTIONS FINANCE                             */}
        {/* ================================================= */}

        {isLoading ? (
          <TableSkeleton
            rows={6}
            columns={7}
          />
        ) : filtered.length ===
          0 ? (
          <EmptyState
            icon={
              WalletCards
            }
            title="Aucun mouvement financier"
            description="Les encaissements et décaissements apparaîtront ici."
          />
        ) : (
          <div className="premium-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    Date
                  </TableHead>

                  <TableHead>
                    Référence
                  </TableHead>

                  <TableHead>
                    Libellé
                  </TableHead>

                  <TableHead>
                    Origine
                  </TableHead>

                  <TableHead>
                    Montant
                  </TableHead>

                  <TableHead>
                    Statut
                  </TableHead>

                  <TableHead className="text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map(
                  (
                    transaction,
                  ) => (
                    <TableRow
                      key={
                        transaction.id
                      }
                    >
                      <TableCell>
                        {formatDateTime(
                          transaction.transaction_date,
                        )}
                      </TableCell>

                      <TableCell>
                        {
                          transaction.reference
                        }
                      </TableCell>

                      <TableCell>
                        <p className="font-medium">
                          {
                            transaction.label
                          }
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {paymentMethodLabel(
                            transaction.payment_method,
                          )}
                        </p>
                      </TableCell>

                      <TableCell>
                        {transaction.sale
                          ? `Vente ${transaction.sale.reference}`
                          : transaction.expense_category
                            ?.name ??
                            transaction.source_type ??
                            "Manuel"}
                      </TableCell>

                      <TableCell>
                        <span
                          className={
                            transaction.transaction_type ===
                            "income"
                              ? "font-semibold text-success"
                              : "font-semibold text-destructive"
                          }
                        >
                          {transaction.transaction_type ===
                          "income"
                            ? "+"
                            : "-"}

                          {formatAmount(
                            transaction.amount,
                            transaction.currency,
                          )}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary">
                          {
                            transaction.status
                          }
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            openDetail(
                              transaction,
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ================================================= */}
        {/* DIALOG DETAIL JOURNAL TRESORERIE                 */}
        {/* ================================================= */}

        <Dialog
          open={
            treasuryDetailOpen
          }
          onOpenChange={(
            value,
          ) => {
            if (!value) {
              closeTreasuryDetail();
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto">
            {treasuryDetailLoading ||
            !treasuryDetail ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>
                    Détail du mouvement de trésorerie
                  </DialogTitle>

                  <DialogDescription>
                    {
                      treasuryDetail.journal.accounting_reference
                    }
                  </DialogDescription>
                </DialogHeader>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Compte
                    </p>

                    <p className="font-semibold mt-1">
                      {
                        treasuryDetail.journal.treasury_account_name
                      }
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {
                        treasuryDetail.journal.treasury_account_code
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Type
                    </p>

                    <p className="font-semibold mt-1">
                      {treasuryJournalTypeLabel(
                        treasuryDetail.journal.movement_type,
                        treasuryDetail.journal.finance_transaction_type,
                        treasuryDetail.journal.finance_source_type,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Montant
                    </p>

                    <p
                      className={
                        treasuryDetail.journal.direction ===
                        "out"
                          ? "font-semibold mt-1 text-destructive"
                          : "font-semibold mt-1 text-success"
                      }
                    >
                      {treasuryDetail.journal.direction ===
                      "out"
                        ? "-"
                        : "+"}

                      {formatAmount(
                        Math.abs(
                          Number(
                            treasuryDetail.journal.signed_amount,
                          ),
                        ),
                        treasuryDetail.journal.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Solde après
                    </p>

                    <p
                      className={
                        Number(
                          treasuryDetail.journal.balance_after,
                        ) <
                        0
                          ? "font-semibold mt-1 text-destructive"
                          : "font-semibold mt-1"
                      }
                    >
                      {formatAmount(
                        treasuryDetail.journal.balance_after,
                        treasuryDetail.journal.currency,
                      )}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold">
                    Informations
                  </h3>

                  <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
                    <p>
                      Date :{" "}
                      <strong>
                        {formatDateTime(
                          treasuryDetail.journal.entry_date,
                        )}
                      </strong>
                    </p>

                    <p>
                      Libellé :{" "}
                      <strong>
                        {
                          treasuryDetail.journal.entry_label
                        }
                      </strong>
                    </p>

                    <p>
                      Référence comptable :{" "}
                      <strong>
                        {
                          treasuryDetail.journal.accounting_reference
                        }
                      </strong>
                    </p>

                    <p>
                      Référence Finance :{" "}
                      <strong>
                        {
                          treasuryDetail.journal.finance_reference ??
                          "—"
                        }
                      </strong>
                    </p>

                    <p>
                      Référence trésorerie :{" "}
                      <strong>
                        {
                          treasuryDetail.journal.treasury_reference ??
                          "—"
                        }
                      </strong>
                    </p>

                    <p>
                      Référence externe :{" "}
                      <strong>
                        {
                          treasuryDetail.journal.external_reference ??
                          "—"
                        }
                      </strong>
                    </p>
                  </div>
                </div>

                {treasuryDetail.financeTransaction && (
                  <div className="rounded-xl border p-4">
                    <h3 className="font-semibold">
                      Origine financière
                    </h3>

                    <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
                      <p>
                        Nature :{" "}
                        <strong>
                          {treasuryDetail.financeTransaction.transaction_type ===
                          "income"
                            ? "Revenu"
                            : "Dépense"}
                        </strong>
                      </p>

                      <p>
                        Référence :{" "}
                        <strong>
                          {
                            treasuryDetail.financeTransaction.reference
                          }
                        </strong>
                      </p>

                      <p>
                        Catégorie :{" "}
                        <strong>
                          {treasuryDetail.financeTransaction
                            .expense_category
                            ?.name ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Paiement :{" "}
                        <strong>
                          {paymentMethodLabel(
                            treasuryDetail.financeTransaction.payment_method,
                          )}
                        </strong>
                      </p>
                    </div>
                  </div>
                )}

                {treasuryDetail.financeTransaction?.sale && (
                  <div className="rounded-xl border p-4">
                    <h3 className="font-semibold">
                      Vente liée
                    </h3>

                    <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
                      <p>
                        Vente :{" "}
                        <strong>
                          {
                            treasuryDetail.financeTransaction.sale.reference
                          }
                        </strong>
                      </p>

                      <p>
                        Bien :{" "}
                        <strong>
                          {treasuryDetail.financeTransaction.sale
                            .property
                            ?.title ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Acquéreur :{" "}
                        <strong>
                          {treasuryDetail.financeTransaction.sale
                            .buyer
                            ?.full_name ??
                            treasuryDetail.financeTransaction.sale
                              .buyer_name ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Commission :{" "}
                        <strong>
                          {formatAmount(
                            treasuryDetail.financeTransaction.sale
                              .commission_amount,
                            treasuryDetail.financeTransaction.sale
                              .currency,
                          )}
                        </strong>
                      </p>
                    </div>
                  </div>
                )}

                {treasuryDetail.treasuryMovement && (
                  <div className="rounded-xl border p-4">
                    <h3 className="font-semibold">
                      Mouvement de trésorerie
                    </h3>

                    <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
                      <p>
                        Source :{" "}
                        <strong>
                          {treasuryDetail.treasuryMovement
                            .source_account
                            ?.name ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Destination :{" "}
                        <strong>
                          {treasuryDetail.treasuryMovement
                            .destination_account
                            ?.name ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Libellé :{" "}
                        <strong>
                          {
                            treasuryDetail.treasuryMovement.label
                          }
                        </strong>
                      </p>

                      <p>
                        Référence externe :{" "}
                        <strong>
                          {
                            treasuryDetail.treasuryMovement.external_reference ??
                            "—"
                          }
                        </strong>
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />

                    Écriture comptable
                  </h3>

                  {treasuryDetail.accountingEntry ? (
                    <>
                      <div className="grid md:grid-cols-3 gap-3 mt-3 text-sm">
                        <p>
                          Référence :{" "}
                          <strong>
                            {
                              treasuryDetail.accountingEntry.reference
                            }
                          </strong>
                        </p>

                        <p>
                          Journal :{" "}
                          <strong>
                            {treasuryDetail.accountingEntry.journal
                              ? `${treasuryDetail.accountingEntry.journal.code} - ${treasuryDetail.accountingEntry.journal.name}`
                              : "—"}
                          </strong>
                        </p>

                        <p>
                          Statut :{" "}
                          <strong>
                            {
                              treasuryDetail.accountingEntry.status
                            }
                          </strong>
                        </p>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>
                                Compte
                              </TableHead>

                              <TableHead>
                                Libellé
                              </TableHead>

                              <TableHead className="text-right">
                                Débit
                              </TableHead>

                              <TableHead className="text-right">
                                Crédit
                              </TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {treasuryDetail.accountingLines.map(
                              (
                                line,
                              ) => (
                                <TableRow
                                  key={
                                    line.id
                                  }
                                >
                                  <TableCell>
                                    <p className="font-medium">
                                      {line.account?.code ??
                                        "—"}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                      {line.account?.name ??
                                        ""}
                                    </p>
                                  </TableCell>

                                  <TableCell>
                                    {
                                      line.label
                                    }
                                  </TableCell>

                                  <TableCell className="text-right">
                                    {Number(
                                      line.debit,
                                    ) >
                                    0
                                      ? formatAmount(
                                          line.debit,
                                          treasuryDetail.accountingEntry
                                            ?.currency ??
                                            "GNF",
                                        )
                                      : "—"}
                                  </TableCell>

                                  <TableCell className="text-right">
                                    {Number(
                                      line.credit,
                                    ) >
                                    0
                                      ? formatAmount(
                                          line.credit,
                                          treasuryDetail.accountingEntry
                                            ?.currency ??
                                            "GNF",
                                        )
                                      : "—"}
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Aucune écriture comptable associée.
                    </p>
                  )}
                </div>

                {(treasuryDetail.journal.notes ||
                  treasuryDetail.treasuryMovement?.notes ||
                  treasuryDetail.financeTransaction?.notes) && (
                  <div className="rounded-xl border p-4">
                    <h3 className="font-semibold">
                      Notes
                    </h3>

                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {treasuryDetail.journal.notes ??
                        treasuryDetail.treasuryMovement
                          ?.notes ??
                        treasuryDetail.financeTransaction
                          ?.notes}
                    </p>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={
                      closeTreasuryDetail
                    }
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* DIALOG SOLDE INITIAL                              */}
        {/* ================================================= */}

        <Dialog
          open={
            openingBalanceOpen
          }
          onOpenChange={
            setOpeningBalanceOpen
          }
        >
          <DialogContent className="sm:max-w-lg">
            <form
              onSubmit={
                handleOpeningBalanceSubmit
              }
            >
              <DialogHeader>
                <DialogTitle>
                  Solde initial
                </DialogTitle>

                <DialogDescription>
                  Chaque compte ne peut avoir qu'un seul solde initial.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-5">
                <Select
                  value={
                    openingBalanceForm.accountId
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setOpeningBalanceForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        accountId:
                          value,
                      }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Compte de trésorerie" />
                  </SelectTrigger>

                  <SelectContent>
                    {(treasuryAccounts ??
                      []).map(
                      (
                        account,
                      ) => {
                        const initialized =
                          openingBalanceAccountIds.has(
                            account.id,
                          );

                        return (
                          <SelectItem
                            key={
                              account.id
                            }
                            value={
                              account.id
                            }
                            disabled={
                              initialized
                            }
                          >
                            {account.name}

                            {initialized
                              ? " — déjà initialisé"
                              : ""}
                          </SelectItem>
                        );
                      },
                    )}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant"
                  value={
                    openingBalanceForm.amount
                  }
                  onChange={(
                    event,
                  ) =>
                    setOpeningBalanceForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        amount:
                          event.target.value,
                      }),
                    )
                  }
                  required
                />

                <Input
                  type="datetime-local"
                  value={
                    openingBalanceForm.date
                  }
                  onChange={(
                    event,
                  ) =>
                    setOpeningBalanceForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        date:
                          event.target.value,
                      }),
                    )
                  }
                  required
                />

                <textarea
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Notes"
                  value={
                    openingBalanceForm.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setOpeningBalanceForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setOpeningBalanceOpen(
                      false,
                    )
                  }
                >
                  Annuler
                </Button>

                <Button
                  type="submit"
                  disabled={
                    recordOpeningBalance.isPending ||
                    treasuryAccountsLoading
                  }
                >
                  {recordOpeningBalance.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* DIALOG ENTREE                                     */}
        {/* ================================================= */}

        <Dialog
          open={
            depositOpen
          }
          onOpenChange={
            setDepositOpen
          }
        >
          <DialogContent className="sm:max-w-xl">
            <form
              onSubmit={
                handleDepositSubmit
              }
            >
              <DialogHeader>
                <DialogTitle>
                  Entrée de trésorerie
                </DialogTitle>

                <DialogDescription>
                  Augmente un compte sans créer de revenu.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-5">
                <Select
                  value={
                    depositForm.accountId
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setDepositForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        accountId:
                          value,
                      }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Compte" />
                  </SelectTrigger>

                  <SelectContent>
                    {(treasuryAccounts ??
                      []).map(
                      (
                        account,
                      ) => (
                        <SelectItem
                          key={
                            account.id
                          }
                          value={
                            account.id
                          }
                        >
                          {account.name} —{" "}
                          {formatAmount(
                            getTreasuryBalance(
                              account.id,
                            ),
                            account.currency,
                          )}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant"
                  value={
                    depositForm.amount
                  }
                  onChange={(
                    event,
                  ) =>
                    setDepositForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        amount:
                          event.target.value,
                      }),
                    )
                  }
                  required
                />

                <Input
                  type="datetime-local"
                  value={
                    depositForm.date
                  }
                  onChange={(
                    event,
                  ) =>
                    setDepositForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        date:
                          event.target.value,
                      }),
                    )
                  }
                />

                <Input
                  placeholder="Libellé"
                  value={
                    depositForm.label
                  }
                  onChange={(
                    event,
                  ) =>
                    setDepositForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        label:
                          event.target.value,
                      }),
                    )
                  }
                />

                <Input
                  placeholder="Référence externe"
                  value={
                    depositForm.externalReference
                  }
                  onChange={(
                    event,
                  ) =>
                    setDepositForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        externalReference:
                          event.target.value,
                      }),
                    )
                  }
                />

                <textarea
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Notes"
                  value={
                    depositForm.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setDepositForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDepositOpen(
                      false,
                    )
                  }
                >
                  Annuler
                </Button>

                <Button
                  type="submit"
                  disabled={
                    recordDeposit.isPending
                  }
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* DIALOG SORTIE                                     */}
        {/* ================================================= */}

        <Dialog
          open={
            withdrawalOpen
          }
          onOpenChange={
            setWithdrawalOpen
          }
        >
          <DialogContent className="sm:max-w-xl">
            <form
              onSubmit={
                handleWithdrawalSubmit
              }
            >
              <DialogHeader>
                <DialogTitle>
                  Sortie de trésorerie
                </DialogTitle>

                <DialogDescription>
                  Diminue un compte sans créer de dépense.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-5">
                <Select
                  value={
                    withdrawalForm.accountId
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setWithdrawalForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        accountId:
                          value,
                      }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Compte" />
                  </SelectTrigger>

                  <SelectContent>
                    {(treasuryAccounts ??
                      []).map(
                      (
                        account,
                      ) => (
                        <SelectItem
                          key={
                            account.id
                          }
                          value={
                            account.id
                          }
                        >
                          {account.name} —{" "}
                          {formatAmount(
                            getTreasuryBalance(
                              account.id,
                            ),
                            account.currency,
                          )}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>

                {withdrawalForm.accountId && (
                  <div className="rounded-lg border p-3 text-sm">
                    Disponible :{" "}
                    <strong>
                      {formatAmount(
                        getTreasuryBalance(
                          withdrawalForm.accountId,
                        ),
                      )}
                    </strong>
                  </div>
                )}

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant"
                  value={
                    withdrawalForm.amount
                  }
                  onChange={(
                    event,
                  ) =>
                    setWithdrawalForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        amount:
                          event.target.value,
                      }),
                    )
                  }
                  required
                />

                <Input
                  type="datetime-local"
                  value={
                    withdrawalForm.date
                  }
                  onChange={(
                    event,
                  ) =>
                    setWithdrawalForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        date:
                          event.target.value,
                      }),
                    )
                  }
                />

                <Input
                  placeholder="Libellé"
                  value={
                    withdrawalForm.label
                  }
                  onChange={(
                    event,
                  ) =>
                    setWithdrawalForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        label:
                          event.target.value,
                      }),
                    )
                  }
                />

                <Input
                  placeholder="Référence externe"
                  value={
                    withdrawalForm.externalReference
                  }
                  onChange={(
                    event,
                  ) =>
                    setWithdrawalForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        externalReference:
                          event.target.value,
                      }),
                    )
                  }
                />

                <textarea
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Notes"
                  value={
                    withdrawalForm.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setWithdrawalForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setWithdrawalOpen(
                      false,
                    )
                  }
                >
                  Annuler
                </Button>

                <Button
                  type="submit"
                  disabled={
                    recordWithdrawal.isPending
                  }
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* DIALOG TRANSFERT                                  */}
        {/* ================================================= */}

        <Dialog
          open={
            transferOpen
          }
          onOpenChange={
            setTransferOpen
          }
        >
          <DialogContent className="sm:max-w-2xl">
            <form
              onSubmit={
                handleTransferSubmit
              }
            >
              <DialogHeader>
                <DialogTitle>
                  Transfert de trésorerie
                </DialogTitle>

                <DialogDescription>
                  Déplace des fonds entre deux comptes.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select
                    value={
                      transferForm.sourceAccountId
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setTransferForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          sourceAccountId:
                            value,
                        }),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>

                    <SelectContent>
                      {(treasuryAccounts ??
                        []).map(
                        (
                          account,
                        ) => (
                          <SelectItem
                            key={
                              account.id
                            }
                            value={
                              account.id
                            }
                          >
                            {
                              account.name
                            }
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>

                  <Select
                    value={
                      transferForm.destinationAccountId
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setTransferForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          destinationAccountId:
                            value,
                        }),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Destination" />
                    </SelectTrigger>

                    <SelectContent>
                      {(treasuryAccounts ??
                        []).map(
                        (
                          account,
                        ) => (
                          <SelectItem
                            key={
                              account.id
                            }
                            value={
                              account.id
                            }
                            disabled={
                              account.id ===
                              transferForm.sourceAccountId
                            }
                          >
                            {
                              account.name
                            }
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant"
                  value={
                    transferForm.amount
                  }
                  onChange={(
                    event,
                  ) =>
                    setTransferForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        amount:
                          event.target.value,
                      }),
                    )
                  }
                />

                <Input
                  type="datetime-local"
                  value={
                    transferForm.date
                  }
                  onChange={(
                    event,
                  ) =>
                    setTransferForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        date:
                          event.target.value,
                      }),
                    )
                  }
                />

                <Input
                  placeholder="Libellé"
                  value={
                    transferForm.label
                  }
                  onChange={(
                    event,
                  ) =>
                    setTransferForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        label:
                          event.target.value,
                      }),
                    )
                  }
                />

                <Input
                  placeholder="Référence externe"
                  value={
                    transferForm.externalReference
                  }
                  onChange={(
                    event,
                  ) =>
                    setTransferForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        externalReference:
                          event.target.value,
                      }),
                    )
                  }
                />

                <textarea
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Notes"
                  value={
                    transferForm.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setTransferForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setTransferOpen(
                      false,
                    )
                  }
                >
                  Annuler
                </Button>

                <Button
                  type="submit"
                  disabled={
                    recordTransfer.isPending
                  }
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* DETAIL TRANSACTION FINANCE                       */}
        {/* ================================================= */}

        <Dialog
          open={
            detailOpen
          }
          onOpenChange={(
            value,
          ) => {
            if (!value) {
              closeDetail();
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto">
            {detailLoading ||
            !detail ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>
                    Mouvement financier{" "}
                    {
                      detail.transaction.reference
                    }
                  </DialogTitle>

                  <DialogDescription>
                    Détail de la transaction et de l'écriture comptable.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Type
                    </p>

                    <p className="font-semibold">
                      {detail.transaction.transaction_type ===
                      "income"
                        ? "Revenu"
                        : "Dépense"}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Montant
                    </p>

                    <p className="font-semibold">
                      {formatAmount(
                        detail.transaction.amount,
                        detail.transaction.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Paiement
                    </p>

                    <p className="font-semibold">
                      {paymentMethodLabel(
                        detail.transaction.payment_method,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Date
                    </p>

                    <p className="font-semibold">
                      {formatDateTime(
                        detail.transaction.transaction_date,
                      )}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />

                    Écriture comptable
                  </h3>

                  {detail.accountingEntry ? (
                    <div className="mt-4 overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              Compte
                            </TableHead>

                            <TableHead>
                              Libellé
                            </TableHead>

                            <TableHead className="text-right">
                              Débit
                            </TableHead>

                            <TableHead className="text-right">
                              Crédit
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {detail.lines.map(
                            (
                              line,
                            ) => (
                              <TableRow
                                key={
                                  line.id
                                }
                              >
                                <TableCell>
                                  {line.account?.code ??
                                    "—"}{" "}
                                  {line.account?.name ??
                                    ""}
                                </TableCell>

                                <TableCell>
                                  {
                                    line.label
                                  }
                                </TableCell>

                                <TableCell className="text-right">
                                  {Number(
                                    line.debit,
                                  ) >
                                  0
                                    ? formatAmount(
                                        line.debit,
                                        detail.accountingEntry
                                          ?.currency ??
                                          "GNF",
                                      )
                                    : "—"}
                                </TableCell>

                                <TableCell className="text-right">
                                  {Number(
                                    line.credit,
                                  ) >
                                  0
                                    ? formatAmount(
                                        line.credit,
                                        detail.accountingEntry
                                          ?.currency ??
                                          "GNF",
                                      )
                                    : "—"}
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Aucune écriture comptable associée.
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={
                      closeDetail
                    }
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </PageShell>
    );
  };

export default FinancePage;