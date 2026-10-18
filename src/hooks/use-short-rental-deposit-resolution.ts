import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import {
  SHORT_RENTAL_DEPOSIT_KEY,
} from "@/hooks/use-short-rental-deposit";

const db = supabase as any;

export const SHORT_RENTAL_DEPOSIT_RESOLUTION_KEY =
  "short-rental-deposit-resolution";

export type ShortRentalDepositResolutionStatus =
  | "draft"
  | "approved"
  | "processing"
  | "completed"
  | "cancelled"
  | string;

export interface ShortRentalCheckoutInspection {
  id: string;
  booking_id: string;
  kind: string;
  finalized_at: string | null;
}

export interface ShortRentalCheckoutFinding {
  id: string;
  inspection_id: string;

  title: string;
  description: string | null;
  severity: string | null;

  estimated_cost: number | null;
  resolved: boolean;
}

export interface ShortRentalDepositResolution {
  id: string;

  organization_id: string;
  deposit_id: string;
  booking_id: string;
  inspection_id: string;

  currency: string;

  status:
    ShortRentalDepositResolutionStatus;

  available_amount_snapshot: number;
  deduction_amount: number;
  release_amount: number;

  decision_notes: string;

  approved_at: string | null;
  approved_by: string | null;

  execution_started_at:
    | string
    | null;

  executed_at:
    | string
    | null;

  executed_by:
    | string
    | null;

  withhold_movement_id:
    | string
    | null;

  release_movement_id:
    | string
    | null;

  cancelled_at:
    | string
    | null;

  cancelled_by:
    | string
    | null;

  cancellation_reason: string;

  created_by:
    | string
    | null;

  created_at: string;
  updated_at: string;
}

export interface ShortRentalDepositDeduction {
  id: string;

  resolution_id: string;
  organization_id: string;

  inspection_finding_id: string;

  estimated_cost_snapshot:
    | number
    | null;

  deduction_amount: number;

  reason: string;

  created_by:
    | string
    | null;

  created_at: string;
  updated_at: string;
}

export interface ShortRentalDepositResolutionContext {
  inspection:
    | ShortRentalCheckoutInspection
    | null;

  findings:
    ShortRentalCheckoutFinding[];

  resolution:
    | ShortRentalDepositResolution
    | null;

  deductions:
    ShortRentalDepositDeduction[];
}

export interface ExecuteDepositResolutionResult {
  resolution_id: string;

  resolution_status: string;

  withhold_movement_id:
    | string
    | null;

  release_movement_id:
    | string
    | null;

  deduction_amount: number;
  release_amount: number;
  remaining_amount: number;

  reused: boolean;
}


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


const normalizeNullableNumber = (
  value: unknown,
): number | null => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
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


const normalizeInspection = (
  row: any,
): ShortRentalCheckoutInspection => ({
  id:
    String(
      row.id ?? "",
    ),

  booking_id:
    String(
      row.booking_id ?? "",
    ),

  kind:
    String(
      row.kind ?? "",
    ),

  finalized_at:
    normalizeNullableString(
      row.finalized_at,
    ),
});


const normalizeFinding = (
  row: any,
): ShortRentalCheckoutFinding => ({
  id:
    String(
      row.id ?? "",
    ),

  inspection_id:
    String(
      row.inspection_id ?? "",
    ),

  title:
    String(
      row.title ??
        "Constat",
    ),

  description:
    normalizeNullableString(
      row.description,
    ),

  severity:
    normalizeNullableString(
      row.severity,
    ),

  estimated_cost:
    normalizeNullableNumber(
      row.estimated_cost,
    ),

  resolved:
    Boolean(
      row.resolved ?? false,
    ),
});


