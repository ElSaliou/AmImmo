import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VisitInsert, VisitUpdate, VisitStatus } from "@/types/real-estate";

const KEY = "visits";

export const useVisits = (filters?: { status?: VisitStatus; leadId?: string; propertyId?: string }) =>
  useQuery({
    queryKey: [KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from("visits")
        .select("*, property:properties(id, title, city, commune), lead:leads(id, full_name, status)")
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.leadId) q = q.eq("lead_id", filters.leadId);
      if (filters?.propertyId) q = q.eq("property_id", filters.propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useCreateVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VisitInsert) => {
      const { data, error } = await supabase.from("visits").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useUpdateVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: VisitUpdate & { id: string }) => {
      const { data, error } = await supabase.from("visits").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useDeleteVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("visits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
