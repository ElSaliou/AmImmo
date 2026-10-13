import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

// ============================================================
// F2.1H — AGENCY-MEDIATED DOCUMENT EXCHANGE
//
// TENANT <-> AGENCY
// OWNER  <-> AGENCY
//
// There is intentionally NO tenant <-> owner exchange.
// ============================================================

const db =
  supabase as any;

const DOCUMENT_BUCKET =
  "entity-documents";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const TENANT_EXCHANGE_KEY = [
  "tenant-portal",
  "document-exchange",
] as const;

const OWNER_EXCHANGE_KEY = [
  "owner-portal",
  "document-exchange",
] as const;

const DOCUMENT_SELECT = `
  id,
  entity_type,
  entity_id,
  name,
  file_url,
  file_type,
  uploaded_at,
  storage_bucket,
  storage_path,
  mime_type,
  file_size,
  visible_to_tenant,
  uploaded_by,
  visible_to_owner,
  category,
  message,
  organization_id,
  communication_scope
`;

// ============================================================
// CATEGORIES
// ============================================================

export const DOCUMENT_EXCHANGE_CATEGORY_OPTIONS = [
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
    label: "Attestation assurance",
  },
  {
    value: "identity",
    label: "Pièce d'identité",
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

export type DocumentExchangeCategory =
  (typeof DOCUMENT_EXCHANGE_CATEGORY_OPTIONS)[number]["value"];

export type DocumentExchangeDirection =
  | "received"
  | "sent";

// ============================================================
// TYPES
// ============================================================

export type DocumentExchangeDocument = {
  id: string;

  entityType: string;
  entityId: string;

  name: string;

  fileUrl: string | null;
  fileType: string | null;

  storageBucket: string | null;
  storagePath: string | null;

  mimeType: string | null;
  fileSize: number | null;

  uploadedAt: string | null;
  uploadedBy: string | null;

  visibleToTenant: boolean;
  visibleToOwner: boolean;

  category: DocumentExchangeCategory;

  message: string | null;

  organizationId: string | null;
  communicationScope: string | null;

  direction: DocumentExchangeDirection;

  conversationId: string | null;
  messageId: string | null;

  contextLabel: string;
};

export type TenantExchangeLease = {
  id: string;

  reference: string | null;
  status: string | null;

  propertyId: string | null;

  property:
    | {
        id: string;
        reference: string | null;
        title: string | null;
      }
    | null;
};

export type TenantExchangeConversation = {
  id: string;

  leaseId: string;

  organizationId: string;

  lastMessageAt: string | null;
};

export type TenantDocumentExchange = {
  userId: string;

  tenantId: string;

  activeLease: TenantExchangeLease | null;

  conversation:
    | TenantExchangeConversation
    | null;

  documents: DocumentExchangeDocument[];
};

export type OwnerExchangeConversation = {
  id: string;

  ownerId: string;

  organizationId: string;

  lastMessageAt: string | null;
};

export type OwnerExchangeMessage = {
  id: string;

  conversationId: string;

  senderUserId: string;

  senderRole:
    | "owner"
    | "agency";

  body: string | null;

  documentId: string | null;

  createdAt: string;

  document:
    | DocumentExchangeDocument
    | null;
};

export type OwnerDocumentExchange = {
  userId: string;

  ownerId: string;

  organizationId: string | null;

  organizationName: string | null;

  conversation:
    | OwnerExchangeConversation
    | null;

  messages: OwnerExchangeMessage[];

  documents: DocumentExchangeDocument[];
};

export type SendTenantDocumentInput = {
  file: File;

  category: DocumentExchangeCategory;

  message?: string;

  name?: string;
};

export type SendOwnerDocumentInput = {
  file: File;

  category: DocumentExchangeCategory;

  message?: string;

  name?: string;
};

export type SendOwnerAgencyMessageInput = {
  message?: string;

  file?: File | null;

  category?: DocumentExchangeCategory;

  name?: string;
};

// ============================================================
// INTERNAL TYPES
// ============================================================

type ExchangeMessageRow = {
  id: string;

  conversation_id: string;

  document_id: string | null;

  sender_user_id: string;

  sender_role: string;

  body: string | null;

  created_at: string | null;
};

type OwnerOrganization = {
  id: string;
  name: string | null;
};

// ============================================================
// GENERIC HELPERS
// ============================================================

const toNullableString = (
  value: unknown,
): string | null =>
  typeof value === "string" &&
  value.length > 0
    ? value
    : null;

const toNullableNumber = (
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

const getRelationRow = (
  value: unknown,
): Record<string, any> | null => {
  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      null
    ) as Record<
      string,
      any
    > | null;
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return value as Record<
      string,
      any
    >;
  }

  return null;
};

