import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadInsert, LeadUpdate, LeadActivityInsert } from "@/types/real-estate";

const KEY = "leads";
const ACTIVITY_KEY = "lead_activities";

export const useLeads = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, property:properties(id, title, city, commune, slug)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useLead = (id?: string) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, property:properties(id, title, city, commune, slug, price, currency)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useLeadActivities = (leadId?: string) =>
  useQuery({
    queryKey: [ACTIVITY_KEY, leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

export const useCreateLeadActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeadActivityInsert) => {
      const { data, error } = await supabase.from("lead_activities").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [ACTIVITY_KEY, vars.lead_id] });
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
};

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

export const useDeleteLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
