import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export const SHORT_RENTAL_DEPOSIT_KEY =
  "short-rental-deposit";

// ============================================================
// TYPES
// ============================================================

export type ShortRentalDepositStatus =
  | "expected"
  | "partially_collected"
  | "held"
  | "partially_released"
  | "partially_withheld"
  | "released"
  | "fully_withheld"
  | "cancelled"
  | string;

export type ShortRentalDepositMovementType =
  | "collection"
  | "release"
  | "withhold"
  | string;

export interface ShortRentalDepositMovement {
  id: string;
  deposit_id: string;
  reference: string;

  movement_type:
    ShortRentalDepositMovementType;

  amount: number;
  currency: string;

  payment_method:
    | string
    | null;

  treasury_account_id:
    | string
    | null;

  treasury_movement_id:
    | string
    | null;

  accounting_entry_id:
    | string
    | null;

  inspection_id:
    | string
    | null;

  beneficiary_owner_id:
    | string
    | null;

  external_reference:
    | string
    | null;

  reason:
    | string
    | null;

  notes: string;

  occurred_at: string;
  created_at: string;

  created_by:
    | string
    | null;
}

export interface ShortRentalDeposit {
  id: string;

  organization_id:
    | string
    | null;

  booking_id: string;
  property_id: string;

  expected_amount: number;
  collected_amount: number;
  released_amount: number;
  withheld_amount: number;

  currency: string;

  status:
    ShortRentalDepositStatus;

  collected_at:
    | string
    | null;

  closed_at:
    | string
    | null;

  notes: string;

  created_by:
    | string
    | null;

  created_at: string;
  updated_at: string;

  /**
   * Montant de caution restant encore
   * à encaisser.
   */
  amount_to_collect: number;

  /**
   * Montant actuellement détenu par
   * l'agence et non encore restitué
   * ou retenu.
   */
  held_amount: number;

  /**
   * Montant déjà résolu :
   * restitution + retenue.
   */
  resolved_amount: number;

  movements:
    ShortRentalDepositMovement[];
}

// ============================================================
// NORMALISATION
// ============================================================

const normalizeNumber = (
  value: unknown,
): number => {
  const parsed =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
};

const normalizeNullableString = (
  value: unknown,
): string | null => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value);
};

const normalizeMovement = (
  row: any,
): ShortRentalDepositMovement => ({
  id:
    String(
      row.id ?? "",
    ),

  deposit_id:
    String(
      row.deposit_id ?? "",
    ),

  reference:
    String(
      row.reference ?? "",
    ),

  movement_type:
    String(
      row.movement_type ?? "",
    ),

  amount:
    normalizeNumber(
      row.amount,
    ),

  currency:
    String(
      row.currency ?? "GNF",
    ),

  payment_method:
    normalizeNullableString(
      row.payment_method,
    ),

  treasury_account_id:
    normalizeNullableString(
      row.treasury_account_id,
    ),

  treasury_movement_id:
    normalizeNullableString(
      row.treasury_movement_id,
    ),

  accounting_entry_id:
    normalizeNullableString(
      row.accounting_entry_id,
    ),

  inspection_id:
    normalizeNullableString(
      row.inspection_id,
    ),

  beneficiary_owner_id:
    normalizeNullableString(
      row.beneficiary_owner_id,
    ),

  external_reference:
    normalizeNullableString(
      row.external_reference,
    ),

  reason:
    normalizeNullableString(
      row.reason,
    ),

  notes:
    String(
      row.notes ?? "",
    ),

  occurred_at:
    String(
      row.occurred_at ?? "",
    ),

  created_at:
    String(
      row.created_at ?? "",
    ),

  created_by:
    normalizeNullableString(
      row.created_by,
    ),
});

const normalizeDeposit = (
  row: any,
  movements:
    ShortRentalDepositMovement[],
): ShortRentalDeposit => {
  const expectedAmount =
    normalizeNumber(
      row.expected_amount,
    );

  const collectedAmount =
    normalizeNumber(
      row.collected_amount,
    );

  const releasedAmount =
    normalizeNumber(
      row.released_amount,
    );

  const withheldAmount =
    normalizeNumber(
      row.withheld_amount,
    );

  const amountToCollect =
    Math.max(
      expectedAmount -
        collectedAmount,
      0,
    );

  const heldAmount =
    Math.max(
      collectedAmount -
        releasedAmount -
        withheldAmount,
      0,
    );

  const resolvedAmount =
    releasedAmount +
    withheldAmount;

  return {
    id:
      String(
        row.id ?? "",
      ),

    organization_id:
      normalizeNullableString(
        row.organization_id,
      ),

    booking_id:
      String(
        row.booking_id ?? "",
      ),

    property_id:
      String(
        row.property_id ?? "",
      ),

    expected_amount:
      expectedAmount,

    collected_amount:
      collectedAmount,

    released_amount:
      releasedAmount,

    withheld_amount:
      withheldAmount,

    currency:
      String(
        row.currency ?? "GNF",
      ),

    status:
      String(
        row.status ?? "expected",
      ),

    collected_at:
      normalizeNullableString(
        row.collected_at,
      ),

    closed_at:
      normalizeNullableString(
        row.closed_at,
      ),

    notes:
      String(
        row.notes ?? "",
      ),

    created_by:
      normalizeNullableString(
        row.created_by,
      ),

    created_at:
      String(
        row.created_at ?? "",
      ),

    updated_at:
      String(
        row.updated_at ?? "",
      ),

    amount_to_collect:
      amountToCollect,

    held_amount:
      heldAmount,

    resolved_amount:
      resolvedAmount,

    movements,
  };
};

// ============================================================
// QUERY
// ============================================================

export function useShortRentalDeposit(
  bookingId:
    | string
    | null
    | undefined,
) {
  return useQuery<
    ShortRentalDeposit | null,
    Error
  >({
    queryKey: [
      SHORT_RENTAL_DEPOSIT_KEY,
      bookingId,
    ],

    enabled:
      Boolean(
        bookingId,
      ),

    queryFn: async () => {
      if (!bookingId) {
        return null;
      }

      const {
        data: depositRow,
        error: depositError,
      } =
        await db
          .from(
            "short_rental_deposits",
          )
          .select(
            `
              id,
              organization_id,
              booking_id,
              property_id,
              expected_amount,
              collected_amount,
              released_amount,
              withheld_amount,
              currency,
              status,
              collected_at,
              closed_at,
              notes,
              created_by,
              created_at,
              updated_at
            `,
          )
          .eq(
            "booking_id",
            bookingId,
          )
          .maybeSingle();

      if (depositError) {
        throw depositError;
      }

      if (!depositRow) {
        return null;
      }

      const {
        data: movementRows,
        error: movementsError,
      } =
        await db
          .from(
            "short_rental_deposit_movements",
          )
          .select(
            `
              id,
              deposit_id,
              reference,
              movement_type,
              amount,
              currency,
              payment_method,
              treasury_account_id,
              treasury_movement_id,
              accounting_entry_id,
              inspection_id,
              beneficiary_owner_id,
              external_reference,
              reason,
              notes,
              occurred_at,
              created_at,
              created_by
            `,
          )
          .eq(
            "deposit_id",
            depositRow.id,
          )
          .order(
            "occurred_at",
            {
              ascending: false,
            },
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          );

      if (movementsError) {
        throw movementsError;
      }

      const movements =
        Array.isArray(
          movementRows,
        )
          ? movementRows.map(
              normalizeMovement,
            )
          : [];

      return normalizeDeposit(
        depositRow,
        movements,
      );
    },
  });
}