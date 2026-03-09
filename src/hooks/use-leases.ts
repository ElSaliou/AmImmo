import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeaseInsert, LeaseUpdate } from "@/types/real-estate";

const KEY = "leases";

export const useLeases = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("*, property:properties(title), tenant:tenants(full_name), owner:owners(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useCreateLease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeaseInsert) => {
      const { data, error } = await supabase.from("leases").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useUpdateLease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: LeaseUpdate & { id: string }) => {
      const { data, error } = await supabase.from("leases").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useDeleteLease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
