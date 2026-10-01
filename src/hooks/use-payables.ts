import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PayableDueState =
  | "overdue"
  | "due_soon"
  | "future"
  | "no_due_date";

export type ExpensePayable = {
  expense_id: string;
  organization_id: string | null;

  expense_reference: string | null;
  document_number: string | null;

  expense_date: string | null;
  due_date: string | null;

  label: string;
  description: string | null;

  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;

  party_id: string | null;

  supplier_name: string;
  supplier_contact_name: string | null;
  supplier_company_name: string | null;
  supplier_phone: string | null;
  supplier_email: string | null;

  amount: number;
  amount_paid: number;
  balance_due: number;

  currency: string;
  status: string;

  property_id: string | null;
  property_title: string | null;

  owner_id: string | null;
  owner_name: string | null;

  sale_id: string | null;
  sale_reference: string | null;

  contract_id: string | null;
  maintenance_request_id: string | null;

  chargeable_to_owner: boolean;

  created_at: string;
  updated_at: string | null;

  days_until_due: number | null;
  overdue_days: number | null;

  due_state: PayableDueState;
  due_state_label: string;
};

export type ExpenseSupplierBalance = {
  party_id: string | null;
  supplier_name: string;

  supplier_phone: string | null;
  supplier_email: string | null;

  currency: string | null;

  open_expense_count: number;

  total_balance_due: number;
  overdue_balance: number;
  due_soon_balance: number;

  overdue_expense_count: number;
  due_soon_expense_count: number;

  oldest_due_date: string | null;
  next_due_date: string | null;

  max_overdue_days: number | null;
};

export type ExpensePayablesKpis = {
  total_payables: number;
  overdue_amount: number;
  due_soon_amount: number;

  open_expense_count: number;
  overdue_expense_count: number;
  due_soon_expense_count: number;

  supplier_count: number;
};

export type TreasuryAccount = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  currency: string;
  active: boolean;
};

