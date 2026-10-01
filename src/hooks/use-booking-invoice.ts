import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

// Les types Supabase générés ne contiennent pas forcément encore
// les dernières RPC/tables courte durée.
const db = supabase as any;

// ============================================================
// TYPES
// ============================================================

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export interface BookingInvoiceLine {
  id: string;
  invoice_id: string;
  label: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at: string;
}

export interface BookingInvoice {
  id: string;
  organization_id: string | null;
  number: string;
  kind: "booking";
  status: InvoiceStatus;

  booking_id: string;
  lease_id: string | null;

  tenant_id: string | null;
  owner_id: string | null;
  property_id: string | null;

  issue_date: string;
  due_date: string;

  period_start: string | null;
  period_end: string | null;

  currency: string;

  amount: number;
  paid_amount: number;

  notes: string;
  accounting_entry_id: string | null;

  created_at: string;
  updated_at: string;

  lines: BookingInvoiceLine[];
}

export interface CreateBookingInvoiceResult {
  invoice_id: string;
  invoice_number: string;
  invoice_status: InvoiceStatus;
  invoice_amount: number;
  invoice_currency: string;
}

// ============================================================
// QUERY KEY
// ============================================================

export const BOOKING_INVOICE_KEY =
  "booking-invoice";

// ============================================================
// HELPERS
// ============================================================

const normalizeInvoice = (
  row: any,
): BookingInvoice => ({
  ...row,

  amount: Number(
    row.amount ?? 0,
  ),

  paid_amount: Number(
    row.paid_amount ?? 0,
  ),

  lines: Array.isArray(
    row.invoice_lines,
  )
    ? row.invoice_lines.map(
        (line: any) => ({
          ...line,

          quantity: Number(
            line.quantity ?? 0,
          ),

          unit_price: Number(
            line.unit_price ?? 0,
          ),

          amount: Number(
            line.amount ?? 0,
          ),
        }),
      )
    : [],
});

const normalizeRpcResult = (
  data: unknown,
): CreateBookingInvoiceResult => {
  const row = Array.isArray(
    data,
  )
    ? data[0]
    : data;

  if (
    !row ||
    typeof row !== "object"
  ) {
    throw new Error(
      "La RPC n'a retourné aucune facture.",
    );
  }

  const result =
    row as Record<
      string,
      unknown
    >;

  if (
    !result.invoice_id ||
    !result.invoice_number
  ) {
    throw new Error(
      "La facture retournée par la RPC est invalide.",
    );
  }

  return {
    invoice_id: String(
      result.invoice_id,
    ),

    invoice_number: String(
      result.invoice_number,
    ),

    invoice_status:
      result.invoice_status as InvoiceStatus,

    invoice_amount: Number(
      result.invoice_amount ??
        0,
    ),

    invoice_currency: String(
      result.invoice_currency ??
        "GNF",
    ),
  };
};

// ============================================================
// QUERY : FACTURE ACTIVE DE LA RESERVATION
// ============================================================

export function useBookingInvoice(
  bookingId:
    | string
    | undefined,
) {
  return useQuery({
    queryKey: [
      BOOKING_INVOICE_KEY,
      bookingId,
    ],

    enabled: Boolean(
      bookingId,
    ),

    queryFn:
      async (): Promise<
        BookingInvoice | null
      > => {
        if (!bookingId) {
          return null;
        }

        const {
          data,
          error,
        } = await db
          .from("invoices")
          .select(`
            id,
            organization_id,
            number,
            kind,
            status,
            booking_id,
            lease_id,
            tenant_id,
            owner_id,
            property_id,
            issue_date,
            due_date,
            period_start,
            period_end,
            currency,
            amount,
            paid_amount,
            notes,
            accounting_entry_id,
            created_at,
            updated_at,
            invoice_lines (
              id,
              invoice_id,
              label,
              quantity,
              unit_price,
              amount,
              created_at
            )
          `)
          .eq(
            "booking_id",
            bookingId,
          )
          .eq(
            "kind",
            "booking",
          )
          .neq(
            "status",
            "cancelled",
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          return null;
        }

        return normalizeInvoice(
          data,
        );
      },
  });
}

// ============================================================
// MUTATION : GENERER LA FACTURE
// ============================================================

export function useCreateBookingInvoice() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      async (
        bookingId: string,
      ): Promise<CreateBookingInvoiceResult> => {
        const {
          data,
          error,
        } = await db.rpc(
          "create_short_rental_invoice",
          {
            p_booking_id:
              bookingId,
          },
        );

        if (error) {
          throw error;
        }

        return normalizeRpcResult(
          data,
        );
      },

    onSuccess:
      async (
        result,
        bookingId,
      ) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              BOOKING_INVOICE_KEY,
              bookingId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "booking-detail",
              bookingId,
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
              "invoice",
              result.invoice_id,
            ],
          }),
        ]);
      },
  });
}