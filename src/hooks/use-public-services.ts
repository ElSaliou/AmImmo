import {
  useQuery,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

import type {
  Service,
  ServiceCategory,
} from "@/types/real-estate";


const PUBLIC_SERVICES_KEY =
  "public-services";

const PUBLIC_SERVICE_CATEGORIES_KEY =
  "public-service-categories";

const PUBLIC_SERVICES_STALE_TIME =
  60_000;


export type PublicServiceWithCategory =
  Service & {
    category:
      ServiceCategory | null;
  };


const PUBLIC_SERVICE_SELECT = `
  *,
  category:service_categories(
    id,
    name,
    slug,
    description,
    icon,
    display_order,
    is_active,
    created_at,
    updated_at
  )
`;


function isPubliclyVisibleService(
  service:
    PublicServiceWithCategory,
): boolean {
  if (
    service.status !==
      "published" ||
    !service.published_at
  ) {
    return false;
  }

  if (
    service.category_id ===
    null
  ) {
    return true;
  }

  return Boolean(
    service.category &&
      service.category.is_active,
  );
}


// ============================================================
// PUBLIC SERVICE CATEGORIES
// ============================================================

export const usePublicServiceCategories =
  () =>
    useQuery<ServiceCategory[]>({
      queryKey: [
        PUBLIC_SERVICE_CATEGORIES_KEY,
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                "service_categories",
              )
              .select("*")
              .eq(
                "is_active",
                true,
              )
              .order(
                "display_order",
                {
                  ascending:
                    true,
                },
              )
              .order(
                "name",
                {
                  ascending:
                    true,
                },
              );

          if (error) {
            console.error(
              "[usePublicServiceCategories] Erreur de chargement :",
              error,
            );

            throw new Error(
              error.message ||
                "Impossible de charger les catégories de prestations.",
            );
          }

          return data ?? [];
        },

      staleTime:
        PUBLIC_SERVICES_STALE_TIME,
    });


// ============================================================
// PUBLIC SERVICES LIST
// ============================================================

export const usePublicServices =
  () =>
    useQuery<
      PublicServiceWithCategory[]
    >({
      queryKey: [
        PUBLIC_SERVICES_KEY,
        "list",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } =
            await supabase
              .from("services")
              .select(
                PUBLIC_SERVICE_SELECT,
              )
              .eq(
                "status",
                "published",
              )
              .not(
                "published_at",
                "is",
                null,
              )
              .order(
                "display_order",
                {
                  ascending:
                    true,
                },
              )
              .order(
                "published_at",
                {
                  ascending:
                    false,
                },
              );

          if (error) {
            console.error(
              "[usePublicServices] Erreur de chargement :",
              error,
            );

            throw new Error(
              error.message ||
                "Impossible de charger les prestations.",
            );
          }

          return (
            (data ?? []) as
              PublicServiceWithCategory[]
          ).filter(
            isPubliclyVisibleService,
          );
        },

      staleTime:
        PUBLIC_SERVICES_STALE_TIME,
    });


// ============================================================
// PUBLIC SERVICE DETAIL BY SLUG
// ============================================================

export const usePublicServiceBySlug =
  (
    slug?:
      string | null,
  ) =>
    useQuery<
      PublicServiceWithCategory | null
    >({
      queryKey: [
        PUBLIC_SERVICES_KEY,
        "detail",
        slug ?? null,
      ],

      enabled:
        Boolean(
          slug?.trim(),
        ),

      queryFn:
        async () => {
          const normalizedSlug =
            slug?.trim();

          if (!normalizedSlug) {
            throw new Error(
              "Slug de prestation manquant.",
            );
          }

          const {
            data,
            error,
          } =
            await supabase
              .from("services")
              .select(
                PUBLIC_SERVICE_SELECT,
              )
              .eq(
                "slug",
                normalizedSlug,
              )
              .eq(
                "status",
                "published",
              )
              .not(
                "published_at",
                "is",
                null,
              )
              .maybeSingle();

          if (error) {
            console.error(
              "[usePublicServiceBySlug] Erreur de chargement :",
              error,
            );

            throw new Error(
              error.message ||
                "Impossible de charger la prestation.",
            );
          }

          if (!data) {
            return null;
          }

          const service =
            data as
              PublicServiceWithCategory;

          if (
            !isPubliclyVisibleService(
              service,
            )
          ) {
            return null;
          }

          return service;
        },

      staleTime:
        PUBLIC_SERVICES_STALE_TIME,
    });