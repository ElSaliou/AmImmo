import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PropertyInsert, PropertyUpdate, ListingType, PropertyStatus } from "@/types/real-estate";

const PROPERTIES_KEY = "properties";

export const useProperties = (filters?: { listing_type?: ListingType; status?: PropertyStatus }) =>
  useQuery({
    queryKey: [PROPERTIES_KEY, filters],
    queryFn: async () => {
      let q = supabase.from("properties").select("*, owner:owners(full_name), building:buildings(name)").order("created_at", { ascending: false });
      if (filters?.listing_type) q = q.eq("listing_type", filters.listing_type);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useProperty = (id: string) =>
  useQuery({
    queryKey: [PROPERTIES_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, owner:owners(full_name), building:buildings(name), images:property_images(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useCreateProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PropertyInsert) => {
      const { data, error } = await supabase.from("properties").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROPERTIES_KEY] }),
  });
};

export const useUpdateProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyUpdate & { id: string }) => {
      const { data, error } = await supabase.from("properties").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROPERTIES_KEY] }),
  });
};

export const useDeleteProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROPERTIES_KEY] }),
  });
};

export const useTogglePublish = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const updates: PropertyUpdate = {
        published,
        status: published ? "published" : "draft",
        published_at: published ? new Date().toISOString() : null,
      };
      const { data, error } = await supabase.from("properties").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROPERTIES_KEY] }),
  });
};
