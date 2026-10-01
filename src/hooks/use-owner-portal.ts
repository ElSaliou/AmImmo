import {
  useQuery,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

export type OwnerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  kind: string | null;
  address: string | null;
  city: string | null;
  bank_name: string | null;
  bank_account: string | null;
  mobile_money_provider: string | null;
  mobile_money_number: string | null;
  management_commission_rate: number | null;
};

export type OwnerDashboard = {
  owner_id: string;
  properties_count: number;
  available_properties_count: number;
  rented_properties_count: number;
  gross_collected: number;
  commissions: number;
  net_owner_amount: number;
  settlements_amount: number;
  outstanding_balance: number;
};

export type OwnerProperty = {
  id: string;

  reference?: string | null;
  title?: string | null;
  name?: string | null;

  property_type?: string | null;
  listing_type?: string | null;
  status?: string | null;

  address?: string | null;
  city?: string | null;
  commune?: string | null;
  district?: string | null;

  bedrooms?: number | null;
  bathrooms?: number | null;
  surface?: number | null;
  area?: number | null;

  rent?: number | null;
  monthly_rent?: number | null;
  price?: number | null;
  sale_price?: number | null;

  charges_monthly?: number | null;

  currency?: string | null;

  available_from?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  furnished?: boolean | null;
};

export type OwnerRevenue = {
  id: string;

  property_id: string | null;
  property_title: string | null;
  property_reference: string | null;

  lease_id: string | null;
  lease_reference: string | null;

  invoice_id: string | null;
  payment_id: string | null;
  mandate_id: string | null;

  currency: string;

  gross_collected: number;
  commission_rate: number;
  commission_amount: number;
  net_owner_amount: number;
  settled_amount: number;

  commission_source: string | null;

  collected_at: string;
  created_at: string;
};

export type OwnerSettlement = {
  id: string;
  reference: string;

  amount: number;
  currency: string;

  settlement_date: string;
  status: string;

  external_reference: string | null;
  notes: string | null;

  treasury_account_id: string | null;
  treasury_account_name: string | null;

  created_at: string;
};

export type OwnerStatement = {
  id: string;
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

  status: string;

  issued_at: string | null;
  sent_at: string | null;

  sent_channel: string | null;
  sent_to: string | null;
  sent_reference: string | null;

  cancelled_at: string | null;
  cancellation_reason: string | null;

  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_address: string | null;
  owner_city: string | null;

  notes: string | null;

  created_at: string;
};

export type OwnerMandate = {
  id: string;
  organization_id: string | null;
  owner_id: string;

  reference: string;

  mandate_type:
    | "management"
    | "rental"
    | "sale"
    | string;

  exclusive: boolean;

  start_date: string;
  end_date: string | null;

  commission_rate: number | null;
  commission_fixed: number | null;

  conditions: string | null;
  document_url: string | null;

  status:
    | "draft"
    | "active"
    | "expired"
    | "terminated"
    | string;

  created_at: string;
  updated_at: string;
};

// ============================================================
// HELPERS
// ============================================================

function firstRow<T>(
  value:
    | T[]
    | T
    | null,
): T | null {
  if (!value) {
    return null;
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}

// ============================================================
// PROFILE
// ============================================================

export function useMyOwnerProfile() {
  return useQuery({
    queryKey: [
      "owner-portal",
      "profile",
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_my_owner_profile",
        );

      if (error) {
        throw error;
      }

      return firstRow(
        data as
          | OwnerProfile[]
          | null,
      );
    },

    staleTime: 60_000,
  });
}

// ============================================================
// DASHBOARD
// ============================================================

export function useMyOwnerDashboard() {
  return useQuery({
    queryKey: [
      "owner-portal",
      "dashboard",
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_my_owner_dashboard",
        );

      if (error) {
        throw error;
      }

      return firstRow(
        data as
          | OwnerDashboard[]
          | null,
      );
    },

    staleTime: 30_000,
  });
}

// ============================================================
// PROPERTIES
// ============================================================

