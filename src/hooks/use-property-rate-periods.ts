import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const PROPERTY_RATE_PERIODS_KEY =
  "property-rate-periods";

export interface PropertyRatePeriod {
  id: string;

  property_id: string;

  name: string;

  start_date: string;
  end_date: string;

  nightly_rate: number;

  minimum_stay:
    | number
    | null;

  priority: number;

  active: boolean;

  created_at: string;
  updated_at: string;
}

export interface PropertyRatePeriodInput {
  property_id: string;

  name: string;

  start_date: string;
  end_date: string;

  nightly_rate: number;

  minimum_stay?:
    | number
    | null;

  priority?: number;

  active?: boolean;
}

export const usePropertyRatePeriods =
  (
    propertyId?: string,
  ) =>
    useQuery({
      queryKey: [
        PROPERTY_RATE_PERIODS_KEY,
        propertyId ??
          "all",
      ],

      queryFn: async () => {
        let query =
          db
            .from(
              "property_rate_periods",
            )
            .select("*")
            .order(
              "priority",
              {
                ascending:
                  false,
              },
            )
            .order(
              "start_date",
              {
                ascending:
                  true,
              },
            );

        if (propertyId) {
          query =
            query.eq(
              "property_id",
              propertyId,
            );
        }

        const {
          data,
          error,
        } = await query;

        if (error) {
          throw error;
        }

        return (
          data ?? []
        ) as PropertyRatePeriod[];
      },
    });

export const useCreatePropertyRatePeriod =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input: PropertyRatePeriodInput,
        ) => {
          const {
            data,
            error,
          } = await db
            .from(
              "property_rate_periods",
            )
            .insert(input)
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          return data as PropertyRatePeriod;
        },

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            PROPERTY_RATE_PERIODS_KEY,
          ],
        });
      },
    });
  };

export const useUpdatePropertyRatePeriod =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async ({
          id,
          ...updates
        }: Partial<PropertyRatePeriodInput> & {
          id: string;
        }) => {
          const {
            data,
            error,
          } = await db
            .from(
              "property_rate_periods",
            )
            .update(
              updates,
            )
            .eq(
              "id",
              id,
            )
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          return data as PropertyRatePeriod;
        },

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            PROPERTY_RATE_PERIODS_KEY,
          ],
        });
      },
    });
  };

export const useDeletePropertyRatePeriod =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          id: string,
        ) => {
          const {
            error,
          } = await db
            .from(
              "property_rate_periods",
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
        queryClient.invalidateQueries({
          queryKey: [
            PROPERTY_RATE_PERIODS_KEY,
          ],
        });
      },
    });
  };