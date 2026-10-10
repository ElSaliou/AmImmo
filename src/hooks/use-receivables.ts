import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TenantReceivableStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type ReceivableDueState =
  | "overdue"
  | "due_today"
  | "due_soon"
  | "future"
  | "no_due_date";

export interface TenantReceivable {
  invoice_id: string;
  invoice_number: string;

  lease_id: string | null;

  tenant_id: string | null;
  tenant_name: string | null;

  owner_id?: string | null;
  owner_name?: string | null;

  property_id?: string | null;
  property_title: string | null;

  issue_date?: string | null;
  due_date: string;

  period_start?: string | null;
  period_end?: string | null;

  amount: number;
  paid_amount: number;
  balance_due: number;

  currency: string;

  status: TenantReceivableStatus;

  due_state?: ReceivableDueState | null;
  due_state_label?: string | null;

  overdue_days?: number | null;
  days_until_due?: number | null;
}

export interface TenantReceivablesKpis {
  total_receivables: number;
  overdue_amount: number;
  due_soon_amount: number;
  open_invoice_count: number;
  overdue_invoice_count: number;
  tenant_count: number;
}

export interface TenantBalance {
  tenant_id: string;
  tenant_name: string | null;

  currency: string;

  open_invoice_count: number;
  total_balance_due: number;
  overdue_balance: number;

  overdue_invoice_count?: number;
  oldest_due_date?: string | null;
  next_due_date?: string | null;
}

export interface RecordTenantPaymentInput {
  invoiceId: string;
  amount: number;

  paymentMethod:
    | "cash"
    | "transfer"
    | "mobile_money"
    | "card"
    | "cheque";

  paidAt?: string;
  reference?: string;
  notes?: string;
}

const toNumber = (value: unknown): number => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

export function useTenantReceivables() {
  return useQuery({
    queryKey: ["tenant-receivables"],

    queryFn: async (): Promise<TenantReceivable[]> => {
      const { data, error } = await (supabase as any)
        .from("tenant_receivables")
        .select("*")
        .order("due_date", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        amount: toNumber(row.amount),
        paid_amount: toNumber(row.paid_amount),
        balance_due: toNumber(row.balance_due),
        overdue_days:
          row.overdue_days == null ? null : toNumber(row.overdue_days),
        days_until_due:
          row.days_until_due == null ? null : toNumber(row.days_until_due),
      }));
    },

    staleTime: 15_000,
  });
}

export function useTenantReceivablesKpis() {
  return useQuery({
    queryKey: ["tenant-receivables-kpis"],

    queryFn: async (): Promise<TenantReceivablesKpis> => {
      const { data, error } = await (supabase as any)
        .from("tenant_receivables_kpis")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      return {
        total_receivables: toNumber(data?.total_receivables),
        overdue_amount: toNumber(data?.overdue_amount),
        due_soon_amount: toNumber(data?.due_soon_amount),
        open_invoice_count: toNumber(data?.open_invoice_count),
        overdue_invoice_count: toNumber(data?.overdue_invoice_count),
        tenant_count: toNumber(data?.tenant_count),
      };
    },

    staleTime: 15_000,
  });
}

export function useTenantBalances() {
  return useQuery({
    queryKey: ["tenant-receivable-balances"],

    queryFn: async (): Promise<TenantBalance[]> => {
      const { data, error } = await (supabase as any)
        .from("tenant_receivable_balances")
        .select("*")
        .order("total_balance_due", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,

        open_invoice_count: toNumber(row.open_invoice_count),
        total_balance_due: toNumber(row.total_balance_due),
        overdue_balance: toNumber(row.overdue_balance),

        overdue_invoice_count: toNumber(row.overdue_invoice_count),
      }));
    },

    staleTime: 15_000,
  });
}

export function useRecordTenantPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordTenantPaymentInput) => {
      const { data, error } = await (supabase as any).rpc(
        "record_tenant_payment",
        {
          p_invoice_id: input.invoiceId,
          p_amount: input.amount,
          p_payment_method: input.paymentMethod,
          p_paid_at: input.paidAt ?? new Date().toISOString(),
          p_reference: input.reference?.trim() || null,
          p_notes: input.notes?.trim() || "",
        }
      );

      if (error) throw error;

      return data as string;
    },

    onSuccess: async (_paymentId, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["invoice", input.invoiceId],
        }),

        queryClient.invalidateQueries({
          queryKey: ["tenant-receivables"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["tenant-receivables-kpis"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["tenant-receivable-balances"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["finance-transactions"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["treasury-account-balances"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["treasury-journal"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["finance-report"],
        }),
      ]);
    },
  });
}