const isDocumentExchangeCategory = (
  value: unknown,
): value is DocumentExchangeCategory =>
  DOCUMENT_EXCHANGE_CATEGORY_OPTIONS.some(
    (
      option,
    ) =>
      option.value ===
      value,
  );

const sortDocuments = (
  documents:
    DocumentExchangeDocument[],
) =>
  [
    ...documents,
  ].sort(
    (
      left,
      right,
    ) => {
      const leftTime =
        left.uploadedAt
          ? new Date(
              left.uploadedAt,
            ).getTime()
          : 0;

      const rightTime =
        right.uploadedAt
          ? new Date(
              right.uploadedAt,
            ).getTime()
          : 0;

      return (
        rightTime -
        leftTime
      );
    },
  );

const dedupeDocuments = (
  documents:
    DocumentExchangeDocument[],
) => {
  const byId =
    new Map<
      string,
      DocumentExchangeDocument
    >();

  documents.forEach(
    (
      document,
    ) => {
      byId.set(
        document.id,
        document,
      );
    },
  );

  return sortDocuments(
    Array.from(
      byId.values(),
    ),
  );
};

const requireAuthUser =
  async () => {
    const {
      data,
      error,
    } =
      await supabase.auth.getUser();

    if (
      error
    ) {
      throw error;
    }

    if (
      !data.user
    ) {
      throw new Error(
        "Authentification requise.",
      );
    }

    return data.user;
  };

const resolveCurrentTenantId =
  async (): Promise<string> => {
    const {
      data,
      error,
    } =
      await db.rpc(
        "my_tenant_id",
      );

    if (
      error
    ) {
      throw error;
    }

    if (
      typeof data !==
        "string" ||
      data.length ===
        0
    ) {
      throw new Error(
        "Aucun locataire n'est associé au compte connecté.",
      );
    }

    return data;
  };

const resolveCurrentOwnerId =
  async (): Promise<string> => {
    const {
      data,
      error,
    } =
      await db.rpc(
        "get_my_owner_id",
      );

    if (
      error
    ) {
      throw error;
    }

    if (
      typeof data ===
        "string" &&
      data.length >
        0
    ) {
      return data;
    }

    if (
      Array.isArray(
        data,
      ) &&
      typeof data[0] ===
        "string"
    ) {
      return data[0];
    }

    throw new Error(
      "Aucun propriétaire n'est associé au compte connecté.",
    );
  };

// ============================================================
// OWNER -> MANAGEMENT ORGANIZATION
// ============================================================

const resolveOwnerOrganization =
  async (
    ownerId: string,
  ): Promise<
    OwnerOrganization | null
  > => {
    const {
      data:
        mandate,
      error:
        mandateError,
    } =
      await db
        .from(
          "mandates",
        )
        .select(
          `
            organization_id,
            start_date
          `,
        )
        .eq(
          "owner_id",
          ownerId,
        )
        .eq(
          "status",
          "active",
        )
        .eq(
          "mandate_type",
          "management",
        )
        .not(
          "organization_id",
          "is",
          null,
        )
        .order(
          "start_date",
          {
            ascending:
              false,
          },
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (
      mandateError
    ) {
      throw mandateError;
    }

    const organizationId =
      toNullableString(
        mandate
          ?.organization_id,
      );

    if (
      !organizationId
    ) {
      return null;
    }

    const {
      data:
        organization,
      error:
        organizationError,
    } =
      await db
        .from(
          "organizations",
        )
        .select(
          "id, name",
        )
        .eq(
          "id",
          organizationId,
        )
        .maybeSingle();

    if (
      organizationError
    ) {
      return {
        id:
          organizationId,
        name:
          null,
      };
    }

    return {
      id:
        organizationId,

      name:
        toNullableString(
          organization
            ?.name,
        ),
    };
  };

// ============================================================
// MESSAGE / FILE HELPERS
// ============================================================

const normalizeMessage = (
  value:
    | string
    | undefined,
): string | null => {
  const normalized =
    value?.trim() ??
    "";

  if (
    normalized.length >
    2000
  ) {
    throw new Error(
      "Le message ne peut pas dépasser 2 000 caractères.",
    );
  }

  return normalized.length >
    0
    ? normalized
    : null;
};

const normalizeDisplayName = (
  value:
    | string
    | undefined,
  fallback: string,
): string => {
  const normalized =
    value?.trim() ||
    fallback.trim();

  if (
    normalized.length ===
    0
  ) {
    return "Document";
  }

  return normalized.slice(
    0,
    255,
  );
};

const sanitizeStorageFileName = (
  fileName: string,
): string => {
  const normalized =
    fileName
      .normalize(
        "NFD",
      )
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-",
      )
      .replace(
        /-+/g,
        "-",
      )
      .replace(
        /^[-.]+|[-.]+$/g,
        "",
      );

  return (
    normalized.slice(
      0,
      140,
    ) ||
    "document"
  );
};

