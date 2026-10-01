import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

// ============================================================
// TYPES FINANCE
// ============================================================

export type FinanceTransactionType =
  | "income"
  | "expense";

export type FinanceTransactionStatus =
  | "draft"
  | "posted"
  | "cancelled";

export type FinancePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "mobile_money"
  | "cheque"
  | "card"
  | "other";

// ============================================================
// TYPES TRESORERIE
// ============================================================

export type TreasuryAccountType =
  | "cash"
  | "bank"
  | "mobile_money";

export type TreasuryMovementType =
  | "opening_balance"
  | "deposit"
  | "withdrawal"
  | "transfer";

export type TreasuryJournalDirection =
  | "in"
  | "out"
  | "neutral";

// ============================================================
// COMPTES TRESORERIE
// ============================================================

export interface TreasuryAccountBalance {
  id: string;
  code: string;
  name: string;
  account_type: TreasuryAccountType;
  currency: string;
  balance: number;
}

export interface TreasuryAccount {
  id: string;
  name: string;
  code: string;
  account_type: TreasuryAccountType;
  accounting_account_id: string;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// MOUVEMENTS TRESORERIE
// ============================================================

export interface TreasuryMovement {
  id: string;

  reference: string;

  movement_type:
    TreasuryMovementType;

  source_account_id:
    string | null;

  destination_account_id:
    string | null;

  amount:
    number;

  currency:
    string;

  movement_date:
    string;

  label:
    string;

  external_reference:
    string | null;

  notes:
    string;

  accounting_entry_id:
    string | null;

  created_by:
    string | null;

  created_at:
    string;

  source_account?: {
    id: string;
    name: string;
    code: string;
    account_type: TreasuryAccountType;
  } | null;

  destination_account?: {
    id: string;
    name: string;
    code: string;
    account_type: TreasuryAccountType;
  } | null;
}

// ============================================================
// JOURNAL TRESORERIE
// ============================================================

export interface TreasuryJournalEntry {
  line_id: string;

  accounting_entry_id:
    string;

  accounting_reference:
    string;

  entry_date:
    string;

  entry_label:
    string;

  accounting_status:
    string;

  currency:
    string;

  treasury_account_id:
    string;

  treasury_account_code:
    string;

  treasury_account_name:
    string;

  account_type:
    TreasuryAccountType;

  debit:
    number;

  credit:
    number;

  signed_amount:
    number;

  direction:
    TreasuryJournalDirection;

  finance_transaction_id:
    string | null;

  finance_reference:
    string | null;

  finance_transaction_type:
    FinanceTransactionType | null;

  finance_source_type:
    string | null;

  sale_id:
    string | null;

  treasury_movement_id:
    string | null;

  treasury_reference:
    string | null;

  movement_type:
    TreasuryMovementType | null;

  external_reference:
    string | null;

  notes:
    string | null;

  created_by:
    string | null;

  created_at:
    string;

  balance_after:
    number;
}

// ============================================================
// CATEGORIES DEPENSES
// ============================================================

export interface FinanceExpenseCategory {
  id: string;
  name: string;
  slug: string;
  accounting_account_id: string;
  active: boolean;
  created_at: string;

  accounting_account?: {
    id: string;
    code: string;
    name: string;
    account_type: string;
  } | null;
}

// ============================================================
// TRANSACTIONS FINANCE
// ============================================================

export interface FinanceTransaction {
  id: string;

  organization_id:
    string | null;

  transaction_type:
    FinanceTransactionType;

  status:
    FinanceTransactionStatus;

  reference:
    string;

  label:
    string;

  amount:
    number;

  currency:
    string;

  transaction_date:
    string;

  payment_method:
    string | null;

  external_reference:
    string | null;

  source_type:
    string | null;

  source_id:
    string | null;

  sale_id:
    string | null;

  sale_commission_id:
    string | null;

  sale_payment_id:
    string | null;

  expense_category_id:
    string | null;

  notes:
    string;

  created_by:
    string | null;

  created_at:
    string;

  updated_at:
    string;

  expense_category?: {
    id: string;
    name: string;
    slug: string;
  } | null;

