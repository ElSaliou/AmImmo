import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import type {
  LeadInsert,
  LeadUpdate,
  LeadActivityInsert,
} from "@/types/real-estate";

const KEY = "leads";
const ACTIVITY_KEY = "lead_activities";
const TENANT_KEY = "tenants";
const PROPERTY_KEY = "properties";

/**
 * Résultat retourné par :
 * public.convert_lead_to_tenant(uuid)
 */
export interface ConvertLeadToTenantResult {
  success: boolean;
  already_converted: boolean;
  lead_id: string;
  tenant_id: string;
  property_id: string;
  property_status?: string;
  next_step?: string;
}

export const useLeads = () =>
  useQuery({
    queryKey: [KEY],

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from("leads")
          .select(`
            *,
            property:properties(
              id,
              title,
              city,
              commune,
              slug,
              price,
              currency,
              listing_type,
              status,
              owner_id
            )
          `)
          .order(
            "created_at",
            {
              ascending: false,
            },
          );

      if (error) {
        throw error;
      }

      return data;
    },
  });

export const useLead = (
  id?: string,
) =>
  useQuery({
    queryKey: [KEY, id],

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from("leads")
          .select(`
            *,
            property:properties(
              id,
              title,
              city,
              commune,
              slug,
              price,
              currency,
              listing_type,
              status,
              owner_id
            )
          `)
          .eq("id", id!)
          .single();

      if (error) {
        throw error;
      }

      return data;
    },

    enabled: !!id,
  });

export const useLeadActivities = (
  leadId?: string,
) =>
  useQuery({
    queryKey: [
      ACTIVITY_KEY,
      leadId,
    ],

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from(
            "lead_activities",
          )
          .select("*")
          .eq(
            "lead_id",
            leadId!,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          );

      if (error) {
        throw error;
      }

      return data;
    },

    enabled: !!leadId,
  });

export const useCreateLeadActivity =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        input: LeadActivityInsert,
      ) => {
        const {
          data,
          error,
        } = await supabase
          .from(
            "lead_activities",
          )
          .insert(input)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      },

      onSuccess: (
        _data,
        variables,
      ) => {
        qc.invalidateQueries({
          queryKey: [
            ACTIVITY_KEY,
            variables.lead_id,
          ],
        });

        qc.invalidateQueries({
          queryKey: [KEY],
        });
      },
    });
  };

/**
 * Création publique depuis le site.
 *
 * Pas de .select(), car l'utilisateur
 * anonyme n'a pas nécessairement
 * de permission SELECT sur leads.
 */
export const useCreateLeadPublic =
  () =>
    useMutation({
      mutationFn: async (
        input: LeadInsert,
      ) => {
        const { error } =
          await supabase
            .from("leads")
            .insert(input);

        if (error) {
          throw error;
        }
      },
    });

/**
 * Création d'un lead par le staff.
 */
export const useCreateLead =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        input: LeadInsert,
      ) => {
        const {
          data,
          error,
        } = await supabase
          .from("leads")
          .insert(input)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      },

      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: [KEY],
        });
      },
    });
  };

/**
 * Mise à jour du lead.
 */
export const useUpdateLead =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async ({
        id,
        ...updates
      }: LeadUpdate & {
        id: string;
      }) => {
        const {
          data,
          error,
        } = await supabase
          .from("leads")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      },

      onSuccess: (
        data,
      ) => {
        qc.invalidateQueries({
          queryKey: [KEY],
        });

        if (data?.id) {
          qc.invalidateQueries({
            queryKey: [
              KEY,
              data.id,
            ],
          });
        }
      },
    });
  };

/**
 * ============================================================
 * CONVERSION MÉTIER
 * LEAD -> LOCATAIRE
 * ============================================================
 *
 * Appelle la fonction PostgreSQL :
 *
 * public.convert_lead_to_tenant(uuid)
 *
 * La fonction Supabase est idempotente :
 * si le lead possède déjà tenant_id,
 * aucun second locataire n'est créé.
 */
export const useConvertLeadToTenant =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        leadId: string,
      ) => {
        /**
         * Les types Supabase générés localement
         * ne connaissent peut-être pas encore
         * cette nouvelle RPC.
         *
         * Le cast permet de l'utiliser immédiatement
         * en attendant la prochaine régénération
         * de src/integrations/supabase/types.ts.
         */
        const {
          data,
          error,
        } = await (
          supabase as any
        ).rpc(
          "convert_lead_to_tenant",
          {
            p_lead_id:
              leadId,
          },
        );

        if (error) {
          throw error;
        }

        if (
          !data?.success
        ) {
          throw new Error(
            "La conversion du prospect a échoué.",
          );
        }

        return data as ConvertLeadToTenantResult;
      },

      onSuccess: (
        data,
      ) => {
        /**
         * Leads
         */
        qc.invalidateQueries({
          queryKey: [KEY],
        });

        qc.invalidateQueries({
          queryKey: [
            KEY,
            data.lead_id,
          ],
        });

        /**
         * Historique CRM
         */
        qc.invalidateQueries({
          queryKey: [
            ACTIVITY_KEY,
            data.lead_id,
          ],
        });

        /**
         * Locataires
         */
        qc.invalidateQueries({
          queryKey: [
            TENANT_KEY,
          ],
        });

        /**
         * Bien
         */
        qc.invalidateQueries({
          queryKey: [
            PROPERTY_KEY,
          ],
        });

        /**
         * Marketplace
         */
        qc.invalidateQueries({
          queryKey: [
            "marketplace",
          ],
        });
      },
    });
  };

export const useDeleteLead =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        id: string,
      ) => {
        const { error } =
          await supabase
            .from("leads")
            .delete()
            .eq("id", id);

        if (error) {
          throw error;
        }
      },

      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: [KEY],
        });
      },
    });
  };