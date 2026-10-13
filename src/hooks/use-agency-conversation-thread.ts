import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

const db =
  supabase as any;

const INBOX_PAGE_SIZE =
  40;

const THREAD_PAGE_SIZE =
  40;

const CONVERSATION_KEY = [
  "admin",
  "agency-conversations",
] as const;

// ============================================================
// TYPES
// ============================================================

export type AgencyConversationChannel =
  | "tenant"
  | "owner";

export type AgencyConversationSummary = {
  id: string;

  channel:
    AgencyConversationChannel;

  organizationId:
    string;

  participantId:
    string;

  participantName:
    string;

  participantEmail:
    string | null;

  participantPhone:
    string | null;

  leaseId:
    string | null;

  leaseReference:
    string | null;

  propertyId:
    string | null;

  propertyReference:
    string | null;

  propertyTitle:
    string | null;

  lastMessageAt:
    string | null;

  lastMessagePreview:
    string | null;

  lastMessageSenderRole:
    string | null;

  unreadCount:
    number;

  sortAt:
    string;
};

export type AgencyConversationCounts = {
  totalConversations:
    number;

  tenantConversations:
    number;

  ownerConversations:
    number;

  unreadConversations:
    number;
};

export type AgencyConversationFilters = {
  channel?:
    AgencyConversationChannel | null;

  unreadOnly?:
    boolean;

  search?:
    string;
};

export type AgencyConversationDocument = {
  id: string;

  name: string;

  fileUrl:
    string | null;

  fileType:
    string | null;

  storageBucket:
    string | null;

  storagePath:
    string | null;

  mimeType:
    string | null;

  fileSize:
    number | null;

  category:
    string | null;

  message:
    string | null;
};

export type AgencyConversationMessage = {
  id: string;

  conversationId:
    string;

  senderUserId:
    string;

  senderRole:
    string;

  body:
    string | null;

  documentId:
    string | null;

  createdAt:
    string;

  document:
    AgencyConversationDocument | null;
};

type InboxCursor = {
  sortAt:
    string;

  channel:
    AgencyConversationChannel;

  conversationId:
    string;
};

type InboxPage = {
  rows:
    AgencyConversationSummary[];

  nextCursor:
    InboxCursor | null;
};

type ThreadPage = {
  rows:
    AgencyConversationMessage[];

  nextOffset:
    number | null;
};

// ============================================================
// HELPERS
// ============================================================

const nullableString = (
  value: unknown,
): string | null =>
  typeof value ===
    "string" &&
  value.length > 0
    ? value
    : null;

const nullableNumber = (
  value: unknown,
): number | null => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
};

const normalizeSearch = (
  value:
    string | undefined,
) =>
  value
    ?.trim()
    .slice(
      0,
      120,
    ) ??
  "";

// ============================================================
// GLOBAL COUNTERS
// ============================================================

export const useAgencyConversationCounts =
  () =>
    useQuery<AgencyConversationCounts>({
      queryKey: [
        ...CONVERSATION_KEY,
        "counts",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } =
            await db.rpc(
              "get_agency_conversation_counts",
            );

          if (error) {
            throw error;
          }

          const row =
            Array.isArray(
              data,
            )
              ? data[0]
              : data;

          return {
            totalConversations:
              Number(
                row
                  ?.total_conversations ??
                  0,
              ),

            tenantConversations:
              Number(
                row
                  ?.tenant_conversations ??
                  0,
              ),

            ownerConversations:
              Number(
                row
                  ?.owner_conversations ??
                  0,
              ),

            unreadConversations:
              Number(
                row
                  ?.unread_conversations ??
                  0,
              ),
          };
        },

      staleTime:
        10_000,

      retry:
        false,
    });

// ============================================================
// PAGINATED INBOX
// ============================================================