const normalizeResolution = (
  row: any,
): ShortRentalDepositResolution => ({
  id:
    String(
      row.id ?? "",
    ),

  organization_id:
    String(
      row.organization_id ?? "",
    ),

  deposit_id:
    String(
      row.deposit_id ?? "",
    ),

  booking_id:
    String(
      row.booking_id ?? "",
    ),

  inspection_id:
    String(
      row.inspection_id ?? "",
    ),

  currency:
    String(
      row.currency ?? "GNF",
    ),

  status:
    String(
      row.status ?? "draft",
    ),

  available_amount_snapshot:
    normalizeNumber(
      row.available_amount_snapshot,
    ),

  deduction_amount:
    normalizeNumber(
      row.deduction_amount,
    ),

  release_amount:
    normalizeNumber(
      row.release_amount,
    ),

  decision_notes:
    String(
      row.decision_notes ?? "",
    ),

  approved_at:
    normalizeNullableString(
      row.approved_at,
    ),

  approved_by:
    normalizeNullableString(
      row.approved_by,
    ),

  execution_started_at:
    normalizeNullableString(
      row.execution_started_at,
    ),

  executed_at:
    normalizeNullableString(
      row.executed_at,
    ),

  executed_by:
    normalizeNullableString(
      row.executed_by,
    ),

  withhold_movement_id:
    normalizeNullableString(
      row.withhold_movement_id,
    ),

  release_movement_id:
    normalizeNullableString(
      row.release_movement_id,
    ),

  cancelled_at:
    normalizeNullableString(
      row.cancelled_at,
    ),

  cancelled_by:
    normalizeNullableString(
      row.cancelled_by,
    ),

  cancellation_reason:
    String(
      row.cancellation_reason ?? "",
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
});


const normalizeDeduction = (
  row: any,
): ShortRentalDepositDeduction => ({
  id:
    String(
      row.id ?? "",
    ),

  resolution_id:
    String(
      row.resolution_id ?? "",
    ),

  organization_id:
    String(
      row.organization_id ?? "",
    ),

  inspection_finding_id:
    String(
      row.inspection_finding_id ?? "",
    ),

  estimated_cost_snapshot:
    normalizeNullableNumber(
      row.estimated_cost_snapshot,
    ),

  deduction_amount:
    normalizeNumber(
      row.deduction_amount,
    ),

  reason:
    String(
      row.reason ?? "",
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
});


const firstRpcRow = <T,>(
  data: unknown,
): T => {
  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  if (
    !row ||
    typeof row !== "object"
  ) {
    throw new Error(
      "La RPC n'a retourné aucun résultat.",
    );
  }

  return row as T;
};


async function invalidateResolutionQueries(
  queryClient: ReturnType<
    typeof useQueryClient
  >,
  bookingId:
    | string
    | null
    | undefined,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: [
        SHORT_RENTAL_DEPOSIT_RESOLUTION_KEY,
        bookingId,
      ],
    }),

    queryClient.invalidateQueries({
      queryKey: [
        SHORT_RENTAL_DEPOSIT_KEY,
        bookingId,
      ],
    }),
  ]);
}


