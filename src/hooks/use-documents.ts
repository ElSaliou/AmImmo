import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DocumentInsert } from "@/types/real-estate";

const KEY = "documents";

export const useDocuments = (entityType?: string, entityId?: string) =>
  useQuery({
    queryKey: [KEY, entityType, entityId],
    queryFn: async () => {
      let q = supabase.from("documents").select("*").order("uploaded_at", { ascending: false });
      if (entityType) q = q.eq("entity_type", entityType);
      if (entityId) q = q.eq("entity_id", entityId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useCreateDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DocumentInsert) => {
      const { data, error } = await supabase.from("documents").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useDeleteDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
