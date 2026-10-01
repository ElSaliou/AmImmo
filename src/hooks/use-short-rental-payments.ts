import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

export type ShortRentalPaymentMethod =
  | "cash"
  | "transfer"
  | "mobile_money"
  | "card"
  | "cheque"
  | "other";

export type ShortRentalPaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded";

export interface ShortRentalPayment {
  id: string;
  organization_id: string | null;
  reference: string;
  invoice_id: string | null;
  tenant_id: string | null;
  owner_id: string | null;

  method: ShortRentalPaymentMethod;
  status: ShortRentalPaymentStatus;

  amount: number;
  currency: string;

  paid_at: string;

  is_refund: boolean;

  notes: string;

  treasury_account_id: string | null;
  accounting_entry_id: string | null;

  created_at: string;
  updated_at: string;
}

export interface RecordShortRentalPaymentInput {
  invoiceId: string;
  bookingId?: string | null;

  amount: number;

  method: ShortRentalPaymentMethod;

  paidAt?: string | null;

  reference?: string | null;

  notes?: string | null;
}

// ============================================================
// QUERY KEY
// ============================================================

export const SHORT_RENTAL_PAYMENTS_KEY =
  "short-rental-payments";

// ============================================================
// PAYMENTS QUERY
// ============================================================

export function useShortRentalPayments(
  invoiceId:
    | string
    | null
    | undefined,
) {
  const db =
    supabase as any;

  return useQuery({
    queryKey: [
      SHORT_RENTAL_PAYMENTS_KEY,
      invoiceId,
    ],

    enabled:
      Boolean(invoiceId),

    queryFn:
      async (): Promise<
        ShortRentalPayment[]
      > => {
        if (!invoiceId) {
          return [];
        }

        const {
          data,
          error,
        } =
          await db
            .from(
              "payments",
            )
            .select(
              `
                id,
                organization_id,
                reference,
                invoice_id,
                tenant_id,
                owner_id,
                method,
                status,
                amount,
                currency,
                paid_at,
                is_refund,
                notes,
                treasury_account_id,
                accounting_entry_id,
                created_at,
                updated_at
              `,
            )
            .eq(
              "invoice_id",
              invoiceId,
            )
            .order(
              "paid_at",
              {
                ascending:
                  false,
              },
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            );

        if (error) {
          throw error;
        }

        return (
          data ?? []
        ).map(
          (
            payment: any,
          ): ShortRentalPayment => ({
            ...payment,

            amount:
              Number(
                payment.amount ??
                  0,
              ),
          }),
        );
      },
  });
}

// ============================================================
// RECORD PAYMENT
// ============================================================

export function useRecordShortRentalPayment() {
  const db =
    supabase as any;

  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      async (
        input: RecordShortRentalPaymentInput,
      ): Promise<string> => {
        if (
          !input.invoiceId
        ) {
          throw new Error(
            "La facture est obligatoire.",
          );
        }

        if (
          !Number.isFinite(
            input.amount,
          ) ||
          input.amount <= 0
        ) {
          throw new Error(
            "Le montant du paiement doit être supérieur à zéro.",
          );
        }

        const {
          data,
          error,
        } =
          await db.rpc(
            "record_short_rental_payment",
            {
              p_invoice_id:
                input.invoiceId,

              p_amount:
                input.amount,

              p_payment_method:
                input.method,

              p_paid_at:
                input.paidAt ??
                new Date().toISOString(),

              p_reference:
                input.reference?.trim() ||
                null,

              p_notes:
                input.notes?.trim() ||
                "",
            },
          );

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "Le paiement a été enregistré mais aucun identifiant n'a été retourné.",
          );
        }

        return String(
          data,
        );
      },

    onSuccess:
      async (
        _paymentId,
        variables,
      ) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              SHORT_RENTAL_PAYMENTS_KEY,
              variables.invoiceId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "booking-invoice",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "booking-detail",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "bookings",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "invoices",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "treasury",
            ],
          }),
        ]);
      },
  });
}