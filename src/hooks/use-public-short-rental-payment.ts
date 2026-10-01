import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const PUBLIC_SHORT_RENTAL_PAYMENT_KEY =
  "public-short-rental-payment";

// ============================================================
// TYPES
// ============================================================

export type PublicShortRentalPaymentBlockReason =
  | "already_paid"
  | "payment_deadline_passed"
  | "booking_not_payable"
  | "nothing_to_pay"
  | string;

export type PublicShortRentalPaymentContext = {
  booking_reference: string;

  booking_status:
    | "confirmed"
    | "in_progress"
    | "completed"
    | string;

  check_in: string;

  check_out: string;

  guests_count: number;

  currency: string;

  payment_plan:
    | "half"
    | "full"
    | string;

  initial_payment_percent: number;

  payment_due_at:
    | string
    | null;

  invoice_number: string;

  invoice_status: string;

  total_amount: number;

  paid_amount: number;

  remaining_amount: number;

  amount_due_now: number;

  payment_deadline_passed: boolean;

  access_expires_at: string;

  // ========================================================
  // V3C.4
  // Décision métier calculée exclusivement côté PostgreSQL.
  // ========================================================

  can_pay: boolean;

  payment_block_reason:
    | PublicShortRentalPaymentBlockReason
    | null;
};

// ============================================================
// HELPERS
// ============================================================

const normalizeNumber = (
  value: unknown,
): number => {
  const parsed =
    Number(value ?? 0);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
};

const normalizePaymentContext = (
  data: unknown,
): PublicShortRentalPaymentContext => {
  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  if (
    !row ||
    typeof row !== "object"
  ) {
    throw new Error(
      "PAYMENT_CONTEXT_INVALID",
    );
  }

  const value =
    row as Record<
      string,
      unknown
    >;

  if (
    !value.booking_reference ||
    !value.check_in ||
    !value.check_out
  ) {
    throw new Error(
      "PAYMENT_CONTEXT_INVALID",
    );
  }

  /*
   * Depuis V3C.4, ces deux propriétés font partie
   * du contrat serveur.
   *
   * Si elles disparaissent accidentellement de la RPC,
   * on refuse le contexte plutôt que de reconstruire
   * une autorisation côté navigateur.
   */
  if (
    typeof value.can_pay !==
      "boolean"
  ) {
    throw new Error(
      "PAYMENT_CONTEXT_INVALID",
    );
  }

  if (
    value.payment_block_reason !==
      null &&
    value.payment_block_reason !==
      undefined &&
    typeof value.payment_block_reason !==
      "string"
  ) {
    throw new Error(
      "PAYMENT_CONTEXT_INVALID",
    );
  }

  return {
    booking_reference:
      String(
        value.booking_reference,
      ),

    booking_status:
      String(
        value.booking_status ??
          "",
      ),

    check_in:
      String(
        value.check_in,
      ),

    check_out:
      String(
        value.check_out,
      ),

    guests_count:
      normalizeNumber(
        value.guests_count,
      ),

    currency:
      String(
        value.currency ??
          "GNF",
      ),

    payment_plan:
      String(
        value.payment_plan ??
          "",
      ),

    initial_payment_percent:
      normalizeNumber(
        value.initial_payment_percent,
      ),

    payment_due_at:
      value.payment_due_at
        ? String(
            value.payment_due_at,
          )
        : null,

    invoice_number:
      String(
        value.invoice_number ??
          "",
      ),

    invoice_status:
      String(
        value.invoice_status ??
          "",
      ),

    total_amount:
      normalizeNumber(
        value.total_amount,
      ),

    paid_amount:
      normalizeNumber(
        value.paid_amount,
      ),

    remaining_amount:
      normalizeNumber(
        value.remaining_amount,
      ),

    amount_due_now:
      normalizeNumber(
        value.amount_due_now,
      ),

    payment_deadline_passed:
      value.payment_deadline_passed ===
      true,

    access_expires_at:
      String(
        value.access_expires_at ??
          "",
      ),

    can_pay:
      value.can_pay,

    payment_block_reason:
      value.payment_block_reason ===
        null ||
      value.payment_block_reason ===
        undefined
        ? null
        : String(
            value.payment_block_reason,
          ),
  };
};

// ============================================================
// HOOK PUBLIC
// ============================================================

/**
 * Contexte public sécurisé de paiement courte durée.
 *
 * IMPORTANT :
 *
 * - aucun SELECT direct sur bookings
 * - aucun SELECT direct sur invoices
 * - aucun SELECT direct sur payments
 * - aucun SELECT direct sur short_rental_payment_access
 *
 * Le token est transmis exclusivement à :
 *
 * get_public_short_rental_payment_context(token)
 *
 * Depuis V3C.4 :
 *
 * - can_pay est la seule décision métier d'autorisation
 * - payment_block_reason explique un éventuel blocage
 *
 * Le frontend ne doit jamais recalculer can_pay.
 */
export const usePublicShortRentalPaymentContext =
  (
    token?: string,
  ) =>
    useQuery({
      queryKey: [
        PUBLIC_SHORT_RENTAL_PAYMENT_KEY,
        token,
      ],

      enabled:
        Boolean(
          token?.trim(),
        ),

      retry:
        false,

      staleTime:
        15_000,

      refetchOnWindowFocus:
        false,

      queryFn:
        async () => {
          const cleanToken =
            token?.trim();

          if (!cleanToken) {
            throw new Error(
              "PAYMENT_LINK_INVALID",
            );
          }

          /*
           * Token généré par PostgreSQL :
           * 32 octets -> 64 caractères hexadécimaux.
           *
           * Ceci est uniquement une validation UX.
           *
           * La sécurité réelle reste entièrement
           * contrôlée côté PostgreSQL.
           */
          if (
            cleanToken.length !==
              64 ||
            !/^[0-9a-fA-F]{64}$/.test(
              cleanToken,
            )
          ) {
            throw new Error(
              "PAYMENT_LINK_INVALID",
            );
          }

          const {
            data,
            error,
          } =
            await db.rpc(
              "get_public_short_rental_payment_context",
              {
                p_token:
                  cleanToken,
              },
            );

          if (error) {
            /*
             * Aucun détail PostgreSQL n'est exposé
             * à l'utilisateur public.
             *
             * Les situations suivantes restent
             * volontairement indistinguables :
             *
             * - token inexistant
             * - token expiré
             * - token révoqué
             * - réservation non accessible
             * - facture active inexistante
             */
            console.warn(
              "[ShortRentalPayment] RPC refusée :",
              error.message,
            );

            throw new Error(
              "PAYMENT_LINK_UNAVAILABLE",
            );
          }

          return normalizePaymentContext(
            data,
          );
        },
    });