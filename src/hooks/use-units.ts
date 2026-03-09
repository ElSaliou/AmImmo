import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UnitInsert } from "@/types/real-estate";

const KEY = "units";

export const useUnits = (buildingId?: string) =>
  useQuery({
    queryKey: [KEY, buildingId],
    queryFn: async () => {
      let q = supabase.from("units").select("*, building:buildings(name)").order("label");
      if (buildingId) q = q.eq("building_id", buildingId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useCreateUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UnitInsert) => {
      const { data, error } = await supabase.from("units").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useDeleteUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
