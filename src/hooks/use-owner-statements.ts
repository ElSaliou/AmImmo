import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

export type CommissionSource =
  | "mandate"
  | "owner"
  | "global"
  | null;

export type OwnerStatementOwner = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string;
  city: string;
};

export type OwnerStatementSummary = {
  owner_id: string;
  owner_name: string;

  period_start: string;
  period_end: string;

  currency: string;

  opening_balance: number;

  collections_count: number;
  gross_collected: number;

  commission_amount: number;

  net_owner_amount: number;

  settlements_count: number;
  settlements_amount: number;

  closing_balance: number;
};

export type OwnerStatementLine = {
  ledger_id: string;

  owner_id: string;
  owner_name: string;

  property_id: string | null;
  property_title: string | null;

  lease_id: string | null;

  invoice_id: string | null;
  invoice_number: string | null;

  payment_id: string | null;
  payment_reference: string | null;

  collected_at: string;

  currency: string;

  gross_collected: number;

  commission_rate: number;
  commission_amount: number;

  commission_source: CommissionSource;

  mandate_id: string | null;

  net_owner_amount: number;

  settled_amount: number;
  balance_to_settle: number;
};

export type OwnerStatementSettlement = {
  settlement_id: string;

  owner_id: string;
  owner_name: string;

  reference: string;

  settlement_date: string;

  amount: number;
  currency: string;

  status: string;

  external_reference: string | null;
  notes: string;

  treasury_account_id: string;
  treasury_account_name: string | null;

  accounting_entry_id: string | null;
  treasury_movement_id: string | null;

  created_at: string;
};

export type OwnerStatementFilters = {
  ownerId: string;
  startDate: string;
  endDate: string;
};

// ============================================================
// OFFICIAL STATEMENT
// ============================================================

export type OfficialOwnerStatementStatus =
  | "draft"
  | "issued"
  | "sent"
  | "cancelled";

