import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const MANAGEMENT_TERMS_KEY =
  "short-rental-management-terms";

export type ShortRentalPricingModel =
  | "commission"
  | "fixed_fee"
  | "commission_plus_fixed"
  | "per_booking"
  | "custom";

export interface ShortRentalManagementTerm {
  id: string;

  property_id: string;
  owner_id: string | null;

  pricing_model: ShortRentalPricingModel;

  commission_rate: number | null;
  fixed_monthly_fee: number | null;
  fee_per_booking: number | null;

  currency: string;

  effective_from: string;
  effective_to: string | null;

  active: boolean;

  notes: string;

  created_at: string;
  updated_at: string;
}

export interface ShortRentalManagementTermInput {
  property_id: string;

  owner_id?: string | null;

  pricing_model: ShortRentalPricingModel;

  commission_rate?: number | null;
  fixed_monthly_fee?: number | null;
  fee_per_booking?: number | null;

  currency?: string;

  effective_from: string;
  effective_to?: string | null;

  active?: boolean;

  notes?: string;
}

/**
 * Toutes les conditions de gestion.
 * Utilisé notamment pour construire la vue globale du module courte durée.
 */
export const useShortRentalManagementTerms = () =>
  useQuery({
    queryKey: [MANAGEMENT_TERMS_KEY],

    queryFn: async () => {
      const { data, error } = await db
        .from("short_rental_management_terms")
        .select("*")
        .order("effective_from", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return (data ?? []) as ShortRentalManagementTerm[];
    },
  });

/**
 * Historique complet d'un logement.
 */
export const useShortRentalManagementTermsByProperty = (
  propertyId?: string,
) =>
  useQuery({
    queryKey: [
      MANAGEMENT_TERMS_KEY,
      "property",
      propertyId,
    ],

    enabled: Boolean(propertyId),

    queryFn: async () => {
      if (!propertyId) {
        return [];
      }

      const { data, error } = await db
        .from("short_rental_management_terms")
        .select("*")
        .eq("property_id", propertyId)
        .order("effective_from", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return (data ?? []) as ShortRentalManagementTerm[];
    },
  });

/**
 * Condition actuellement marquée active pour un logement.
 *
 * L'index SQL partiel garantit qu'il ne peut y avoir
 * qu'une seule ligne active par property_id.
 */
export const useActiveShortRentalManagementTerm = (
  propertyId?: string,
) =>
  useQuery({
    queryKey: [
      MANAGEMENT_TERMS_KEY,
      "active",
      propertyId,
    ],

    enabled: Boolean(propertyId),

    queryFn: async () => {
      if (!propertyId) {
        return null;
      }

      const { data, error } = await db
        .from("short_rental_management_terms")
        .select("*")
        .eq("property_id", propertyId)
        .eq("active", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as ShortRentalManagementTerm | null;
    },
  });

export const useCreateShortRentalManagementTerm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ShortRentalManagementTermInput,
    ) => {
      const { data, error } = await db
        .from("short_rental_management_terms")
        .insert(input)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return data as ShortRentalManagementTerm;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MANAGEMENT_TERMS_KEY],
      });
    },
  });
};

export const useUpdateShortRentalManagementTerm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ShortRentalManagementTermInput> & {
      id: string;
    }) => {
      const { data, error } = await db
        .from("short_rental_management_terms")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return data as ShortRentalManagementTerm;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MANAGEMENT_TERMS_KEY],
      });
    },
  });
};