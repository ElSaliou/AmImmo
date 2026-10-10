import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import type {
  Database,
} from "@/integrations/supabase/types";

import type {
  LeaseInsert,
  LeaseUpdate,
} from "@/types/real-estate";

const KEY = "leases";

export type LeaseTerminationInitiator =
  Database["public"]["Enums"]["lease_termination_initiator"];

export type RentBillingRule =
  Database["public"]["Enums"]["rent_billing_rule"];

export interface LeaseBillingPreview {
  resolution_status: string;
  resolution_code: string;
  billing_month: string | null;
  billing_context: string | null;
  billing_rule: RentBillingRule | null;
  policy_version: string | null;
  effective_date: string | null;
  period_start: string | null;
  period_end: string | null;
  days_in_month: number | null;
  billed_days: number | null;
  monthly_rent_snapshot: number | null;
  monthly_charges_snapshot: number | null;
  rent_amount: number | null;
  charges_amount: number | null;
  total_amount: number | null;
}

export interface LeaseTerminationResult {
  lease_id: string;
  lease_reference: string | null;
  lease_status: string;
  termination_date: string;
  final_invoice_id: string;
  final_invoice_number: string;
  final_invoice_amount: number;
  invoice_reused: boolean;
}

export interface LeaseExpirationResult {
  lease_id: string;
  lease_reference: string | null;
  lease_status: string;
  end_date: string;
  final_invoice_id: string;
  final_invoice_number: string;
  final_invoice_amount: number;
  invoice_reused: boolean;
}

export type LeaseTermVersionRow =
  Database["public"]["Tables"]["lease_term_versions"]["Row"];
export type LeaseAmendmentRow =
  Database["public"]["Tables"]["lease_amendments"]["Row"];

export type LeaseAmendmentApplicationResult =
  Database["public"]["Functions"]["apply_lease_amendment"]["Returns"][number];

export type LeaseAmendmentChanges = Partial<{
  monthly_rent: number;
  charges: number;
  due_day: number;
  deposit: number;
  end_date: string | null;
}>;
const toNullableNumber = (
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

  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const normalizeBillingPreview = (
  row: any,
): LeaseBillingPreview => ({
  resolution_status:
    row?.resolution_status ?? "invalid",

  resolution_code:
    row?.resolution_code ??
    "BILLING_UNKNOWN",

  billing_month:
    row?.billing_month ?? null,

  billing_context:
    row?.billing_context ?? null,

  billing_rule:
    row?.billing_rule ?? null,

  policy_version:
    row?.policy_version ?? null,

  effective_date:
    row?.effective_date ?? null,

  period_start:
    row?.period_start ?? null,

  period_end:
    row?.period_end ?? null,

  days_in_month:
    toNullableNumber(
      row?.days_in_month,
    ),

  billed_days:
    toNullableNumber(
      row?.billed_days,
    ),

  monthly_rent_snapshot:
    toNullableNumber(
      row?.monthly_rent_snapshot,
    ),

  monthly_charges_snapshot:
    toNullableNumber(
      row?.monthly_charges_snapshot,
    ),

  rent_amount:
    toNullableNumber(
      row?.rent_amount,
    ),

  charges_amount:
    toNullableNumber(
      row?.charges_amount,
    ),

  total_amount:
    toNullableNumber(
      row?.total_amount,
    ),
});

const firstRpcRow = (
  data: any,
) =>
  Array.isArray(data)
    ? data[0]
    : data;

const invalidateRealEstate = async (
  qc: ReturnType<typeof useQueryClient>,
) => {
  await Promise.all([
    qc.invalidateQueries({
      queryKey: [KEY],
    }),

    qc.invalidateQueries({
      queryKey: ["properties"],
    }),

    qc.invalidateQueries({
      queryKey: ["marketplace"],
    }),

    qc.invalidateQueries({
      queryKey: ["tenants"],
    }),

    qc.invalidateQueries({
      queryKey: ["leads"],
    }),
  ]);
};

const invalidateLeaseClosureData = async (
  qc: ReturnType<typeof useQueryClient>,
) => {
  await Promise.all([
    invalidateRealEstate(qc),

    qc.invalidateQueries({
      queryKey: [
        "tenant-receivables",
      ],
    }),

    qc.invalidateQueries({
      queryKey: [
        "tenant-receivables-kpis",
      ],
    }),

    qc.invalidateQueries({
      queryKey: [
        "tenant-receivable-balances",
      ],
    }),

    qc.invalidateQueries({
      queryKey: [
        "finance-report",
      ],
    }),
  ]);
};

export const useLeases = () =>
  useQuery({
    queryKey: [KEY],

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from("leases")
          .select(`
            *,
            property:properties(
              id,
              title,
              price,
              currency,
              charges,
              status,
              listing_type,
              owner_id
            ),
            tenant:tenants(
              id,
              full_name,
              email,
              phone
            ),
            owner:owners(
              id,
              full_name
            )
          `)
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        throw error;
      }

      return data;
    },
  });

