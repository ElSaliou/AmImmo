import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

const KEY = "mandates";

export type MandateInsert = TablesInsert<"mandates">;
export type MandateUpdate = TablesUpdate<"mandates">;

export const useMandates = (ownerId?: string) =>
  useQuery({
    queryKey: [KEY, ownerId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("mandates")
        .select("*, owner:owners(id, full_name, kind), properties:mandate_properties(property_id, property:properties(id, title, reference))")
        .order("created_at", { ascending: false });
      if (ownerId) q = q.eq("owner_id", ownerId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useMandate = (id?: string) =>
  useQuery({
    queryKey: [KEY, "one", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mandates")
        .select("*, properties:mandate_properties(property_id)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

export const useCreateMandate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyIds = [], ...input }: MandateInsert & { propertyIds?: string[] }) => {
      const { data, error } = await supabase.from("mandates").insert(input).select().single();
      if (error) throw error;
      if (propertyIds.length) {
        const { error: e2 } = await supabase
          .from("mandate_properties")
          .insert(propertyIds.map((property_id) => ({ mandate_id: data.id, property_id })));
        if (e2) throw e2;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useUpdateMandate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, propertyIds, ...updates }: MandateUpdate & { id: string; propertyIds?: string[] }) => {
      const { data, error } = await supabase.from("mandates").update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (propertyIds) {
        const { error: eDel } = await supabase.from("mandate_properties").delete().eq("mandate_id", id);
        if (eDel) throw eDel;
        if (propertyIds.length) {
          const { error: eIns } = await supabase
            .from("mandate_properties")
            .insert(propertyIds.map((property_id) => ({ mandate_id: id, property_id })));
          if (eIns) throw eIns;
        }
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useDeleteMandate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mandates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