export function useMyOwnerProperties() {
  return useQuery({
    queryKey: [
      "owner-portal",
      "properties",
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "properties",
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            },
          );

      if (error) {
        throw error;
      }

      return (
        data ??
        []
      ) as unknown as OwnerProperty[];
    },

    staleTime: 30_000,
  });
}

// ============================================================
// REVENUES
// ============================================================

export function useMyOwnerRevenues() {
  return useQuery({
    queryKey: [
      "owner-portal",
      "revenues",
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_my_owner_revenues",
        );

      if (error) {
        console.error(
          "[OwnerPortal] Revenus :",
          error,
        );

        throw error;
      }

      return (
        data ??
        []
      ).map(
        (
          row: any,
        ) => ({
          ...row,

          gross_collected:
            Number(
              row.gross_collected ??
                0,
            ),

          commission_rate:
            Number(
              row.commission_rate ??
                0,
            ),

          commission_amount:
            Number(
              row.commission_amount ??
                0,
            ),

          net_owner_amount:
            Number(
              row.net_owner_amount ??
                0,
            ),

          settled_amount:
            Number(
              row.settled_amount ??
                0,
            ),
        }),
      ) as OwnerRevenue[];
    },

    staleTime: 30_000,
  });
}

// ============================================================
// SETTLEMENTS
// ============================================================

export function useMyOwnerSettlements() {
  return useQuery({
    queryKey: [
      "owner-portal",
      "settlements",
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_my_owner_settlements",
        );

      if (error) {
        console.error(
          "[OwnerPortal] Reversements :",
          error,
        );

        throw error;
      }

      return (
        data ??
        []
      ).map(
        (
          row: any,
        ) => ({
          ...row,

          amount:
            Number(
              row.amount ??
                0,
            ),
        }),
      ) as OwnerSettlement[];
    },

    staleTime: 30_000,
  });
}

// ============================================================
// STATEMENTS
// ============================================================

export function useMyOwnerStatements() {
  return useQuery({
    queryKey: [
      "owner-portal",
      "statements",
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_my_owner_statements",
        );

      if (error) {
        console.error(
          "[OwnerPortal] Relevés :",
          error,
        );

        throw error;
      }

      return (
        data ??
        []
      ).map(
        (
          row: any,
        ) => ({
          ...row,

          opening_balance:
            Number(
              row.opening_balance ??
                0,
            ),

          gross_collected:
            Number(
              row.gross_collected ??
                0,
            ),

          commission_amount:
            Number(
              row.commission_amount ??
                0,
            ),

          net_owner_amount:
            Number(
              row.net_owner_amount ??
                0,
            ),

          settlements_amount:
            Number(
              row.settlements_amount ??
                0,
            ),

          closing_balance:
            Number(
              row.closing_balance ??
                0,
            ),
        }),
      ) as OwnerStatement[];
    },

    staleTime: 30_000,
  });
}

// ============================================================
// MANDATES
// ============================================================

export function useMyOwnerMandates() {
  return useQuery({
    queryKey: [
      "owner-portal",
      "mandates",
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "mandates",
          )
          .select(`
            id,
            organization_id,
            owner_id,
            reference,
            mandate_type,
            exclusive,
            start_date,
            end_date,
            commission_rate,
            commission_fixed,
            conditions,
            document_url,
            status,
            created_at,
            updated_at
          `)
          .order(
            "start_date",
            {
              ascending: false,
            },
          );

      if (error) {
        console.error(
          "[OwnerPortal] Mandats :",
          error,
        );

        throw error;
      }

      return (
        data ??
        []
      ).map(
        (
          row: any,
        ) => ({
          ...row,

          commission_rate:
            row.commission_rate ===
            null
              ? null
              : Number(
                  row.commission_rate,
                ),

          commission_fixed:
            row.commission_fixed ===
            null
              ? null
              : Number(
                  row.commission_fixed,
                ),
        }),
      ) as OwnerMandate[];
    },

    staleTime: 30_000,
  });
}