const getFileExtension = (
  fileName: string,
) => {
  const safeName =
    sanitizeStorageFileName(
      fileName,
    );

  const parts =
    safeName.split(
      ".",
    );

  if (
    parts.length <
    2
  ) {
    return "";
  }

  return (
    parts
      .pop()
      ?.toLowerCase() ??
    ""
  );
};

const resolveMimeType = (
  file: File,
): string => {
  const extension =
    getFileExtension(
      file.name,
    );

  let mime =
    file.type
      ?.trim()
      .toLowerCase() ??
    "";

  if (
    mime ===
    "image/jpg"
  ) {
    mime =
      "image/jpeg";
  }

  const allowed =
    new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

  if (
    allowed.has(
      mime,
    )
  ) {
    return mime;
  }

  switch (
    extension
  ) {
    case "pdf":
      return "application/pdf";

    case "jpg":
    case "jpeg":
      return "image/jpeg";

    case "png":
      return "image/png";

    case "webp":
      return "image/webp";

    default:
      throw new Error(
        "Format non autorisé. Utilisez un fichier PDF, JPG, JPEG, PNG ou WEBP.",
      );
  }
};

const validateFile = (
  file: File,
): string => {
  if (
    !file ||
    file.size <=
      0
  ) {
    throw new Error(
      "Le fichier sélectionné est vide.",
    );
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      "Le fichier ne peut pas dépasser 10 Mo.",
    );
  }

  return resolveMimeType(
    file,
  );
};

const buildStoragePath = (
  role:
    | "tenant"
    | "owner",
  userId: string,
  fileName: string,
) =>
  [
    role,
    userId,
    crypto.randomUUID(),
    sanitizeStorageFileName(
      fileName,
    ),
  ].join(
    "/",
  );

const uploadExchangeFile =
  async (
    role:
      | "tenant"
      | "owner",
    userId: string,
    file: File,
    mimeType: string,
  ): Promise<string> => {
    const storagePath =
      buildStoragePath(
        role,
        userId,
        file.name,
      );

    const {
      error,
    } =
      await supabase.storage
        .from(
          DOCUMENT_BUCKET,
        )
        .upload(
          storagePath,
          file,
          {
            cacheControl:
              "3600",

            upsert:
              false,

            contentType:
              mimeType,
          },
        );

    if (
      error
    ) {
      throw error;
    }

    return storagePath;
  };

// If the RPC fails after Storage upload, remove the orphan object.
// D2 grants the uploader permission to delete its own uncommitted
// tenant/... or owner/... object.
const tryCleanupUpload =
  async (
    storagePath: string,
  ) => {
    const {
      error,
    } =
      await supabase.storage
        .from(
          DOCUMENT_BUCKET,
        )
        .remove([
          storagePath,
        ]);

    if (
      error
    ) {
      console.error(
        "[DocumentExchange] Impossible de nettoyer l'upload orphelin :",
        storagePath,
        error,
      );
    }
  };

const buildMessageBody = (
  displayName: string,
  message: string | null,
) =>
  message ??
  `Document : ${displayName}`;

// ============================================================
// DOCUMENT MAPPING
// ============================================================

const mapDocument = (
  row:
    Record<
      string,
      any
    >,
  userId: string,
  options?: {
    direction?:
      DocumentExchangeDirection;

    conversationId?:
      string | null;

    messageId?:
      string | null;

    contextLabel?:
      string;
  },
): DocumentExchangeDocument => ({
  id:
    String(
      row.id,
    ),

  entityType:
    String(
      row.entity_type ??
        "",
    ),

  entityId:
    String(
      row.entity_id ??
        "",
    ),

  name:
    String(
      row.name ??
        "Document",
    ),

  fileUrl:
    toNullableString(
      row.file_url,
    ),

  fileType:
    toNullableString(
      row.file_type,
    ),

  storageBucket:
    toNullableString(
      row.storage_bucket,
    ),

  storagePath:
    toNullableString(
      row.storage_path,
    ),

  mimeType:
    toNullableString(
      row.mime_type,
    ),

  fileSize:
    toNullableNumber(
      row.file_size,
    ),

  uploadedAt:
    toNullableString(
      row.uploaded_at,
    ),

  uploadedBy:
    toNullableString(
      row.uploaded_by,
    ),

  visibleToTenant:
    row.visible_to_tenant ===
    true,

  visibleToOwner:
    row.visible_to_owner ===
    true,

  category:
    isDocumentExchangeCategory(
      row.category,
    )
      ? row.category
      : "other",

  message:
    toNullableString(
      row.message,
    ),

  organizationId:
    toNullableString(
      row.organization_id,
    ),

  communicationScope:
    toNullableString(
      row.communication_scope,
    ),

  direction:
    options
      ?.direction ??
    (
      row.uploaded_by ===
      userId
        ? "sent"
        : "received"
    ),

  conversationId:
    options
      ?.conversationId ??
    null,

  messageId:
    options
      ?.messageId ??
    null,

  contextLabel:
    options
      ?.contextLabel ??
    "Document",
});

