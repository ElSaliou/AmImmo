import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Les types Supabase générés n'ont pas encore été régénérés
 * depuis l'ajout des tables courte durée.
 *
 * On limite volontairement le `any` à ce hook.
 */
const db = supabase as any;

const GUESTS_KEY = "guests";

// ============================================================
// TYPES
// ============================================================

export interface Guest {
  id: string;

  organization_id: string | null;
  user_id: string | null;

  full_name: string;

  email: string | null;

  /**
   * La colonne phone est NOT NULL
   * dans la table public.guests.
   */
  phone: string;

  nationality: string | null;

  date_of_birth: string | null;

  id_type: string | null;
  id_number: string | null;
  id_expiry_date: string | null;

  address: string | null;
  city: string | null;
  country: string | null;

  notes: string;

  created_at: string;
  updated_at: string;
}

export interface GuestInput {
  organization_id?: string | null;
  user_id?: string | null;

  full_name: string;

  email?: string | null;

  /**
   * Obligatoire car public.guests.phone est NOT NULL.
   */
  phone: string;

  nationality?: string | null;

  date_of_birth?: string | null;

  id_type?: string | null;
  id_number?: string | null;
  id_expiry_date?: string | null;

  address?: string | null;
  city?: string | null;
  country?: string | null;

  notes?: string | null;
}

export type GuestUpdateInput = {
  id: string;
} & Partial<GuestInput>;

// ============================================================
// HELPERS
// ============================================================

const nullableText = (
  value: string | null | undefined,
): string | null => {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : null;
};

const requiredText = (
  value: string | null | undefined,
  message: string,
): string => {
  const normalized =
    value?.trim();

  if (!normalized) {
    throw new Error(
      message,
    );
  }

  return normalized;
};

// ============================================================
// LIST
// ============================================================

export const useGuests = (
  search?: string,
) =>
  useQuery({
    queryKey: [
      GUESTS_KEY,
      "list",
      search?.trim() ?? "",
    ],

    queryFn: async (): Promise<
      Guest[]
    > => {
      let query = db
        .from("guests")
        .select("*")
        .order(
          "full_name",
          {
            ascending: true,
          },
        );

      const term =
        search?.trim();

      if (term) {
        const safeTerm =
          term
            .replace(
              /,/g,
              " ",
            )
            .replace(
              /[()]/g,
              " ",
            )
            .trim();

        if (safeTerm) {
          query =
            query.or(
              [
                `full_name.ilike.%${safeTerm}%`,
                `email.ilike.%${safeTerm}%`,
                `phone.ilike.%${safeTerm}%`,
              ].join(","),
            );
        }
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        console.error(
          "[Guests] Erreur chargement voyageurs :",
          error,
        );

        throw error;
      }

      return (
        data ?? []
      ) as Guest[];
    },
  });

// ============================================================
// DETAIL
// ============================================================

export const useGuest = (
  guestId?: string | null,
) =>
  useQuery({
    queryKey: [
      GUESTS_KEY,
      "detail",
      guestId ?? null,
    ],

    queryFn: async (): Promise<
      Guest
    > => {
      if (!guestId) {
        throw new Error(
          "Identifiant voyageur manquant.",
        );
      }

      const {
        data,
        error,
      } = await db
        .from("guests")
        .select("*")
        .eq(
          "id",
          guestId,
        )
        .single();

      if (error) {
        console.error(
          "[Guests] Erreur chargement voyageur :",
          error,
        );

        throw error;
      }

      return data as Guest;
    },

    enabled:
      Boolean(guestId),
  });

// ============================================================
// CREATE
// ============================================================

export const useCreateGuest =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input: GuestInput,
        ): Promise<Guest> => {
          const fullName =
            requiredText(
              input.full_name,
              "Le nom complet du voyageur est obligatoire.",
            );

          const phone =
            requiredText(
              input.phone,
              "Le numéro de téléphone du voyageur est obligatoire.",
            );

          const payload = {
            organization_id:
              input.organization_id ??
              null,

            user_id:
              input.user_id ??
              null,

            full_name:
              fullName,

            email:
              nullableText(
                input.email,
              ),

            phone,

            nationality:
              nullableText(
                input.nationality,
              ),

            date_of_birth:
              input.date_of_birth ||
              null,

            id_type:
              nullableText(
                input.id_type,
              ),

            id_number:
              nullableText(
                input.id_number,
              ),

            /**
             * Colonne réellement présente
             * dans public.guests.
             */
            id_expiry_date:
              input.id_expiry_date ||
              null,

            address:
              nullableText(
                input.address,
              ),

            city:
              nullableText(
                input.city,
              ),

            country:
              nullableText(
                input.country,
              ),

            notes:
              input.notes?.trim() ??
              "",
          };

          const {
            data,
            error,
          } = await db
            .from("guests")
            .insert(payload)
            .select("*")
            .single();

          if (error) {
            console.error(
              "[Guests] Erreur création voyageur :",
              error,
            );

            throw error;
          }

          return data as Guest;
        },

      onSuccess: (
        guest: Guest,
      ) => {
        queryClient.invalidateQueries({
          queryKey: [
            GUESTS_KEY,
          ],
        });

        queryClient.setQueryData(
          [
            GUESTS_KEY,
            "detail",
            guest.id,
          ],
          guest,
        );
      },
    });
  };

