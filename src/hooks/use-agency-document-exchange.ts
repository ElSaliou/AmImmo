import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

const db = supabase as any;

const DOCUMENT_BUCKET =
  "entity-documents";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const DOCUMENTS_KEY = [
  "admin",
  "agency-document-exchange",
] as const;

const TARGETS_KEY = [
  "admin",
  "agency-document-targets",
] as const;

// ============================================================
// TYPES
// ============================================================

export type AgencyDocumentChannel =
  | "tenant"
  | "owner"
  | "internal";

export type AgencyDocumentDirection =
  | "received"
  | "sent"
  | "internal"
  | "unknown";

export type AgencyDocumentItem = {
  id: string;
  name: string;

  entityType: string;
  entityId: string;

  category: string | null;
  message: string | null;

  fileUrl: string | null;
  fileType: string | null;

  storageBucket: string | null;
  storagePath: string | null;

  mimeType: string | null;
  fileSize: number | null;

  uploadedAt: string | null;
  uploadedBy: string | null;

  organizationId: string | null;
  communicationScope: string | null;

  channel: AgencyDocumentChannel;
  direction: AgencyDocumentDirection;

  conversationId: string | null;
  messageId: string | null;
  senderRole: string | null;

  personId: string | null;
  personName: string | null;
  personEmail: string | null;
  personPhone: string | null;

  leaseId: string | null;
  leaseReference: string | null;

  propertyId: string | null;
  propertyReference: string | null;
  propertyTitle: string | null;
};

export type AgencyDocumentCenter = {
  documents: AgencyDocumentItem[];

  total: number;

  tenantCount: number;
  ownerCount: number;
  internalCount: number;

  receivedCount: number;
  sentCount: number;
};

export type AgencyTenantTarget = {
  channel: "tenant";

  leaseId: string;
  leaseReference: string | null;

  tenantId: string;
  tenantName: string;

  tenantEmail: string | null;
  tenantPhone: string | null;

  propertyId: string | null;
  propertyReference: string | null;
  propertyTitle: string | null;
};

export type AgencyOwnerTarget = {
  channel: "owner";

  ownerId: string;
  ownerName: string;

  ownerEmail: string | null;
  ownerPhone: string | null;
};

export type AgencyDocumentTargets = {
  organizationId: string;

  tenantTargets: AgencyTenantTarget[];
  ownerTargets: AgencyOwnerTarget[];
};

export type SendAgencyMessageInput =
  | {
      channel: "tenant";
      leaseId: string;
      message?: string;
      file?: File | null;
      category?: string;
    }
  | {
      channel: "owner";
      ownerId: string;
      message?: string;
      file?: File | null;
      category?: string;
    };

type GenericRow =
  Record<string, any>;

type MessageContext = {
  id: string;

  conversationId: string;
  documentId: string;

  senderRole: string;

  body: string | null;
};

// ============================================================
// GENERIC HELPERS
// ============================================================

const nullableString = (
  value: unknown,
) =>
  typeof value === "string" &&
  value.length > 0
    ? value
    : null;

const nullableNumber = (
  value: unknown,
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const uniqueStrings = (
  values:
    Array<string | null | undefined>,
) =>
  Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          Boolean(value),
      ),
    ),
  );

const requireUser =
  async () => {
    const {
      data,
      error,
    } =
      await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error(
        "Authentification requise.",
      );
    }

    return data.user;
  };

const resolveOrganizationId =
  async (): Promise<string> => {
    const {
      data,
      error,
    } =
      await db.rpc(
        "current_org_id",
      );

    if (error) {
      throw error;
    }

    if (
      typeof data !== "string" ||
      !data
    ) {
      throw new Error(
        "Aucune organisation n'est associée au compte connecté.",
      );
    }

    return data;
  };

// ============================================================
// FILES
// ============================================================

const sanitizeFileName = (
  fileName: string,
) =>
  fileName
    .normalize("NFD")
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
    )
    .slice(
      0,
      140,
    ) ||
  "document";

const getExtension = (
  fileName: string,
) =>
  sanitizeFileName(
    fileName,
  )
    .split(".")
    .pop()
    ?.toLowerCase() ??
  "";

