import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TenantInsert, TenantUpdate } from "@/types/real-estate";

const KEY = "tenants";

export const useTenants = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

export const useCreateTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TenantInsert) => {
      const { data, error } = await supabase.from("tenants").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useUpdateTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TenantUpdate & { id: string }) => {
      const { data, error } = await supabase.from("tenants").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useDeleteTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