export const useLeaseTermVersions = (
  leaseId: string | null | undefined,
) =>
  useQuery({
    queryKey: [
      KEY,
      "term-versions",
      leaseId,
    ],

    enabled:
      Boolean(leaseId),

    queryFn:
      async (): Promise<
        LeaseTermVersionRow[]
      > => {
        if (!leaseId) {
          return [];
        }

        const {
          data,
          error,
        } = await supabase
          .from("lease_term_versions")
          .select("*")
          .eq(
            "lease_id",
            leaseId,
          )
          .order(
            "version_no",
            {
              ascending: false,
            },
          );

        if (error) {
          throw error;
        }

        return data ?? [];
      },
  });
export const useLeaseAmendments = (
  leaseId: string | null | undefined,
) =>
  useQuery({
    queryKey: [
      KEY,
      "amendments",
      leaseId,
    ],

    enabled:
      Boolean(leaseId),

    queryFn:
      async (): Promise<
        LeaseAmendmentRow[]
      > => {
        if (!leaseId) {
          return [];
        }

        const {
          data,
          error,
        } = await supabase
          .from("lease_amendments")
          .select("*")
          .eq(
            "lease_id",
            leaseId,
          )
          .order(
            "effective_date",
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

        if (error) {
          throw error;
        }

        return data ?? [];
      },
  });

export const useApplyLeaseAmendment =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async ({
          leaseId,
          effectiveDate,
          reason,
          changes,
        }: {
          leaseId: string;
          effectiveDate: string;
          reason: string;
          changes:
            LeaseAmendmentChanges;
        }) => {
          const {
            data,
            error,
          } = await supabase.rpc(
            "apply_lease_amendment",
            {
              p_lease_id:
                leaseId,

              p_effective_date:
                effectiveDate,

              p_reason:
                reason.trim(),

              p_changes:
                changes as Database["public"]["Functions"]["apply_lease_amendment"]["Args"]["p_changes"],
            },
          );

          if (error) {
            throw error;
          }

          const result =
            data?.[0];

          if (!result) {
            throw new Error(
              "L'avenant n'a retourné aucun résultat.",
            );
          }

          return result as LeaseAmendmentApplicationResult;
        },

      onSuccess:
        async () => {
          await invalidateRealEstate(
            qc,
          );
        },
    });
  };
type LeaseLifecycleBlockedField =
  | "status"
  | "termination_date"
  | "termination_reason"
  | "termination_initiator"
  | "termination_billing_rule";

export type SafeLeaseUpdate = Omit<
  LeaseUpdate,
  LeaseLifecycleBlockedField
>;

const LEASE_LIFECYCLE_BLOCKED_FIELDS = [
  "status",
  "termination_date",
  "termination_reason",
  "termination_initiator",
  "termination_billing_rule",
] as const;

const ACTIVE_LEASE_AMENDMENT_FIELDS = [
  "monthly_rent",
  "charges",
  "due_day",
  "deposit",
  "end_date",
] as const;

const hasOwnField = (
  value: Record<string, unknown>,
  field: string,
) =>
  Object.prototype.hasOwnProperty.call(
    value,
    field,
  );
export const useCreateLease = () => {
  const qc =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      input: LeaseInsert,
    ) => {
      const {
        data,
        error,
      } = await supabase
        .from("leases")
        .insert({ ...input, status: "pending" })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    onSuccess: async () => {
      await invalidateRealEstate(
        qc,
      );
    },
  });
};

export const useActivateLease = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ leaseId }: { leaseId: string }) => {
      const { data, error } = await supabase
        .from("leases")
        .update({ status: "active" })
        .eq("id", leaseId)
        .eq("status", "pending")
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Impossible d'activer ce bail : il est introuvable ou n'est plus en attente.",
        );
      }

      return data;
    },

    onSuccess: async () => {
      await invalidateRealEstate(qc);
    },
  });
};
export const useUpdateLease = () => {
  const qc =
    useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: SafeLeaseUpdate & {
      id: string;
    }) => {
      const rawUpdates = updates as Record<string, unknown>;

      const blockedField =
        LEASE_LIFECYCLE_BLOCKED_FIELDS.find((field) =>
          hasOwnField(rawUpdates, field),
        );

      if (blockedField) {
        throw new Error(
          `Le champ "${blockedField}" ne peut pas être modifié via useUpdateLease(). Utilisez le workflow métier dédié.`,
        );
      }

      const touchesContractTerms =
        ACTIVE_LEASE_AMENDMENT_FIELDS.some((field) =>
          hasOwnField(rawUpdates, field),
        );

      if (touchesContractTerms) {
        const {
          data: currentLease,
          error: currentLeaseError,
        } = await supabase
          .from("leases")
          .select("id, status")
          .eq("id", id)
          .single();

        if (currentLeaseError) {
          throw currentLeaseError;
        }

        if (currentLease.status === "active") {
          throw new Error(
            "Les termes contractuels d'un bail actif doivent être modifiés via un avenant.",
          );
        }
      }

      const {
        data,
        error,
      } = await supabase
        .from("leases")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    onSuccess: async () => {
      await invalidateRealEstate(
        qc,
      );
    },
  });
};

