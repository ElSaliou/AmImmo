import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OwnerInsert, OwnerUpdate } from "@/types/real-estate";

const KEY = "owners";

export const useOwners = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from("owners").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

export const useCreateOwner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OwnerInsert) => {
      const { data, error } = await supabase.from("owners").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useUpdateOwner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: OwnerUpdate & { id: string }) => {
      const { data, error } = await supabase.from("owners").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useDeleteOwner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("owners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useOwner = (id?: string) =>
  useQuery({
    queryKey: [KEY, "one", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("owners").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

export const useOwnerProperties = (ownerId?: string) =>
  useQuery({
    queryKey: [KEY, "properties", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, reference, city, district, status, listing_type, price, currency, published")
        .eq("owner_id", ownerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
