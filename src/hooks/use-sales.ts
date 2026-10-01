import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

const BUYERS_KEY =
  "buyers";

const SALES_KEY =
  "sales";

const SALE_HISTORY_KEY =
  "sale_status_history";

// ============================================================
// TYPES
// ============================================================

export type SaleStatus =
  | "prospect"
  | "visit"
  | "offer"
  | "negotiation"
  | "reservation"
  | "sold"
  | "closed"
  | "cancelled";

export interface Buyer {
  id: string;

  full_name: string;

  email: string | null;
  phone: string | null;

  id_number: string | null;

  address: string;

  profession: string | null;

  notes: string;

  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;

  organization_id:
    string | null;

  property_id:
    string;

  owner_id:
    string | null;

  lead_id:
    string | null;

  buyer_id:
    string | null;

  reference:
    string;

  buyer_name:
    string;

  buyer_phone:
    string;

  buyer_email:
    string;

  asking_price:
    number;

  offered_price:
    number;

  agreed_price:
    number;

  commission_rate:
    number;

  commission_amount:
    number;

  currency:
    string;

  status:
    SaleStatus;

  closed_at:
    string | null;

  notes:
    string;

  created_at:
    string;

  updated_at:
    string;

  property?: {
    id: string;

    title: string;

    price: number;

    currency: string;

    status: string;

    listing_type: string;

    owner_id:
      string | null;

    city?: string | null;

    commune?: string | null;

    district?: string | null;

    reference?: string | null;
  } | null;

  buyer?: {
    id: string;

    full_name: string;

    email: string | null;

    phone: string | null;

    id_number?: string | null;

    address?: string;

    profession?: string | null;
  } | null;

  owner?: {
    id: string;

    full_name: string;

    email?: string | null;

    phone?: string | null;
  } | null;

  lead?: {
    id: string;

    full_name: string;

    email?: string | null;

    phone?: string | null;
  } | null;
}

export interface SaleStatusHistory {
  id: string;

  sale_id: string;

  old_status:
    SaleStatus | null;

  new_status:
    SaleStatus;

  note:
    string;

  changed_by:
    string | null;

  created_at:
    string;
}

export interface ConvertLeadToBuyerResult {
  success: boolean;

  already_converted:
    boolean;

  lead_id:
    string;

  buyer_id:
    string;

  property_id:
    string;

  property_status?:
    string;

  next_step?:
    string;
}

export interface SaleInsert {
  property_id:
    string;

  buyer_id:
    string;

  owner_id?:
    string | null;

  lead_id?:
    string | null;

  reference:
    string;

  buyer_name:
    string;

  buyer_phone?:
    string;

  buyer_email?:
    string;

  asking_price?:
    number;

  offered_price?:
    number;

  agreed_price?:
    number;

  commission_rate?:
    number;

  commission_amount?:
    number;

  currency?:
    string;

  status?:
    SaleStatus;

  closed_at?:
    string | null;

  notes?:
    string;
}

export interface SaleUpdate {
  asking_price?:
    number;

  offered_price?:
    number;

  agreed_price?:
    number;

  commission_rate?:
    number;

  commission_amount?:
    number;

  owner_id?:
    string | null;

  buyer_id?:
    string | null;

  buyer_name?:
    string;

  buyer_phone?:
    string;

  buyer_email?:
    string;

  notes?:
    string;

  status?:
    SaleStatus;

  closed_at?:
    string | null;
}

// ============================================================
// HELPERS
// ============================================================

const invalidateSales = (
  qc: ReturnType<
    typeof useQueryClient
  >,
) => {
  qc.invalidateQueries({
    queryKey: [
      SALES_KEY,
    ],
  });

  qc.invalidateQueries({
    queryKey: [
      BUYERS_KEY,
    ],
  });

  qc.invalidateQueries({
    queryKey: [
      SALE_HISTORY_KEY,
    ],
  });

  qc.invalidateQueries({
    queryKey: [
      "properties",
    ],
  });

  qc.invalidateQueries({
    queryKey: [
      "marketplace",
    ],
  });

  qc.invalidateQueries({
    queryKey: [
      "leads",
    ],
  });

  qc.invalidateQueries({
    queryKey: [
      "lead_activities",
    ],
  });
};

// ============================================================
// BUYERS
// ============================================================

export const useBuyers =
  () =>
    useQuery({
      queryKey: [
        BUYERS_KEY,
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "buyers",
            )
            .select("*")
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
          ) as Buyer[];
        },
    });

// ============================================================
// LISTE DES VENTES
// ============================================================

export const useSales =
  () =>
    useQuery({
      queryKey: [
        SALES_KEY,
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "sales",
            )
            .select(`
              *,
              property:properties(
                id,
                title,
                reference,
                price,
                currency,
                status,
                listing_type,
                owner_id,
                city,
                commune,
                district
              ),
              buyer:buyers(
                id,
                full_name,
                email,
                phone,
                id_number,
                address,
                profession
              ),
              owner:owners(
                id,
                full_name,
                email,
                phone
              ),
              lead:leads(
                id,
                full_name,
                email,
                phone
              )
            `)
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
          ) as Sale[];
        },
    });