// ============================================================
// SECURE ACCESS URL
// ============================================================

export const createDocumentExchangeAccessUrl =
  async (
    document:
      DocumentExchangeDocument,
    expiresIn =
      300,
  ): Promise<string> => {
    if (
      document.storageBucket &&
      document.storagePath
    ) {
      const {
        data,
        error,
      } =
        await supabase.storage
          .from(
            document.storageBucket,
          )
          .createSignedUrl(
            document.storagePath,
            expiresIn,
          );

      if (
        error
      ) {
        throw error;
      }

      if (
        !data
          ?.signedUrl
      ) {
        throw new Error(
          "Impossible de générer le lien sécurisé du document.",
        );
      }

      return data.signedUrl;
    }

    if (
      document.fileUrl
    ) {
      return document.fileUrl;
    }

    throw new Error(
      "Aucun fichier n'est associé à ce document.",
    );
  };

// ============================================================
// TENANT LEASE MAPPING
// ============================================================

const mapTenantLease = (
  row:
    Record<
      string,
      any
    >,
): TenantExchangeLease => {
  const property =
    getRelationRow(
      row.property,
    );

  return {
    id:
      String(
        row.id,
      ),

    reference:
      toNullableString(
        row.reference,
      ),

    status:
      toNullableString(
        row.status,
      ),

    propertyId:
      toNullableString(
        row.property_id,
      ),

    property:
      property
        ? {
            id:
              String(
                property.id,
              ),

            reference:
              toNullableString(
                property.reference,
              ),

            title:
              toNullableString(
                property.title,
              ),
          }
        : null,
  };
};

const getTenantLeaseLabel = (
  lease:
    TenantExchangeLease,
) => {
  const propertyLabel =
    lease.property
      ?.title ??
    lease.property
      ?.reference ??
    null;

  const leaseLabel =
    lease.reference ??
    "Bail";

  return propertyLabel
    ? `${leaseLabel} • ${propertyLabel}`
    : leaseLabel;
};

// ============================================================
// LOAD DOCUMENTS BY IDS
// ============================================================

const loadDocumentsByIds =
  async (
    ids:
      string[],
  ): Promise<
    Record<
      string,
      any
    >[]
  > => {
    const uniqueIds =
      Array.from(
        new Set(
          ids.filter(
            Boolean,
          ),
        ),
      );

    if (
      uniqueIds.length ===
      0
    ) {
      return [];
    }

    const {
      data,
      error,
    } =
      await db
        .from(
          "documents",
        )
        .select(
          DOCUMENT_SELECT,
        )
        .in(
          "id",
          uniqueIds,
        );

    if (
      error
    ) {
      throw error;
    }

    return (
      data ??
      []
    ) as Record<
      string,
      any
    >[];
  };

// ============================================================
// TENANT STANDARD DOCUMENTS
//
// Non-communication documents already made available by the
// agency remain visible in the tenant document vault.
// ============================================================