export type OfficialOwnerStatement = {
  id: string;

  organization_id: string | null;

  owner_id: string;

  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_company: string | null;
  owner_address: string | null;
  owner_city: string | null;

  reference: string;

  period_start: string;
  period_end: string;

  currency: string;

  opening_balance: number;
  gross_collected: number;
  commission_amount: number;
  net_owner_amount: number;
  settlements_amount: number;
  closing_balance: number;

  status: OfficialOwnerStatementStatus;

  issued_at: string | null;
  sent_at: string | null;

  sent_channel: "email" | "whatsapp" | "manual" | null;
  sent_to: string | null;
  sent_reference: string | null;

  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;

  notes: string;

  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OfficialCollectionLine = {
  id: string;

  statement_id: string;

  ledger_id: string;

  property_id: string | null;
  property_title: string | null;

  invoice_number: string | null;
  payment_reference: string | null;

  collected_at: string;

  currency: string;

  gross_collected: number;

  commission_rate: number;
  commission_source: CommissionSource;
  commission_amount: number;

  net_owner_amount: number;

  settled_amount: number;
  balance_to_settle: number;
};

export type OfficialSettlementLine = {
  id: string;

  statement_id: string;

  settlement_id: string;

  reference: string;

  settlement_date: string;

  amount: number;
  currency: string;

  treasury_account_name: string | null;

  external_reference: string | null;
  notes: string;
};

export type OfficialOwnerStatementBundle = {
  statement: OfficialOwnerStatement;
  collections: OfficialCollectionLine[];
  settlements: OfficialSettlementLine[];
};

// ============================================================
// NORMALIZERS
// ============================================================

const normalizeSummary = (
  row: any,
): OwnerStatementSummary => ({
  owner_id: row.owner_id,
  owner_name: row.owner_name,

  period_start: row.period_start,
  period_end: row.period_end,

  currency: row.currency ?? "GNF",

  opening_balance: Number(
    row.opening_balance ?? 0,
  ),

  collections_count: Number(
    row.collections_count ?? 0,
  ),

  gross_collected: Number(
    row.gross_collected ?? 0,
  ),

  commission_amount: Number(
    row.commission_amount ?? 0,
  ),

  net_owner_amount: Number(
    row.net_owner_amount ?? 0,
  ),

  settlements_count: Number(
    row.settlements_count ?? 0,
  ),

  settlements_amount: Number(
    row.settlements_amount ?? 0,
  ),

  closing_balance: Number(
    row.closing_balance ?? 0,
  ),
});

const normalizeLine = (
  row: any,
): OwnerStatementLine => ({
  ledger_id: row.ledger_id,

  owner_id: row.owner_id,
  owner_name: row.owner_name,

  property_id: row.property_id ?? null,
  property_title:
    row.property_title ?? null,

  lease_id: row.lease_id ?? null,

  invoice_id: row.invoice_id ?? null,
  invoice_number:
    row.invoice_number ?? null,

  payment_id: row.payment_id ?? null,
  payment_reference:
    row.payment_reference ?? null,

  collected_at: row.collected_at,

  currency: row.currency ?? "GNF",

  gross_collected: Number(
    row.gross_collected ?? 0,
  ),

  commission_rate: Number(
    row.commission_rate ?? 0,
  ),

  commission_amount: Number(
    row.commission_amount ?? 0,
  ),

  commission_source:
    row.commission_source ?? null,

  mandate_id: row.mandate_id ?? null,

  net_owner_amount: Number(
    row.net_owner_amount ?? 0,
  ),

  settled_amount: Number(
    row.settled_amount ?? 0,
  ),

  balance_to_settle: Number(
    row.balance_to_settle ?? 0,
  ),
});

const normalizeSettlement = (
  row: any,
): OwnerStatementSettlement => ({
  settlement_id: row.settlement_id,

  owner_id: row.owner_id,
  owner_name: row.owner_name,

  reference: row.reference,

  settlement_date: row.settlement_date,

  amount: Number(row.amount ?? 0),

  currency: row.currency ?? "GNF",

  status: row.status,

  external_reference:
    row.external_reference ?? null,

  notes: row.notes ?? "",

  treasury_account_id:
    row.treasury_account_id,

  treasury_account_name:
    row.treasury_account_name ?? null,

  accounting_entry_id:
    row.accounting_entry_id ?? null,

  treasury_movement_id:
    row.treasury_movement_id ?? null,

  created_at: row.created_at,
});

const normalizeOfficialStatement = (
  row: any,
): OfficialOwnerStatement => ({
  ...row,

  owner_name: row.owner_name ?? null,
  owner_email: row.owner_email ?? null,
  owner_phone: row.owner_phone ?? null,
  owner_company: row.owner_company ?? null,
  owner_address: row.owner_address ?? null,
  owner_city: row.owner_city ?? null,

  sent_channel: row.sent_channel ?? null,
  sent_to: row.sent_to ?? null,
  sent_reference: row.sent_reference ?? null,

  cancelled_at: row.cancelled_at ?? null,
  cancellation_reason: row.cancellation_reason ?? null,
  cancelled_by: row.cancelled_by ?? null,

  currency: row.currency ?? "GNF",

  opening_balance: Number(
    row.opening_balance ?? 0,
  ),

  gross_collected: Number(
    row.gross_collected ?? 0,
  ),

  commission_amount: Number(
    row.commission_amount ?? 0,
  ),

  net_owner_amount: Number(
    row.net_owner_amount ?? 0,
  ),

  settlements_amount: Number(
    row.settlements_amount ?? 0,
  ),

  closing_balance: Number(
    row.closing_balance ?? 0,
  ),

  notes: row.notes ?? "",
});

const normalizeOfficialCollection = (
  row: any,
): OfficialCollectionLine => ({
  ...row,

  property_id: row.property_id ?? null,
  property_title:
    row.property_title ?? null,

  invoice_number:
    row.invoice_number ?? null,

  payment_reference:
    row.payment_reference ?? null,

  currency: row.currency ?? "GNF",

  gross_collected: Number(
    row.gross_collected ?? 0,
  ),

  commission_rate: Number(
    row.commission_rate ?? 0,
  ),

  commission_source:
    row.commission_source ?? null,

  commission_amount: Number(
    row.commission_amount ?? 0,
  ),

  net_owner_amount: Number(
    row.net_owner_amount ?? 0,
  ),

  settled_amount: Number(
    row.settled_amount ?? 0,
  ),

  balance_to_settle: Number(
    row.balance_to_settle ?? 0,
  ),
});

const normalizeOfficialSettlement = (
  row: any,
): OfficialSettlementLine => ({
  ...row,

  amount: Number(row.amount ?? 0),

  currency: row.currency ?? "GNF",

  treasury_account_name:
    row.treasury_account_name ?? null,

  external_reference:
    row.external_reference ?? null,

  notes: row.notes ?? "",
});

// ============================================================
// OWNER LIST
// ============================================================

export function useOwnerStatementOwners() {
  return useQuery({
    queryKey: ["owner-statement-owners"],

    queryFn: async () => {
      const { data, error } = await (
        supabase as any
      )
        .from("owners")
        .select(`
          id,
          full_name,
          email,
          phone,
          company,
          address,
          city
        `)
        .order("full_name", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      return (data ?? []).map(
        (owner: any): OwnerStatementOwner => ({
          id: owner.id,
          full_name: owner.full_name,
          email: owner.email ?? null,
          phone: owner.phone ?? null,
          company: owner.company ?? null,
          address: owner.address ?? "",
          city: owner.city ?? "",
        }),
      );
    },
  });
}

// ============================================================
// CURRENT STATEMENT
// ============================================================

export function useOwnerStatementSummary(
  filters: OwnerStatementFilters,
) {
  const {
    ownerId,
    startDate,
    endDate,
  } = filters;

  return useQuery({
    queryKey: [
      "owner-statement-summary",
      ownerId,
      startDate,
      endDate,
    ],

    enabled: Boolean(
      ownerId &&
        startDate &&
        endDate,
    ),

    queryFn: async () => {
      const { data, error } = await (
        supabase as any
      ).rpc(
        "get_owner_statement_summary",
        {
          p_owner_id: ownerId,
          p_start_date: startDate,
          p_end_date: endDate,
        },
      );

      if (error) throw error;

      const row = Array.isArray(data)
        ? data[0]
        : data;

      return row
        ? normalizeSummary(row)
        : null;
    },
  });
}

export function useOwnerStatementLines(
  filters: OwnerStatementFilters,
) {
  const {
    ownerId,
    startDate,
    endDate,
  } = filters;

  return useQuery({
    queryKey: [
      "owner-statement-lines",
      ownerId,
      startDate,
      endDate,
    ],

    enabled: Boolean(
      ownerId &&
        startDate &&
        endDate,
    ),

    queryFn: async () => {
      const { data, error } = await (
        supabase as any
      ).rpc(
        "get_owner_statement_lines",
        {
          p_owner_id: ownerId,
          p_start_date: startDate,
          p_end_date: endDate,
        },
      );

      if (error) throw error;

      return (data ?? []).map(
        normalizeLine,
      );
    },
  });
}

export function useOwnerStatementSettlements(
  filters: OwnerStatementFilters,
) {
  const {
    ownerId,
    startDate,
    endDate,
  } = filters;

  return useQuery({
    queryKey: [
      "owner-statement-settlements",
      ownerId,
      startDate,
      endDate,
    ],

    enabled: Boolean(
      ownerId &&
        startDate &&
        endDate,
    ),

    queryFn: async () => {
      const { data, error } = await (
        supabase as any
      ).rpc(
        "get_owner_statement_settlements",
        {
          p_owner_id: ownerId,
          p_start_date: startDate,
          p_end_date: endDate,
        },
      );

      if (error) throw error;

      return (data ?? []).map(
        normalizeSettlement,
      );
    },
  });
}

export function useOwnerStatement(
  filters: OwnerStatementFilters,
) {
  const summaryQuery =
    useOwnerStatementSummary(filters);

  const linesQuery =
    useOwnerStatementLines(filters);

  const settlementsQuery =
    useOwnerStatementSettlements(filters);

  return {
    summary:
      summaryQuery.data ?? null,

    lines:
      linesQuery.data ?? [],

    settlements:
      settlementsQuery.data ?? [],

    isLoading:
      summaryQuery.isLoading ||
      linesQuery.isLoading ||
      settlementsQuery.isLoading,

    isFetching:
      summaryQuery.isFetching ||
      linesQuery.isFetching ||
      settlementsQuery.isFetching,

    isError:
      summaryQuery.isError ||
      linesQuery.isError ||
      settlementsQuery.isError,

    error:
      summaryQuery.error ??
      linesQuery.error ??
      settlementsQuery.error ??
      null,

    refetch: async () => {
      await Promise.all([
        summaryQuery.refetch(),
        linesQuery.refetch(),
        settlementsQuery.refetch(),
      ]);
    },
  };
}

// ============================================================
// OFFICIAL STATEMENT HISTORY
// ============================================================

export function useOfficialOwnerStatements(
  ownerId: string,
) {
  return useQuery({
    queryKey: [
      "official-owner-statements",
      ownerId,
    ],

    enabled: Boolean(ownerId),

    queryFn: async () => {
      const { data, error } = await (
        supabase as any
      )
        .from("owner_statements")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      return (data ?? []).map(
        normalizeOfficialStatement,
      );
    },
  });
}

// ============================================================
// CREATE OFFICIAL
// ============================================================

export function useCreateOfficialOwnerStatement() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async ({
      ownerId,
      startDate,
      endDate,
      notes = "",
    }: {
      ownerId: string;
      startDate: string;
      endDate: string;
      notes?: string;
    }) => {
      const { data, error } = await (
        supabase as any
      ).rpc(
        "create_owner_statement",
        {
          p_owner_id: ownerId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_notes: notes,
        },
      );

      if (error) throw error;

      return data as string;
    },

    onSuccess: async (
      _data,
      variables,
    ) => {
      await queryClient.invalidateQueries({
        queryKey: [
          "official-owner-statements",
          variables.ownerId,
        ],
      });
    },
  });
}

