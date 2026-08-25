import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BuildingInsert, BuildingUpdate } from "@/types/real-estate";

const KEY = "buildings";

export const useBuildings = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("*, owner:owners(id, full_name)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

export const useBuilding = (id?: string) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("*, owner:owners(id, full_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useCreateBuilding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BuildingInsert) => {
      const { data, error } = await supabase.from("buildings").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useUpdateBuilding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: BuildingUpdate & { id: string }) => {
      const { data, error } = await supabase.from("buildings").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useDeleteBuilding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("buildings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
