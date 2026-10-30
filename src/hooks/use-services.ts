import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import type {
  Service,
  ServiceCategory,
  ServiceInsert,
  ServiceUpdate,
  ServiceCategoryInsert,
  ServiceCategoryUpdate,
} from "@/types/real-estate";

const SERVICES_KEY = "services";
const CATEGORIES_KEY = "service_categories";

export type ServiceWithCategory = Service & {
  category: ServiceCategory | null;
};

// ============================================================
// SERVICE CATEGORIES
// ============================================================

export const useServiceCategories = () =>
  useQuery<ServiceCategory[]>({
    queryKey: [CATEGORIES_KEY],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("display_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        });

      if (error) {
        console.error(
          "[useServiceCategories] Erreur de chargement :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de charger les catégories de prestations.",
        );
      }

      return data ?? [];
    },
  });

export const useCreateServiceCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ServiceCategoryInsert,
    ) => {
      const { data, error } = await supabase
        .from("service_categories")
        .insert(input)
        .select()
        .single();

      if (error) {
        console.error(
          "[useCreateServiceCategory] Erreur de création :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de créer la catégorie.",
        );
      }

      return data;
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY],
      });
    },
  });
};

export const useUpdateServiceCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: ServiceCategoryUpdate & {
      id: string;
    }) => {
      const { data, error } = await supabase
        .from("service_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          "[useUpdateServiceCategory] Erreur de modification :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de modifier la catégorie.",
        );
      }

      return data;
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [CATEGORIES_KEY],
        }),
        queryClient.invalidateQueries({
          queryKey: [SERVICES_KEY],
        }),
      ]);
    },
  });
};


// ============================================================
// SERVICES
// ============================================================

export const useServices = () =>
  useQuery<ServiceWithCategory[]>({
    queryKey: [SERVICES_KEY],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`
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
        `)
        .order("display_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "[useServices] Erreur de chargement des prestations :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de charger les prestations.",
        );
      }

      return (data ?? []) as ServiceWithCategory[];
    },
  });

export const useService = (
  id?: string,
) =>
  useQuery<ServiceWithCategory>({
    queryKey: [SERVICES_KEY, id],

    queryFn: async () => {
      if (!id) {
        throw new Error(
          "Identifiant de prestation manquant.",
        );
      }

      const { data, error } = await supabase
        .from("services")
        .select(`
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
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error(
          "[useService] Erreur de chargement :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de charger la prestation.",
        );
      }

      return data as ServiceWithCategory;
    },

    enabled: Boolean(id),
  });

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ServiceInsert,
    ) => {
      const { data, error } = await supabase
        .from("services")
        .insert(input)
        .select()
        .single();

      if (error) {
        console.error(
          "[useCreateService] Erreur de création :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de créer la prestation.",
        );
      }

      return data;
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [SERVICES_KEY],
      });
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: ServiceUpdate & {
      id: string;
    }) => {
      const { data, error } = await supabase
        .from("services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          "[useUpdateService] Erreur de modification :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de modifier la prestation.",
        );
      }

      return data;
    },

    onSuccess: async (
      _data,
      variables,
    ) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [SERVICES_KEY],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            SERVICES_KEY,
            variables.id,
          ],
        }),
      ]);
    },
  });
};


// ============================================================
// PUBLICATION WORKFLOW
// ============================================================

export const usePublishService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string,
    ) => {
      const { data, error } = await supabase
        .from("services")
        .update({
          status: "published",
          published_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          "[usePublishService] Erreur de publication :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de publier la prestation.",
        );
      }

      return data;
    },

    onSuccess: async (
      data,
    ) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [SERVICES_KEY],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            SERVICES_KEY,
            data.id,
          ],
        }),
      ]);
    },
  });
};

export const useUnpublishService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string,
    ) => {
      const { data, error } = await supabase
        .from("services")
        .update({
          status: "draft",
          published_at: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          "[useUnpublishService] Erreur de dépublication :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de remettre la prestation en brouillon.",
        );
      }

      return data;
    },

    onSuccess: async (
      data,
    ) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [SERVICES_KEY],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            SERVICES_KEY,
            data.id,
          ],
        }),
      ]);
    },
  });
};

export const useArchiveService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string,
    ) => {
      const { data, error } = await supabase
        .from("services")
        .update({
          status: "archived",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          "[useArchiveService] Erreur d'archivage :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible d'archiver la prestation.",
        );
      }

      return data;
    },

    onSuccess: async (
      data,
    ) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [SERVICES_KEY],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            SERVICES_KEY,
            data.id,
          ],
        }),
      ]);
    },
  });
};