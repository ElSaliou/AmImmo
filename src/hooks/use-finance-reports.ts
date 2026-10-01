// src/hooks/use-finance-reports.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinanceReportPeriod {
  start_date: string;
  end_date: string;
}

export interface FinanceReportSummary {
  period: FinanceReportPeriod;
  previous_period: FinanceReportPeriod;

  revenue: number;
  expenses: number;
  net_result: number;

  previous_revenue: number;
  previous_expenses: number;
  previous_net_result: number;

  cash_in: number;
  cash_out: number;
  net_cash_flow: number;

  treasury_balance: number;

  supplier_payables: number;
  overdue_supplier_payables: number;

  receivables: number;
}

export interface FinanceCashflowDaily {
  report_date: string;
  cash_in: number;
  cash_out: number;
  net_cash_flow: number;
}

export interface FinanceTreasuryAccount {
  treasury_account_id: string;
  treasury_account_code: string;
  treasury_account_name: string;
  currency: string;

  cash_in: number;
  cash_out: number;
  net_cash_flow: number;
  closing_balance: number;
}

export interface FinanceExpenseByCategory {
  category_id: string | null;
  category_name: string;

  expense_count: number;

  amount: number;
  amount_paid: number;
  balance_due: number;
}

export interface FinanceExpenseByProperty {
  property_id: string | null;
  property_title: string;

  expense_count: number;

  amount: number;
  amount_paid: number;
  balance_due: number;
}

export interface FinanceExpenseByOwner {
  owner_id: string | null;
  owner_name: string;

  expense_count: number;

  amount: number;
  owner_chargeable_amount: number;
  amount_paid: number;
  balance_due: number;
}

export interface FinanceCommissions {
  sales_count: number;
  expected_commission: number;
  collected_commission: number;
  remaining_commission: number;
}

export interface FinancePayables {
  total: number;
  overdue: number;
  due_soon: number;
  suppliers: number;
  open_expenses: number;
}

export interface FinanceReceivable {
  account_id: string;
  account_code: string;
  account_name: string;

  debit: number;
  credit: number;
  balance: number;
}

export interface FinanceReport {
  generated_at: string;

  period: FinanceReportPeriod;

  summary: FinanceReportSummary;

  cashflow_daily: FinanceCashflowDaily[];

  treasury_accounts: FinanceTreasuryAccount[];

  expenses_by_category: FinanceExpenseByCategory[];

  expenses_by_property: FinanceExpenseByProperty[];

  expenses_by_owner: FinanceExpenseByOwner[];

  commissions: FinanceCommissions;

  payables: FinancePayables;

  receivables: FinanceReceivable[];
}

const numberValue = (value: unknown): number => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

