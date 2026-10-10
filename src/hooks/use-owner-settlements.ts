import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface OwnerSettlementKpis {
  gross_collected: number;
  commission_amount: number;
  net_owner_amount: number;
  settled_amount: number;
  balance_to_settle: number;
  owner_count_to_settle: number;
}

export interface OwnerRentBalance {
  owner_id: string;
  owner_name: string;

  owner_phone?: string | null;
  owner_email?: string | null;

  currency: string;

  collection_count: number;

  gross_collected: number;
  commission_amount: number;
  net_owner_amount: number;
  settled_amount: number;
  balance_to_settle: number;
}

export interface OwnerRentLedger {
  ledger_id: string;

  owner_id: string;
  owner_name: string;

  property_id?: string | null;
  property_title?: string | null;

  lease_id?: string | null;
  lease_reference?: string | null;

  invoice_id: string;
  invoice_number: string;

  payment_id: string;
  payment_reference: string;

  collected_at: string;

  currency: string;

  gross_collected: number;

  commission_rate: number;
  commission_amount: number;

  net_owner_amount: number;

  settled_amount: number;
  balance_to_settle: number;

  settlement_status:
    | "to_settle"
    | "partially_settled"
    | "settled";

  commission_accounting_entry_id?: string | null;

  created_at: string;
}

export interface OwnerSettlement {
  settlement_id: string;

  reference: string;

  owner_id: string;
  owner_name: string;

  amount: number;
  currency: string;

  settlement_date: string;

  status: string;

  external_reference?: string | null;

  notes?: string | null;

  treasury_account_id: string;

  treasury_code?: string | null;
  treasury_name?: string | null;

  accounting_entry_id?: string | null;
  treasury_movement_id?: string | null;

  created_at: string;
}

export interface OwnerSettlementAllocation {
  allocation_id: string;

  settlement_id: string;
  ledger_id: string;

  allocated_amount: number;

  owner_id: string | null;
  owner_name: string | null;

  property_id: string | null;
  property_title: string | null;

  invoice_id: string | null;
  invoice_number: string | null;

  payment_id: string | null;
  payment_reference: string | null;

  collected_at: string | null;

    ledger_created_at: string | null;

currency: string;

  gross_collected: number;
  commission_amount: number;
  net_owner_amount: number;
}

export interface TreasuryAccount {
  id: string;
  code: string;
  name: string;
  account_type: string;
  currency: string;
  active: boolean;
}

export interface RecordOwnerSettlementInput {
  ownerId: string;
  amount: number;
  treasuryAccountId: string;

  paidAt?: string;

  reference?: string;
  notes?: string;
}

const numberValue = (value: unknown) => {
  const result = Number(value ?? 0);

  return Number.isFinite(result)
    ? result
    : 0;
};

export function useOwnerSettlementKpis() {
  return useQuery({
    queryKey: ["owner-settlements-kpis"],

    queryFn: async (): Promise<OwnerSettlementKpis> => {
      const { data, error } = await (supabase as any)
        .from("owner_settlements_kpis")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      return {
        gross_collected:
          numberValue(data?.gross_collected),

        commission_amount:
          numberValue(data?.commission_amount),

        net_owner_amount:
          numberValue(data?.net_owner_amount),

        settled_amount:
          numberValue(data?.settled_amount),

        balance_to_settle:
          numberValue(data?.balance_to_settle),

        owner_count_to_settle:
          numberValue(data?.owner_count_to_settle),
      };
    },

    staleTime: 15_000,
  });
}

export function useOwnerRentBalances() {
  return useQuery({
    queryKey: ["owner-rent-balances"],

    queryFn: async (): Promise<OwnerRentBalance[]> => {
      const { data, error } = await (supabase as any)
        .from("owner_rent_balances")
        .select("*")
        .order(
          "balance_to_settle",
          { ascending: false }
        );

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,

        collection_count:
          numberValue(row.collection_count),

        gross_collected:
          numberValue(row.gross_collected),

        commission_amount:
          numberValue(row.commission_amount),

        net_owner_amount:
          numberValue(row.net_owner_amount),

        settled_amount:
          numberValue(row.settled_amount),

        balance_to_settle:
          numberValue(row.balance_to_settle),
      }));
    },

    staleTime: 15_000,
  });
}

export function useOwnerRentLedger() {
  return useQuery({
    queryKey: ["owner-rent-ledger"],

    queryFn: async (): Promise<OwnerRentLedger[]> => {
      const { data, error } = await (supabase as any)
        .from("owner_rent_ledger_view")
        .select("*")
        .order(
          "collected_at",
          { ascending: false }
        );

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,

        gross_collected:
          numberValue(row.gross_collected),

        commission_rate:
          numberValue(row.commission_rate),

        commission_amount:
          numberValue(row.commission_amount),

        net_owner_amount:
          numberValue(row.net_owner_amount),

        settled_amount:
          numberValue(row.settled_amount),

        balance_to_settle:
          numberValue(row.balance_to_settle),
      }));
    },

    staleTime: 15_000,
  });
}

export function useOwnerSettlements() {
  return useQuery({
    queryKey: ["owner-settlements"],

    queryFn: async (): Promise<OwnerSettlement[]> => {
      const { data, error } = await (supabase as any)
        .from("owner_settlements_view")
        .select("*")
        .order(
          "settlement_date",
          { ascending: false }
        );

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,

        amount:
          numberValue(row.amount),
      }));
    },

    staleTime: 15_000,
  });
}