export function useShortRentalDepositResolution(
  bookingId:
    | string
    | null
    | undefined,
) {
  return useQuery<
    ShortRentalDepositResolutionContext,
    Error
  >({
    queryKey: [
      SHORT_RENTAL_DEPOSIT_RESOLUTION_KEY,
      bookingId,
    ],

    enabled:
      Boolean(
        bookingId,
      ),

    queryFn: async () => {
      if (!bookingId) {
        return {
          inspection: null,
          findings: [],
          resolution: null,
          deductions: [],
        };
      }


      const {
        data: inspectionRow,
        error: inspectionError,
      } =
        await db
          .from(
            "inspections",
          )
          .select(
            `
              id,
              booking_id,
              kind,
              finalized_at
            `,
          )
          .eq(
            "booking_id",
            bookingId,
          )
          .eq(
            "kind",
            "checkout",
          )
          .maybeSingle();


      if (inspectionError) {
        throw inspectionError;
      }


      const inspection =
        inspectionRow
          ? normalizeInspection(
              inspectionRow,
            )
          : null;


      let findings:
        ShortRentalCheckoutFinding[] =
        [];


      if (inspection) {
        const {
          data: findingRows,
          error: findingsError,
        } =
          await db
            .from(
              "inspection_findings",
            )
            .select(
              `
                id,
                inspection_id,
                title,
                description,
                severity,
                estimated_cost,
                resolved
              `,
            )
            .eq(
              "inspection_id",
              inspection.id,
            );


        if (findingsError) {
          throw findingsError;
        }


        findings =
          Array.isArray(
            findingRows,
          )
            ? findingRows.map(
                normalizeFinding,
              )
            : [];
      }


      const {
        data: resolutionRow,
        error: resolutionError,
      } =
        await db
          .from(
            "short_rental_deposit_resolutions",
          )
          .select(
            `
              id,
              organization_id,
              deposit_id,
              booking_id,
              inspection_id,
              currency,
              status,
              available_amount_snapshot,
              deduction_amount,
              release_amount,
              decision_notes,
              approved_at,
              approved_by,
              execution_started_at,
              executed_at,
              executed_by,
              withhold_movement_id,
              release_movement_id,
              cancelled_at,
              cancelled_by,
              cancellation_reason,
              created_by,
              created_at,
              updated_at
            `,
          )
          .eq(
            "booking_id",
            bookingId,
          )
          .neq(
            "status",
            "cancelled",
          )
          .maybeSingle();


      if (resolutionError) {
        throw resolutionError;
      }


      const resolution =
        resolutionRow
          ? normalizeResolution(
              resolutionRow,
            )
          : null;


      let deductions:
        ShortRentalDepositDeduction[] =
        [];


      if (resolution) {
        const {
          data: deductionRows,
          error: deductionError,
        } =
          await db
            .from(
              "short_rental_deposit_deductions",
            )
            .select(
              `
                id,
                resolution_id,
                organization_id,
                inspection_finding_id,
                estimated_cost_snapshot,
                deduction_amount,
                reason,
                created_by,
                created_at,
                updated_at
              `,
            )
            .eq(
              "resolution_id",
              resolution.id,
            );


        if (deductionError) {
          throw deductionError;
        }


        deductions =
          Array.isArray(
            deductionRows,
          )
            ? deductionRows.map(
                normalizeDeduction,
              )
            : [];
      }


      return {
        inspection,
        findings,
        resolution,
        deductions,
      };
    },
  });
}


export function usePrepareShortRentalDepositResolution(
  bookingId:
    | string
    | null
    | undefined,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationKey: [
      "short-rental-deposit-resolution",
      "prepare",
      bookingId,
    ],

    mutationFn: async () => {
      if (!bookingId) {
        throw new Error(
          "Réservation introuvable.",
        );
      }

      const {
        data,
        error,
      } =
        await db.rpc(
          "prepare_short_rental_deposit_resolution",
          {
            p_booking_id:
              bookingId,
          },
        );

      if (error) {
        throw error;
      }

      return normalizeResolution(
        firstRpcRow<any>(
          data,
        ),
      );
    },

    onSuccess: async () => {
      await invalidateResolutionQueries(
        queryClient,
        bookingId,
      );
    },
  });
}


export interface UpsertDepositDeductionInput {
  resolutionId: string;
  findingId: string;
  amount: number;
  reason: string;
}


export function useUpsertShortRentalDepositDeduction(
  bookingId:
    | string
    | null
    | undefined,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationKey: [
      "short-rental-deposit-resolution",
      "deduction",
      "upsert",
      bookingId,
    ],

    mutationFn: async (
      input:
        UpsertDepositDeductionInput,
    ) => {
      const {
        data,
        error,
      } =
        await db.rpc(
          "upsert_short_rental_deposit_deduction",
          {
            p_resolution_id:
              input.resolutionId,

            p_finding_id:
              input.findingId,

            p_amount:
              input.amount,

            p_reason:
              input.reason,
          },
        );

      if (error) {
        throw error;
      }

      return normalizeDeduction(
        firstRpcRow<any>(
          data,
        ),
      );
    },

    onSuccess: async () => {
      await invalidateResolutionQueries(
        queryClient,
        bookingId,
      );
    },
  });
}


export interface DeleteDepositDeductionInput {
  resolutionId: string;
  findingId: string;
}


