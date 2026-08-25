import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ListingType, PropertyType } from "@/types/real-estate";

const KEY = "marketplace";

export interface MarketplaceFilters {
  listing_type?: ListingType;
  property_type?: PropertyType;
  city?: string;
  commune?: string;
  featured?: boolean;
  limit?: number;
}

export const useMarketplaceListings = (filters?: MarketplaceFilters) =>
  useQuery({
    queryKey: [KEY, filters],
    queryFn: async () => {
      let q = supabase.from("marketplace_listings").select("*").order("published_at", { ascending: false });
      if (filters?.listing_type) q = q.eq("listing_type", filters.listing_type);
      if (filters?.property_type) q = q.eq("property_type", filters.property_type);
      if (filters?.city) q = q.eq("city", filters.city);
      if (filters?.commune) q = q.eq("commune", filters.commune);
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

/** Biens similaires : même type d'offre, priorité à la même commune / type de bien */
export const useSimilarListings = (params: {
  propertyId?: string;
  listingType?: ListingType;
  propertyType?: PropertyType;
  commune?: string;
  city?: string;
  limit?: number;
}) =>
  useQuery({
    queryKey: [KEY, "similar", params],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("listing_type", params.listingType!)
        .neq("property_id", params.propertyId!)
        .limit(24);
      if (error) throw error;
      const scored = (data ?? []).map((l) => {
        let score = 0;
        if (params.commune && l.commune === params.commune) score += 3;
        if (params.propertyType && l.property_type === params.propertyType) score += 2;
        if (params.city && l.city === params.city) score += 1;
        return { listing: l, score };
      });
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, params.limit ?? 3)
        .map((s) => s.listing);
    },
    enabled: !!params.listingType && !!params.propertyId,
  });

/** Listings ciblés par identifiants de biens (utilisé par les favoris) */
export const useListingsByPropertyIds = (propertyIds: string[]) =>
  useQuery({
    queryKey: [KEY, "byIds", [...propertyIds].sort()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .in("property_id", propertyIds);
      if (error) throw error;
      return data;
    },
    enabled: propertyIds.length > 0,
  });