// ============================================================
// DELIVERY / CANCELLATION
// ============================================================

export type OwnerStatementSendChannel =
  | "email"
  | "whatsapp"
  | "manual";

export function useMarkOwnerStatementSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ownerId,
      channel,
      sentTo,
      sentReference = null,
    }: {
      id: string;
      ownerId: string;
      channel: OwnerStatementSendChannel;
      sentTo: string;
      sentReference?: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc(
        "mark_owner_statement_sent",
        {
          p_statement_id: id,
          p_channel: channel,
          p_sent_to: sentTo,
          p_sent_reference: sentReference || null,
        },
      );

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      return normalizeOfficialStatement(row);
    },

    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["official-owner-statements", variables.ownerId],
      });
    },
  });
}

export function useCancelOwnerStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ownerId,
      reason,
    }: {
      id: string;
      ownerId: string;
      reason: string;
    }) => {
      const { data, error } = await (supabase as any).rpc(
        "cancel_owner_statement",
        {
          p_statement_id: id,
          p_reason: reason,
        },
      );

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      return normalizeOfficialStatement(row);
    },

    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["official-owner-statements", variables.ownerId],
      });
    },
  });
}

// ============================================================
// FETCH OFFICIAL DOCUMENT + SNAPSHOTS
// ============================================================