const loadTenantStandardDocuments =
  async (
    tenantId: string,
    leases:
      TenantExchangeLease[],
    userId: string,
  ): Promise<
    DocumentExchangeDocument[]
  > => {
    const queries:
      any[] = [];

    queries.push(
      db
        .from(
          "documents",
        )
        .select(
          DOCUMENT_SELECT,
        )
        .in(
          "entity_type",
          [
            "tenant",
            "tenants",
          ],
        )
        .eq(
          "entity_id",
          tenantId,
        )
        .is(
          "communication_scope",
          null,
        ),
    );

    const leaseIds =
      leases.map(
        (
          lease,
        ) =>
          lease.id,
      );

    if (
      leaseIds.length >
      0
    ) {
      queries.push(
        db
          .from(
            "documents",
          )
          .select(
            DOCUMENT_SELECT,
          )
          .in(
            "entity_type",
            [
              "lease",
              "leases",
            ],
          )
          .in(
            "entity_id",
            leaseIds,
          )
          .is(
            "communication_scope",
            null,
          ),
      );
    }

    const results =
      await Promise.all(
        queries,
      );

    const leaseById =
      new Map(
        leases.map(
          (
            lease,
          ) => [
            lease.id,
            lease,
          ],
        ),
      );

    const documents:
      DocumentExchangeDocument[] =
      [];

    results.forEach(
      (
        result,
      ) => {
        if (
          result.error
        ) {
          throw result.error;
        }

        (
          result.data ??
          []
        ).forEach(
          (
            row:
              Record<
                string,
                any
              >,
          ) => {
            const entityId =
              String(
                row.entity_id ??
                  "",
              );

            const lease =
              leaseById.get(
                entityId,
              );

            documents.push(
              mapDocument(
                row,
                userId,
                {
                  contextLabel:
                    lease
                      ? getTenantLeaseLabel(
                          lease,
                        )
                      : "Dossier locataire",
                },
              ),
            );
          },
        );
      },
    );

    return documents;
  };

// ============================================================
// TENANT <-> AGENCY COMMUNICATION DOCUMENTS
// ============================================================

