import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FileImage,
  FileText,
  FolderOpen,
  Inbox,
  Loader2,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from "lucide-react";

import {
  toast,
} from "sonner";

import PageShell from "@/components/PageShell";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  createDocumentAccessUrl,
} from "@/hooks/use-documents";

import {
  type AgencyDocumentChannel,
  type AgencyDocumentItem,
  type AgencyOwnerTarget,
  type AgencyTenantTarget,
  useAgencyDocumentExchange,
  useAgencyDocumentTargets,
  useSendAgencyDocumentMessage,
} from "@/hooks/use-agency-document-exchange";

import {
  type AgencyConversationDocument,
  type AgencyConversationSummary,
  useAgencyConversationCounts,
  useAgencyConversationThread,
  useAgencyConversations,
  useMarkAgencyConversationRead,
} from "@/hooks/use-agency-conversation-thread";

import {
  useAgencyConversationDeepLink,
} from "@/hooks/use-agency-conversation-deeplink";

// ============================================================
// TYPES
// ============================================================

type MainTab =
  | "conversations"
  | "documents";

type ConversationFilter =
  | "all"
  | "unread"
  | "tenant"
  | "owner";

type DocumentChannelFilter =
  | "all"
  | AgencyDocumentChannel;

type DirectionFilter =
  | "all"
  | "received"
  | "sent";

type ComposeChannel =
  | "tenant"
  | "owner";

// ============================================================
// CATEGORIES
// ============================================================

const CATEGORY_OPTIONS = [
  {
    value: "lease",
    label: "Contrat / Bail",
  },
  {
    value: "receipt",
    label: "Quittance / Reçu",
  },
  {
    value: "insurance",
    label: "Assurance",
  },
  {
    value: "identity",
    label: "Identité",
  },
  {
    value: "proof",
    label: "Justificatif",
  },
  {
    value: "inspection",
    label: "État des lieux",
  },
  {
    value: "letter",
    label: "Courrier",
  },
  {
    value: "maintenance",
    label: "Maintenance",
  },
  {
    value: "other",
    label: "Autre",
  },
] as const;

// ============================================================
// HELPERS
// ============================================================

const formatDate = (
  value: string | null,
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const formatCompactDate = (
  value: string | null,
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const now =
    new Date();

  const sameDay =
    now.getFullYear() ===
      date.getFullYear() &&
    now.getMonth() ===
      date.getMonth() &&
    now.getDate() ===
      date.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(date);
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
    },
  ).format(date);
};