  sale?: {
    id: string;
    reference: string;
    buyer_name: string;
    buyer_phone: string;
    buyer_email: string;
    asking_price: number;
    agreed_price: number;
    commission_amount: number;
    currency: string;
    status: string;

    property?: {
      id: string;
      title: string;
    } | null;

    buyer?: {
      id: string;
      full_name: string;
    } | null;
  } | null;
}

// ============================================================
// COMPTABILITE
// ============================================================

export interface AccountingEntry {
  id: string;

  journal_id:
    string;

  reference:
    string;

  entry_date:
    string;

  label:
    string;

  status:
    string;

  currency:
    string;

  finance_transaction_id:
    string | null;

  sale_id:
    string | null;

  notes:
    string;

  created_by:
    string | null;

  created_at:
    string;

  journal?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface AccountingEntryLine {
  id: string;

  entry_id:
    string;

  account_id:
    string;

  label:
    string;

  debit:
    number;

  credit:
    number;

  created_at:
    string;

  account?: {
    id: string;
    code: string;
    name: string;
    account_type: string;
  } | null;
}

// ============================================================
// DETAILS
// ============================================================

export interface FinanceTransactionDetails {
  transaction:
    FinanceTransaction;

  accountingEntry:
    AccountingEntry | null;

  lines:
    AccountingEntryLine[];
}

export interface TreasuryJournalEntryDetails {
  journal:
    TreasuryJournalEntry;

  accountingEntry:
    AccountingEntry | null;

  accountingLines:
    AccountingEntryLine[];

  financeTransaction:
    FinanceTransaction | null;

  treasuryMovement:
    TreasuryMovement | null;
}

// ============================================================
// INPUT DEPENSE
// ============================================================

export interface RecordFinanceExpenseInput {
  categoryId: string;
  amount: number;

  currency?: string;

  paymentMethod:
    FinancePaymentMethod;

  transactionDate:
    string;

  label?: string;
  externalReference?: string;
  notes?: string;
}

export interface RecordFinanceExpenseResult {
  success: boolean;

  finance_transaction_id:
    string;

  accounting_entry_id:
    string;

  finance_reference:
    string;

  accounting_reference:
    string;
}

// ============================================================
// INPUT SOLDE INITIAL
// ============================================================

export interface RecordTreasuryOpeningBalanceInput {
  accountId: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface RecordTreasuryOpeningBalanceResult {
  success: boolean;

  movement_id:
    string;

  accounting_entry_id:
    string;

  reference:
    string;

  account_id?: string;
  account_name?: string;
  amount?: number;
}

// ============================================================
// INPUT TRANSFERT
// ============================================================

export interface RecordTreasuryTransferInput {
  sourceAccountId: string;
  destinationAccountId: string;

  amount: number;

  date: string;

  label?: string;
  externalReference?: string;
  notes?: string;
}

export interface RecordTreasuryTransferResult {
  success: boolean;

  movement_id:
    string;

  accounting_entry_id:
    string;

  reference:
    string;

  source_account:
    string;

  destination_account:
    string;

  amount:
    number;
}

// ============================================================
// INPUT ENTREE / SORTIE
// ============================================================

export interface RecordTreasuryFlowInput {
  accountId: string;
  amount: number;
  date: string;

  label?: string;
  externalReference?: string;
  notes?: string;
}

export interface RecordTreasuryFlowResult {
  success: boolean;

  movement_id:
    string;

  accounting_entry_id:
    string;

  reference:
    string;

  account_name:
    string;

  amount:
    number;

  previous_balance?: number;
  new_balance?: number;
}

// ============================================================
// INVALIDATION
// ============================================================

const invalidateFinanceQueries =
  async (
    queryClient:
      ReturnType<
        typeof useQueryClient
      >,
  ) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [
          "finance-transactions",
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          "finance-transaction",
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          "finance-expense-categories",
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          "treasury-account-balances",
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          "treasury-accounts",
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          "treasury-movements",
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          "treasury-journal",
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          "treasury-journal-entry",
        ],
      }),
    ]);
  };

// ============================================================
// TRANSACTIONS FINANCE
// ============================================================

export const useFinanceTransactions =
  () =>
    useQuery({
      queryKey: [
        "finance-transactions",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "finance_transactions",
            )
            .select(`
              *,
              expense_category:finance_expense_categories(
                id,
                name,
                slug
              ),
              sale:sales(
                id,
                reference,
                buyer_name,
                buyer_phone,
                buyer_email,
                asking_price,
                agreed_price,
                commission_amount,
                currency,
                status,
                property:properties(
                  id,
                  title
                ),
                buyer:buyers(
                  id,
                  full_name
                )
              )
            `)
            .order(
              "transaction_date",
              {
                ascending:
                  false,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ?? []
          ) as FinanceTransaction[];
        },
    });

