import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "property-videos";

export interface PropertyVideo {
  id: string;
  property_id: string;
  url: string;
  title: string;
  video_type: "standard" | "tour_360";
  position: number;
  created_at: string;
}

export const usePropertyVideos = (propertyId: string) =>
  useQuery({
    queryKey: [KEY, propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_videos" as any)
        .select("*")
        .eq("property_id", propertyId)
        .order("position");
      if (error) throw error;
      return data as unknown as PropertyVideo[];
    },
    enabled: !!propertyId,
  });

export const useUploadPropertyVideo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      propertyId,
      file,
      position,
      videoType = "standard",
      title = "",
    }: {
      propertyId: string;
      file: File;
      position: number;
      videoType?: "standard" | "tour_360";
      title?: string;
    }) => {
      const ext = file.name.split(".").pop();
      const path = `${propertyId}/videos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("property-images")
        .getPublicUrl(path);

      const { data, error } = await supabase
        .from("property_videos" as any)
        .insert({
          property_id: propertyId,
          url: urlData.publicUrl,
          title,
          video_type: videoType,
          position,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PropertyVideo;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: [KEY, data.property_id] }),
  });
};

export const useDeletePropertyVideo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      propertyId,
    }: {
      id: string;
      propertyId: string;
    }) => {
      const { error } = await supabase
        .from("property_videos" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { propertyId };
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: [KEY, data.propertyId] }),
  });
};