export const useAgencyConversations =
  (
    filters:
      AgencyConversationFilters = {},
  ) => {
    const channel =
      filters.channel ??
      null;

    const unreadOnly =
      filters.unreadOnly ??
      false;

    const search =
      normalizeSearch(
        filters.search,
      );

    const query =
      useInfiniteQuery({
        queryKey: [
          ...CONVERSATION_KEY,
          "inbox",
          channel,
          unreadOnly,
          search,
        ],

        initialPageParam:
          null as
            | InboxCursor
            | null,

        queryFn:
          async ({
            pageParam,
          }): Promise<InboxPage> => {
            const cursor =
              pageParam as
                | InboxCursor
                | null;

            const {
              data,
              error,
            } =
              await db.rpc(
                "get_agency_conversation_inbox",
                {
                  p_limit:
                    INBOX_PAGE_SIZE,

                  p_before_sort_at:
                    cursor
                      ?.sortAt ??
                    null,

                  p_before_channel:
                    cursor
                      ?.channel ??
                    null,

                  p_before_conversation_id:
                    cursor
                      ?.conversationId ??
                    null,

                  p_channel:
                    channel,

                  p_unread_only:
                    unreadOnly,

                  p_search:
                    search ||
                    null,
                },
              );

            if (error) {
              throw error;
            }

            const rows:
              AgencyConversationSummary[] =
              (
                data ??
                []
              ).map(
                (
                  row:
                    any,
                ) => ({
                  id:
                    String(
                      row.conversation_id,
                    ),

                  channel:
                    row.channel as
                      AgencyConversationChannel,

                  organizationId:
                    String(
                      row.organization_id,
                    ),

                  participantId:
                    String(
                      row.participant_id,
                    ),

                  participantName:
                    nullableString(
                      row.participant_name,
                    ) ??
                    (
                      row.channel ===
                      "tenant"
                        ? "Locataire"
                        : "Propriétaire"
                    ),

                  participantEmail:
                    nullableString(
                      row.participant_email,
                    ),

                  participantPhone:
                    nullableString(
                      row.participant_phone,
                    ),

                  leaseId:
                    nullableString(
                      row.lease_id,
                    ),

                  leaseReference:
                    nullableString(
                      row.lease_reference,
                    ),

                  propertyId:
                    nullableString(
                      row.property_id,
                    ),

                  propertyReference:
                    nullableString(
                      row.property_reference,
                    ),

                  propertyTitle:
                    nullableString(
                      row.property_title,
                    ),

                  lastMessageAt:
                    nullableString(
                      row.last_message_at,
                    ),

                  lastMessagePreview:
                    nullableString(
                      row.last_message_preview,
                    ),

                  lastMessageSenderRole:
                    nullableString(
                      row.last_message_sender_role,
                    ),

                  unreadCount:
                    Number(
                      row.unread_count ??
                      0,
                    ),

                  sortAt:
                    String(
                      row.sort_at,
                    ),
                }),
              );

            const lastRow =
              rows[
                rows.length -
                  1
              ];

            const nextCursor =
              rows.length ===
                INBOX_PAGE_SIZE &&
              lastRow
                ? {
                    sortAt:
                      lastRow.sortAt,

                    channel:
                      lastRow.channel,

                    conversationId:
                      lastRow.id,
                  }
                : null;

            return {
              rows,
              nextCursor,
            };
          },

        getNextPageParam:
          (
            lastPage,
          ) =>
            lastPage.nextCursor ??
            undefined,

        staleTime:
          10_000,

        retry:
          false,
      });

    const data =
      query.data
        ?.pages.flatMap(
          (
            page,
          ) =>
            page.rows,
        ) ??
      [];

    return {
      ...query,

      data,
    };
  };

// ============================================================
// PAGINATED THREAD
//
// Only the selected conversation is queried.
// No other conversation history is downloaded.
// ============================================================

