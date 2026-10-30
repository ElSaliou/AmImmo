import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import type {
  QuoteRequest,
  QuoteRequestStatus,
  QuoteRequestUpdate,
} from "@/types/real-estate";

const KEY = "quote_requests";

type QuoteRequestService = {
  id: string;
  title: string;
  slug: string;
  status: string;
};

type QuoteRequestProperty = {
  id: string;
  title: string;
};

type QuoteRequestLead = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
};

export type QuoteRequestWithRelations =
  QuoteRequest & {
    service: QuoteRequestService | null;
    property: QuoteRequestProperty | null;
    lead: QuoteRequestLead | null;
  };


// ============================================================
// LIST
// ============================================================

export const useQuoteRequests = () =>
  useQuery<QuoteRequestWithRelations[]>({
    queryKey: [KEY],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select(`
          *,
          service:services(
            id,
            title,
            slug,
            status
          ),
          property:properties(
            id,
            title
          ),
          lead:leads(
            id,
            full_name,
            email,
            phone,
            status
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "[useQuoteRequests] Erreur de chargement :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de charger les demandes de devis.",
        );
      }

      return (
        data ?? []
      ) as QuoteRequestWithRelations[];
    },
  });


// ============================================================
// DETAIL
// ============================================================

export const useQuoteRequest = (
  id?: string,
) =>
  useQuery<QuoteRequestWithRelations>({
    queryKey: [KEY, id],

    queryFn: async () => {
      if (!id) {
        throw new Error(
          "Identifiant de demande de devis manquant.",
        );
      }

      const { data, error } = await supabase
        .from("quote_requests")
        .select(`
          *,
          service:services(
            id,
            title,
            slug,
            status
          ),
          property:properties(
            id,
            title
          ),
          lead:leads(
            id,
            full_name,
            email,
            phone,
            status
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error(
          "[useQuoteRequest] Erreur de chargement :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de charger la demande de devis.",
        );
      }

      return data as QuoteRequestWithRelations;
    },

    enabled: Boolean(id),
  });


// ============================================================
// GENERIC INTERNAL UPDATE
// ============================================================

export const useUpdateQuoteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: QuoteRequestUpdate & {
      id: string;
    }) => {
      const { data, error } = await supabase
        .from("quote_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          "[useUpdateQuoteRequest] Erreur de modification :",
          error,
        );

        throw new Error(
          error.message ||
            "Impossible de modifier la demande de devis.",
        );
      }

      return data;
    },

    onSuccess: async (
      data,
    ) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [KEY],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            KEY,
            data.id,
          ],
        }),
      ]);
    },
  });
};


// ============================================================
// STATUS WORKFLOW
// ============================================================

export const useUpdateQuoteRequestStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        id,
        status,
      }: {
        id: string;
        status: QuoteRequestStatus;
      }) => {
        /**
         * answered doit obligatoirement passer par
         * useAnswerQuoteRequest() afin de garantir :
         *
         * - agency_response non vide
         * - responded_at renseigné
         * - status = answered
         */
        if (status === "answered") {
          throw new Error(
            "Utilisez l'action de réponse pour marquer la demande comme répondue.",
          );
        }

        const updates: QuoteRequestUpdate = {
          status,

          closed_at:
            status === "closed" ||
            status === "cancelled"
              ? new Date().toISOString()
              : null,
        };

        const { data, error } = await supabase
          .from("quote_requests")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error(
            "[useUpdateQuoteRequestStatus] Erreur :",
            error,
          );

          throw new Error(
            error.message ||
              "Impossible de modifier le statut de la demande.",
          );
        }

        return data;
      },

      onSuccess: async (
        data,
      ) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [KEY],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              KEY,
              data.id,
            ],
          }),
        ]);
      },
    });
  };


// ============================================================
// INTERNAL NOTES
// ============================================================

export const useUpdateQuoteRequestNotes =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        id,
        internalNotes,
      }: {
        id: string;
        internalNotes: string;
      }) => {
        const { data, error } = await supabase
          .from("quote_requests")
          .update({
            internal_notes:
              internalNotes.trim() || null,
          })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error(
            "[useUpdateQuoteRequestNotes] Erreur :",
            error,
          );

          throw new Error(
            error.message ||
              "Impossible d'enregistrer les notes internes.",
          );
        }

        return data;
      },

      onSuccess: async (
        data,
      ) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [KEY],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              KEY,
              data.id,
            ],
          }),
        ]);
      },
    });
  };


// ============================================================
// AGENCY RESPONSE
// ============================================================

export const useAnswerQuoteRequest =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        id,
        response,
      }: {
        id: string;
        response: string;
      }) => {
        const normalized =
          response.trim();

        if (!normalized) {
          throw new Error(
            "La réponse de l'agence ne peut pas être vide.",
          );
        }

        const { data, error } = await supabase
          .from("quote_requests")
          .update({
            agency_response:
              normalized,

            responded_at:
              new Date().toISOString(),

            status: "answered",

            closed_at: null,
          })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error(
            "[useAnswerQuoteRequest] Erreur :",
            error,
          );

          throw new Error(
            error.message ||
              "Impossible d'enregistrer la réponse de l'agence.",
          );
        }

        return data;
      },

      onSuccess: async (
        data,
      ) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [KEY],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              KEY,
              data.id,
            ],
          }),
        ]);
      },
    });
  };


// ============================================================
// CRM LINK
// ============================================================

export const useLinkQuoteRequestToLead =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        quoteRequestId,
        leadId,
      }: {
        quoteRequestId: string;
        leadId: string | null;
      }) => {
        const { data, error } = await supabase
          .from("quote_requests")
          .update({
            lead_id: leadId,
          })
          .eq(
            "id",
            quoteRequestId,
          )
          .select()
          .single();

        if (error) {
          console.error(
            "[useLinkQuoteRequestToLead] Erreur :",
            error,
          );

          throw new Error(
            error.message ||
              "Impossible de rattacher la demande au prospect.",
          );
        }

        return data;
      },

      onSuccess: async (
        data,
      ) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [KEY],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              KEY,
              data.id,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "leads",
            ],
          }),
        ]);
      },
    });
  };


// ============================================================
// NEW REQUESTS COUNT
// ============================================================

export const useNewQuoteRequestsCount =
  () =>
    useQuery<number>({
      queryKey: [
        KEY,
        "count",
        "new",
      ],

      queryFn: async () => {
        const {
          count,
          error,
        } = await supabase
          .from("quote_requests")
          .select(
            "id",
            {
              count: "exact",
              head: true,
            },
          )
          .eq(
            "status",
            "new",
          );

        if (error) {
          console.error(
            "[useNewQuoteRequestsCount] Erreur :",
            error,
          );

          throw new Error(
            error.message ||
              "Impossible de calculer les nouvelles demandes de devis.",
          );
        }

        return count ?? 0;
      },
    });