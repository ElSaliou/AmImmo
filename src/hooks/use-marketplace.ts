import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ListingType } from "@/types/real-estate";

const KEY = "marketplace";

export const useMarketplaceListings = (filters?: {
  listing_type?: ListingType;
  city?: string;
  featured?: boolean;
  limit?: number;
}) =>
  useQuery({
    queryKey: [KEY, filters],
    queryFn: async () => {
      let q = supabase.from("marketplace_listings").select("*").order("published_at", { ascending: false });
      if (filters?.listing_type) q = q.eq("listing_type", filters.listing_type);
      if (filters?.city) q = q.eq("city", filters.city);
      if (filters?.featured) q = q.eq("featured", true);
      if (filters?.limit) q = q.limit(filters.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useMarketplaceListing = (slug: string) =>
  useQuery({
    queryKey: [KEY, "slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      // Fetch images and videos in parallel
      const [{ data: images }, { data: videos }] = await Promise.all([
        supabase.from("property_images").select("*").eq("property_id", data.property_id).order("position"),
        supabase.from("property_videos").select("*").eq("property_id", data.property_id).order("position"),
      ]);
      return { ...data, images: images ?? [], videos: videos ?? [] };
    },
    enabled: !!slug,
  });