export const useAgencyConversationThread =
  (
    channel:
      AgencyConversationChannel | null,

    conversationId:
      string | null,
  ) => {
    const query =
      useInfiniteQuery({
        queryKey: [
          ...CONVERSATION_KEY,
          "thread",
          channel,
          conversationId,
        ],

        enabled:
          Boolean(
            channel &&
              conversationId,
          ),

        initialPageParam:
          0,

        queryFn:
          async ({
            pageParam,
          }): Promise<ThreadPage> => {
            if (
              !channel ||
              !conversationId
            ) {
              return {
                rows: [],
                nextOffset: null,
              };
            }

            const offset =
              Number(
                pageParam ??
                0,
              );

            const table =
              channel ===
              "tenant"
                ? "lease_messages"
                : "owner_agency_messages";

            const {
              data:
                messageRows,
              error:
                messageError,
            } =
              await db
                .from(
                  table,
                )
                .select(
                  `
                    id,
                    conversation_id,
                    sender_user_id,
                    sender_role,
                    body,
                    document_id,
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
                .range(
                  offset,
                  offset +
                    THREAD_PAGE_SIZE -
                    1,
                );

            if (
              messageError
            ) {
              throw messageError;
            }

            const rawMessages =
              messageRows ??
              [];

            const documentIds =
              Array.from(
                new Set(
                  rawMessages
                    .map(
                      (
                        row:
                          any,
                      ) =>
                        nullableString(
                          row.document_id,
                        ),
                    )
                    .filter(
                      (
                        value,
                      ): value is string =>
                        Boolean(
                          value,
                        ),
                    ),
                ),
              );

            const documentsResult =
              documentIds.length >
              0
                ? await db
                    .from(
                      "documents",
                    )
                    .select(
                      `
                        id,
                        name,
                        file_url,
                        file_type,
                        storage_bucket,
                        storage_path,
                        mime_type,
                        file_size,
                        category,
                        message
                      `,
                    )
                    .in(
                      "id",
                      documentIds,
                    )
                : {
                    data: [],
                    error: null,
                  };

            if (
              documentsResult.error
            ) {
              throw documentsResult.error;
            }

            const documentById =
              new Map(
                (
                  documentsResult.data ??
                  []
                ).map(
                  (
                    row:
                      any,
                  ) => [
                    String(
                      row.id,
                    ),

                    {
                      id:
                        String(
                          row.id,
                        ),

                      name:
                        String(
                          row.name ??
                            "Document",
                        ),

                      fileUrl:
                        nullableString(
                          row.file_url,
                        ),

                      fileType:
                        nullableString(
                          row.file_type,
                        ),

                      storageBucket:
                        nullableString(
                          row.storage_bucket,
                        ),

                      storagePath:
                        nullableString(
                          row.storage_path,
                        ),

                      mimeType:
                        nullableString(
                          row.mime_type,
                        ),

                      fileSize:
                        nullableNumber(
                          row.file_size,
                        ),

                      category:
                        nullableString(
                          row.category,
                        ),

                      message:
                        nullableString(
                          row.message,
                        ),
                    } satisfies
                      AgencyConversationDocument,
                  ],
                ),
              );

            const rows:
              AgencyConversationMessage[] =
              rawMessages
                .map(
                  (
                    row:
                      any,
                  ) => {
                    const documentId =
                      nullableString(
                        row.document_id,
                      );

                    return {
                      id:
                        String(
                          row.id,
                        ),

                      conversationId:
                        String(
                          row.conversation_id,
                        ),

                      senderUserId:
                        String(
                          row.sender_user_id,
                        ),

                      senderRole:
                        String(
                          row.sender_role,
                        ),

                      body:
                        nullableString(
                          row.body,
                        ),

                      documentId,

                      createdAt:
                        String(
                          row.created_at,
                        ),

                      document:
                        documentId
                          ? documentById.get(
                              documentId,
                            ) ??
                            null
                          : null,
                    };
                  },
                )
                .reverse();

            return {
              rows,

              nextOffset:
                rawMessages.length ===
                THREAD_PAGE_SIZE
                  ? offset +
                    THREAD_PAGE_SIZE
                  : null,
            };
          },

        getNextPageParam:
          (
            lastPage,
          ) =>
            lastPage.nextOffset ??
            undefined,

        staleTime:
          5_000,

        retry:
          false,
      });

    // Pages arrive newest -> older.
    // Reverse page order for chronological display.
    const data =
      query.data
        ? [
            ...query.data.pages,
          ]
            .reverse()
            .flatMap(
              (
                page,
              ) =>
                page.rows,
            )
        : [];

    return {
      ...query,

      data,
    };
  };

// ============================================================
// MARK READ
// ============================================================

export const useMarkAgencyConversationRead =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async ({
          channel,
          conversationId,
        }: {
          channel:
            AgencyConversationChannel;

          conversationId:
            string;
        }) => {
          const rpc =
            channel ===
            "tenant"
              ? "mark_lease_conversation_read"
              : "mark_owner_agency_conversation_read";

          const {
            data,
            error,
          } =
            await db.rpc(
              rpc,
              {
                p_conversation_id:
                  conversationId,
              },
            );

          if (error) {
            throw error;
          }

          return data ===
            true;
        },

      onSuccess:
        async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                ...CONVERSATION_KEY,
                "inbox",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                ...CONVERSATION_KEY,
                "counts",
              ],
            }),
          ]);
        },
    });
  };