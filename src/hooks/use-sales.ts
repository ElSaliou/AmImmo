import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const BUYERS_KEY = "buyers";
const SALES_KEY = "sales_transactions";

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

export interface SaleTransaction {
  id: string;
  property_id: string;
  buyer_id: string | null;
  lead_id: string | null;
  owner_id: string | null;
  reference: string | null;
  sale_price: number;
  currency: string;
  status:
    | "draft"
    | "reserved"
    | "completed"
    | "cancelled";
  reservation_date: string | null;
  agreement_date: string | null;
  completed_at: string | null;
  payment_method: string | null;
  document_url: string | null;
  notes: string;
  created_at: string;
  updated_at: string;

  property?: {
    id: string;
    title: string;
    price: number;
    currency: string;
    status: string;
    owner_id: string | null;
  } | null;

  buyer?: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;

  owner?: {
    id: string;
    full_name: string;
  } | null;

  lead?: {
    id: string;
    full_name: string;
  } | null;
}

export interface ConvertLeadToBuyerResult {
  success: boolean;
  already_converted: boolean;
  lead_id: string;
  buyer_id: string;
  property_id: string;
  property_status?: string;
  next_step?: string;
}

export interface SaleInsert {
  property_id: string;
  buyer_id: string;
  lead_id?: string | null;
  owner_id?: string | null;
  reference?: string | null;
  sale_price: number;
  currency: string;
  status?: "draft" | "reserved";
  reservation_date?: string | null;
  agreement_date?: string | null;
  payment_method?: string | null;
  notes?: string;
}

const invalidateSales = (
  qc: ReturnType<typeof useQueryClient>,
) => {
  qc.invalidateQueries({
    queryKey: [SALES_KEY],
  });

  qc.invalidateQueries({
    queryKey: [BUYERS_KEY],
  });

  qc.invalidateQueries({
    queryKey: ["properties"],
  });

  qc.invalidateQueries({
    queryKey: ["marketplace"],
  });

  qc.invalidateQueries({
    queryKey: ["leads"],
  });

  qc.invalidateQueries({
    queryKey: ["lead_activities"],
  });
};

export const useBuyers = () =>
  useQuery({
    queryKey: [BUYERS_KEY],

    queryFn: async () => {
      const { data, error } = await (
        supabase as any
      )
        .from("buyers")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      return (data ?? []) as Buyer[];
    },
  });

export const useSalesTransactions = () =>
  useQuery({
    queryKey: [SALES_KEY],

    queryFn: async () => {
      const { data, error } = await (
        supabase as any
      )
        .from("sales_transactions")
        .select(`
          *,
          property:properties(
            id,
            title,
            price,
            currency,
            status,
            owner_id
          ),
          buyer:buyers(
            id,
            full_name,
            email,
            phone
          ),
          owner:owners(
            id,
            full_name
          ),
          lead:leads(
            id,
            full_name
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      return (data ??
        []) as SaleTransaction[];
    },
  });

export const useConvertLeadToBuyer = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      leadId: string,
    ) => {
      const { data, error } = await (
        supabase as any
      ).rpc(
        "convert_lead_to_buyer",
        {
          p_lead_id: leadId,
        },
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error(
          "La conversion en acquéreur a échoué.",
        );
      }

      return data as ConvertLeadToBuyerResult;
    },

    onSuccess: (
      data,
    ) => {
      invalidateSales(qc);

      qc.invalidateQueries({
        queryKey: [
          "leads",
          data.lead_id,
        ],
      });
    },
  });
};

export const useCreateSaleTransaction =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        input: SaleInsert,
      ) => {
        const {
          data,
          error,
        } = await (
          supabase as any
        )
          .from(
            "sales_transactions",
          )
          .insert({
            ...input,

            status:
              input.status ??
              "draft",

            notes:
              input.notes ??
              "",
          })
          .select()
          .single();

        if (error) throw error;

        return data;
      },

      onSuccess: () =>
        invalidateSales(qc),
    });
  };

export const useUpdateSaleTransaction =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        id,
        ...updates
      }: {
        id: string;
        [key: string]: any;
      }) => {
        const {
          data,
          error,
        } = await (
          supabase as any
        )
          .from(
            "sales_transactions",
          )
          .update({
            ...updates,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        return data;
      },

      onSuccess: () =>
        invalidateSales(qc),
    });
  };

export const useDeleteSaleTransaction =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        id: string,
      ) => {
        const { error } = await (
          supabase as any
        )
          .from(
            "sales_transactions",
          )
          .delete()
          .eq("id", id);

        if (error) throw error;
      },

      onSuccess: () =>
        invalidateSales(qc),
    });
  };
