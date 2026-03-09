import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadInsert, LeadUpdate } from "@/types/real-estate";

const KEY = "leads";

export const useLeads = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, property:properties(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

/** Public-facing lead creation — no .select() since anon has no SELECT permission */
export const useCreateLeadPublic = () =>
  useMutation({
    mutationFn: async (input: LeadInsert) => {
      const { error } = await supabase.from("leads").insert(input);
      if (error) throw error;
    },
  });

/** Staff lead creation with returned data */
export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeadInsert) => {
      const { data, error } = await supabase.from("leads").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useUpdateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase.from("leads").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