export type PayExpenseInput = {
  expenseId: string;
  amount: number;
  treasuryAccountId: string;
  paymentDate?: string;
  reference?: string;
  notes?: string;
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePayable(row: any): ExpensePayable {
  return {
    ...row,

    amount: toNumber(row.amount),
    amount_paid: toNumber(row.amount_paid),
    balance_due: toNumber(row.balance_due),

    days_until_due:
      row.days_until_due === null || row.days_until_due === undefined
        ? null
        : toNumber(row.days_until_due),

    overdue_days:
      row.overdue_days === null || row.overdue_days === undefined
        ? null
        : toNumber(row.overdue_days),

    chargeable_to_owner: Boolean(row.chargeable_to_owner),
  };
}

function normalizeSupplierBalance(row: any): ExpenseSupplierBalance {
  return {
    ...row,

    open_expense_count: toNumber(row.open_expense_count),

    total_balance_due: toNumber(row.total_balance_due),
    overdue_balance: toNumber(row.overdue_balance),
    due_soon_balance: toNumber(row.due_soon_balance),

    overdue_expense_count: toNumber(row.overdue_expense_count),
    due_soon_expense_count: toNumber(row.due_soon_expense_count),

    max_overdue_days:
      row.max_overdue_days === null || row.max_overdue_days === undefined
        ? null
        : toNumber(row.max_overdue_days),
  };
}

function normalizeKpis(row: any): ExpensePayablesKpis {
  return {
    total_payables: toNumber(row?.total_payables),
    overdue_amount: toNumber(row?.overdue_amount),
    due_soon_amount: toNumber(row?.due_soon_amount),

    open_expense_count: toNumber(row?.open_expense_count),
    overdue_expense_count: toNumber(row?.overdue_expense_count),
    due_soon_expense_count: toNumber(row?.due_soon_expense_count),

    supplier_count: toNumber(row?.supplier_count),
  };
}

async function invalidatePayablesQueries(queryClient: any) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["expense-payables"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["expense-supplier-balances"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["expense-payables-kpis"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["expenses"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["expense"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["finance-transactions"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["treasury-balances"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["treasury-account-balances"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["treasury-journal"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["treasury-movements"],
    }),
  ]);
}

/**
 * Toutes les dépenses fournisseurs encore ouvertes.
 */
export function useExpensePayables() {
  return useQuery({
    queryKey: ["expense-payables"],

    queryFn: async (): Promise<ExpensePayable[]> => {
      const { data, error } = await (supabase as any)
        .from("expense_payables")
        .select("*")
        .order("due_date", {
          ascending: true,
          nullsFirst: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return (data ?? []).map(normalizePayable);
    },
  });
}

/**
 * Synthèse des dettes par fournisseur.
 */
export function useExpenseSupplierBalances() {
  return useQuery({
    queryKey: ["expense-supplier-balances"],

    queryFn: async (): Promise<ExpenseSupplierBalance[]> => {
      const { data, error } = await (supabase as any)
        .from("expense_supplier_balances")
        .select("*")
        .order("total_balance_due", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return (data ?? []).map(normalizeSupplierBalance);
    },
  });
}

/**
 * KPI de la page Dettes fournisseurs.
 */
export function useExpensePayablesKpis() {
  return useQuery({
    queryKey: ["expense-payables-kpis"],

    queryFn: async (): Promise<ExpensePayablesKpis> => {
      const { data, error } = await (supabase as any)
        .from("expense_payables_kpis")
        .select("*")
        .maybeSingle();

      if (error) {
        throw error;
      }

      return normalizeKpis(data);
    },
  });
}

/**
 * Comptes utilisables pour payer une dépense.
 */
export function usePayableTreasuryAccounts() {
  return useQuery({
    queryKey: ["payable-treasury-accounts"],

    queryFn: async (): Promise<TreasuryAccount[]> => {
      const { data, error } = await (supabase as any)
        .from("treasury_accounts")
        .select(
          `
            id,
            code,
            name,
            account_type,
            currency,
            active
          `,
        )
        .eq("active", true)
        .order("name", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      return (data ?? []) as TreasuryAccount[];
    },
  });
}

/**
 * Paiement direct d'une dépense.
 *
 * Réutilise le workflow comptable existant :
 * fournisseur 401xxx -> trésorerie.
 */
export function usePayExpenseFromPayables() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      amount,
      treasuryAccountId,
      paymentDate,
      reference,
      notes,
    }: PayExpenseInput) => {
      if (!expenseId) {
        throw new Error("Dépense invalide.");
      }

      if (!treasuryAccountId) {
        throw new Error("Sélectionnez un compte de paiement.");
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Le montant du paiement doit être supérieur à zéro.");
      }

      const rpcPayloadCandidates = [
        {
          p_expense_id: expenseId,
          p_amount: amount,
          p_treasury_account_id: treasuryAccountId,
          p_payment_date: paymentDate ?? new Date().toISOString(),
          p_reference: reference?.trim() || null,
          p_notes: notes?.trim() || null,
        },

        {
          p_expense_id: expenseId,
          p_amount: amount,
          p_treasury_account_id: treasuryAccountId,
          p_paid_at: paymentDate ?? new Date().toISOString(),
          p_reference: reference?.trim() || null,
          p_notes: notes?.trim() || null,
        },

        {
          p_expense_id: expenseId,
          p_amount: amount,
          p_treasury_account_id: treasuryAccountId,
          p_payment_date: paymentDate ?? new Date().toISOString(),
          p_notes: notes?.trim() || null,
        },

        {
          p_expense_id: expenseId,
          p_amount: amount,
          p_treasury_account_id: treasuryAccountId,
          p_notes: notes?.trim() || null,
        },

        {
          p_expense_id: expenseId,
          p_amount: amount,
          p_treasury_account_id: treasuryAccountId,
        },
      ];

      let lastError: any = null;

      for (const payload of rpcPayloadCandidates) {
        const { data, error } = await (supabase as any).rpc(
          "pay_expense",
          payload,
        );

        if (!error) {
          return data;
        }

        lastError = error;

        const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

        const isSignatureProblem =
          message.includes("function") ||
          message.includes("schema cache") ||
          message.includes("parameter") ||
          message.includes("argument") ||
          message.includes("p_payment_date") ||
          message.includes("p_paid_at") ||
          message.includes("p_reference");

        if (!isSignatureProblem) {
          throw error;
        }
      }

      throw lastError ?? new Error("Impossible d'enregistrer le paiement.");
    },

    onSuccess: async () => {
      await invalidatePayablesQueries(queryClient);
    },
  });
}