const loadTenantConversationDocuments =
  async (
    tenantId: string,
    leases:
      TenantExchangeLease[],
    userId: string,
  ): Promise<{
    documents:
      DocumentExchangeDocument[];

    activeConversation:
      | TenantExchangeConversation
      | null;
  }> => {
    const leaseIds =
      leases.map(
        (
          lease,
        ) =>
          lease.id,
      );

    if (
      leaseIds.length ===
      0
    ) {
      return {
        documents: [],
        activeConversation:
          null,
      };
    }

    const {
      data:
        conversationRows,
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
            last_message_at
          `,
        )
        .eq(
          "tenant_id",
          tenantId,
        )
        .in(
          "lease_id",
          leaseIds,
        );

    if (
      conversationError
    ) {
      throw conversationError;
    }

    const conversations =
      (
        conversationRows ??
        []
      ) as Record<
        string,
        any
      >[];

    if (
      conversations.length ===
      0
    ) {
      return {
        documents: [],
        activeConversation:
          null,
      };
    }

    const conversationIds =
      conversations.map(
        (
          row,
        ) =>
          String(
            row.id,
          ),
      );

    const {
      data:
        messageRows,
      error:
        messageError,
    } =
      await db
        .from(
          "lease_messages",
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
        .in(
          "conversation_id",
          conversationIds,
        )
        .not(
          "document_id",
          "is",
          null,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        );

    if (
      messageError
    ) {
      throw messageError;
    }

    const messages =
      (
        messageRows ??
        []
      ) as ExchangeMessageRow[];

    const documentRows =
      await loadDocumentsByIds(
        messages
          .map(
            (
              message,
            ) =>
              message.document_id,
          )
          .filter(
            (
              value,
            ): value is string =>
              typeof value ===
                "string" &&
              value.length >
                0,
          ),
      );

    const documentById =
      new Map(
        documentRows.map(
          (
            row,
          ) => [
            String(
              row.id,
            ),
            row,
          ],
        ),
      );

    const conversationById =
      new Map(
        conversations.map(
          (
            row,
          ) => [
            String(
              row.id,
            ),
            row,
          ],
        ),
      );

    const leaseById =
      new Map(
        leases.map(
          (
            lease,
          ) => [
            lease.id,
            lease,
          ],
        ),
      );

    const documents:
      DocumentExchangeDocument[] =
      [];

    messages.forEach(
      (
        message,
      ) => {
        if (
          !message.document_id
        ) {
          return;
        }

        const row =
          documentById.get(
            message.document_id,
          );

        if (
          !row
        ) {
          return;
        }

        const conversation =
          conversationById.get(
            message.conversation_id,
          );

        const lease =
          conversation
            ? leaseById.get(
                String(
                  conversation
                    .lease_id,
                ),
              )
            : null;

        documents.push(
          mapDocument(
            row,
            userId,
            {
              direction:
                message.sender_role ===
                "tenant"
                  ? "sent"
                  : "received",

              conversationId:
                message.conversation_id,

              messageId:
                message.id,

              contextLabel:
                lease
                  ? getTenantLeaseLabel(
                      lease,
                    )
                  : "Échange avec votre agence",
            },
          ),
        );
      },
    );

    const activeLease =
      leases.find(
        (
          lease,
        ) =>
          lease.status ===
          "active",
      ) ??
      null;

    const activeConversationRow =
      activeLease
        ? conversations.find(
            (
              row,
            ) =>
              String(
                row.lease_id,
              ) ===
              activeLease.id,
          )
        : null;

    const activeConversation =
      activeConversationRow
        ? {
            id:
              String(
                activeConversationRow.id,
              ),

            leaseId:
              String(
                activeConversationRow
                  .lease_id,
              ),

            organizationId:
              String(
                activeConversationRow
                  .organization_id,
              ),

            lastMessageAt:
              toNullableString(
                activeConversationRow
                  .last_message_at,
              ),
          }
        : null;

    return {
      documents,
      activeConversation,
    };
  };

// ============================================================
// TENANT READ MODEL
// ============================================================

export const useTenantDocumentExchange =
  () =>
    useQuery<
      TenantDocumentExchange
    >({
      queryKey:
        TENANT_EXCHANGE_KEY,

      queryFn:
        async () => {
          const user =
            await requireAuthUser();

          const tenantId =
            await resolveCurrentTenantId();

          const {
            data:
              leaseRows,
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
                  status,
                  property_id,
                  created_at,
                  property:properties(
                    id,
                    reference,
                    title
                  )
                `,
              )
              .eq(
                "tenant_id",
                tenantId,
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              );

          if (
            leaseError
          ) {
            throw leaseError;
          }

          const leases =
            (
              leaseRows ??
              []
            ).map(
              (
                row:
                  Record<
                    string,
                    any
                  >,
              ) =>
                mapTenantLease(
                  row,
                ),
            );

          const activeLease =
            leases.find(
              (
                lease,
              ) =>
                lease.status ===
                "active",
            ) ??
            null;

          const [
            standardDocuments,
            conversationData,
          ] =
            await Promise.all([
              loadTenantStandardDocuments(
                tenantId,
                leases,
                user.id,
              ),

              loadTenantConversationDocuments(
                tenantId,
                leases,
                user.id,
              ),
            ]);

          return {
            userId:
              user.id,

            tenantId,

            activeLease,

            conversation:
              conversationData.activeConversation,

            documents:
              dedupeDocuments([
                ...standardDocuments,
                ...conversationData.documents,
              ]),
          };
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// OWNER <-> AGENCY COMMUNICATION DOCUMENTS
// ============================================================

const loadOwnerConversationDocuments =
  async (
    ownerId: string,
    organization:
      OwnerOrganization,
    userId: string,
  ): Promise<{
    conversation:
      | OwnerExchangeConversation
      | null;

    messages:
      OwnerExchangeMessage[];

    documents:
      DocumentExchangeDocument[];
  }> => {
    const {
      data:
        conversationRow,
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
            last_message_at
          `,
        )
        .eq(
          "owner_id",
          ownerId,
        )
        .eq(
          "organization_id",
          organization.id,
        )
        .maybeSingle();

    if (
      conversationError
    ) {
      throw conversationError;
    }

    if (
      !conversationRow
    ) {
      return {
        conversation:
          null,

        messages:
          [],

        documents:
          [],
      };
    }

    const conversation: OwnerExchangeConversation =
      {
        id:
          String(
            conversationRow.id,
          ),

        ownerId:
          String(
            conversationRow
              .owner_id,
          ),

        organizationId:
          String(
            conversationRow
              .organization_id,
          ),

        lastMessageAt:
          toNullableString(
            conversationRow
              .last_message_at,
          ),
      };

    // Load ALL messages. Text-only agency replies must remain visible
    // in the owner portal; document_id is optional.
    const {
      data:
        messageRows,
      error:
        messageError,
    } =
      await db
        .from(
          "owner_agency_messages",
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
          conversation.id,
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        )
        .order(
          "id",
          {
            ascending:
              true,
          },
        );

    if (
      messageError
    ) {
      throw messageError;
    }

    const messageRowsTyped =
      (
        messageRows ??
        []
      ) as ExchangeMessageRow[];

    const documentRows =
      await loadDocumentsByIds(
        Array.from(
          new Set(
            messageRowsTyped
              .map(
                (
                  message,
                ) =>
                  message.document_id,
              )
              .filter(
                (
                  value,
                ): value is string =>
                  typeof value ===
                    "string" &&
                  value.length >
                    0,
              ),
          ),
        ),
      );

    const documentById =
      new Map(
        documentRows.map(
          (
            row,
          ) => [
            String(
              row.id,
            ),
            row,
          ],
        ),
      );

    const documents:
      DocumentExchangeDocument[] =
      [];

    const messages:
      OwnerExchangeMessage[] =
      messageRowsTyped.map(
        (
          message,
        ) => {
          let mappedDocument:
            | DocumentExchangeDocument
            | null =
            null;

          if (
            message.document_id
          ) {
            const row =
              documentById.get(
                message.document_id,
              );

            if (row) {
              mappedDocument =
                mapDocument(
                  row,
                  userId,
                  {
                    direction:
                      message.sender_role ===
                      "owner"
                        ? "sent"
                        : "received",

                    conversationId:
                      conversation.id,

                    messageId:
                      message.id,

                    contextLabel:
                      organization.name
                        ? `Échange avec ${organization.name}`
                        : "Échange avec votre agence",
                  },
                );

              documents.push(
                mappedDocument,
              );
            }
          }

          return {
            id:
              String(
                message.id,
              ),

            conversationId:
              String(
                message.conversation_id,
              ),

            senderUserId:
              String(
                message.sender_user_id,
              ),

            senderRole:
              message.sender_role ===
              "agency"
                ? "agency"
                : "owner",

            body:
              toNullableString(
                message.body,
              ),

            documentId:
              toNullableString(
                message.document_id,
              ),

            createdAt:
              String(
                message.created_at ??
                  "",
              ),

            document:
              mappedDocument,
          };
        },
      );

    return {
      conversation,

      messages,

      documents:
        sortDocuments(
          documents,
        ),
    };
  };

// ============================================================
// OWNER READ MODEL
// ============================================================

export const useOwnerDocumentExchange =
  () =>
    useQuery<
      OwnerDocumentExchange
    >({
      queryKey:
        OWNER_EXCHANGE_KEY,

      queryFn:
        async () => {
          const user =
            await requireAuthUser();

          const ownerId =
            await resolveCurrentOwnerId();

          const organization =
            await resolveOwnerOrganization(
              ownerId,
            );

          if (
            !organization
          ) {
            return {
              userId:
                user.id,

              ownerId,

              organizationId:
                null,

              organizationName:
                null,

              conversation:
                null,

              messages:
                [],

              documents:
                [],
            };
          }

          const {
            conversation,
            messages,
            documents,
          } =
            await loadOwnerConversationDocuments(
              ownerId,
              organization,
              user.id,
            );

          return {
            userId:
              user.id,

            ownerId,

            organizationId:
              organization.id,

            organizationName:
              organization.name,

            conversation,

            messages,

            documents,
          };
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// TENANT -> AGENCY
// ============================================================

export const useSendTenantDocument =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            SendTenantDocumentInput,
        ) => {
          const user =
            await requireAuthUser();

          const tenantId =
            await resolveCurrentTenantId();

          const {
            data:
              leaseData,
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
                  tenant_id,
                  status
                `,
              )
              .eq(
                "tenant_id",
                tenantId,
              )
              .eq(
                "status",
                "active",
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(
                1,
              )
              .maybeSingle();

          if (
            leaseError
          ) {
            throw leaseError;
          }

          if (
            !leaseData
          ) {
            throw new Error(
              "Aucun bail actif n'est associé à votre compte.",
            );
          }

          const mimeType =
            validateFile(
              input.file,
            );

          const message =
            normalizeMessage(
              input.message,
            );

          const name =
            normalizeDisplayName(
              input.name,
              input.file.name,
            );

          const storagePath =
            await uploadExchangeFile(
              "tenant",
              user.id,
              input.file,
              mimeType,
            );

          const {
            error,
          } =
            await db.rpc(
              "send_lease_message_with_attachment",
              {
                p_lease_id:
                  String(
                    leaseData.id,
                  ),

                p_body:
                  buildMessageBody(
                    name,
                    message,
                  ),

                p_name:
                  name,

                p_storage_path:
                  storagePath,

                p_mime_type:
                  mimeType,

                p_file_size:
                  input.file
                    .size,

                p_category:
                  input.category,

                p_document_message:
                  message,
              },
            );

          if (
            error
          ) {
            await tryCleanupUpload(
              storagePath,
            );

            throw error;
          }

          return {
            storagePath,
          };
        },

      onSuccess:
        async () => {
          await Promise.all([
            queryClient.invalidateQueries(
              {
                queryKey:
                  TENANT_EXCHANGE_KEY,
              },
            ),

            queryClient.invalidateQueries(
              {
                queryKey: [
                  "tenant-portal",
                  "documents",
                ],
              },
            ),

            queryClient.invalidateQueries(
              {
                queryKey: [
                  "tenant-portal",
                  "dashboard",
                ],
              },
            ),
          ]);
        },
    });
  };

