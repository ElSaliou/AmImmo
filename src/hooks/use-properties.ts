import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import type {
  PropertyInsert,
  PropertyUpdate,
  ListingType,
  PropertyStatus,
} from "@/types/real-estate";

const PROPERTIES_KEY =
  "properties";

const invalidatePropertyQueries = (
  qc: ReturnType<
    typeof useQueryClient
  >,
) => {
  qc.invalidateQueries({
    queryKey: [
      PROPERTIES_KEY,
    ],
  });

  qc.invalidateQueries({
    queryKey: [
      "marketplace",
    ],
  });
};

export const useProperties = (
  filters?: {
    listing_type?: ListingType;
    status?: PropertyStatus;
  },
) =>
  useQuery({
    queryKey: [
      PROPERTIES_KEY,
      filters,
    ],

    queryFn: async () => {
      let q = supabase
        .from("properties")
        .select(`
          *,
          owner:owners(
            id,
            full_name
          ),
          building:buildings(
            id,
            name
          ),
          images:property_images(
            url,
            position
          )
        `)
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

      if (
        filters?.listing_type
      ) {
        q = q.eq(
          "listing_type",
          filters.listing_type,
        );
      }

      if (
        filters?.status
      ) {
        q = q.eq(
          "status",
          filters.status,
        );
      }

      const {
        data,
        error,
      } = await q;

      if (error) {
        throw error;
      }

      return data;
    },
  });

export const useProperty = (
  id: string,
) =>
  useQuery({
    queryKey: [
      PROPERTIES_KEY,
      id,
    ],

    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("properties")
        .select(`
          *,
          owner:owners(
            id,
            full_name
          ),
          building:buildings(
            id,
            name
          ),
          images:property_images(*)
        `)
        .eq(
          "id",
          id,
        )
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    enabled: !!id,
  });

export const useCreateProperty =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        input:
          PropertyInsert,
      ) => {
        const {
          data,
          error,
        } = await supabase
          .from(
            "properties",
          )
          .insert(input)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      },

      onSuccess: () => {
        invalidatePropertyQueries(
          qc,
        );
      },
    });
  };

export const useUpdateProperty =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        id,
        ...updates
      }: PropertyUpdate & {
        id: string;
      }) => {
        const {
          data,
          error,
        } = await supabase
          .from(
            "properties",
          )
          .update(updates)
          .eq(
            "id",
            id,
          )
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      },

      onSuccess: () => {
        invalidatePropertyQueries(
          qc,
        );
      },
    });
  };

export const useDeleteProperty =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        id: string,
      ) => {
        const {
          error,
        } = await supabase
          .from(
            "properties",
          )
          .delete()
          .eq(
            "id",
            id,
          );

        if (error) {
          throw error;
        }
      },

      onSuccess: () => {
        invalidatePropertyQueries(
          qc,
        );
      },
    });
  };

/**
 * Publication / dépublication classique.
 *
 * Cette fonction doit uniquement être utilisée
 * pour draft <-> published.
 *
 * Les statuts métier reserved/rented/sold/
 * maintenance/unavailable sont gérés par
 * les workflows métier.
 */
export const useTogglePublish =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        id,
        published,
      }: {
        id: string;
        published: boolean;
      }) => {
        const updates:
          PropertyUpdate = {
          published,

          status:
            published
              ? "published"
              : "draft",

          published_at:
            published
              ? new Date().toISOString()
              : null,
        };

        const {
          data,
          error,
        } = await supabase
          .from(
            "properties",
          )
          .update(updates)
          .eq(
            "id",
            id,
          )
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      },

      onSuccess: () => {
        invalidatePropertyQueries(
          qc,
        );
      },
    });
  };

/**
 * ============================================================
 * REMISE EN DISPONIBILITÉ APRÈS CONTRÔLE
 * ============================================================
 *
 * Appelle :
 * public.approve_property_reavailability(uuid, text)
 */
export const useApprovePropertyReavailability =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        propertyId,
        note,
      }: {
        propertyId: string;
        note?: string;
      }) => {
        const {
          data,
          error,
        } = await (
          supabase as any
        ).rpc(
          "approve_property_reavailability",
          {
            p_property_id:
              propertyId,

            p_note:
              note?.trim() ||
              null,
          },
        );

        if (error) {
          throw error;
        }

        return data;
      },

      onSuccess: () => {
        invalidatePropertyQueries(
          qc,
        );
      },
    });
  };

/**
 * ============================================================
 * DÉCISION APRÈS CONTRÔLE :
 * MAINTENANCE OU ARCHIVAGE
 * ============================================================
 */
export const usePropertyControlDecision =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        propertyId,
        decision,
        note,
      }: {
        propertyId: string;

        decision:
          | "maintenance"
          | "archived";

        note?: string;
      }) => {
        /*
         * On récupère d'abord
         * l'état actuel.
         */
        const {
          data: property,
          error:
            propertyError,
        } = await supabase
          .from(
            "properties",
          )
          .select(
            "id, status, control_required",
          )
          .eq(
            "id",
            propertyId,
          )
          .single();

        if (
          propertyError
        ) {
          throw propertyError;
        }

        if (
          !(
            property as any
          ).control_required
        ) {
          throw new Error(
            "Ce bien n'est pas actuellement en attente de contrôle.",
          );
        }

        const oldStatus =
          property.status;

        const now =
          new Date().toISOString();

        const updatePayload =
          decision ===
          "maintenance"
            ? {
                status:
                  "maintenance",

                control_required:
                  false,

                availability_reason:
                  "maintenance",

                availability_note:
                  note?.trim() ||
                  "Travaux ou maintenance requis après contrôle.",

                status_changed_at:
                  now,

                updated_at:
                  now,
              }
            : {
                status:
                  "archived",

                published:
                  false,

                control_required:
                  false,

                availability_reason:
                  "owner_request",

                availability_note:
                  note?.trim() ||
                  "Bien retiré de la commercialisation après contrôle.",

                status_changed_at:
                  now,

                updated_at:
                  now,
              };

        /*
         * Les types locaux peuvent
         * ne pas encore connaître
         * les nouvelles colonnes.
         */
        const {
          error:
            updateError,
        } = await (
          supabase as any
        )
          .from("properties")
          .update(
            updatePayload,
          )
          .eq(
            "id",
            propertyId,
          );

        if (
          updateError
        ) {
          throw updateError;
        }

        /*
         * Historique du statut.
         */
        const {
          error:
            historyError,
        } = await (
          supabase as any
        )
          .from(
            "property_status_history",
          )
          .insert({
            property_id:
              propertyId,

            old_status:
              oldStatus,

            new_status:
              decision,

            reason:
              decision ===
              "maintenance"
                ? "maintenance"
                : "owner_request",

            note:
              note?.trim() ||
              (decision ===
              "maintenance"
                ? "Contrôle terminé : maintenance requise."
                : "Contrôle terminé : bien archivé."),
          });

        if (
          historyError
        ) {
          console.warn(
            "[Properties] Historique non enregistré :",
            historyError,
          );
        }

        return {
          success: true,
          propertyId,
          decision,
        };
      },

      onSuccess: () => {
        invalidatePropertyQueries(
          qc,
        );
      },
    });
  };