// ============================================================
// DETAIL TRANSACTION FINANCE
// ============================================================

export const useFinanceTransaction =
  (
    transactionId:
      string | null,
  ) =>
    useQuery({
      queryKey: [
        "finance-transaction",
        transactionId,
      ],

      enabled:
        Boolean(
          transactionId,
        ),

      queryFn:
        async () => {
          if (
            !transactionId
          ) {
            return null;
          }

          const {
            data:
              transaction,
            error:
              transactionError,
          } = await (
            supabase as any
          )
            .from(
              "finance_transactions",
            )
            .select(`
              *,
              expense_category:finance_expense_categories(
                id,
                name,
                slug
              ),
              sale:sales(
                id,
                reference,
                buyer_name,
                buyer_phone,
                buyer_email,
                asking_price,
                agreed_price,
                commission_amount,
                currency,
                status,
                property:properties(
                  id,
                  title
                ),
                buyer:buyers(
                  id,
                  full_name
                )
              )
            `)
            .eq(
              "id",
              transactionId,
            )
            .single();

          if (
            transactionError
          ) {
            throw transactionError;
          }

          const {
            data:
              accountingEntry,
            error:
              accountingError,
          } = await (
            supabase as any
          )
            .from(
              "accounting_entries",
            )
            .select(`
              *,
              journal:accounting_journals(
                id,
                code,
                name
              )
            `)
            .eq(
              "finance_transaction_id",
              transactionId,
            )
            .maybeSingle();

          if (
            accountingError
          ) {
            throw accountingError;
          }

          let lines:
            AccountingEntryLine[] =
            [];

          if (
            accountingEntry?.id
          ) {
            const {
              data:
                lineData,
              error:
                lineError,
            } = await (
              supabase as any
            )
              .from(
                "accounting_entry_lines",
              )
              .select(`
                *,
                account:accounting_accounts(
                  id,
                  code,
                  name,
                  account_type
                )
              `)
              .eq(
                "entry_id",
                accountingEntry.id,
              )
              .order(
                "debit",
                {
                  ascending:
                    false,
                },
              );

            if (
              lineError
            ) {
              throw lineError;
            }

            lines =
              (
                lineData ??
                []
              ) as AccountingEntryLine[];
          }

          return {
            transaction:
              transaction as FinanceTransaction,

            accountingEntry:
              accountingEntry as AccountingEntry | null,

            lines,
          } satisfies FinanceTransactionDetails;
        },
    });

// ============================================================
// CATEGORIES DEPENSES
// ============================================================

export const useFinanceExpenseCategories =
  () =>
    useQuery({
      queryKey: [
        "finance-expense-categories",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "finance_expense_categories",
            )
            .select(`
              *,
              accounting_account:accounting_accounts(
                id,
                code,
                name,
                account_type
              )
            `)
            .eq(
              "active",
              true,
            )
            .order(
              "name",
              {
                ascending:
                  true,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ?? []
          ) as FinanceExpenseCategory[];
        },
    });

// ============================================================
// DEPENSE
// ============================================================

export const useRecordFinanceExpense =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            RecordFinanceExpenseInput,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "record_finance_expense",
            {
              p_category_id:
                input.categoryId,

              p_amount:
                input.amount,

              p_currency:
                input.currency ??
                "GNF",

              p_payment_method:
                input.paymentMethod,

              p_transaction_date:
                input.transactionDate,

              p_label:
                input.label?.trim() ||
                null,

              p_external_reference:
                input.externalReference?.trim() ||
                null,

              p_notes:
                input.notes?.trim() ||
                null,
            },
          );

          if (
            error
          ) {
            throw error;
          }

          return data as RecordFinanceExpenseResult;
        },

      onSuccess:
        async () => {
          await invalidateFinanceQueries(
            queryClient,
          );
        },
    });
  };

// ============================================================
// SOLDES TRESORERIE
// ============================================================