function normalizeReport(raw: any): FinanceReport {
  const summary = raw?.summary ?? {};
  const commissions = raw?.commissions ?? {};
  const payables = raw?.payables ?? {};

  return {
    generated_at: raw?.generated_at ?? new Date().toISOString(),

    period: {
      start_date: raw?.period?.start_date ?? "",
      end_date: raw?.period?.end_date ?? "",
    },

    summary: {
      period: {
        start_date: summary?.period?.start_date ?? "",
        end_date: summary?.period?.end_date ?? "",
      },

      previous_period: {
        start_date: summary?.previous_period?.start_date ?? "",
        end_date: summary?.previous_period?.end_date ?? "",
      },

      revenue: numberValue(summary?.revenue),
      expenses: numberValue(summary?.expenses),
      net_result: numberValue(summary?.net_result),

      previous_revenue: numberValue(summary?.previous_revenue),
      previous_expenses: numberValue(summary?.previous_expenses),
      previous_net_result: numberValue(summary?.previous_net_result),

      cash_in: numberValue(summary?.cash_in),
      cash_out: numberValue(summary?.cash_out),
      net_cash_flow: numberValue(summary?.net_cash_flow),

      treasury_balance: numberValue(summary?.treasury_balance),

      supplier_payables: numberValue(summary?.supplier_payables),
      overdue_supplier_payables: numberValue(
        summary?.overdue_supplier_payables,
      ),

      receivables: numberValue(summary?.receivables),
    },

    cashflow_daily: Array.isArray(raw?.cashflow_daily)
      ? raw.cashflow_daily.map((row: any) => ({
          report_date: row?.report_date ?? "",
          cash_in: numberValue(row?.cash_in),
          cash_out: numberValue(row?.cash_out),
          net_cash_flow: numberValue(row?.net_cash_flow),
        }))
      : [],

    treasury_accounts: Array.isArray(raw?.treasury_accounts)
      ? raw.treasury_accounts.map((row: any) => ({
          treasury_account_id: row?.treasury_account_id ?? "",
          treasury_account_code: row?.treasury_account_code ?? "",
          treasury_account_name: row?.treasury_account_name ?? "",
          currency: row?.currency ?? "GNF",

          cash_in: numberValue(row?.cash_in),
          cash_out: numberValue(row?.cash_out),
          net_cash_flow: numberValue(row?.net_cash_flow),
          closing_balance: numberValue(row?.closing_balance),
        }))
      : [],

    expenses_by_category: Array.isArray(raw?.expenses_by_category)
      ? raw.expenses_by_category.map((row: any) => ({
          category_id: row?.category_id ?? null,
          category_name: row?.category_name ?? "Non catégorisée",

          expense_count: numberValue(row?.expense_count),

          amount: numberValue(row?.amount),
          amount_paid: numberValue(row?.amount_paid),
          balance_due: numberValue(row?.balance_due),
        }))
      : [],

    expenses_by_property: Array.isArray(raw?.expenses_by_property)
      ? raw.expenses_by_property.map((row: any) => ({
          property_id: row?.property_id ?? null,
          property_title: row?.property_title ?? "Non rattaché",

          expense_count: numberValue(row?.expense_count),

          amount: numberValue(row?.amount),
          amount_paid: numberValue(row?.amount_paid),
          balance_due: numberValue(row?.balance_due),
        }))
      : [],

    expenses_by_owner: Array.isArray(raw?.expenses_by_owner)
      ? raw.expenses_by_owner.map((row: any) => ({
          owner_id: row?.owner_id ?? null,
          owner_name: row?.owner_name ?? "Non rattaché",

          expense_count: numberValue(row?.expense_count),

          amount: numberValue(row?.amount),
          owner_chargeable_amount: numberValue(
            row?.owner_chargeable_amount,
          ),
          amount_paid: numberValue(row?.amount_paid),
          balance_due: numberValue(row?.balance_due),
        }))
      : [],

    commissions: {
      sales_count: numberValue(commissions?.sales_count),
      expected_commission: numberValue(
        commissions?.expected_commission,
      ),
      collected_commission: numberValue(
        commissions?.collected_commission,
      ),
      remaining_commission: numberValue(
        commissions?.remaining_commission,
      ),
    },

    payables: {
      total: numberValue(payables?.total),
      overdue: numberValue(payables?.overdue),
      due_soon: numberValue(payables?.due_soon),
      suppliers: numberValue(payables?.suppliers),
      open_expenses: numberValue(payables?.open_expenses),
    },

    receivables: Array.isArray(raw?.receivables)
      ? raw.receivables.map((row: any) => ({
          account_id: row?.account_id ?? "",
          account_code: row?.account_code ?? "",
          account_name: row?.account_name ?? "",

          debit: numberValue(row?.debit),
          credit: numberValue(row?.credit),
          balance: numberValue(row?.balance),
        }))
      : [],
  };
}

export function useFinanceReport(
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ["finance-report", startDate, endDate],

    queryFn: async (): Promise<FinanceReport> => {
      if (!startDate || !endDate) {
        throw new Error("La période du rapport est incomplète.");
      }

      const { data, error } = await (supabase as any).rpc(
        "get_finance_report",
        {
          p_start_date: startDate,
          p_end_date: endDate,
        },
      );

      if (error) {
        throw error;
      }

      return normalizeReport(data);
    },

    enabled: Boolean(startDate && endDate),

    staleTime: 30_000,

    refetchOnWindowFocus: false,
  });
}