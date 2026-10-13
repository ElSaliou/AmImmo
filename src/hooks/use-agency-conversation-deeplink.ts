import {
  useQuery,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  type AgencyConversationChannel,
  type AgencyConversationSummary,
} from "@/hooks/use-agency-conversation-thread";

const db =
  supabase as any;

const nullableString = (
  value: unknown,
): string | null =>
  typeof value ===
    "string" &&
  value.length > 0
    ? value
    : null;

// ============================================================
// FETCH ONE CONVERSATION
// ============================================================

const fetchTenantConversation =
  async (
    conversationId:
      string,
  ): Promise<AgencyConversationSummary | null> => {
    const {
      data:
        conversation,
      error:
        conversationError,
    } =
      await db
        .from(
          "lease_conversations",
        )
        .select(
          `
            id,
            lease_id,
            tenant_id,
            organization_id,
            created_at,
            last_message_at,
            agency_last_read_at
          `,
        )
        .eq(
          "id",
          conversationId,
        )
        .maybeSingle();

    if (
      conversationError
    ) {
      throw conversationError;
    }

    if (
      !conversation
    ) {
      return null;
    }

    // --------------------------------------------------------
    // LEASE
    // --------------------------------------------------------

    const {
      data:
        lease,
      error:
        leaseError,
    } =
      await db
        .from(
          "leases",
        )
        .select(
          `
            id,
            reference,
            property_id
          `,
        )
        .eq(
          "id",
          conversation.lease_id,
        )
        .maybeSingle();

    if (
      leaseError
    ) {
      throw leaseError;
    }

    // --------------------------------------------------------
    // TENANT
    // --------------------------------------------------------

    const {
      data:
        tenant,
      error:
        tenantError,
    } =
      await db
        .from(
          "tenants",
        )
        .select(
          `
            id,
            full_name,
            email,
            phone
          `,
        )
        .eq(
          "id",
          conversation.tenant_id,
        )
        .maybeSingle();

    if (
      tenantError
    ) {
      throw tenantError;
    }

    // --------------------------------------------------------
    // PROPERTY
    // --------------------------------------------------------

    let property:
      any =
      null;

    if (
      lease?.property_id
    ) {
      const {
        data,
        error,
      } =
        await db
          .from(
            "properties",
          )
          .select(
            `
              id,
              reference,
              title
            `,
          )
          .eq(
            "id",
            lease.property_id,
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      property =
        data;
    }

    // --------------------------------------------------------
    // LAST MESSAGE
    // --------------------------------------------------------

    const {
      data:
        latestMessages,
      error:
        latestError,
    } =
      await db
        .from(
          "lease_messages",
        )
        .select(
          `
            body,
            document_id,
            sender_role,
            created_at
          `,
        )
        .eq(
          "conversation_id",
          conversationId,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .order(
          "id",
          {
            ascending:
              false,
          },
        )
        .limit(
          1,
        );

    if (
      latestError
    ) {
      throw latestError;
    }

    const latest =
      latestMessages?.[0] ??
      null;

    // --------------------------------------------------------
    // UNREAD
    // --------------------------------------------------------

    let unreadQuery =
      db
        .from(
          "lease_messages",
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        )
        .eq(
          "conversation_id",
          conversationId,
        )
        .eq(
          "sender_role",
          "tenant",
        );

    if (
      conversation.agency_last_read_at
    ) {
      unreadQuery =
        unreadQuery.gt(
          "created_at",
          conversation.agency_last_read_at,
        );
    }

    const {
      count:
        unreadCount,
      error:
        unreadError,
    } =
      await unreadQuery;

    if (
      unreadError
    ) {
      throw unreadError;
    }

    // --------------------------------------------------------
    // PREVIEW
    // --------------------------------------------------------

    const body =
      nullableString(
        latest?.body,
      );

    const preview =
      body
        ? body.slice(
            0,
            180,
          )
        : latest?.document_id
          ? "Document joint"
          : null;

    const sortAt =
      nullableString(
        latest?.created_at,
      ) ??
      nullableString(
        conversation.last_message_at,
      ) ??
      String(
        conversation.created_at,
      );

    return {
      id:
        String(
          conversation.id,
        ),

      channel:
        "tenant",

      organizationId:
        String(
          conversation.organization_id,
        ),

      participantId:
        String(
          conversation.tenant_id,
        ),

      participantName:
        nullableString(
          tenant?.full_name,
        ) ??
        "Locataire",

      participantEmail:
        nullableString(
          tenant?.email,
        ),

      participantPhone:
        nullableString(
          tenant?.phone,
        ),

      leaseId:
        String(
          conversation.lease_id,
        ),

      leaseReference:
        nullableString(
          lease?.reference,
        ),

      propertyId:
        nullableString(
          property?.id,
        ),

      propertyReference:
        nullableString(
          property?.reference,
        ),

      propertyTitle:
        nullableString(
          property?.title,
        ),

      lastMessageAt:
        nullableString(
          latest?.created_at,
        ) ??
        nullableString(
          conversation.last_message_at,
        ),

      lastMessagePreview:
        preview,

      lastMessageSenderRole:
        nullableString(
          latest?.sender_role,
        ),

      unreadCount:
        Number(
          unreadCount ??
          0,
        ),

      sortAt,
    };
  };

// ============================================================
// OWNER
// ============================================================

const fetchOwnerConversation =
  async (
    conversationId:
      string,
  ): Promise<AgencyConversationSummary | null> => {
    const {
      data:
        conversation,
      error:
        conversationError,
    } =
      await db
        .from(
          "owner_agency_conversations",
        )
        .select(
          `
            id,
            owner_id,
            organization_id,
            created_at,
            last_message_at,
            agency_last_read_at
          `,
        )
        .eq(
          "id",
          conversationId,
        )
        .maybeSingle();

    if (
      conversationError
    ) {
      throw conversationError;
    }

    if (
      !conversation
    ) {
      return null;
    }

    // --------------------------------------------------------
    // OWNER
    // --------------------------------------------------------

    const {
      data:
        owner,
      error:
        ownerError,
    } =
      await db
        .from(
          "owners",
        )
        .select(
          `
            id,
            full_name,
            email,
            phone
          `,
        )
        .eq(
          "id",
          conversation.owner_id,
        )
        .maybeSingle();

    if (
      ownerError
    ) {
      throw ownerError;
    }

    // --------------------------------------------------------
    // LAST MESSAGE
    // --------------------------------------------------------

    const {
      data:
        latestMessages,
      error:
        latestError,
    } =
      await db
        .from(
          "owner_agency_messages",
        )
        .select(
          `
            body,
            document_id,
            sender_role,
            created_at
          `,
        )
        .eq(
          "conversation_id",
          conversationId,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .order(
          "id",
          {
            ascending:
              false,
          },
        )
        .limit(
          1,
        );

    if (
      latestError
    ) {
      throw latestError;
    }

    const latest =
      latestMessages?.[0] ??
      null;

    // --------------------------------------------------------
    // UNREAD
    // --------------------------------------------------------

    let unreadQuery =
      db
        .from(
          "owner_agency_messages",
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        )
        .eq(
          "conversation_id",
          conversationId,
        )
        .eq(
          "sender_role",
          "owner",
        );

    if (
      conversation.agency_last_read_at
    ) {
      unreadQuery =
        unreadQuery.gt(
          "created_at",
          conversation.agency_last_read_at,
        );
    }

    const {
      count:
        unreadCount,
      error:
        unreadError,
    } =
      await unreadQuery;

    if (
      unreadError
    ) {
      throw unreadError;
    }

    // --------------------------------------------------------
    // PREVIEW
    // --------------------------------------------------------

    const body =
      nullableString(
        latest?.body,
      );

    const preview =
      body
        ? body.slice(
            0,
            180,
          )
        : latest?.document_id
          ? "Document joint"
          : null;

    const sortAt =
      nullableString(
        latest?.created_at,
      ) ??
      nullableString(
        conversation.last_message_at,
      ) ??
      String(
        conversation.created_at,
      );

    return {
      id:
        String(
          conversation.id,
        ),

      channel:
        "owner",

      organizationId:
        String(
          conversation.organization_id,
        ),

      participantId:
        String(
          conversation.owner_id,
        ),

      participantName:
        nullableString(
          owner?.full_name,
        ) ??
        "Propriétaire",

      participantEmail:
        nullableString(
          owner?.email,
        ),

      participantPhone:
        nullableString(
          owner?.phone,
        ),

      leaseId:
        null,

      leaseReference:
        null,

      propertyId:
        null,

      propertyReference:
        null,

      propertyTitle:
        null,

      lastMessageAt:
        nullableString(
          latest?.created_at,
        ) ??
        nullableString(
          conversation.last_message_at,
        ),

      lastMessagePreview:
        preview,

      lastMessageSenderRole:
        nullableString(
          latest?.sender_role,
        ),

      unreadCount:
        Number(
          unreadCount ??
          0,
        ),

      sortAt,
    };
  };

// ============================================================
// QUERY
// ============================================================

export const useAgencyConversationDeepLink =
  (
    channel:
      AgencyConversationChannel | null,

    conversationId:
      string | null,
  ) =>
    useQuery<
      AgencyConversationSummary | null
    >({
      queryKey: [
        "admin",
        "agency-conversations",
        "deep-link",
        channel,
        conversationId,
      ],

      enabled:
        Boolean(
          channel &&
            conversationId,
        ),

      queryFn:
        async () => {
          if (
            !channel ||
            !conversationId
          ) {
            return null;
          }

          if (
            channel ===
            "tenant"
          ) {
            return fetchTenantConversation(
              conversationId,
            );
          }

          return fetchOwnerConversation(
            conversationId,
          );
        },

      staleTime:
        15_000,

      retry:
        false,
    });