export const useTreasuryAccountBalances =
  () =>
    useQuery({
      queryKey: [
        "treasury-account-balances",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "treasury_account_balances",
            )
            .select("*")
            .order(
              "name",
              {
                ascending:
                  true,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as TreasuryAccountBalance[];
        },
    });

// ============================================================
// COMPTES TRESORERIE
// ============================================================

export const useTreasuryAccounts =
  () =>
    useQuery({
      queryKey: [
        "treasury-accounts",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "treasury_accounts",
            )
            .select("*")
            .eq(
              "active",
              true,
            )
            .order(
              "name",
              {
                ascending:
                  true,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as TreasuryAccount[];
        },
    });

// ============================================================
// MOUVEMENTS TRESORERIE
// ============================================================

export const useTreasuryMovements =
  () =>
    useQuery({
      queryKey: [
        "treasury-movements",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "treasury_movements",
            )
            .select(`
              *,
              source_account:treasury_accounts!treasury_movements_source_account_id_fkey(
                id,
                name,
                code,
                account_type
              ),
              destination_account:treasury_accounts!treasury_movements_destination_account_id_fkey(
                id,
                name,
                code,
                account_type
              )
            `)
            .order(
              "movement_date",
              {
                ascending:
                  false,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as TreasuryMovement[];
        },
    });

// ============================================================
// JOURNAL COMPLET DE TRESORERIE
// ============================================================

export const useTreasuryJournal =
  () =>
    useQuery({
      queryKey: [
        "treasury-journal",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "treasury_journal_with_balance",
            )
            .select("*")
            .order(
              "entry_date",
              {
                ascending:
                  false,
              },
            )
            .order(
              "accounting_entry_id",
              {
                ascending:
                  false,
              },
            )
            .order(
              "line_id",
              {
                ascending:
                  false,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as TreasuryJournalEntry[];
        },
    });

// ============================================================
// DETAIL JOURNAL DE TRESORERIE
// ============================================================

export const useTreasuryJournalEntry =
  (
    lineId:
      string | null,
  ) =>
    useQuery({
      queryKey: [
        "treasury-journal-entry",
        lineId,
      ],

      enabled:
        Boolean(
          lineId,
        ),

      queryFn:
        async () => {
          if (
            !lineId
          ) {
            return null;
          }

          // ==================================================
          // LIGNE DU JOURNAL
          // ==================================================

          const {
            data:
              journalData,
            error:
              journalError,
          } = await (
            supabase as any
          )
            .from(
              "treasury_journal_with_balance",
            )
            .select("*")
            .eq(
              "line_id",
              lineId,
            )
            .single();

          if (
            journalError
          ) {
            throw journalError;
          }

          const journal =
            journalData as TreasuryJournalEntry;

          // ==================================================
          // ECRITURE COMPTABLE
          // ==================================================

          const {
            data:
              accountingEntry,
            error:
              accountingEntryError,
          } = await (
            supabase as any
          )
            .from(
              "accounting_entries",
            )
            .select(`
              *,
              journal:accounting_journals(
                id,
                code,
                name
              )
            `)
            .eq(
              "id",
              journal.accounting_entry_id,
            )
            .maybeSingle();

          if (
            accountingEntryError
          ) {
            throw accountingEntryError;
          }

          // ==================================================
          // LIGNES COMPTABLES
          // ==================================================

          const {
            data:
              accountingLines,
            error:
              accountingLinesError,
          } = await (
            supabase as any
          )
            .from(
              "accounting_entry_lines",
            )
            .select(`
              *,
              account:accounting_accounts(
                id,
                code,
                name,
                account_type
              )
            `)
            .eq(
              "entry_id",
              journal.accounting_entry_id,
            )
            .order(
              "debit",
              {
                ascending:
                  false,
              },
            );

          if (
            accountingLinesError
          ) {
            throw accountingLinesError;
          }

          // ==================================================
          // TRANSACTION FINANCE
          // ==================================================

          let financeTransaction:
            FinanceTransaction |
            null =
            null;

          if (
            journal.finance_transaction_id
          ) {
            const {
              data,
              error,
            } = await (
              supabase as any
            )
              .from(
                "finance_transactions",
              )
              .select(`
                *,
                expense_category:finance_expense_categories(
                  id,
                  name,
                  slug
                ),
                sale:sales(
                  id,
                  reference,
                  buyer_name,
                  buyer_phone,
                  buyer_email,
                  asking_price,
                  agreed_price,
                  commission_amount,
                  currency,
                  status,
                  property:properties(
                    id,
                    title
                  ),
                  buyer:buyers(
                    id,
                    full_name
                  )
                )
              `)
              .eq(
                "id",
                journal.finance_transaction_id,
              )
              .maybeSingle();

            if (
              error
            ) {
              throw error;
            }

            financeTransaction =
              data as FinanceTransaction | null;
          }

          // ==================================================
          // MOUVEMENT TRESORERIE
          // ==================================================

          let treasuryMovement:
            TreasuryMovement |
            null =
            null;

          if (
            journal.treasury_movement_id
          ) {
            const {
              data,
              error,
            } = await (
              supabase as any
            )
              .from(
                "treasury_movements",
              )
              .select(`
                *,
                source_account:treasury_accounts!treasury_movements_source_account_id_fkey(
                  id,
                  name,
                  code,
                  account_type
                ),
                destination_account:treasury_accounts!treasury_movements_destination_account_id_fkey(
                  id,
                  name,
                  code,
                  account_type
                )
              `)
              .eq(
                "id",
                journal.treasury_movement_id,
              )
              .maybeSingle();

            if (
              error
            ) {
              throw error;
            }

            treasuryMovement =
              data as TreasuryMovement | null;
          }

          return {
            journal,

            accountingEntry:
              accountingEntry as AccountingEntry | null,

            accountingLines:
              (
                accountingLines ??
                []
              ) as AccountingEntryLine[],

            financeTransaction,

            treasuryMovement,
          } satisfies TreasuryJournalEntryDetails;
        },
    });

// ============================================================
// SOLDE INITIAL
// ============================================================

export const useRecordTreasuryOpeningBalance =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            RecordTreasuryOpeningBalanceInput,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "record_treasury_opening_balance",
            {
              p_account_id:
                input.accountId,

              p_amount:
                input.amount,

              p_date:
                input.date,

              p_notes:
                input.notes?.trim() ||
                null,
            },
          );

          if (
            error
          ) {
            throw error;
          }

          return data as RecordTreasuryOpeningBalanceResult;
        },

      onSuccess:
        async () => {
          await invalidateFinanceQueries(
            queryClient,
          );
        },
    });
  };