const formatMessageTime = (
  value: string,
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const formatFileSize = (
  value: number | null,
) => {
  if (
    value === null ||
    value <= 0
  ) {
    return null;
  }

  if (
    value < 1024
  ) {
    return `${value} o`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${Math.round(
      value / 1024,
    )} Ko`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} Mo`;
};

const categoryLabel = (
  value: string | null,
) =>
  CATEGORY_OPTIONS.find(
    (
      option,
    ) =>
      option.value ===
      value,
  )?.label ??
  value ??
  "Non classé";

const tenantTargetLabel = (
  target:
    AgencyTenantTarget,
) => {
  const context =
    [
      target.leaseReference,
      target.propertyTitle ??
        target.propertyReference,
    ]
      .filter(Boolean)
      .join(" • ");

  return context
    ? `${target.tenantName} — ${context}`
    : target.tenantName;
};

const ownerTargetLabel = (
  target:
    AgencyOwnerTarget,
) =>
  target.ownerName;

// ============================================================
// PAGE
// ============================================================

const DocumentsPage =
  () => {
    // ========================================================
    // URL / DEEP LINKS
    //
    // Tenant:
    // /admin/documents?conversation=<uuid>
    //
    // Owner:
    // /admin/documents?ownerConversation=<uuid>
    // ========================================================

    const [
      searchParams,
    ] =
      useSearchParams();

    const tenantDeepLinkId =
      searchParams.get(
        "conversation",
      );

    const ownerDeepLinkId =
      searchParams.get(
        "ownerConversation",
      );

    const deepLinkChannel =
      ownerDeepLinkId
        ? "owner"
        : tenantDeepLinkId
          ? "tenant"
          : null;

    const deepLinkConversationId =
      ownerDeepLinkId ??
      tenantDeepLinkId;

    // ========================================================
    // DOCUMENT CENTER
    // ========================================================

    const {
      data:
        center,

      isLoading:
        documentsLoading,

      isError:
        documentsError,

      error:
        documentsErrorValue,

      refetch:
        refetchDocuments,
    } =
      useAgencyDocumentExchange();

    // ========================================================
    // SEND TARGETS
    // ========================================================

    const {
      data:
        targets,

      isLoading:
        targetsLoading,

      refetch:
        refetchTargets,
    } =
      useAgencyDocumentTargets();

    // ========================================================
    // COUNTERS
    // ========================================================

    const {
      data:
        conversationCounts,

      refetch:
        refetchCounts,
    } =
      useAgencyConversationCounts();

    // ========================================================
    // MAIN NAVIGATION
    // ========================================================

    const [
      activeTab,
      setActiveTab,
    ] =
      useState<MainTab>(
        "conversations",
      );

    // ========================================================
    // CONVERSATION FILTERS
    // ========================================================

    const [
      conversationSearch,
      setConversationSearch,
    ] =
      useState("");

    const [
      debouncedConversationSearch,
      setDebouncedConversationSearch,
    ] =
      useState("");

    const [
      conversationFilter,
      setConversationFilter,
    ] =
      useState<ConversationFilter>(
        "all",
      );

    useEffect(
      () => {
        const timeout =
          window.setTimeout(
            () => {
              setDebouncedConversationSearch(
                conversationSearch.trim(),
              );
            },
            300,
          );

        return () => {
          window.clearTimeout(
            timeout,
          );
        };
      },
      [
        conversationSearch,
      ],
    );

    const conversationChannel =
      conversationFilter ===
      "tenant"
        ? "tenant"
        : conversationFilter ===
            "owner"
          ? "owner"
          : null;

    const unreadOnly =
      conversationFilter ===
      "unread";

    // ========================================================
    // PAGINATED INBOX
    // ========================================================

    const {
      data:
        conversationRows,

      isLoading:
        conversationsLoading,

      isError:
        conversationsError,

      error:
        conversationsErrorValue,

      refetch:
        refetchConversations,

      fetchNextPage:
        fetchNextConversationPage,

      hasNextPage:
        hasNextConversationPage,

      isFetchingNextPage:
        isFetchingNextConversationPage,
    } =
      useAgencyConversations({
        channel:
          conversationChannel,

        unreadOnly,

        search:
          debouncedConversationSearch,
      });

    // ========================================================
    // DEEP LINK RESOLUTION
    // ========================================================

    const loadedDeepLinkConversation =
      useMemo(
        () => {
          if (
            !deepLinkChannel ||
            !deepLinkConversationId
          ) {
            return null;
          }

          return (
            conversationRows.find(
              (
                conversation,
              ) =>
                conversation.id ===
                  deepLinkConversationId &&
                conversation.channel ===
                  deepLinkChannel,
            ) ??
            null
          );
        },
        [
          conversationRows,
          deepLinkChannel,
          deepLinkConversationId,
        ],
      );

    const {
      data:
        directDeepLinkConversation,

      isLoading:
        directDeepLinkLoading,

      isFetched:
        directDeepLinkFetched,

      isError:
        directDeepLinkError,

      error:
        directDeepLinkErrorValue,
    } =
      useAgencyConversationDeepLink(
        deepLinkChannel,

        loadedDeepLinkConversation
          ? null
          : deepLinkConversationId,
      );

    const resolvedDeepLinkConversation =
      loadedDeepLinkConversation ??
      directDeepLinkConversation ??
      null;

    // ========================================================
    // SEND MUTATION
    // ========================================================

    const sendMessage =
      useSendAgencyDocumentMessage();

    const markRead =
      useMarkAgencyConversationRead();

    // ========================================================
    // SELECTED CONVERSATION
    // ========================================================

    const [
      selectedConversation,
      setSelectedConversation,
    ] =
      useState<
        AgencyConversationSummary | null
      >(
        null,
      );

    const [
      mobileThreadVisible,
      setMobileThreadVisible,
    ] =
      useState(false);

    // ========================================================
    // RESET SELECTION ON FILTER / SEARCH
    //
    // A deep-linked conversation keeps priority.
    // ========================================================

    useEffect(
      () => {
        if (
          deepLinkConversationId
        ) {
          return;
        }

        setSelectedConversation(
          null,
        );

        setMobileThreadVisible(
          false,
        );
      },
      [
        conversationFilter,
        debouncedConversationSearch,
        deepLinkConversationId,
      ],
    );

    // ========================================================
    // DEFAULT CONVERSATION
    // ========================================================

    useEffect(
      () => {
        if (
          deepLinkConversationId
        ) {
          return;
        }

        if (
          selectedConversation ||
          conversationRows.length ===
            0
        ) {
          return;
        }

        setSelectedConversation(
          conversationRows[0],
        );
      },
      [
        deepLinkConversationId,
        selectedConversation,
        conversationRows,
      ],
    );

    // ========================================================
    // CONVERSATION INFINITE SCROLL
    // ========================================================

    const conversationScrollRef =
      useRef<HTMLDivElement | null>(
        null,
      );

    const conversationLoadMoreRef =
      useRef<HTMLDivElement | null>(
        null,
      );

    useEffect(
      () => {
        const root =
          conversationScrollRef.current;

        const target =
          conversationLoadMoreRef.current;

        if (
          !root ||
          !target ||
          !hasNextConversationPage
        ) {
          return;
        }

        const observer =
          new IntersectionObserver(
            (
              entries,
            ) => {
              const entry =
                entries[0];

              if (
                entry?.isIntersecting &&
                !isFetchingNextConversationPage
              ) {
                void fetchNextConversationPage();
              }
            },
            {
              root,
              rootMargin:
                "160px",
              threshold:
                0.01,
            },
          );

        observer.observe(
          target,
        );

        return () => {
          observer.disconnect();
        };
      },
      [
        hasNextConversationPage,
        isFetchingNextConversationPage,
        fetchNextConversationPage,
        conversationRows.length,
      ],
    );

    // ========================================================
    // THREAD
    // ========================================================

    const [
      threadMessage,
      setThreadMessage,
    ] =
      useState("");

    const [
      threadFile,
      setThreadFile,
    ] =
      useState<File | null>(
        null,
      );

    const [
      threadCategory,
      setThreadCategory,
    ] =
      useState("other");

    const threadFileRef =
      useRef<HTMLInputElement | null>(
        null,
      );

    const threadEndRef =
      useRef<HTMLDivElement | null>(
        null,
      );

    const threadScrollRef =
      useRef<HTMLDivElement | null>(
        null,
      );

    const loadingOlderMessagesRef =
      useRef(false);

    const {
      data:
        thread,

      isLoading:
        threadLoading,

      refetch:
        refetchThread,

      fetchNextPage:
        fetchPreviousMessages,

      hasNextPage:
        hasPreviousMessages,

      isFetchingNextPage:
        isFetchingPreviousMessages,
    } =
      useAgencyConversationThread(
        selectedConversation
          ?.channel ??
          null,

        selectedConversation
          ?.id ??
          null,
      );

    // ========================================================
    // LOAD PREVIOUS MESSAGES
    // ========================================================

    const loadPreviousMessages =
      async () => {
        if (
          !hasPreviousMessages ||
          isFetchingPreviousMessages
        ) {
          return;
        }

        const container =
          threadScrollRef.current;

        const previousHeight =
          container
            ?.scrollHeight ??
          0;

        const previousTop =
          container
            ?.scrollTop ??
          0;

        loadingOlderMessagesRef.current =
          true;

        try {
          await fetchPreviousMessages();

          window.setTimeout(
            () => {
              const current =
                threadScrollRef.current;

              if (current) {
                const newHeight =
                  current.scrollHeight;

                current.scrollTop =
                  previousTop +
                  (
                    newHeight -
                    previousHeight
                  );
              }

              loadingOlderMessagesRef.current =
                false;
            },
            0,
          );
        } catch {
          loadingOlderMessagesRef.current =
            false;
        }
      };

    // ========================================================
    // AUTO-SCROLL TO END
    // ========================================================

    useEffect(
      () => {
        if (
          !selectedConversation ||
          threadLoading ||
          loadingOlderMessagesRef.current
        ) {
          return;
        }

        window.setTimeout(
          () => {
            threadEndRef.current?.scrollIntoView(
              {
                block:
                  "nearest",
              },
            );
          },
          0,
        );
      },
      [
        selectedConversation
          ?.id,
        thread?.length,
        threadLoading,
      ],
    );

    // ========================================================
    // OPEN CONVERSATION
    // ========================================================

    const openConversation =
      (
        conversation:
          AgencyConversationSummary,
      ) => {
        setSelectedConversation(
          conversation,
        );

        setThreadMessage(
          "",
        );

        setThreadFile(
          null,
        );

        setThreadCategory(
          "other",
        );

        if (
          threadFileRef.current
        ) {
          threadFileRef.current.value =
            "";
        }

        setMobileThreadVisible(
          true,
        );
      };

    // ========================================================
    // OPEN DEEP LINK
    // ========================================================

    const deepLinkHandledRef =
      useRef<
        string | null
      >(
        null,
      );

    useEffect(
      () => {
        if (
          !deepLinkChannel ||
          !deepLinkConversationId
        ) {
          deepLinkHandledRef.current =
            null;

          return;
        }

        const deepLinkKey =
          `${deepLinkChannel}:${deepLinkConversationId}`;

        if (
          deepLinkHandledRef.current ===
          deepLinkKey
        ) {
          return;
        }

        if (
          resolvedDeepLinkConversation
        ) {
          setActiveTab(
            "conversations",
          );

          openConversation(
            resolvedDeepLinkConversation,
          );

          deepLinkHandledRef.current =
            deepLinkKey;

          return;
        }

        if (
          directDeepLinkError
        ) {
          toast.error(
            directDeepLinkErrorValue instanceof
              Error
              ? directDeepLinkErrorValue.message
              : "Impossible d'ouvrir cette conversation.",
          );

          deepLinkHandledRef.current =
            deepLinkKey;

          return;
        }

        if (
          directDeepLinkFetched &&
          !directDeepLinkLoading &&
          !resolvedDeepLinkConversation
        ) {
          toast.error(
            "Conversation introuvable ou inaccessible.",
          );

          deepLinkHandledRef.current =
            deepLinkKey;
        }
      },
      [
        deepLinkChannel,
        deepLinkConversationId,
        resolvedDeepLinkConversation,
        directDeepLinkFetched,
        directDeepLinkLoading,
        directDeepLinkError,
        directDeepLinkErrorValue,
      ],
    );

    // ========================================================
    // MARK AS READ
    // ========================================================

    useEffect(
      () => {
        if (
          activeTab !==
            "conversations" ||
          !selectedConversation ||
          selectedConversation.unreadCount <=
            0
        ) {
          return;
        }

        const desktopVisible =
          typeof window !==
            "undefined" &&
          window.innerWidth >=
            1024;

        if (
          !desktopVisible &&
          !mobileThreadVisible
        ) {
          return;
        }

        const channel =
          selectedConversation.channel;

        const conversationId =
          selectedConversation.id;

        setSelectedConversation(
          (
            previous,
          ) =>
            previous
              ? {
                  ...previous,
                  unreadCount:
                    0,
                }
              : previous,
        );

        markRead.mutate({
          channel,
          conversationId,
        });
      },
      [
        activeTab,
        selectedConversation
          ?.id,
        selectedConversation
          ?.channel,
        selectedConversation
          ?.unreadCount,
        mobileThreadVisible,
      ],
    );

    // ========================================================
    // DOCUMENT FILTERS
    // ========================================================

    const [
      documentSearch,
      setDocumentSearch,
    ] =
      useState("");

    const [
      documentChannelFilter,
      setDocumentChannelFilter,
    ] =
      useState<DocumentChannelFilter>(
        "all",
      );

    const [
      directionFilter,
      setDirectionFilter,
    ] =
      useState<DirectionFilter>(
        "all",
      );

    const [
      openingDocumentId,
      setOpeningDocumentId,
    ] =
      useState<
        string | null
      >(
        null,
      );

    const documents =
      center?.documents ??
      [];

    const filteredDocuments =
      useMemo(
        () => {
          const normalized =
            documentSearch
              .trim()
              .toLowerCase();

          return documents.filter(
            (
              document,
            ) => {
              if (
                documentChannelFilter !==
                  "all" &&
                document.channel !==
                  documentChannelFilter
              ) {
                return false;
              }

              if (
                directionFilter !==
                  "all" &&
                document.direction !==
                  directionFilter
              ) {
                return false;
              }

              if (!normalized) {
                return true;
              }

              return [
                document.name,
                document.personName,
                document.personEmail,
                document.personPhone,
                document.leaseReference,
                document.propertyReference,
                document.propertyTitle,
                document.category,
                document.message,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(
                  normalized,
                );
            },
          );
        },
        [
          documents,
          documentSearch,
          documentChannelFilter,
          directionFilter,
        ],
      );

    // ========================================================
    // NEW MESSAGE
    // ========================================================

    const [
      composeOpen,
      setComposeOpen,
    ] =
      useState(false);

    const [
      composeChannel,
      setComposeChannel,
    ] =
      useState<ComposeChannel>(
        "tenant",
      );

    const [
      selectedLeaseId,
      setSelectedLeaseId,
    ] =
      useState("");

    const [
      selectedOwnerId,
      setSelectedOwnerId,
    ] =
      useState("");

    const [
      composeMessage,
      setComposeMessage,
    ] =
      useState("");

    const [
      composeFile,
      setComposeFile,
    ] =
      useState<File | null>(
        null,
      );

    const [
      composeCategory,
      setComposeCategory,
    ] =
      useState("other");

    const composeFileRef =
      useRef<HTMLInputElement | null>(
        null,
      );

    const tenantTargets =
      targets?.tenantTargets ??
      [];

    const ownerTargets =
      targets?.ownerTargets ??
      [];

    // ========================================================
    // RESET COMPOSER
    // ========================================================

    const resetCompose =
      () => {
        setComposeChannel(
          "tenant",
        );

        setSelectedLeaseId(
          "",
        );

        setSelectedOwnerId(
          "",
        );

        setComposeMessage(
          "",
        );

        setComposeFile(
          null,
        );

        setComposeCategory(
          "other",
        );

        if (
          composeFileRef.current
        ) {
          composeFileRef.current.value =
            "";
        }
      };

    // ========================================================
    // OPEN DOCUMENT
    // ========================================================

    const openRawDocument =
      async (
        document: {
          id: string;
          name: string;
          fileUrl: string | null;
          fileType: string | null;
          storageBucket: string | null;
          storagePath: string | null;
          mimeType: string | null;
          fileSize: number | null;
        },
      ) => {
        const popup =
          window.open(
            "about:blank",
            "_blank",
          );

        if (!popup) {
          toast.error(
            "Autorisez les fenêtres contextuelles pour ouvrir ce document.",
          );

          return;
        }

        popup.opener =
          null;

        try {
          const url =
            await createDocumentAccessUrl(
              {
                id:
                  document.id,

                name:
                  document.name,

                file_url:
                  document.fileUrl,

                file_type:
                  document.fileType,

                storage_bucket:
                  document.storageBucket,

                storage_path:
                  document.storagePath,

                mime_type:
                  document.mimeType,

                file_size:
                  document.fileSize,
              } as any,
            );

          popup.location.href =
            url;
        } catch (
          documentError:
            unknown
        ) {
          popup.close();

          toast.error(
            documentError instanceof
              Error
              ? documentError.message
              : "Impossible d'ouvrir le document.",
          );
        }
      };

    const handleOpenDocument =
      async (
        document:
          AgencyDocumentItem,
      ) => {
        setOpeningDocumentId(
          document.id,
        );

        try {
          await openRawDocument(
            document,
          );
        } finally {
          setOpeningDocumentId(
            null,
          );
        }
      };

    // ========================================================
    // DOCUMENT -> CONVERSATION
    // ========================================================

    const openDocumentConversation =
      (
        document:
          AgencyDocumentItem,
      ) => {
        if (
          document.conversationId
        ) {
          const loadedConversation =
            conversationRows.find(
              (
                conversation,
              ) =>
                conversation.id ===
                  document.conversationId &&
                conversation.channel ===
                  document.channel,
            );

          if (
            loadedConversation
          ) {
            setActiveTab(
              "conversations",
            );

            openConversation(
              loadedConversation,
            );

            return;
          }

          if (
            document.channel ===
              "tenant" &&
            document.personId &&
            document.leaseId
          ) {
            const fallbackConversation:
              AgencyConversationSummary =
              {
                id:
                  document.conversationId,

                channel:
                  "tenant",

                organizationId:
                  document.organizationId ??
                  "",

                participantId:
                  document.personId,

                participantName:
                  document.personName ??
                  "Locataire",

                participantEmail:
                  document.personEmail,

                participantPhone:
                  document.personPhone,

                leaseId:
                  document.leaseId,

                leaseReference:
                  document.leaseReference,

                propertyId:
                  document.propertyId,

                propertyReference:
                  document.propertyReference,

                propertyTitle:
                  document.propertyTitle,

                lastMessageAt:
                  document.uploadedAt,

                lastMessagePreview:
                  document.message ??
                  document.name,

                lastMessageSenderRole:
                  document.senderRole,

                unreadCount:
                  0,

                sortAt:
                  document.uploadedAt ??
                  new Date().toISOString(),
              };

            setActiveTab(
              "conversations",
            );

            openConversation(
              fallbackConversation,
            );

            return;
          }

          if (
            document.channel ===
              "owner" &&
            document.personId
          ) {
            const fallbackConversation:
              AgencyConversationSummary =
              {
                id:
                  document.conversationId,

                channel:
                  "owner",

                organizationId:
                  document.organizationId ??
                  "",

                participantId:
                  document.personId,

                participantName:
                  document.personName ??
                  "Propriétaire",

                participantEmail:
                  document.personEmail,

                participantPhone:
                  document.personPhone,

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
                  document.uploadedAt,

                lastMessagePreview:
                  document.message ??
                  document.name,

                lastMessageSenderRole:
                  document.senderRole,

                unreadCount:
                  0,

                sortAt:
                  document.uploadedAt ??
                  new Date().toISOString(),
              };

            setActiveTab(
              "conversations",
            );

            openConversation(
              fallbackConversation,
            );

            return;
          }
        }

        resetCompose();

        if (
          document.channel ===
            "tenant" &&
          document.leaseId
        ) {
          setComposeChannel(
            "tenant",
          );

          setSelectedLeaseId(
            document.leaseId,
          );

          setComposeCategory(
            document.category ??
              "other",
          );

          setComposeOpen(
            true,
          );

          return;
        }

        if (
          document.channel ===
            "owner" &&
          document.personId
        ) {
          setComposeChannel(
            "owner",
          );

          setSelectedOwnerId(
            document.personId,
          );

          setComposeCategory(
            document.category ??
              "other",
          );

          setComposeOpen(
            true,
          );

          return;
        }

        toast.error(
          "Impossible d'identifier l'échange associé à ce document.",
        );
      };

    // ========================================================
    // SEND NEW MESSAGE
    // ========================================================

    const sendNewMessage =
      async () => {
        const message =
          composeMessage.trim();

        if (
          !message &&
          !composeFile
        ) {
          toast.error(
            "Ajoutez un message ou un document.",
          );

          return;
        }

        try {
          if (
            composeChannel ===
            "tenant"
          ) {
            if (
              !selectedLeaseId
            ) {
              toast.error(
                "Sélectionnez un locataire.",
              );

              return;
            }

            await sendMessage.mutateAsync({
              channel:
                "tenant",

              leaseId:
                selectedLeaseId,

              message,

              file:
                composeFile,

              category:
                composeCategory,
            });
          } else {
            if (
              !selectedOwnerId
            ) {
              toast.error(
                "Sélectionnez un propriétaire.",
              );

              return;
            }

            await sendMessage.mutateAsync({
              channel:
                "owner",

              ownerId:
                selectedOwnerId,

              message,

              file:
                composeFile,

              category:
                composeCategory,
            });
          }

          toast.success(
            "Message envoyé.",
          );

          setComposeOpen(
            false,
          );

          resetCompose();

          await Promise.all([
            refetchDocuments(),
            refetchConversations(),
            refetchCounts(),
            refetchTargets(),
          ]);
        } catch (
          sendError:
            unknown
        ) {
          toast.error(
            sendError instanceof
              Error
              ? sendError.message
              : "Impossible d'envoyer le message.",
          );
        }
      };

    // ========================================================
    // SEND THREAD REPLY
    // ========================================================

    const sendThreadReply =
      async () => {
        if (
          !selectedConversation
        ) {
          return;
        }

        const message =
          threadMessage.trim();

        if (
          !message &&
          !threadFile
        ) {
          toast.error(
            "Ajoutez un message ou un document.",
          );

          return;
        }

        try {
          if (
            selectedConversation.channel ===
            "tenant"
          ) {
            if (
              !selectedConversation.leaseId
            ) {
              throw new Error(
                "Bail introuvable.",
              );
            }

            await sendMessage.mutateAsync({
              channel:
                "tenant",

              leaseId:
                selectedConversation.leaseId,

              message,

              file:
                threadFile,

              category:
                threadCategory,
            });
          } else {
            await sendMessage.mutateAsync({
              channel:
                "owner",

              ownerId:
                selectedConversation.participantId,

              message,

              file:
                threadFile,

              category:
                threadCategory,
            });
          }

          setThreadMessage(
            "",
          );

          setThreadFile(
            null,
          );

          setThreadCategory(
            "other",
          );

          if (
            threadFileRef.current
          ) {
            threadFileRef.current.value =
              "";
          }

          await Promise.all([
            refetchThread(),
            refetchConversations(),
            refetchCounts(),
            refetchDocuments(),
          ]);

          toast.success(
            "Réponse envoyée.",
          );
        } catch (
          replyError:
            unknown
        ) {
          toast.error(
            replyError instanceof
              Error
              ? replyError.message
              : "Impossible d'envoyer la réponse.",
          );
        }
      };

    // ========================================================
    // REFRESH
    // ========================================================

    const refreshAll =
      async () => {
        await Promise.all([
          refetchConversations(),
          refetchCounts(),
          refetchDocuments(),
          refetchTargets(),
          selectedConversation
            ? refetchThread()
            : Promise.resolve(),
        ]);
      };

    // ========================================================
    // PAGE STATES
    // ========================================================

    if (
      documentsLoading ||
      conversationsLoading
    ) {
      return (
        <PageShell
          title="Documents"
          subtitle="Messagerie et documents de gestion"
        >
          <div className="flex min-h-[480px] items-center justify-center">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
          </div>
        </PageShell>
      );
    }

    if (
      documentsError ||
      conversationsError
    ) {
      const value =
        documentsError
          ? documentsErrorValue
          : conversationsErrorValue;

      return (
        <PageShell
          title="Documents"
          subtitle="Messagerie et documents de gestion"
        >
          <div className="rounded-2xl border border-destructive/20 bg-card p-6">
            <p className="font-semibold text-destructive">
              Impossible de charger les échanges
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              {value instanceof
              Error
                ? value.message
                : "Une erreur est survenue."}
            </p>
          </div>
        </PageShell>
      );
    }

    // ========================================================
    // UI
    // ========================================================

    return (
      <PageShell
        title="Documents"
        subtitle="Messagerie centralisée AmImo avec les locataires et propriétaires"
      >
        <div className="space-y-5">
          {/* ================================================= */}
          {/* HEADER                                            */}
          {/* ================================================= */}

          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Centre d'échanges
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Les conversations sont chargées progressivement par lots de 40.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="px-3 py-1.5"
              >
                Conversations{" "}
                {
                  conversationCounts
                    ?.totalConversations ??
                  0
                }
              </Badge>

              <Badge
                variant="outline"
                className={
                  (
                    conversationCounts
                      ?.unreadConversations ??
                    0
                  ) >
                  0
                    ? "border-primary/30 bg-primary/5 px-3 py-1.5 text-primary"
                    : "px-3 py-1.5"
                }
              >
                Non lues{" "}
                {
                  conversationCounts
                    ?.unreadConversations ??
                  0
                }
              </Badge>

              <Badge
                variant="outline"
                className="px-3 py-1.5"
              >
                Documents{" "}
                {
                  center?.total ??
                  0
                }
              </Badge>

              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Actualiser"
                onClick={() => {
                  void refreshAll();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                onClick={() => {
                  resetCompose();

                  setComposeOpen(
                    true,
                  );
                }}
              >
                <Plus className="h-4 w-4" />
                Nouveau message
              </Button>
            </div>
          </div>

          {/* ================================================= */}
          {/* MAIN TABS                                         */}
          {/* ================================================= */}

          <div className="flex gap-2 border-b">
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "conversations",
                )
              }
              className={
                activeTab ===
                  "conversations"
                  ? "border-b-2 border-primary px-4 py-3 text-sm font-semibold text-primary"
                  : "px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              }
            >
              Conversations
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "documents",
                )
              }
              className={
                activeTab ===
                  "documents"
                  ? "border-b-2 border-primary px-4 py-3 text-sm font-semibold text-primary"
                  : "px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              }
            >
              Documents
            </button>
          </div>

          {/* ================================================= */}
          {/* CONVERSATIONS                                     */}
          {/* ================================================= */}

          {activeTab ===
            "conversations" && (
            <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="grid min-h-[680px] lg:grid-cols-[390px_minmax(0,1fr)]">
                {/* =========================================== */}
                {/* LEFT INBOX                                  */}
                {/* =========================================== */}

                <aside
                  className={
                    mobileThreadVisible
                      ? "hidden min-w-0 border-r lg:flex lg:flex-col"
                      : "flex min-w-0 flex-col border-r"
                  }
                >
                  {/* SEARCH */}

                  <div className="space-y-3 border-b p-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <input
                        type="search"
                        value={
                          conversationSearch
                        }
                        onChange={(
                          event,
                        ) =>
                          setConversationSearch(
                            event.target.value,
                          )
                        }
                        placeholder="Nom, bail, bien, téléphone..."
                        className="h-10 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    {/* SERVER FILTERS */}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConversationFilter(
                            "all",
                          )
                        }
                        className={
                          conversationFilter ===
                          "all"
                            ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                            : "rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        Tous{" "}
                        {
                          conversationCounts
                            ?.totalConversations ??
                          0
                        }
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConversationFilter(
                            "unread",
                          )
                        }
                        className={
                          conversationFilter ===
                          "unread"
                            ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                            : "rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        Non lus{" "}
                        {
                          conversationCounts
                            ?.unreadConversations ??
                          0
                        }
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConversationFilter(
                            "tenant",
                          )
                        }
                        className={
                          conversationFilter ===
                          "tenant"
                            ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                            : "rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        Locataires{" "}
                        {
                          conversationCounts
                            ?.tenantConversations ??
                          0
                        }
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConversationFilter(
                            "owner",
                          )
                        }
                        className={
                          conversationFilter ===
                          "owner"
                            ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                            : "rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        Propriétaires{" "}
                        {
                          conversationCounts
                            ?.ownerConversations ??
                          0
                        }
                      </button>
                    </div>

                    {conversationSearch !==
                      debouncedConversationSearch && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Recherche...
                      </div>
                    )}
                  </div>

                  {/* PAGINATED LIST */}

                  <div
                    ref={
                      conversationScrollRef
                    }
                    className="min-h-0 flex-1 overflow-y-auto"
                  >
                    {conversationRows.length ===
                    0 ? (
                      <div className="p-8 text-center">
                        <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />

                        <p className="mt-3 text-sm text-muted-foreground">
                          Aucune conversation trouvée.
                        </p>
                      </div>
                    ) : (
                      conversationRows.map(
                        (
                          conversation,
                        ) => {
                          const selected =
                            selectedConversation
                              ?.id ===
                              conversation.id &&
                            selectedConversation
                              ?.channel ===
                              conversation.channel;

                          const tenant =
                            conversation.channel ===
                            "tenant";

                          return (
                            <button
                              key={
                                `${conversation.channel}-${conversation.id}`
                              }
                              type="button"
                              onClick={() =>
                                openConversation(
                                  conversation,
                                )
                              }
                              className={
                                selected
                                  ? "w-full border-b border-l-4 border-l-primary bg-primary/5 p-4 text-left"
                                  : "w-full border-b border-l-4 border-l-transparent p-4 text-left transition hover:bg-muted/40"
                              }
                            >
                              <div className="flex gap-3">
                                <div
                                  className={
                                    tenant
                                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"
                                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"
                                  }
                                >
                                  {tenant ? (
                                    <UserRound className="h-5 w-5" />
                                  ) : (
                                    <Building2 className="h-5 w-5" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p
                                        className={
                                          conversation.unreadCount >
                                          0
                                            ? "truncate text-sm font-bold text-foreground"
                                            : "truncate text-sm font-semibold text-foreground"
                                        }
                                      >
                                        {
                                          conversation.participantName
                                        }
                                      </p>

                                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                        {tenant
                                          ? conversation.leaseReference ??
                                            "Locataire"
                                          : "Propriétaire"}
                                      </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatCompactDate(
                                          conversation.lastMessageAt,
                                        )}
                                      </span>

                                      {conversation.unreadCount >
                                        0 && (
                                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                          {
                                            conversation.unreadCount
                                          }
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {tenant &&
                                    conversation.propertyTitle && (
                                      <p className="mt-1 truncate text-xs text-muted-foreground">
                                        {
                                          conversation.propertyTitle
                                        }
                                      </p>
                                    )}

                                  <p
                                    className={
                                      conversation.unreadCount >
                                      0
                                        ? "mt-2 line-clamp-2 text-xs font-semibold text-foreground"
                                        : "mt-2 line-clamp-2 text-xs text-muted-foreground"
                                    }
                                  >
                                    {conversation.lastMessagePreview ??
                                      "Aucun message"}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        },
                      )
                    )}

                    {/* INFINITE SCROLL */}

                    <div
                      ref={
                        conversationLoadMoreRef
                      }
                      className="p-3 text-center"
                    >
                      {isFetchingNextConversationPage ? (
                        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement...
                        </div>
                      ) : hasNextConversationPage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            void fetchNextConversationPage();
                          }}
                        >
                          Charger 40 conversations supplémentaires
                        </Button>
                      ) : conversationRows.length >
                        0 ? (
                        <p className="py-2 text-[11px] text-muted-foreground">
                          Toutes les conversations sont chargées.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </aside>

                {/* =========================================== */}
                {/* RIGHT THREAD                                */}
                {/* =========================================== */}

                <div
                  className={
                    mobileThreadVisible
                      ? "flex min-w-0 flex-col"
                      : "hidden min-w-0 flex-col lg:flex"
                  }
                >
                  {!selectedConversation ? (
                    deepLinkConversationId &&
                    directDeepLinkLoading ? (
                      <div className="flex flex-1 items-center justify-center p-10">
                        <div className="text-center">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />

                          <p className="mt-3 text-sm text-muted-foreground">
                            Ouverture de la conversation...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center p-10 text-center">
                        <div>
                          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" />

                          <p className="mt-4 font-semibold">
                            Sélectionnez une conversation
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            Seul l'historique de cette conversation sera chargé.
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    <>
                      {/* THREAD HEADER */}

                      <header className="border-b bg-background p-4">
                        <div className="flex items-start gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 lg:hidden"
                            onClick={() =>
                              setMobileThreadVisible(
                                false,
                              )
                            }
                          >
                            <ArrowLeft className="h-5 w-5" />
                          </Button>

                          <div
                            className={
                              selectedConversation.channel ===
                              "tenant"
                                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"
                                : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"
                            }
                          >
                            {selectedConversation.channel ===
                            "tenant" ? (
                              <UserRound className="h-5 w-5" />
                            ) : (
                              <Building2 className="h-5 w-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="font-bold text-foreground">
                                {
                                  selectedConversation.participantName
                                }
                              </h2>

                              <Badge variant="outline">
                                {selectedConversation.channel ===
                                "tenant"
                                  ? "LOCATAIRE"
                                  : "PROPRIÉTAIRE"}
                              </Badge>
                            </div>

                            {selectedConversation.channel ===
                            "tenant" ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {selectedConversation.leaseReference ??
                                  "Bail"}

                                {selectedConversation.propertyTitle
                                  ? ` • ${selectedConversation.propertyTitle}`
                                  : ""}

                                {selectedConversation.propertyReference
                                  ? ` • ${selectedConversation.propertyReference}`
                                  : ""}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Échange Propriétaire ⇄ AmImo
                              </p>
                            )}
                          </div>
                        </div>
                      </header>

                      {/* THREAD */}

                      <div
                        ref={
                          threadScrollRef
                        }
                        className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6"
                      >
                        {threadLoading ? (
                          <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="mx-auto max-w-4xl">
                            {/* OLDER MESSAGES */}

                            {hasPreviousMessages && (
                              <div className="mb-5 flex justify-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={
                                    isFetchingPreviousMessages
                                  }
                                  onClick={() => {
                                    void loadPreviousMessages();
                                  }}
                                >
                                  {isFetchingPreviousMessages ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Chargement...
                                    </>
                                  ) : (
                                    <>
                                      <ArrowLeft className="h-4 w-4 rotate-90" />
                                      Charger les messages précédents
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}

                            <div className="space-y-4">
                              {(thread ?? []).map(
                                (
                                  message,
                                ) => {
                                  const agency =
                                    message.senderRole ===
                                    "agency";

                                  return (
                                    <div
                                      key={
                                        message.id
                                      }
                                      className={
                                        agency
                                          ? "flex justify-end"
                                          : "flex justify-start"
                                      }
                                    >
                                      <div
                                        className={
                                          agency
                                            ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground sm:max-w-[70%]"
                                            : "max-w-[85%] rounded-2xl rounded-bl-md border bg-background px-4 py-3 shadow-sm sm:max-w-[70%]"
                                        }
                                      >
                                        <div className="flex items-center justify-between gap-4">
                                          <p
                                            className={
                                              agency
                                                ? "text-xs font-semibold text-primary-foreground/75"
                                                : "text-xs font-semibold text-muted-foreground"
                                            }
                                          >
                                            {agency
                                              ? "AmImo"
                                              : selectedConversation.participantName}
                                          </p>

                                          <p
                                            className={
                                              agency
                                                ? "text-[10px] text-primary-foreground/60"
                                                : "text-[10px] text-muted-foreground"
                                            }
                                          >
                                            {formatMessageTime(
                                              message.createdAt,
                                            )}
                                          </p>
                                        </div>

                                        {message.body && (
                                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                                            {
                                              message.body
                                            }
                                          </p>
                                        )}

                                        {message.document && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void openRawDocument(
                                                message.document as AgencyConversationDocument,
                                              )
                                            }
                                            className={
                                              agency
                                                ? "mt-3 flex w-full items-center gap-3 rounded-xl bg-primary-foreground/10 p-3 text-left transition hover:bg-primary-foreground/15"
                                                : "mt-3 flex w-full items-center gap-3 rounded-xl bg-muted p-3 text-left transition hover:bg-muted/70"
                                            }
                                          >
                                            <Paperclip className="h-4 w-4 shrink-0" />

                                            <div className="min-w-0 flex-1">
                                              <p className="truncate text-sm font-semibold">
                                                {
                                                  message.document.name
                                                }
                                              </p>

                                              <p className="mt-0.5 text-xs opacity-70">
                                                {formatFileSize(
                                                  message.document.fileSize,
                                                ) ??
                                                  categoryLabel(
                                                    message.document.category,
                                                  )}
                                              </p>
                                            </div>

                                            <ExternalLink className="h-4 w-4 shrink-0" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                },
                              )}

                              {(thread ?? []).length ===
                                0 && (
                                <div className="py-16 text-center text-sm text-muted-foreground">
                                  Aucun message dans cette conversation.
                                </div>
                              )}

                              <div
                                ref={
                                  threadEndRef
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* REPLY */}

                      <div className="border-t bg-background p-4">
                        <div className="mx-auto max-w-4xl space-y-3">
                          <textarea
                            value={
                              threadMessage
                            }
                            onChange={(
                              event,
                            ) =>
                              setThreadMessage(
                                event.target.value,
                              )
                            }
                            rows={
                              3
                            }
                            maxLength={
                              2000
                            }
                            placeholder={`Répondre à ${selectedConversation.participantName}...`}
                            className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <input
                              ref={
                                threadFileRef
                              }
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.webp"
                              onChange={(
                                event,
                              ) =>
                                setThreadFile(
                                  event.target
                                    .files?.[0] ??
                                    null,
                                )
                              }
                              className="min-w-0 flex-1 text-sm"
                            />

                            {threadFile && (
                              <select
                                value={
                                  threadCategory
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setThreadCategory(
                                    event.target.value,
                                  )
                                }
                                className="h-10 rounded-xl border bg-background px-3 text-sm"
                              >
                                {CATEGORY_OPTIONS.map(
                                  (
                                    option,
                                  ) => (
                                    <option
                                      key={
                                        option.value
                                      }
                                      value={
                                        option.value
                                      }
                                    >
                                      {
                                        option.label
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            )}

                            <Button
                              type="button"
                              disabled={
                                sendMessage.isPending ||
                                (
                                  !threadMessage.trim() &&
                                  !threadFile
                                )
                              }
                              onClick={() => {
                                void sendThreadReply();
                              }}
                            >
                              {sendMessage.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}

                              Envoyer
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ================================================= */}
          {/* DOCUMENTS                                        */}
          {/* ================================================= */}

          {activeTab ===
            "documents" && (
            <section className="space-y-4">
              {/* FILTERS */}

              <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      [
                        "all",
                        "Tous",
                      ],
                      [
                        "tenant",
                        "Locataires",
                      ],
                      [
                        "owner",
                        "Propriétaires",
                      ],
                      [
                        "internal",
                        "Internes",
                      ],
                    ] as const
                  ).map(
                    (
                      [
                        value,
                        label,
                      ],
                    ) => (
                      <Button
                        key={
                          value
                        }
                        type="button"
                        size="sm"
                        variant={
                          documentChannelFilter ===
                          value
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setDocumentChannelFilter(
                            value,
                          )
                        }
                      >
                        {label}
                      </Button>
                    ),
                  )}
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_190px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <input
                      type="search"
                      value={
                        documentSearch
                      }
                      onChange={(
                        event,
                      ) =>
                        setDocumentSearch(
                          event.target.value,
                        )
                      }
                      placeholder="Document, personne, bail, bien..."
                      className="h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <select
                    value={
                      directionFilter
                    }
                    onChange={(
                      event,
                    ) =>
                      setDirectionFilter(
                        event.target
                          .value as
                          DirectionFilter,
                      )
                    }
                    className="h-11 rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="all">
                      Tous les sens
                    </option>

                    <option value="received">
                      Reçus
                    </option>

                    <option value="sent">
                      Envoyés
                    </option>
                  </select>
                </div>
              </div>

              {/* DOCUMENT TABLE */}

              {filteredDocuments.length ===
              0 ? (
                <div className="rounded-2xl border bg-card p-12 text-center">
                  <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground" />

                  <p className="mt-3 text-sm text-muted-foreground">
                    Aucun document.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                      <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-semibold">
                            Document
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            Canal
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            Personne
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            Contexte
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            Sens
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            Catégorie
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            Date
                          </th>

                          <th className="px-4 py-3 text-right font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {filteredDocuments.map(
                          (
                            document,
                          ) => {
                            const type =
                              (
                                document.mimeType ??
                                document.fileType ??
                                ""
                              ).toLowerCase();

                            const FileIcon =
                              type.includes(
                                "image",
                              )
                                ? FileImage
                                : FileText;

                            return (
                              <tr
                                key={
                                  document.id
                                }
                                className="transition hover:bg-muted/20"
                              >
                                {/* DOCUMENT */}

                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                      <FileIcon className="h-4 w-4" />
                                    </div>

                                    <div className="min-w-0">
                                      <p className="max-w-[240px] truncate font-semibold">
                                        {
                                          document.name
                                        }
                                      </p>

                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {formatFileSize(
                                          document.fileSize,
                                        ) ??
                                          "—"}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* CHANNEL */}

                                <td className="px-4 py-3">
                                  <Badge variant="outline">
                                    {document.channel ===
                                    "tenant"
                                      ? "Locataire"
                                      : document.channel ===
                                          "owner"
                                        ? "Propriétaire"
                                        : "Interne"}
                                  </Badge>
                                </td>

                                {/* PERSON */}

                                <td className="px-4 py-3">
                                  <p className="max-w-[180px] truncate font-medium">
                                    {document.personName ??
                                      "—"}
                                  </p>
                                </td>

                                {/* CONTEXT */}

                                <td className="px-4 py-3">
                                  {document.channel ===
                                  "tenant" ? (
                                    <div>
                                      <p className="font-medium">
                                        {document.leaseReference ??
                                          "—"}
                                      </p>

                                      <p className="mt-0.5 max-w-[220px] truncate text-xs text-muted-foreground">
                                        {document.propertyTitle ??
                                          document.propertyReference ??
                                          ""}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </td>

                                {/* DIRECTION */}

                                <td className="px-4 py-3">
                                  <Badge
                                    variant="outline"
                                    className={
                                      document.direction ===
                                      "received"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : document.direction ===
                                            "sent"
                                          ? "border-sky-200 bg-sky-50 text-sky-700"
                                          : ""
                                    }
                                  >
                                    {document.direction ===
                                    "received"
                                      ? "Reçu"
                                      : document.direction ===
                                          "sent"
                                        ? "Envoyé"
                                        : "—"}
                                  </Badge>
                                </td>

                                {/* CATEGORY */}

                                <td className="px-4 py-3">
                                  {
                                    categoryLabel(
                                      document.category,
                                    )
                                  }
                                </td>

                                {/* DATE */}

                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                  {formatDate(
                                    document.uploadedAt,
                                  )}
                                </td>

                                {/* ACTIONS */}

                                <td className="px-4 py-3">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={
                                        openingDocumentId ===
                                        document.id
                                      }
                                      onClick={() => {
                                        void handleOpenDocument(
                                          document,
                                        );
                                      }}
                                    >
                                      {openingDocumentId ===
                                      document.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <ExternalLink className="h-4 w-4" />
                                      )}

                                      Ouvrir
                                    </Button>

                                    {(
                                      document.conversationId ||
                                      (
                                        document.channel ===
                                          "tenant" &&
                                        document.leaseId
                                      ) ||
                                      (
                                        document.channel ===
                                          "owner" &&
                                        document.personId
                                      )
                                    ) && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                          openDocumentConversation(
                                            document,
                                          )
                                        }
                                      >
                                        <MessageCircle className="h-4 w-4" />
                                        Échange
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ================================================= */}
          {/* NEW MESSAGE DIALOG                               */}
          {/* ================================================= */}

          <Dialog
            open={
              composeOpen
            }
            onOpenChange={(
              open,
            ) => {
              setComposeOpen(
                open,
              );

              if (
                !open &&
                !sendMessage.isPending
              ) {
                resetCompose();
              }
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Nouveau message / document
                </DialogTitle>

                <DialogDescription>
                  Envoyez un message, un document ou les deux.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* CHANNEL */}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={
                      composeChannel ===
                      "tenant"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => {
                      setComposeChannel(
                        "tenant",
                      );

                      setSelectedOwnerId(
                        "",
                      );
                    }}
                  >
                    <UserRound className="h-4 w-4" />
                    Locataire
                  </Button>

                  <Button
                    type="button"
                    variant={
                      composeChannel ===
                      "owner"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => {
                      setComposeChannel(
                        "owner",
                      );

                      setSelectedLeaseId(
                        "",
                      );
                    }}
                  >
                    <Building2 className="h-4 w-4" />
                    Propriétaire
                  </Button>
                </div>

                {/* TARGET */}

                {composeChannel ===
                "tenant" ? (
                  <select
                    value={
                      selectedLeaseId
                    }
                    disabled={
                      targetsLoading
                    }
                    onChange={(
                      event,
                    ) =>
                      setSelectedLeaseId(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="">
                      Sélectionner un locataire...
                    </option>

                    {tenantTargets.map(
                      (
                        target,
                      ) => (
                        <option
                          key={
                            target.leaseId
                          }
                          value={
                            target.leaseId
                          }
                        >
                          {tenantTargetLabel(
                            target,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <select
                    value={
                      selectedOwnerId
                    }
                    disabled={
                      targetsLoading
                    }
                    onChange={(
                      event,
                    ) =>
                      setSelectedOwnerId(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="">
                      Sélectionner un propriétaire...
                    </option>

                    {ownerTargets.map(
                      (
                        target,
                      ) => (
                        <option
                          key={
                            target.ownerId
                          }
                          value={
                            target.ownerId
                          }
                        >
                          {ownerTargetLabel(
                            target,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                )}

                {/* MESSAGE */}

                <textarea
                  value={
                    composeMessage
                  }
                  onChange={(
                    event,
                  ) =>
                    setComposeMessage(
                      event.target.value,
                    )
                  }
                  rows={
                    5
                  }
                  maxLength={
                    2000
                  }
                  placeholder="Votre message..."
                  className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />

                {/* FILE */}

                <input
                  ref={
                    composeFileRef
                  }
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(
                    event,
                  ) =>
                    setComposeFile(
                      event.target
                        .files?.[0] ??
                        null,
                    )
                  }
                  className="text-sm"
                />

                {composeFile && (
                  <select
                    value={
                      composeCategory
                    }
                    onChange={(
                      event,
                    ) =>
                      setComposeCategory(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    {CATEGORY_OPTIONS.map(
                      (
                        option,
                      ) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    sendMessage.isPending
                  }
                  onClick={() =>
                    setComposeOpen(
                      false,
                    )
                  }
                >
                  Annuler
                </Button>

                <Button
                  type="button"
                  disabled={
                    sendMessage.isPending ||
                    (
                      !composeMessage.trim() &&
                      !composeFile
                    ) ||
                    (
                      composeChannel ===
                        "tenant" &&
                      !selectedLeaseId
                    ) ||
                    (
                      composeChannel ===
                        "owner" &&
                      !selectedOwnerId
                    )
                  }
                  onClick={() => {
                    void sendNewMessage();
                  }}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}

                  Envoyer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageShell>
    );
  };

export default DocumentsPage;