export async function getOfficialOwnerStatementBundle(
  statementId: string,
): Promise<OfficialOwnerStatementBundle> {
  const [
    statementResult,
    collectionResult,
    settlementResult,
  ] = await Promise.all([
    (supabase as any)
      .from("owner_statements")
      .select("*")
      .eq("id", statementId)
      .single(),

    (supabase as any)
      .from(
        "owner_statement_collection_lines",
      )
      .select("*")
      .eq(
        "statement_id",
        statementId,
      )
      .order("collected_at", {
        ascending: true,
      }),

    (supabase as any)
      .from(
        "owner_statement_settlement_lines",
      )
      .select("*")
      .eq(
        "statement_id",
        statementId,
      )
      .order("settlement_date", {
        ascending: true,
      }),
  ]);

  if (statementResult.error) {
    throw statementResult.error;
  }

  if (collectionResult.error) {
    throw collectionResult.error;
  }

  if (settlementResult.error) {
    throw settlementResult.error;
  }

  return {
    statement:
      normalizeOfficialStatement(
        statementResult.data,
      ),

    collections:
      (
        collectionResult.data ?? []
      ).map(
        normalizeOfficialCollection,
      ),

    settlements:
      (
        settlementResult.data ?? []
      ).map(
        normalizeOfficialSettlement,
      ),
  };
}