import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "property-images";

export const usePropertyImages = (propertyId: string) =>
  useQuery({
    queryKey: [KEY, propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

export const useUploadPropertyImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, file, position }: { propertyId: string; file: File; position: number }) => {
      const ext = file.name.split(".").pop();
      const path = `${propertyId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("property-images").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(path);

      const { data, error } = await supabase
        .from("property_images")
        .insert({ property_id: propertyId, url: urlData.publicUrl, position })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [KEY, data.property_id] }),
  });
};

export const useDeletePropertyImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { error } = await supabase.from("property_images").delete().eq("id", id);
      if (error) throw error;
      return { propertyId };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: [KEY, data.propertyId] }),
  });
};
