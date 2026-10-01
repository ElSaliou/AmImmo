import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

export type SaleCommissionStatus =
  | "pending"
  | "partial"
  | "paid"
  | "cancelled";

export interface SaleCommission {
  id: string;

  sale_id: string;

  organization_id:
    string | null;

  amount_due:
    number;

  amount_paid:
    number;

  balance_due:
    number;

  currency:
    string;

  status:
    SaleCommissionStatus;

  due_date:
    string | null;

  paid_at:
    string | null;

  notes:
    string;

  created_at:
    string;

  updated_at:
    string;
}

export interface SaleCommissionPayment {
  id: string;

  commission_id:
    string;

  sale_id:
    string;

  amount:
    number;

  currency:
    string;

  payment_date:
    string;

  payment_method:
    string | null;

  reference:
    string | null;

  notes:
    string;

  created_by:
    string | null;

  created_at:
    string;
}

export interface SaleFinancialEvent {
  id: string;

  sale_id:
    string;

  commission_id:
    string | null;

  payment_id:
    string | null;

  event_type:
    string;

  amount:
    number;

  currency:
    string;

  accounting_posted:
    boolean;

  accounting_reference:
    string | null;

  payload:
    Record<
      string,
      any
    >;

  created_at:
    string;
}

export interface RecordCommissionPaymentInput {
  saleId:
    string;

  amount:
    number;

  paymentMethod?:
    string;

  reference?:
    string;

  notes?:
    string;
}

export interface RecordCommissionPaymentResult {
  success:
    boolean;

  sale_id:
    string;

  commission_id:
    string;

  payment_id:
    string;

  amount_paid:
    number;

  amount_due:
    number;

  balance_due:
    number;

  status:
    SaleCommissionStatus;
}

const SALE_FINANCE_KEY =
  "sale-finance";

const invalidateSaleFinance =
  (
    qc:
      ReturnType<
        typeof useQueryClient
      >,

    saleId:
      string,
  ) => {
    qc.invalidateQueries({
      queryKey: [
        SALE_FINANCE_KEY,
        saleId,
      ],
    });

    qc.invalidateQueries({
      queryKey: [
        "sales",
      ],
    });

    qc.invalidateQueries({
      queryKey: [
        "sales",
        saleId,
      ],
    });
  };

// ============================================================
// COMMISSION
// ============================================================

export const useSaleCommission =
  (
    saleId:
      string | null,
  ) =>
    useQuery({
      queryKey: [
        SALE_FINANCE_KEY,
        saleId,
        "commission",
      ],

      enabled:
        Boolean(
          saleId,
        ),

      queryFn:
        async () => {
          if (
            !saleId
          ) {
            return null;
          }

          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "sale_commissions",
            )
            .select("*")
            .eq(
              "sale_id",
              saleId,
            )
            .maybeSingle();

          if (
            error
          ) {
            throw error;
          }

          return data as SaleCommission | null;
        },
    });

// ============================================================
// PAIEMENTS
// ============================================================

export const useSaleCommissionPayments =
  (
    saleId:
      string | null,
  ) =>
    useQuery({
      queryKey: [
        SALE_FINANCE_KEY,
        saleId,
        "payments",
      ],

      enabled:
        Boolean(
          saleId,
        ),

      queryFn:
        async () => {
          if (
            !saleId
          ) {
            return [];
          }

          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "sale_commission_payments",
            )
            .select("*")
            .eq(
              "sale_id",
              saleId,
            )
            .order(
              "payment_date",
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
          ) as SaleCommissionPayment[];
        },
    });

// ============================================================
// EVENEMENTS FINANCIERS
// ============================================================

export const useSaleFinancialEvents =
  (
    saleId:
      string | null,
  ) =>
    useQuery({
      queryKey: [
        SALE_FINANCE_KEY,
        saleId,
        "events",
      ],

      enabled:
        Boolean(
          saleId,
        ),

      queryFn:
        async () => {
          if (
            !saleId
          ) {
            return [];
          }

          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "sale_financial_events",
            )
            .select("*")
            .eq(
              "sale_id",
              saleId,
            )
            .order(
              "created_at",
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
          ) as SaleFinancialEvent[];
        },
    });

// ============================================================
// ENREGISTRER UN PAIEMENT
// ============================================================

export const useRecordSaleCommissionPayment =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            RecordCommissionPaymentInput,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "record_sale_commission_payment",
            {
              p_sale_id:
                input.saleId,

              p_amount:
                input.amount,

              p_payment_method:
                input.paymentMethod?.trim() ||
                null,

              p_reference:
                input.reference?.trim() ||
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

          if (
            !data?.success
          ) {
            throw new Error(
              "L'enregistrement du paiement a échoué.",
            );
          }

          return data as RecordCommissionPaymentResult;
        },

      onSuccess:
        (
          data,
        ) => {
          invalidateSaleFinance(
            qc,
            data.sale_id,
          );
        },
    });
  };