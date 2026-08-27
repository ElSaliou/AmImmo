import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import type {
  ListingType,
  PropertyType,
  MarketplaceListing,
} from "@/types/real-estate";

const KEY = "marketplace";

export interface MarketplaceFilters {
  listing_type?: ListingType;
  property_type?: PropertyType;
  city?: string;
  commune?: string;
  featured?: boolean;
  limit?: number;
}

/**
 * Type enrichi utilisé par les cartes publiques.
 *
 * cover_image reste compatible avec MarketplaceListing,
 * mais est complété dynamiquement depuis property_images.
 */
type MarketplaceListingWithCover = MarketplaceListing & {
  cover_image?: string | null;
};

/**
 * Ajoute automatiquement la première photo de chaque bien
 * aux annonces Marketplace.
 *
 * Cela évite de dupliquer la photo dans marketplace_listings.
 */
const enrichListingsWithCoverImages = async <
  T extends MarketplaceListingWithCover,
>(
  listings: T[],
): Promise<T[]> => {
  if (!listings.length) {
    return [];
  }

  const propertyIds = Array.from(
    new Set(
      listings
        .map((listing) => listing.property_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (!propertyIds.length) {
    return listings;
  }

  const { data: images, error } = await supabase
    .from("property_images")
    .select("property_id, url, position")
    .in("property_id", propertyIds)
    .order("position", { ascending: true });

  /**
   * Une erreur sur les images ne doit pas empêcher
   * les annonces de s'afficher.
   */
  if (error) {
    console.warn(
      "[Marketplace] Impossible de récupérer les photos des biens :",
      error,
    );

    return listings;
  }

  /**
   * Première image disponible pour chaque bien.
   */
  const firstImageByProperty = new Map<string, string>();

  for (const image of images ?? []) {
    if (
      image.property_id &&
      image.url &&
      !firstImageByProperty.has(image.property_id)
    ) {
      firstImageByProperty.set(
        image.property_id,
        image.url,
      );
    }
  }

  return listings.map((listing) => ({
    ...listing,

    /**
     * Priorité :
     * 1. cover_image déjà présent
     * 2. première image de property_images
     */
    cover_image:
      listing.cover_image ||
      firstImageByProperty.get(
        listing.property_id,
      ) ||
      null,
  }));
};

/**
 * Liste publique des annonces.
 */
export const useMarketplaceListings = (
  filters?: MarketplaceFilters,
) =>
  useQuery({
    queryKey: [KEY, filters],

    queryFn: async () => {
      let query = supabase
        .from("marketplace_listings")
        .select("*")
        .order("published_at", {
          ascending: false,
        });

      if (filters?.listing_type) {
        query = query.eq(
          "listing_type",
          filters.listing_type,
        );
      }

      if (filters?.property_type) {
        query = query.eq(
          "property_type",
          filters.property_type,
        );
      }

      if (filters?.city) {
        query = query.eq(
          "city",
          filters.city,
        );
      }

      if (filters?.commune) {
        query = query.eq(
          "commune",
          filters.commune,
        );
      }

      if (filters?.featured) {
        query = query.eq(
          "featured",
          true,
        );
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        console.error(
          "[Marketplace] Erreur chargement annonces :",
          error,
        );

        throw error;
      }

      return enrichListingsWithCoverImages(
        (data ?? []) as MarketplaceListingWithCover[],
      );
    },
  });

/**
 * Fiche publique d'une annonce.
 */
export const useMarketplaceListing = (
  slug: string,
) =>
  useQuery({
    queryKey: [
      KEY,
      "slug",
      slug,
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error(
          "[Marketplace] Erreur chargement fiche :",
          error,
        );

        throw error;
      }

      /**
       * Photos + vidéos.
       */
      const [
        {
          data: images,
          error: imagesError,
        },
        {
          data: videos,
          error: videosError,
        },
      ] = await Promise.all([
        supabase
          .from("property_images")
          .select("*")
          .eq(
            "property_id",
            data.property_id,
          )
          .order("position", {
            ascending: true,
          }),

        supabase
          .from("property_videos")
          .select("*")
          .eq(
            "property_id",
            data.property_id,
          )
          .order("position", {
            ascending: true,
          }),
      ]);

      if (imagesError) {
        console.warn(
          "[Marketplace] Photos non récupérées :",
          imagesError,
        );
      }

      if (videosError) {
        console.warn(
          "[Marketplace] Vidéos non récupérées :",
          videosError,
        );
      }

      const sortedImages =
        images ?? [];

      return {
        ...data,

        cover_image:
          data.cover_image ||
          sortedImages[0]?.url ||
          null,

        images: sortedImages,

        videos:
          videos ?? [],
      };
    },

    enabled: Boolean(slug),
  });

/**
 * Biens similaires :
 * même type d'offre,
 * priorité à la même commune puis au même type de bien.
 */
export const useSimilarListings = (
  params: {
    propertyId?: string;
    listingType?: ListingType;
    propertyType?: PropertyType;
    commune?: string;
    city?: string;
    limit?: number;
  },
) =>
  useQuery({
    queryKey: [
      KEY,
      "similar",
      params,
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq(
          "listing_type",
          params.listingType!,
        )
        .neq(
          "property_id",
          params.propertyId!,
        )
        .limit(24);

      if (error) {
        throw error;
      }

      const scored = (
        data ?? []
      ).map((listing) => {
        let score = 0;

        if (
          params.commune &&
          listing.commune ===
            params.commune
        ) {
          score += 3;
        }

        if (
          params.propertyType &&
          listing.property_type ===
            params.propertyType
        ) {
          score += 2;
        }

        if (
          params.city &&
          listing.city ===
            params.city
        ) {
          score += 1;
        }

        return {
          listing,
          score,
        };
      });

      const similar = scored
        .sort(
          (a, b) =>
            b.score - a.score,
        )
        .slice(
          0,
          params.limit ?? 3,
        )
        .map(
          (item) =>
            item.listing,
        );

      return enrichListingsWithCoverImages(
        similar as MarketplaceListingWithCover[],
      );
    },

    enabled:
      Boolean(
        params.listingType,
      ) &&
      Boolean(
        params.propertyId,
      ),
  });

/**
 * Listings utilisés par les favoris.
 */
export const useListingsByPropertyIds = (
  propertyIds: string[],
) =>
  useQuery({
    queryKey: [
      KEY,
      "byIds",
      [...propertyIds].sort(),
    ],

    queryFn: async () => {
      if (
        propertyIds.length ===
        0
      ) {
        return [];
      }

      const {
        data,
        error,
      } = await supabase
        .from("marketplace_listings")
        .select("*")
        .in(
          "property_id",
          propertyIds,
        );

      if (error) {
        throw error;
      }

      return enrichListingsWithCoverImages(
        (data ??
          []) as MarketplaceListingWithCover[],
      );
    },

    enabled:
      propertyIds.length > 0,
  });