export function useOwnerSettlementAllocations(
  settlementId?: string | null
) {
  return useQuery({
    queryKey: [
      "owner-settlement-allocations",
      settlementId,
    ],

    enabled: Boolean(settlementId),

    queryFn: async (): Promise<
      OwnerSettlementAllocation[]
    > => {
      if (!settlementId) {
        return [];
      }

      const {
        data: itemRows,
        error: itemsError,
      } = await (supabase as any)
        .from("owner_settlement_items")
        .select(
          `
          id,
          settlement_id,
          ledger_id,
          amount
          `
        )
        .eq(
          "settlement_id",
          settlementId
        );

      if (itemsError) {
        throw itemsError;
      }

      if (!itemRows?.length) {
        return [];
      }

      const ledgerIds = Array.from(
        new Set(
          itemRows.map(
            (row: any) =>
              row.ledger_id
          )
        )
      );

      const {
        data: ledgerRows,
        error: ledgerError,
      } = await (supabase as any)
        .from("owner_rent_ledger_view")
        .select(
          `
          ledger_id,
          owner_id,
          owner_name,
          property_id,
          property_title,
          invoice_id,
          invoice_number,
          payment_id,
          payment_reference,
          collected_at,
          currency,
          gross_collected,
          commission_amount,
          net_owner_amount,
          created_at
          `
        )
        .in(
          "ledger_id",
          ledgerIds
        );

      if (ledgerError) {
        throw ledgerError;
      }

      const ledgerById =
        new Map<string, any>(
          (ledgerRows ?? []).map(
            (row: any) => [
              row.ledger_id,
              row,
            ]
          )
        );

      return itemRows
        .map(
          (
            item: any
          ): OwnerSettlementAllocation => {
            const ledger =
              ledgerById.get(
                item.ledger_id
              ) ?? null;

            return {
              allocation_id:
                item.id,

              settlement_id:
                item.settlement_id,

              ledger_id:
                item.ledger_id,

              allocated_amount:
                numberValue(
                  item.amount
                ),

              owner_id:
                ledger?.owner_id ??
                null,

              owner_name:
                ledger?.owner_name ??
                null,

              property_id:
                ledger?.property_id ??
                null,

              property_title:
                ledger?.property_title ??
                null,

              invoice_id:
                ledger?.invoice_id ??
                null,

              invoice_number:
                ledger?.invoice_number ??
                null,

              payment_id:
                ledger?.payment_id ??
                null,

              payment_reference:
                ledger?.payment_reference ??
                null,

              collected_at:
                ledger?.collected_at ??
                null,

              ledger_created_at:
                ledger?.created_at ??
                null,

              currency:
                ledger?.currency ??
                "GNF",

              gross_collected:
                numberValue(
                  ledger?.gross_collected
                ),

              commission_amount:
                numberValue(
                  ledger?.commission_amount
                ),

              net_owner_amount:
                numberValue(
                  ledger?.net_owner_amount
                ),
            };
          }
        )
        .sort(
          (
            a,
            b
          ) => {
            const aTime =
              a.collected_at
                ? new Date(
                    a.collected_at
                  ).getTime()
                : 0;

            const bTime =
              b.collected_at
                ? new Date(
                    b.collected_at
                  ).getTime()
                : 0;

            if (aTime !== bTime) {
              return aTime - bTime;
            }

            const aCreatedTime =
              a.ledger_created_at
                ? new Date(
                    a.ledger_created_at
                  ).getTime()
                : 0;

            const bCreatedTime =
              b.ledger_created_at
                ? new Date(
                    b.ledger_created_at
                  ).getTime()
                : 0;

            return (
              aCreatedTime -
              bCreatedTime
            );
          }
        );
    },

    staleTime: 15_000,
  });
}

export function useOwnerTreasuryAccounts() {
  return useQuery({
    queryKey: ["owner-settlement-treasury-accounts"],

    queryFn: async (): Promise<TreasuryAccount[]> => {
      const { data, error } = await (supabase as any)
        .from("treasury_accounts")
        .select(
          `
          id,
          code,
          name,
          account_type,
          currency,
          active
          `
        )
        .eq("active", true)
        .order("name");

      if (error) throw error;

      return data ?? [];
    },

    staleTime: 30_000,
  });
}

export function useRecordOwnerSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: RecordOwnerSettlementInput
    ) => {
      const { data, error } = await (supabase as any)
        .rpc(
          "record_owner_settlement",
          {
            p_owner_id:
              input.ownerId,

            p_amount:
              input.amount,

            p_treasury_account_id:
              input.treasuryAccountId,

            p_paid_at:
              input.paidAt ??
              new Date().toISOString(),

            p_reference:
              input.reference?.trim() ||
              null,

            p_notes:
              input.notes?.trim() ||
              "",
          }
        );

      if (error) throw error;

      return data as string;
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "owner-settlements-kpis",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "owner-rent-balances",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "owner-rent-ledger",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "owner-settlements",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "treasury-account-balances",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "treasury-journal",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "finance-report",
          ],
        }),
      ]);
    },
  });
}