export function useDeleteShortRentalDepositDeduction(
  bookingId:
    | string
    | null
    | undefined,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationKey: [
      "short-rental-deposit-resolution",
      "deduction",
      "delete",
      bookingId,
    ],

    mutationFn: async (
      input:
        DeleteDepositDeductionInput,
    ) => {
      const {
        data,
        error,
      } =
        await db.rpc(
          "delete_short_rental_deposit_deduction",
          {
            p_resolution_id:
              input.resolutionId,

            p_finding_id:
              input.findingId,
          },
        );

      if (error) {
        throw error;
      }

      return Boolean(data);
    },

    onSuccess: async () => {
      await invalidateResolutionQueries(
        queryClient,
        bookingId,
      );
    },
  });
}


export function useApproveShortRentalDepositResolution(
  bookingId:
    | string
    | null
    | undefined,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationKey: [
      "short-rental-deposit-resolution",
      "approve",
      bookingId,
    ],

    mutationFn: async ({
      resolutionId,
      notes,
    }: {
      resolutionId: string;
      notes: string;
    }) => {
      const {
        data,
        error,
      } =
        await db.rpc(
          "approve_short_rental_deposit_resolution",
          {
            p_resolution_id:
              resolutionId,

            p_notes:
              notes,
          },
        );

      if (error) {
        throw error;
      }

      return normalizeResolution(
        firstRpcRow<any>(
          data,
        ),
      );
    },

    onSuccess: async () => {
      await invalidateResolutionQueries(
        queryClient,
        bookingId,
      );
    },
  });
}


export function useCancelShortRentalDepositResolution(
  bookingId:
    | string
    | null
    | undefined,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationKey: [
      "short-rental-deposit-resolution",
      "cancel",
      bookingId,
    ],

    mutationFn: async ({
      resolutionId,
      reason,
    }: {
      resolutionId: string;
      reason: string;
    }) => {
      const {
        data,
        error,
      } =
        await db.rpc(
          "cancel_short_rental_deposit_resolution",
          {
            p_resolution_id:
              resolutionId,

            p_reason:
              reason,
          },
        );

      if (error) {
        throw error;
      }

      return normalizeResolution(
        firstRpcRow<any>(
          data,
        ),
      );
    },

    onSuccess: async () => {
      await invalidateResolutionQueries(
        queryClient,
        bookingId,
      );
    },
  });
}


export function useExecuteShortRentalDepositResolution(
  bookingId:
    | string
    | null
    | undefined,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationKey: [
      "short-rental-deposit-resolution",
      "execute",
      bookingId,
    ],

    mutationFn: async ({
      resolutionId,
      releasePaymentMethod,
      notes,
    }: {
      resolutionId: string;

      releasePaymentMethod:
        | string
        | null;

      notes: string;
    }) => {
      const {
        data,
        error,
      } =
        await db.rpc(
          "execute_short_rental_deposit_resolution",
          {
            p_resolution_id:
              resolutionId,

            p_release_payment_method:
              releasePaymentMethod,

            p_executed_at:
              null,

            p_notes:
              notes,
          },
        );

      if (error) {
        throw error;
      }

      const row =
        firstRpcRow<any>(
          data,
        );

      return {
        resolution_id:
          String(
            row.resolution_id ?? "",
          ),

        resolution_status:
          String(
            row.resolution_status ??
              "",
          ),

        withhold_movement_id:
          normalizeNullableString(
            row.withhold_movement_id,
          ),

        release_movement_id:
          normalizeNullableString(
            row.release_movement_id,
          ),

        deduction_amount:
          normalizeNumber(
            row.deduction_amount,
          ),

        release_amount:
          normalizeNumber(
            row.release_amount,
          ),

        remaining_amount:
          normalizeNumber(
            row.remaining_amount,
          ),

        reused:
          Boolean(
            row.reused ?? false,
          ),
      } satisfies
        ExecuteDepositResolutionResult;
    },

    onSuccess: async () => {
      await invalidateResolutionQueries(
        queryClient,
        bookingId,
      );
    },
  });
}