const resolveMimeType = (
  file: File,
) => {
  let mime =
    file.type
      ?.trim()
      .toLowerCase() ??
    "";

  if (mime === "image/jpg") {
    mime = "image/jpeg";
  }

  if (
    [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(mime)
  ) {
    return mime;
  }

  switch (
    getExtension(
      file.name,
    )
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
        "Format non autorisé. Utilisez PDF, JPG, JPEG, PNG ou WEBP.",
      );
  }
};

const validateFile = (
  file: File,
) => {
  if (
    !file ||
    file.size <= 0
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

const normalizeMessage = (
  value?: string,
) => {
  const message =
    value?.trim() ?? "";

  if (
    message.length > 2000
  ) {
    throw new Error(
      "Le message ne peut pas dépasser 2 000 caractères.",
    );
  }

  return message;
};

const uploadAgencyFile =
  async (
    organizationId: string,
    userId: string,
    file: File,
    mimeType: string,
  ) => {
    const storagePath =
      [
        "agency",
        organizationId,
        userId,
        crypto.randomUUID(),
        sanitizeFileName(
          file.name,
        ),
      ].join("/");

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

    if (error) {
      throw error;
    }

    return storagePath;
  };

const cleanupUpload =
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

    if (error) {
      console.error(
        "[AgencyDocuments] Orphelin Storage :",
        storagePath,
        error,
      );
    }
  };

// ============================================================
// LOADERS
// ============================================================

const loadDocuments =
  async () => {
    const {
      data,
      error,
    } =
      await db
        .from(
          "documents",
        )
        .select(`
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
          uploaded_by,
          category,
          message,
          organization_id,
          communication_scope
        `)
        .order(
          "uploaded_at",
          {
            ascending:
              false,
          },
        );

    if (error) {
      throw error;
    }

    return (
      data ?? []
    ) as GenericRow[];
  };

const loadTenants =
  async (
    ids: string[],
  ) => {
    if (!ids.length) {
      return [];
    }

    const {
      data,
      error,
    } =
      await db
        .from(
          "tenants",
        )
        .select(
          "id, full_name, email, phone",
        )
        .in(
          "id",
          ids,
        );

    if (error) {
      throw error;
    }

    return data ?? [];
  };

const loadOwners =
  async (
    ids: string[],
  ) => {
    if (!ids.length) {
      return [];
    }

    const {
      data,
      error,
    } =
      await db
        .from(
          "owners",
        )
        .select(
          "id, full_name, email, phone",
        )
        .in(
          "id",
          ids,
        );

    if (error) {
      throw error;
    }

    return data ?? [];
  };

const loadLeases =
  async (
    ids: string[],
  ) => {
    if (!ids.length) {
      return [];
    }

    const {
      data,
      error,
    } =
      await db
        .from(
          "leases",
        )
        .select(
          "id, reference, tenant_id, property_id",
        )
        .in(
          "id",
          ids,
        );

    if (error) {
      throw error;
    }

    return data ?? [];
  };

const loadProperties =
  async (
    ids: string[],
  ) => {
    if (!ids.length) {
      return [];
    }

    const {
      data,
      error,
    } =
      await db
        .from(
          "properties",
        )
        .select(
          "id, reference, title",
        )
        .in(
          "id",
          ids,
        );

    if (error) {
      throw error;
    }

    return data ?? [];
  };

const getDirection = (
  channel:
    AgencyDocumentChannel,
  senderRole:
    string | null,
): AgencyDocumentDirection => {
  if (
    channel === "internal"
  ) {
    return "internal";
  }

  if (
    senderRole === "agency"
  ) {
    return "sent";
  }

  if (
    channel === "tenant" &&
    senderRole === "tenant"
  ) {
    return "received";
  }

  if (
    channel === "owner" &&
    senderRole === "owner"
  ) {
    return "received";
  }

  return "unknown";
};

// ============================================================
// DOCUMENT CENTER
// ============================================================

export const useAgencyDocumentExchange =
  () =>
    useQuery<AgencyDocumentCenter>({
      queryKey:
        DOCUMENTS_KEY,

      queryFn:
        async () => {
          const documents =
            await loadDocuments();

          const tenantIds =
            documents
              .filter(
                (document) =>
                  document.communication_scope ===
                  "tenant_agency",
              )
              .map(
                (document) =>
                  String(
                    document.id,
                  ),
              );

          const ownerIds =
            documents
              .filter(
                (document) =>
                  document.communication_scope ===
                  "owner_agency",
              )
              .map(
                (document) =>
                  String(
                    document.id,
                  ),
              );

          const leaseMessages:
            MessageContext[] =
            tenantIds.length
              ? (
                  (
                    await db
                      .from(
                        "lease_messages",
                      )
                      .select(
                        "id, conversation_id, document_id, sender_role, body",
                      )
                      .in(
                        "document_id",
                        tenantIds,
                      )
                  ).data ??
                  []
                ).map(
                  (
                    row:
                      GenericRow,
                  ) => ({
                    id:
                      String(
                        row.id,
                      ),

                    conversationId:
                      String(
                        row.conversation_id,
                      ),

                    documentId:
                      String(
                        row.document_id,
                      ),

                    senderRole:
                      String(
                        row.sender_role,
                      ),

                    body:
                      nullableString(
                        row.body,
                      ),
                  }),
                )
              : [];

          const ownerMessages:
            MessageContext[] =
            ownerIds.length
              ? (
                  (
                    await db
                      .from(
                        "owner_agency_messages",
                      )
                      .select(
                        "id, conversation_id, document_id, sender_role, body",
                      )
                      .in(
                        "document_id",
                        ownerIds,
                      )
                  ).data ??
                  []
                ).map(
                  (
                    row:
                      GenericRow,
                  ) => ({
                    id:
                      String(
                        row.id,
                      ),

                    conversationId:
                      String(
                        row.conversation_id,
                      ),

                    documentId:
                      String(
                        row.document_id,
                      ),

                    senderRole:
                      String(
                        row.sender_role,
                      ),

                    body:
                      nullableString(
                        row.body,
                      ),
                  }),
                )
              : [];

          const leaseMessageByDocument =
            new Map(
              leaseMessages.map(
                (message) => [
                  message.documentId,
                  message,
                ],
              ),
            );

          const ownerMessageByDocument =
            new Map(
              ownerMessages.map(
                (message) => [
                  message.documentId,
                  message,
                ],
              ),
            );

          const leaseConversationIds =
            uniqueStrings(
              leaseMessages.map(
                (message) =>
                  message.conversationId,
              ),
            );

          const ownerConversationIds =
            uniqueStrings(
              ownerMessages.map(
                (message) =>
                  message.conversationId,
              ),
            );

          const leaseConversations =
            leaseConversationIds.length
              ? (
                  await db
                    .from(
                      "lease_conversations",
                    )
                    .select(
                      "id, lease_id, tenant_id, organization_id",
                    )
                    .in(
                      "id",
                      leaseConversationIds,
                    )
                ).data ??
                []
              : [];

          const ownerConversations =
            ownerConversationIds.length
              ? (
                  await db
                    .from(
                      "owner_agency_conversations",
                    )
                    .select(
                      "id, owner_id, organization_id",
                    )
                    .in(
                      "id",
                      ownerConversationIds,
                    )
                ).data ??
                []
              : [];

          const leaseConversationById =
            new Map(
              leaseConversations.map(
                (row: GenericRow) => [
                  String(
                    row.id,
                  ),
                  row,
                ],
              ),
            );

          const ownerConversationById =
            new Map(
              ownerConversations.map(
                (row: GenericRow) => [
                  String(
                    row.id,
                  ),
                  row,
                ],
              ),
            );

          const leaseIds =
            uniqueStrings([
              ...leaseConversations.map(
                (row: GenericRow) =>
                  nullableString(
                    row.lease_id,
                  ),
              ),

              ...documents
                .filter(
                  (document) =>
                    document.communication_scope ===
                      "tenant_agency" &&
                    [
                      "lease",
                      "leases",
                    ].includes(
                      String(
                        document.entity_type,
                      ).toLowerCase(),
                    ),
                )
                .map(
                  (document) =>
                    nullableString(
                      document.entity_id,
                    ),
                ),
            ]);

          const leases =
            await loadLeases(
              leaseIds,
            );

          const leaseById =
            new Map(
              leases.map(
                (row: GenericRow) => [
                  String(
                    row.id,
                  ),
                  row,
                ],
              ),
            );

          const tenantEntityIds =
            uniqueStrings([
              ...leaseConversations.map(
                (row: GenericRow) =>
                  nullableString(
                    row.tenant_id,
                  ),
              ),

              ...leases.map(
                (row: GenericRow) =>
                  nullableString(
                    row.tenant_id,
                  ),
              ),
            ]);

          const ownerEntityIds =
            uniqueStrings([
              ...ownerConversations.map(
                (row: GenericRow) =>
                  nullableString(
                    row.owner_id,
                  ),
              ),

              ...documents
                .filter(
                  (document) =>
                    document.communication_scope ===
                      "owner_agency",
                )
                .map(
                  (document) =>
                    nullableString(
                      document.entity_id,
                    ),
                ),
            ]);

          const [
            tenants,
            owners,
          ] =
            await Promise.all([
              loadTenants(
                tenantEntityIds,
              ),

              loadOwners(
                ownerEntityIds,
              ),
            ]);

          const tenantById =
            new Map(
              tenants.map(
                (row: GenericRow) => [
                  String(
                    row.id,
                  ),
                  row,
                ],
              ),
            );

          const ownerById =
            new Map(
              owners.map(
                (row: GenericRow) => [
                  String(
                    row.id,
                  ),
                  row,
                ],
              ),
            );

          const propertyIds =
            uniqueStrings(
              leases.map(
                (row: GenericRow) =>
                  nullableString(
                    row.property_id,
                  ),
              ),
            );

          const properties =
            await loadProperties(
              propertyIds,
            );

          const propertyById =
            new Map(
              properties.map(
                (row: GenericRow) => [
                  String(
                    row.id,
                  ),
                  row,
                ],
              ),
            );

          const mapped =
            documents.map(
              (
                document,
              ): AgencyDocumentItem => {
                const id =
                  String(
                    document.id,
                  );

                const scope =
                  nullableString(
                    document.communication_scope,
                  );

                if (
                  scope ===
                  "tenant_agency"
                ) {
                  const message =
                    leaseMessageByDocument.get(
                      id,
                    );

                  const conversation =
                    message
                      ? leaseConversationById.get(
                          message.conversationId,
                        )
                      : null;

                  const leaseId =
                    nullableString(
                      conversation
                        ?.lease_id,
                    ) ??
                    nullableString(
                      document.entity_id,
                    );

                  const lease =
                    leaseId
                      ? leaseById.get(
                          leaseId,
                        )
                      : null;

                  const tenantId =
                    nullableString(
                      conversation
                        ?.tenant_id,
                    ) ??
                    nullableString(
                      lease
                        ?.tenant_id,
                    );

                  const tenant =
                    tenantId
                      ? tenantById.get(
                          tenantId,
                        )
                      : null;

                  const propertyId =
                    nullableString(
                      lease
                        ?.property_id,
                    );

                  const property =
                    propertyId
                      ? propertyById.get(
                          propertyId,
                        )
                      : null;

                  return {
                    id,

                    name:
                      String(
                        document.name ??
                          "Document",
                      ),

                    entityType:
                      String(
                        document.entity_type ??
                          "",
                      ),

                    entityId:
                      String(
                        document.entity_id ??
                          "",
                      ),

                    category:
                      nullableString(
                        document.category,
                      ),

                    message:
                      nullableString(
                        document.message,
                      ) ??
                      message?.body ??
                      null,

                    fileUrl:
                      nullableString(
                        document.file_url,
                      ),

                    fileType:
                      nullableString(
                        document.file_type,
                      ),

                    storageBucket:
                      nullableString(
                        document.storage_bucket,
                      ),

                    storagePath:
                      nullableString(
                        document.storage_path,
                      ),

                    mimeType:
                      nullableString(
                        document.mime_type,
                      ),

                    fileSize:
                      nullableNumber(
                        document.file_size,
                      ),

                    uploadedAt:
                      nullableString(
                        document.uploaded_at,
                      ),

                    uploadedBy:
                      nullableString(
                        document.uploaded_by,
                      ),

                    organizationId:
                      nullableString(
                        document.organization_id,
                      ),

                    communicationScope:
                      scope,

                    channel:
                      "tenant",

                    direction:
                      getDirection(
                        "tenant",
                        message
                          ?.senderRole ??
                          null,
                      ),

                    conversationId:
                      message
                        ?.conversationId ??
                      null,

                    messageId:
                      message?.id ??
                      null,

                    senderRole:
                      message
                        ?.senderRole ??
                      null,

                    personId:
                      tenantId,

                    personName:
                      nullableString(
                        tenant
                          ?.full_name,
                      ),

                    personEmail:
                      nullableString(
                        tenant
                          ?.email,
                      ),

                    personPhone:
                      nullableString(
                        tenant
                          ?.phone,
                      ),

                    leaseId,

                    leaseReference:
                      nullableString(
                        lease
                          ?.reference,
                      ),

                    propertyId,

                    propertyReference:
                      nullableString(
                        property
                          ?.reference,
                      ),

                    propertyTitle:
                      nullableString(
                        property
                          ?.title,
                      ),
                  };
                }

                if (
                  scope ===
                  "owner_agency"
                ) {
                  const message =
                    ownerMessageByDocument.get(
                      id,
                    );

                  const conversation =
                    message
                      ? ownerConversationById.get(
                          message.conversationId,
                        )
                      : null;

                  const ownerId =
                    nullableString(
                      conversation
                        ?.owner_id,
                    ) ??
                    nullableString(
                      document.entity_id,
                    );

                  const owner =
                    ownerId
                      ? ownerById.get(
                          ownerId,
                        )
                      : null;

                  return {
                    id,

                    name:
                      String(
                        document.name ??
                          "Document",
                      ),

                    entityType:
                      String(
                        document.entity_type ??
                          "",
                      ),

                    entityId:
                      String(
                        document.entity_id ??
                          "",
                      ),

                    category:
                      nullableString(
                        document.category,
                      ),

                    message:
                      nullableString(
                        document.message,
                      ) ??
                      message?.body ??
                      null,

                    fileUrl:
                      nullableString(
                        document.file_url,
                      ),

                    fileType:
                      nullableString(
                        document.file_type,
                      ),

                    storageBucket:
                      nullableString(
                        document.storage_bucket,
                      ),

                    storagePath:
                      nullableString(
                        document.storage_path,
                      ),

                    mimeType:
                      nullableString(
                        document.mime_type,
                      ),

                    fileSize:
                      nullableNumber(
                        document.file_size,
                      ),

                    uploadedAt:
                      nullableString(
                        document.uploaded_at,
                      ),

                    uploadedBy:
                      nullableString(
                        document.uploaded_by,
                      ),

                    organizationId:
                      nullableString(
                        document.organization_id,
                      ),

                    communicationScope:
                      scope,

                    channel:
                      "owner",

                    direction:
                      getDirection(
                        "owner",
                        message
                          ?.senderRole ??
                          null,
                      ),

                    conversationId:
                      message
                        ?.conversationId ??
                      null,

                    messageId:
                      message?.id ??
                      null,

                    senderRole:
                      message
                        ?.senderRole ??
                      null,

                    personId:
                      ownerId,

                    personName:
                      nullableString(
                        owner
                          ?.full_name,
                      ),

                    personEmail:
                      nullableString(
                        owner
                          ?.email,
                      ),

                    personPhone:
                      nullableString(
                        owner
                          ?.phone,
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
                  };
                }

                return {
                  id,

                  name:
                    String(
                      document.name ??
                        "Document",
                    ),

                  entityType:
                    String(
                      document.entity_type ??
                        "",
                    ),

                  entityId:
                    String(
                      document.entity_id ??
                        "",
                    ),

                  category:
                    nullableString(
                      document.category,
                    ),

                  message:
                    nullableString(
                      document.message,
                    ),

                  fileUrl:
                    nullableString(
                      document.file_url,
                    ),

                  fileType:
                    nullableString(
                      document.file_type,
                    ),

                  storageBucket:
                    nullableString(
                      document.storage_bucket,
                    ),

                  storagePath:
                    nullableString(
                      document.storage_path,
                    ),

                  mimeType:
                    nullableString(
                      document.mime_type,
                    ),

                  fileSize:
                    nullableNumber(
                      document.file_size,
                    ),

                  uploadedAt:
                    nullableString(
                      document.uploaded_at,
                    ),

                  uploadedBy:
                    nullableString(
                      document.uploaded_by,
                    ),

                  organizationId:
                    nullableString(
                      document.organization_id,
                    ),

                  communicationScope:
                    scope,

                  channel:
                    "internal",

                  direction:
                    "internal",

                  conversationId:
                    null,

                  messageId:
                    null,

                  senderRole:
                    null,

                  personId:
                    null,

                  personName:
                    null,

                  personEmail:
                    null,

                  personPhone:
                    null,

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
                };
              },
            );

          return {
            documents:
              mapped,

            total:
              mapped.length,

            tenantCount:
              mapped.filter(
                (d) =>
                  d.channel ===
                  "tenant",
              ).length,

            ownerCount:
              mapped.filter(
                (d) =>
                  d.channel ===
                  "owner",
              ).length,

            internalCount:
              mapped.filter(
                (d) =>
                  d.channel ===
                  "internal",
              ).length,

            receivedCount:
              mapped.filter(
                (d) =>
                  d.direction ===
                  "received",
              ).length,

            sentCount:
              mapped.filter(
                (d) =>
                  d.direction ===
                  "sent",
              ).length,
          };
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// TARGETS FOR NEW OUTBOUND MESSAGE
// ============================================================

export const useAgencyDocumentTargets =
  () =>
    useQuery<AgencyDocumentTargets>({
      queryKey:
        TARGETS_KEY,

      queryFn:
        async () => {
          const organizationId =
            await resolveOrganizationId();

          const {
            data:
              mandates,
            error:
              mandateError,
          } =
            await db
              .from(
                "mandates",
              )
              .select(
                "owner_id",
              )
              .eq(
                "organization_id",
                organizationId,
              )
              .eq(
                "status",
                "active",
              )
              .eq(
                "mandate_type",
                "management",
              );

          if (
            mandateError
          ) {
            throw mandateError;
          }

          const ownerIds =
            uniqueStrings(
              (
                mandates ?? []
              ).map(
                (row: GenericRow) =>
                  nullableString(
                    row.owner_id,
                  ),
              ),
            );

          const owners =
            await loadOwners(
              ownerIds,
            );

          const ownerTargets =
            owners
              .map(
                (
                  owner:
                    GenericRow,
                ): AgencyOwnerTarget => ({
                  channel:
                    "owner",

                  ownerId:
                    String(
                      owner.id,
                    ),

                  ownerName:
                    nullableString(
                      owner.full_name,
                    ) ??
                    "Propriétaire",

                  ownerEmail:
                    nullableString(
                      owner.email,
                    ),

                  ownerPhone:
                    nullableString(
                      owner.phone,
                    ),
                }),
              )
              .sort(
                (a, b) =>
                  a.ownerName.localeCompare(
                    b.ownerName,
                    "fr",
                  ),
              );

          if (
            ownerIds.length ===
            0
          ) {
            return {
              organizationId,
              tenantTargets:
                [],
              ownerTargets,
            };
          }

          const {
            data:
              leases,
            error:
              leaseError,
          } =
            await db
              .from(
                "leases",
              )
              .select(`
                id,
                reference,
                tenant_id,
                owner_id,
                property_id,
                status
              `)
              .in(
                "owner_id",
                ownerIds,
              )
              .eq(
                "status",
                "active",
              );

          if (
            leaseError
          ) {
            throw leaseError;
          }

          const tenantIds =
            uniqueStrings(
              (
                leases ?? []
              ).map(
                (row: GenericRow) =>
                  nullableString(
                    row.tenant_id,
                  ),
              ),
            );

          const propertyIds =
            uniqueStrings(
              (
                leases ?? []
              ).map(
                (row: GenericRow) =>
                  nullableString(
                    row.property_id,
                  ),
              ),
            );

          const [
            tenants,
            properties,
          ] =
            await Promise.all([
              loadTenants(
                tenantIds,
              ),

              loadProperties(
                propertyIds,
              ),
            ]);

          const tenantById =
            new Map(
              tenants.map(
                (row: GenericRow) => [
                  String(
                    row.id,
                  ),
                  row,
                ],
              ),
            );

          const propertyById =
            new Map(
              properties.map(
                (row: GenericRow) => [
                  String(
                    row.id,
                  ),
                  row,
                ],
              ),
            );

          const tenantTargets =
            (
              leases ?? []
            )
              .map(
                (
                  lease:
                    GenericRow,
                ) => {
                  const tenantId =
                    nullableString(
                      lease.tenant_id,
                    );

                  if (!tenantId) {
                    return null;
                  }

                  const tenant =
                    tenantById.get(
                      tenantId,
                    );

                  if (!tenant) {
                    return null;
                  }

                  const propertyId =
                    nullableString(
                      lease.property_id,
                    );

                  const property =
                    propertyId
                      ? propertyById.get(
                          propertyId,
                        )
                      : null;

                  return {
                    channel:
                      "tenant",

                    leaseId:
                      String(
                        lease.id,
                      ),

                    leaseReference:
                      nullableString(
                        lease.reference,
                      ),

                    tenantId,

                    tenantName:
                      nullableString(
                        tenant.full_name,
                      ) ??
                      "Locataire",

                    tenantEmail:
                      nullableString(
                        tenant.email,
                      ),

                    tenantPhone:
                      nullableString(
                        tenant.phone,
                      ),

                    propertyId,

                    propertyReference:
                      nullableString(
                        property
                          ?.reference,
                      ),

                    propertyTitle:
                      nullableString(
                        property
                          ?.title,
                      ),
                  } satisfies AgencyTenantTarget;
                },
              )
              .filter(
                (
                  value,
                ): value is AgencyTenantTarget =>
                  value !== null,
              );

          return {
            organizationId,
            tenantTargets,
            ownerTargets,
          };
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// SEND / REPLY
// ============================================================

export const useSendAgencyDocumentMessage =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            SendAgencyMessageInput,
        ) => {
          const user =
            await requireUser();

          const organizationId =
            await resolveOrganizationId();

          const message =
            normalizeMessage(
              input.message,
            );

          const file =
            input.file ??
            null;

          if (
            !message &&
            !file
          ) {
            throw new Error(
              "Ajoutez un message ou un document.",
            );
          }

          // ==================================================
          // TENANT
          // ==================================================

          if (
            input.channel ===
            "tenant"
          ) {
            const leaseId =
              input.leaseId.trim();

            if (!leaseId) {
              throw new Error(
                "Sélectionnez un locataire et son bail.",
              );
            }

            if (!file) {
              const {
                error,
              } =
                await db.rpc(
                  "send_lease_message",
                  {
                    p_lease_id:
                      leaseId,

                    p_body:
                      message,

                    p_document_id:
                      null,
                  },
                );

              if (error) {
                throw error;
              }

              return;
            }

            const mimeType =
              validateFile(
                file,
              );

            const path =
              await uploadAgencyFile(
                organizationId,
                user.id,
                file,
                mimeType,
              );

            try {
              const {
                error,
              } =
                await db.rpc(
                  "send_lease_message_with_attachment",
                  {
                    p_lease_id:
                      leaseId,

                    p_body:
                      message ||
                      `Document : ${file.name}`,

                    p_name:
                      file.name,

                    p_storage_path:
                      path,

                    p_mime_type:
                      mimeType,

                    p_file_size:
                      file.size,

                    p_category:
                      input.category ??
                      "other",

                    p_document_message:
                      message ||
                      null,
                  },
                );

              if (error) {
                throw error;
              }
            } catch (
              rpcError
            ) {
              await cleanupUpload(
                path,
              );

              throw rpcError;
            }

            return;
          }

          // ==================================================
          // OWNER
          // ==================================================

          const ownerId =
            input.ownerId.trim();

          if (!ownerId) {
            throw new Error(
              "Sélectionnez un propriétaire.",
            );
          }

          if (!file) {
            const {
              error,
            } =
              await db.rpc(
                "send_owner_agency_message",
                {
                  p_owner_id:
                    ownerId,

                  p_organization_id:
                    organizationId,

                  p_body:
                    message,

                  p_document_id:
                    null,
                },
              );

            if (error) {
              throw error;
            }

            return;
          }

          const mimeType =
            validateFile(
              file,
            );

          const path =
            await uploadAgencyFile(
              organizationId,
              user.id,
              file,
              mimeType,
            );

          try {
            const {
              error,
            } =
              await db.rpc(
                "send_owner_agency_message_with_attachment",
                {
                  p_owner_id:
                    ownerId,

                  p_organization_id:
                    organizationId,

                  p_body:
                    message ||
                    `Document : ${file.name}`,

                  p_name:
                    file.name,

                  p_storage_path:
                    path,

                  p_mime_type:
                    mimeType,

                  p_file_size:
                    file.size,

                  p_category:
                    input.category ??
                    "other",

                  p_document_message:
                    message ||
                    null,
                },
              );

            if (error) {
              throw error;
            }
          } catch (
            rpcError
          ) {
            await cleanupUpload(
              path,
            );

            throw rpcError;
          }
        },

      onSuccess:
        async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey:
                DOCUMENTS_KEY,
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "tenant-portal",
                "document-exchange",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "owner-portal",
                "document-exchange",
              ],
            }),
          ]);
        },
    });
  };