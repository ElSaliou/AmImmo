import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import type {
  LeaseInsert,
  LeaseUpdate,
} from "@/types/real-estate";

const KEY = "leases";

const invalidateRealEstate = (
  qc: ReturnType<typeof useQueryClient>,
) => {
  qc.invalidateQueries({
    queryKey: [KEY],
  });

  qc.invalidateQueries({
    queryKey: ["properties"],
  });

  qc.invalidateQueries({
    queryKey: ["marketplace"],
  });

  qc.invalidateQueries({
    queryKey: ["tenants"],
  });

  qc.invalidateQueries({
    queryKey: ["leads"],
  });
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
        .insert(input)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    onSuccess: () => {
      invalidateRealEstate(qc);
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
    }: LeaseUpdate & {
      id: string;
    }) => {
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

    onSuccess: () => {
      invalidateRealEstate(qc);
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

    onSuccess: () => {
      invalidateRealEstate(qc);
    },
  });
};