// ============================================================
// OWNER -> AGENCY
// ============================================================

export const useSendOwnerDocument =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            SendOwnerDocumentInput,
        ) => {
          const user =
            await requireAuthUser();

          const ownerId =
            await resolveCurrentOwnerId();

          const organization =
            await resolveOwnerOrganization(
              ownerId,
            );

          if (
            !organization
          ) {
            throw new Error(
              "Aucun mandat de gestion actif n'est associé à votre compte.",
            );
          }

          const mimeType =
            validateFile(
              input.file,
            );

          const message =
            normalizeMessage(
              input.message,
            );

          const name =
            normalizeDisplayName(
              input.name,
              input.file.name,
            );

          const storagePath =
            await uploadExchangeFile(
              "owner",
              user.id,
              input.file,
              mimeType,
            );

          const {
            error,
          } =
            await db.rpc(
              "send_owner_agency_message_with_attachment",
              {
                p_owner_id:
                  ownerId,

                p_organization_id:
                  organization.id,

                p_body:
                  buildMessageBody(
                    name,
                    message,
                  ),

                p_name:
                  name,

                p_storage_path:
                  storagePath,

                p_mime_type:
                  mimeType,

                p_file_size:
                  input.file
                    .size,

                p_category:
                  input.category,

                p_document_message:
                  message,
              },
            );

          if (
            error
          ) {
            await tryCleanupUpload(
              storagePath,
            );

            throw error;
          }

          return {
            storagePath,
          };
        },

      onSuccess:
        async () => {
          await Promise.all([
            queryClient.invalidateQueries(
              {
                queryKey:
                  OWNER_EXCHANGE_KEY,
              },
            ),

            queryClient.invalidateQueries(
              {
                queryKey: [
                  "owner-portal",
                  "dashboard",
                ],
              },
            ),
          ]);
        },
    });
  };