// ============================================================
// DETAIL D'UNE VENTE
// ============================================================

export const useSale =
  (
    saleId:
      string | null,
  ) =>
    useQuery({
      queryKey: [
        SALES_KEY,
        saleId,
      ],

      enabled:
        Boolean(
          saleId,
        ),

      queryFn:
        async () => {
          if (!saleId) {
            return null;
          }

          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "sales",
            )
            .select(`
              *,
              property:properties(
                id,
                title,
                reference,
                price,
                currency,
                status,
                listing_type,
                owner_id,
                city,
                commune,
                district
              ),
              buyer:buyers(
                id,
                full_name,
                email,
                phone,
                id_number,
                address,
                profession
              ),
              owner:owners(
                id,
                full_name,
                email,
                phone
              ),
              lead:leads(
                id,
                full_name,
                email,
                phone
              )
            `)
            .eq(
              "id",
              saleId,
            )
            .single();

          if (error) {
            throw error;
          }

          return data as Sale;
        },
    });

// ============================================================
// HISTORIQUE DES STATUTS
// ============================================================

export const useSaleStatusHistory =
  (
    saleId:
      string | null,
  ) =>
    useQuery({
      queryKey: [
        SALE_HISTORY_KEY,
        saleId,
      ],

      enabled:
        Boolean(
          saleId,
        ),

      queryFn:
        async () => {
          if (!saleId) {
            return [];
          }

          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "sale_status_history",
            )
            .select(`
              id,
              sale_id,
              old_status,
              new_status,
              note,
              changed_by,
              created_at
            `)
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

          if (error) {
            throw error;
          }

          return (
            data ?? []
          ) as SaleStatusHistory[];
        },
    });

// ============================================================
// CONVERSION PROSPECT -> ACQUEREUR
// ============================================================

export const useConvertLeadToBuyer =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          leadId:
            string,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "convert_lead_to_buyer",
            {
              p_lead_id:
                leadId,
            },
          );

          if (error) {
            throw error;
          }

          if (
            !data?.success
          ) {
            throw new Error(
              "La conversion en acquéreur a échoué.",
            );
          }

          return data as ConvertLeadToBuyerResult;
        },

      onSuccess:
        (
          data,
        ) => {
          invalidateSales(
            qc,
          );

          qc.invalidateQueries({
            queryKey: [
              "leads",
              data.lead_id,
            ],
          });
        },
    });
  };

// ============================================================
// CREATION D'UNE VENTE
// ============================================================

export const useCreateSale =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            SaleInsert,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "sales",
            )
            .insert({
              ...input,

              buyer_phone:
                input.buyer_phone ??
                "",

              buyer_email:
                input.buyer_email ??
                "",

              asking_price:
                input.asking_price ??
                0,

              offered_price:
                input.offered_price ??
                0,

              agreed_price:
                input.agreed_price ??
                0,

              commission_rate:
                input.commission_rate ??
                0,

              commission_amount:
                input.commission_amount ??
                0,

              currency:
                input.currency ??
                "GNF",

              status:
                input.status ??
                "prospect",

              notes:
                input.notes ??
                "",
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          return data as Sale;
        },

      onSuccess:
        () => {
          invalidateSales(
            qc,
          );
        },
    });
  };

// ============================================================
// MODIFICATION D'UNE VENTE
// ============================================================

export const useUpdateSale =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async ({
          id,
          ...updates
        }: SaleUpdate & {
          id: string;
        }) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "sales",
            )
            .update({
              ...updates,

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              id,
            )
            .select()
            .single();

          if (error) {
            throw error;
          }

          return data as Sale;
        },

      onSuccess:
        (
          data,
        ) => {
          invalidateSales(
            qc,
          );

          qc.invalidateQueries({
            queryKey: [
              SALES_KEY,
              data.id,
            ],
          });

          qc.invalidateQueries({
            queryKey: [
              SALE_HISTORY_KEY,
              data.id,
            ],
          });
        },
    });
  };

// ============================================================
// SUPPRESSION
// ============================================================

export const useDeleteSale =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          id:
            string,
        ) => {
          /*
           * Sécurité frontend supplémentaire :
           * on récupère d'abord le statut.
           */
          const {
            data:
              sale,
            error:
              saleError,
          } = await (
            supabase as any
          )
            .from(
              "sales",
            )
            .select(
              "id, status",
            )
            .eq(
              "id",
              id,
            )
            .single();

          if (
            saleError
          ) {
            throw saleError;
          }

          if (
            [
              "sold",
              "closed",
              "cancelled",
            ].includes(
              sale.status,
            )
          ) {
            throw new Error(
              "Une transaction finalisée ou annulée ne peut pas être supprimée.",
            );
          }

          const {
            error,
          } = await (
            supabase as any
          )
            .from(
              "sales",
            )
            .delete()
            .eq(
              "id",
              id,
            );

          if (error) {
            throw error;
          }
        },

      onSuccess:
        () => {
          invalidateSales(
            qc,
          );
        },
    });
  };