// ============================================================
// UPDATE
// ============================================================

export const useUpdateGuest =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async ({
          id,
          ...input
        }: GuestUpdateInput): Promise<Guest> => {
          if (!id) {
            throw new Error(
              "Identifiant voyageur manquant.",
            );
          }

          const payload: Record<
            string,
            unknown
          > = {};

          if (
            input.organization_id !==
            undefined
          ) {
            payload.organization_id =
              input.organization_id;
          }

          if (
            input.user_id !==
            undefined
          ) {
            payload.user_id =
              input.user_id;
          }

          if (
            input.full_name !==
            undefined
          ) {
            payload.full_name =
              requiredText(
                input.full_name,
                "Le nom complet du voyageur est obligatoire.",
              );
          }

          if (
            input.email !==
            undefined
          ) {
            payload.email =
              nullableText(
                input.email,
              );
          }

          if (
            input.phone !==
            undefined
          ) {
            payload.phone =
              requiredText(
                input.phone,
                "Le numéro de téléphone du voyageur est obligatoire.",
              );
          }

          if (
            input.nationality !==
            undefined
          ) {
            payload.nationality =
              nullableText(
                input.nationality,
              );
          }

          if (
            input.date_of_birth !==
            undefined
          ) {
            payload.date_of_birth =
              input.date_of_birth ||
              null;
          }

          if (
            input.id_type !==
            undefined
          ) {
            payload.id_type =
              nullableText(
                input.id_type,
              );
          }

          if (
            input.id_number !==
            undefined
          ) {
            payload.id_number =
              nullableText(
                input.id_number,
              );
          }

          if (
            input.id_expiry_date !==
            undefined
          ) {
            payload.id_expiry_date =
              input.id_expiry_date ||
              null;
          }

          if (
            input.address !==
            undefined
          ) {
            payload.address =
              nullableText(
                input.address,
              );
          }

          if (
            input.city !==
            undefined
          ) {
            payload.city =
              nullableText(
                input.city,
              );
          }

          if (
            input.country !==
            undefined
          ) {
            payload.country =
              nullableText(
                input.country,
              );
          }

          if (
            input.notes !==
            undefined
          ) {
            payload.notes =
              input.notes?.trim() ??
              "";
          }

          if (
            Object.keys(
              payload,
            ).length === 0
          ) {
            throw new Error(
              "Aucune modification à enregistrer.",
            );
          }

          const {
            data,
            error,
          } = await db
            .from("guests")
            .update(payload)
            .eq(
              "id",
              id,
            )
            .select("*")
            .single();

          if (error) {
            console.error(
              "[Guests] Erreur modification voyageur :",
              error,
            );

            throw error;
          }

          return data as Guest;
        },

      onSuccess: (
        guest: Guest,
      ) => {
        queryClient.invalidateQueries({
          queryKey: [
            GUESTS_KEY,
          ],
        });

        queryClient.setQueryData(
          [
            GUESTS_KEY,
            "detail",
            guest.id,
          ],
          guest,
        );
      },
    });
  };

// ============================================================
// DELETE
// ============================================================

export const useDeleteGuest =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          guestId: string,
        ): Promise<string> => {
          if (!guestId) {
            throw new Error(
              "Identifiant voyageur manquant.",
            );
          }

          const {
            error,
          } = await db
            .from("guests")
            .delete()
            .eq(
              "id",
              guestId,
            );

          if (error) {
            console.error(
              "[Guests] Erreur suppression voyageur :",
              error,
            );

            throw error;
          }

          return guestId;
        },

      onSuccess: (
        guestId: string,
      ) => {
        queryClient.invalidateQueries({
          queryKey: [
            GUESTS_KEY,
          ],
        });

        queryClient.removeQueries({
          queryKey: [
            GUESTS_KEY,
            "detail",
            guestId,
          ],
        });
      },
    });
  };