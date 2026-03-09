import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "maintenance";

export const useMaintenanceRequests = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*, property:properties(title), tenant:tenants(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useCreateMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { property_id: string; tenant_id?: string; title: string; description: string; priority: "low" | "medium" | "high" | "urgent" }) => {
      const { data, error } = await supabase.from("maintenance_requests").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