// ============================================================
// OWNER <-> AGENCY THREAD SEND
// ============================================================

export const useSendOwnerAgencyMessage =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            SendOwnerAgencyMessageInput,
        ) => {
          const user =
            await requireAuthUser();

          const ownerId =
            await resolveCurrentOwnerId();

          const organization =
            await resolveOwnerOrganization(
              ownerId,
            );

          if (
            !organization
          ) {
            throw new Error(
              "Aucun mandat de gestion actif n'est associé à votre compte.",
            );
          }

          const message =
            normalizeMessage(
              input.message,
            );

          if (
            !message &&
            !input.file
          ) {
            throw new Error(
              "Ajoutez un message ou un document.",
            );
          }

          if (
            input.file
          ) {
            const mimeType =
              validateFile(
                input.file,
              );

            const name =
              normalizeDisplayName(
                input.name,
                input.file.name,
              );

            const storagePath =
              await uploadExchangeFile(
                "owner",
                user.id,
                input.file,
                mimeType,
              );

            const {
              error,
            } =
              await db.rpc(
                "send_owner_agency_message_with_attachment",
                {
                  p_owner_id:
                    ownerId,

                  p_organization_id:
                    organization.id,

                  p_body:
                    buildMessageBody(
                      name,
                      message,
                    ),

                  p_name:
                    name,

                  p_storage_path:
                    storagePath,

                  p_mime_type:
                    mimeType,

                  p_file_size:
                    input.file.size,

                  p_category:
                    input.category ??
                    "other",

                  p_document_message:
                    message,
                },
              );

            if (
              error
            ) {
              await tryCleanupUpload(
                storagePath,
              );

              throw error;
            }

            return {
              storagePath,
            };
          }

          const {
            error,
          } =
            await db.rpc(
              "send_owner_agency_message",
              {
                p_owner_id:
                  ownerId,

                p_organization_id:
                  organization.id,

                p_body:
                  message,

                p_document_id:
                  null,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return {
            storagePath:
              null,
          };
        },

      onSuccess:
        async () => {
          await Promise.all([
            queryClient.invalidateQueries(
              {
                queryKey:
                  OWNER_EXCHANGE_KEY,
              },
            ),

            queryClient.invalidateQueries(
              {
                queryKey: [
                  "owner-portal",
                  "dashboard",
                ],
              },
            ),
          ]);
        },
    });
  };

// ============================================================
// OWNER CONVERSATION READ STATE
// ============================================================

export const useMarkOwnerAgencyConversationRead =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          conversationId:
            string,
        ) => {
          const {
            data,
            error,
          } =
            await db.rpc(
              "mark_owner_agency_conversation_read",
              {
                p_conversation_id:
                  conversationId,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return data ===
            true;
        },

      onSuccess:
        async () => {
          await queryClient.invalidateQueries(
            {
              queryKey:
                OWNER_EXCHANGE_KEY,
            },
          );
        },
    });
  };
