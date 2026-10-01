import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const PROPERTY_BLOCKS_KEY =
  "property-blocks";

export type PropertyBlockType =
  | "manual"
  | "maintenance"
  | "owner_use"
  | "administrative"
  | "external_booking"
  | "other";

export interface PropertyBlock {
  id: string;

  organization_id:
    | string
    | null;

  property_id: string;

  start_date: string;
  end_date: string;

  block_type:
    PropertyBlockType;

  reason:
    | string
    | null;

  notes: string;

  external_reference:
    | string
    | null;

  created_by:
    | string
    | null;

  created_at: string;
  updated_at: string;
}

export interface PropertyBlockInput {
  property_id: string;

  organization_id?:
    | string
    | null;

  start_date: string;
  end_date: string;

  block_type:
    PropertyBlockType;

  reason?:
    | string
    | null;

  notes?: string;

  external_reference?:
    | string
    | null;
}

/**
 * Liste des blocages d'un logement.
 */
export const usePropertyBlocks = (
  propertyId?: string,
) =>
  useQuery({
    queryKey: [
      PROPERTY_BLOCKS_KEY,
      propertyId,
    ],

    enabled: Boolean(
      propertyId,
    ),

    queryFn: async () => {
      if (!propertyId) {
        return [];
      }

      const {
        data,
        error,
      } = await db
        .from(
          "property_blocks",
        )
        .select("*")
        .eq(
          "property_id",
          propertyId,
        )
        .order(
          "start_date",
          {
            ascending: true,
          },
        )
        .order(
          "created_at",
          {
            ascending: true,
          },
        );

      if (error) {
        throw error;
      }

      return (
        data ?? []
      ) as PropertyBlock[];
    },
  });

/**
 * Création d'un blocage.
 */
export const useCreatePropertyBlock =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        input: PropertyBlockInput,
      ) => {
        const {
          data,
          error,
        } = await db
          .from(
            "property_blocks",
          )
          .insert({
            property_id:
              input.property_id,

            organization_id:
              input.organization_id ??
              null,

            start_date:
              input.start_date,

            end_date:
              input.end_date,

            block_type:
              input.block_type,

            reason:
              input.reason ??
              null,

            notes:
              input.notes ??
              "",

            external_reference:
              input.external_reference ??
              null,
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        return data as PropertyBlock;
      },

      onSuccess: (
        data,
      ) => {
        queryClient.invalidateQueries({
          queryKey: [
            PROPERTY_BLOCKS_KEY,
            data.property_id,
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            PROPERTY_BLOCKS_KEY,
          ],
        });
      },
    });
  };

/**
 * Modification d'un blocage.
 */
export const useUpdatePropertyBlock =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        id,
        ...updates
      }: Partial<PropertyBlockInput> & {
        id: string;
      }) => {
        const {
          data,
          error,
        } = await db
          .from(
            "property_blocks",
          )
          .update(updates)
          .eq(
            "id",
            id,
          )
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        return data as PropertyBlock;
      },

      onSuccess: (
        data,
      ) => {
        queryClient.invalidateQueries({
          queryKey: [
            PROPERTY_BLOCKS_KEY,
            data.property_id,
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            PROPERTY_BLOCKS_KEY,
          ],
        });
      },
    });
  };

/**
 * Suppression d'un blocage.
 */
export const useDeletePropertyBlock =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        id: string,
      ) => {
        const {
          data,
          error,
        } = await db
          .from(
            "property_blocks",
          )
          .delete()
          .eq(
            "id",
            id,
          )
          .select(
            "id, property_id",
          )
          .single();

        if (error) {
          throw error;
        }

        return data as {
          id: string;
          property_id: string;
        };
      },

      onSuccess: (
        data,
      ) => {
        queryClient.invalidateQueries({
          queryKey: [
            PROPERTY_BLOCKS_KEY,
            data.property_id,
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            PROPERTY_BLOCKS_KEY,
          ],
        });
      },
    });
  };