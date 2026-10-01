import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const SHORT_RENTAL_SETTINGS_KEY =
  "short-rental-settings";

export interface ShortRentalSettings {
  id: string;
  property_id: string;

  currency: string;

  base_nightly_rate: number;
  cleaning_fee: number;
  security_deposit: number;

  minimum_stay: number;
  maximum_stay: number | null;
  max_guests: number;

  default_check_in_time: string;
  default_check_out_time: string;

  instant_booking: boolean;
  active: boolean;

  created_at: string;
  updated_at: string;
}

export interface ShortRentalSettingsInput {
  property_id: string;

  currency?: string;

  base_nightly_rate?: number;
  cleaning_fee?: number;
  security_deposit?: number;

  minimum_stay?: number;
  maximum_stay?: number | null;
  max_guests?: number;

  default_check_in_time?: string;
  default_check_out_time?: string;

  instant_booking?: boolean;
  active?: boolean;
}

export const useShortRentalSettings =
  () =>
    useQuery({
      queryKey: [
        SHORT_RENTAL_SETTINGS_KEY,
      ],

      queryFn: async () => {
        const {
          data,
          error,
        } = await db
          .from(
            "short_rental_settings",
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            },
          );

        if (error) {
          throw error;
        }

        return (
          data ?? []
        ) as ShortRentalSettings[];
      },
    });

export const useShortRentalSetting = (
  propertyId?: string,
) =>
  useQuery({
    queryKey: [
      SHORT_RENTAL_SETTINGS_KEY,
      propertyId,
    ],

    enabled:
      Boolean(propertyId),

    queryFn: async () => {
      if (!propertyId) {
        return null;
      }

      const {
        data,
        error,
      } = await db
        .from(
          "short_rental_settings",
        )
        .select("*")
        .eq(
          "property_id",
          propertyId,
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as
        | ShortRentalSettings
        | null;
    },
  });

export const useUpsertShortRentalSettings =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input: ShortRentalSettingsInput,
        ) => {
          const {
            data,
            error,
          } = await db
            .from(
              "short_rental_settings",
            )
            .upsert(
              input,
              {
                onConflict:
                  "property_id",
              },
            )
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          return data as ShortRentalSettings;
        },

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            SHORT_RENTAL_SETTINGS_KEY,
          ],
        });
      },
    });
  };