export const usePreviewLeaseTerminationBilling =
  () =>
    useMutation({
      mutationFn:
        async ({
          leaseId,
          terminationDate,
          initiator,
          billingRule,
        }: {
          leaseId: string;
          terminationDate: string;
          initiator:
            LeaseTerminationInitiator;
          billingRule:
            RentBillingRule;
        }) => {
          const {
            data,
            error,
          } = await supabase.rpc(
            "preview_lease_termination_billing",
            {
              p_lease_id:
                leaseId,

              p_termination_date:
                terminationDate,

              p_initiator:
                initiator,

              p_billing_rule:
                billingRule,
            },
          );

          if (error) {
            throw error;
          }

          const row =
            firstRpcRow(data);

          if (!row) {
            throw new Error(
              "L'aperçu de résiliation n'a retourné aucun résultat.",
            );
          }

          return normalizeBillingPreview(
            row,
          );
        },
    });

export const usePreviewLeaseExpirationBilling =
  () =>
    useMutation({
      mutationFn:
        async ({
          leaseId,
        }: {
          leaseId: string;
        }) => {
          const {
            data,
            error,
          } = await supabase.rpc(
            "preview_lease_expiration_billing",
            {
              p_lease_id:
                leaseId,
            },
          );

          if (error) {
            throw error;
          }

          const row =
            firstRpcRow(data);

          if (!row) {
            throw new Error(
              "L'aperçu d'expiration n'a retourné aucun résultat.",
            );
          }

          return normalizeBillingPreview(
            row,
          );
        },
    });

export const useTerminateLease = () => {
  const qc =
    useQueryClient();

  return useMutation({
    mutationFn: async ({
      leaseId,
      terminationDate,
      initiator,
      billingRule,
      reason,
    }: {
      leaseId: string;
      terminationDate: string;
      initiator:
        LeaseTerminationInitiator;
      billingRule:
        RentBillingRule;
      reason?: string | null;
    }) => {
      const {
        data,
        error,
      } = await supabase.rpc(
        "terminate_lease_with_final_invoice",
        {
          p_lease_id:
            leaseId,

          p_termination_date:
            terminationDate,

          p_initiator:
            initiator,

          p_billing_rule:
            billingRule,

          p_reason:
            reason?.trim() ||
            null,
        },
      );

      if (error) {
        throw error;
      }

      const result =
        firstRpcRow(data);

      if (!result) {
        throw new Error(
          "La résiliation n'a retourné aucun résultat.",
        );
      }

      return {
        ...result,
        final_invoice_amount:
          Number(
            result.final_invoice_amount ??
              0,
          ),
        invoice_reused:
          Boolean(
            result.invoice_reused,
          ),
      } as LeaseTerminationResult;
    },

    onSuccess: async () => {
      await invalidateLeaseClosureData(
        qc,
      );
    },
  });
};

export const useExpireLease = () => {
  const qc =
    useQueryClient();

  return useMutation({
    mutationFn: async ({
      leaseId,
    }: {
      leaseId: string;
    }) => {
      const {
        data,
        error,
      } = await supabase.rpc(
        "expire_lease_with_final_invoice",
        {
          p_lease_id:
            leaseId,
        },
      );

      if (error) {
        throw error;
      }

      const result =
        firstRpcRow(data);

      if (!result) {
        throw new Error(
          "L'expiration n'a retourné aucun résultat.",
        );
      }

      return {
        ...result,
        final_invoice_amount:
          Number(
            result.final_invoice_amount ??
              0,
          ),
        invoice_reused:
          Boolean(
            result.invoice_reused,
          ),
      } as LeaseExpirationResult;
    },

    onSuccess: async () => {
      await invalidateLeaseClosureData(
        qc,
      );
    },
  });
};

export const useDeleteLease = () => {
  const qc =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string,
    ) => {
      const { error } =
        await supabase
          .from("leases")
          .delete()
          .eq("id", id);

      if (error) {
        throw error;
      }
    },

    onSuccess: async () => {
      await invalidateRealEstate(
        qc,
      );
    },
  });
};
