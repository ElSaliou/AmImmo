import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Building,
  BuildingInsert,
  BuildingUpdate,
} from "@/types/real-estate";

const KEY = "buildings";

type BuildingOwner = {
  id: string;
  full_name: string | null;
};

export type BuildingWithOwner = Building & {
  owner: BuildingOwner | null;
};

/**
 * Liste des immeubles.
 *
 * Important :
 * On ne fait volontairement pas de jointure PostgREST
 * owner:owners(...) dans la requête principale.
 *
 * Si la relation FK n'est pas correctement détectée par PostgREST,
 * cela empêchait auparavant toute la liste des immeubles de s'afficher.
 */
export const useBuildings = () =>
  useQuery<BuildingWithOwner[]>({
    queryKey: [KEY],

    queryFn: async () => {
      // 1. Charger les immeubles
      const { data: buildings, error: buildingsError } = await supabase
        .from("buildings")
        .select("*")
        .order("name", { ascending: true });

      if (buildingsError) {
        console.error(
          "[useBuildings] Erreur de chargement des immeubles :",
          buildingsError,
        );

        throw new Error(
          buildingsError.message || "Impossible de charger les immeubles.",
        );
      }

      if (!buildings || buildings.length === 0) {
        return [];
      }

      // 2. Récupérer uniquement les propriétaires réellement utilisés
      const ownerIds = Array.from(
        new Set(
          buildings
            .map((building) => building.owner_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      let owners: BuildingOwner[] = [];

      if (ownerIds.length > 0) {
        const { data: ownersData, error: ownersError } = await supabase
          .from("owners")
          .select("id, full_name")
          .in("id", ownerIds);

        /**
         * Une erreur de lecture des propriétaires ne doit PAS empêcher
         * l'affichage des immeubles.
         */
        if (ownersError) {
          console.warn(
            "[useBuildings] Les immeubles sont chargés mais les propriétaires n'ont pas pu être récupérés :",
            ownersError,
          );
        } else {
          owners = ownersData ?? [];
        }
      }

      const ownersMap = new Map(
        owners.map((owner) => [owner.id, owner]),
      );

      return buildings.map((building) => ({
        ...(building as Building),
        owner: building.owner_id
          ? ownersMap.get(building.owner_id) ?? null
          : null,
      }));
    },
  });

/**
 * Fiche d'un immeuble.
 */
export const useBuilding = (id?: string) =>
  useQuery<BuildingWithOwner>({
    queryKey: [KEY, id],

    queryFn: async () => {
      if (!id) {
        throw new Error("Identifiant de l'immeuble manquant.");
      }

      const { data: building, error: buildingError } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", id)
        .single();

      if (buildingError) {
        console.error(
          "[useBuilding] Erreur de chargement de l'immeuble :",
          buildingError,
        );

        throw new Error(
          buildingError.message || "Impossible de charger l'immeuble.",
        );
      }

      let owner: BuildingOwner | null = null;

      if (building.owner_id) {
        const { data: ownerData, error: ownerError } = await supabase
          .from("owners")
          .select("id, full_name")
          .eq("id", building.owner_id)
          .maybeSingle();

        if (ownerError) {
          console.warn(
            "[useBuilding] Immeuble chargé mais propriétaire non récupéré :",
            ownerError,
          );
        } else {
          owner = ownerData;
        }
      }

      return {
        ...(building as Building),
        owner,
      };
    },

    enabled: Boolean(id),
  });

/**
 * Création.
 */
export const useCreateBuilding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BuildingInsert) => {
      const { data, error } = await supabase
        .from("buildings")
        .insert(input)
        .select()
        .single();

      if (error) {
        console.error(
          "[useCreateBuilding] Erreur de création :",
          error,
        );

        throw new Error(
          error.message || "Impossible de créer l'immeuble.",
        );
      }

      return data;
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [KEY],
      });
    },
  });
};

/**
 * Modification.
 */
export const useUpdateBuilding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: BuildingUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("buildings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          "[useUpdateBuilding] Erreur de modification :",
          error,
        );

        throw new Error(
          error.message || "Impossible de modifier l'immeuble.",
        );
      }

      return data;
    },

    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [KEY],
        }),

        queryClient.invalidateQueries({
          queryKey: [KEY, variables.id],
        }),
      ]);
    },
  });
};

/**
 * Suppression.
 */
export const useDeleteBuilding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("buildings")
        .delete()
        .eq("id", id);

      if (error) {
        console.error(
          "[useDeleteBuilding] Erreur de suppression :",
          error,
        );

        throw new Error(
          error.message || "Impossible de supprimer l'immeuble.",
        );
      }

      return id;
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [KEY],
      });
    },
  });
};