// ============================================================
// TRANSFERT
// ============================================================

export const useRecordTreasuryTransfer =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            RecordTreasuryTransferInput,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "record_treasury_transfer",
            {
              p_source_account_id:
                input.sourceAccountId,

              p_destination_account_id:
                input.destinationAccountId,

              p_amount:
                input.amount,

              p_date:
                input.date,

              p_label:
                input.label?.trim() ||
                null,

              p_external_reference:
                input.externalReference?.trim() ||
                null,

              p_notes:
                input.notes?.trim() ||
                null,
            },
          );

          if (
            error
          ) {
            throw error;
          }

          return data as RecordTreasuryTransferResult;
        },

      onSuccess:
        async () => {
          await invalidateFinanceQueries(
            queryClient,
          );
        },
    });
  };

// ============================================================
// ENTREE TRESORERIE
// ============================================================

export const useRecordTreasuryDeposit =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            RecordTreasuryFlowInput,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "record_treasury_deposit",
            {
              p_account_id:
                input.accountId,

              p_amount:
                input.amount,

              p_date:
                input.date,

              p_label:
                input.label?.trim() ||
                null,

              p_external_reference:
                input.externalReference?.trim() ||
                null,

              p_notes:
                input.notes?.trim() ||
                null,
            },
          );

          if (
            error
          ) {
            throw error;
          }

          return data as RecordTreasuryFlowResult;
        },

      onSuccess:
        async () => {
          await invalidateFinanceQueries(
            queryClient,
          );
        },
    });
  };

// ============================================================
// SORTIE TRESORERIE
// ============================================================

export const useRecordTreasuryWithdrawal =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            RecordTreasuryFlowInput,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "record_treasury_withdrawal",
            {
              p_account_id:
                input.accountId,

              p_amount:
                input.amount,

              p_date:
                input.date,

              p_label:
                input.label?.trim() ||
                null,

              p_external_reference:
                input.externalReference?.trim() ||
                null,

              p_notes:
                input.notes?.trim() ||
                null,
            },
          );

          if (
            error
          ) {
            throw error;
          }

          return data as RecordTreasuryFlowResult;
        },

      onSuccess:
        async () => {
          await invalidateFinanceQueries(
            queryClient,
          );
        },
    });
  };