import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

import type {
  InspectionDocumentSnapshot,
} from "@/hooks/use-inspections";

export const INSPECTION_DOCUMENT_BUCKET =
  "entity-documents";

export const INSPECTION_DOCUMENT_MAX_SIZE =
  10 * 1024 * 1024;

export const INSPECTION_DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type InspectionDocumentMimeType =
  (typeof INSPECTION_DOCUMENT_ALLOWED_TYPES)[number];

export type InspectionDocumentCategory =
  | "overview"
  | "room"
  | "item"
  | "meter"
  | "finding"
  | "other";

export type InspectionEvidenceDocument = {
  inspectionDocumentId: string;
  documentId: string;
  inspectionId: string;

  roomId: string | null;
  itemId: string | null;
  meterReadingId: string | null;
  findingId: string | null;

  category: string;
  createdAt: string;

  name: string;
  mimeType: string | null;
  fileSize: number | null;

  storageBucket: string | null;
  storagePath: string | null;

  uploadedAt: string | null;
  uploadedBy: string | null;
};

export type UploadInspectionEvidenceInput = {
  inspectionId: string;
  organizationId: string;

  file: File;

  category: InspectionDocumentCategory;

  roomId?: string;
  itemId?: string;
  meterReadingId?: string;
  findingId?: string;

  message?: string;
};

type JsonObject =
  Record<string, unknown>;

const DOCUMENT_METADATA_KEY =
  "inspection-document-metadata";

const getErrorMessage = (
  error: unknown,
) =>
  error instanceof Error
    ? error.message
    : String(error);

const isObject = (
  value: unknown,
): value is JsonObject =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);

const nullableString = (
  value: unknown,
): string | null =>
  typeof value === "string" &&
  value.length > 0
    ? value
    : null;

const sanitizeStorageFileName = (
  fileName: string,
) => {
  const safe =
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
      );

  return safe || "document";
};

const getExtension = (
  fileName: string,
) =>
  sanitizeStorageFileName(
    fileName,
  )
    .split(".")
    .pop()
    ?.toLowerCase() ??
  "";

const resolveMimeType = (
  file: File,
): InspectionDocumentMimeType => {
  let mime =
    file.type
      ?.trim()
      .toLowerCase() ??
    "";

  if (mime === "image/jpg") {
    mime = "image/jpeg";
  }

  if (
    INSPECTION_DOCUMENT_ALLOWED_TYPES.includes(
      mime as InspectionDocumentMimeType,
    )
  ) {
    return mime as InspectionDocumentMimeType;
  }

  const extension =
    getExtension(
      file.name,
    );

  const fallback =
    extension === "pdf"
      ? "application/pdf"
      : extension === "jpg" ||
          extension === "jpeg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : null;

  if (!fallback) {
    throw new Error(
      "Format non autorisé. Utilisez PDF, JPEG, PNG ou WebP.",
    );
  }

  return fallback;
};

const validateFile = (
  file: File,
) => {
  if (!file.name.trim()) {
    throw new Error(
      "Le nom du fichier est obligatoire.",
    );
  }

  if (file.name.trim().length > 255) {
    throw new Error(
      "Le nom du fichier ne peut pas dépasser 255 caractères.",
    );
  }

  if (file.size <= 0) {
    throw new Error(
      "Le fichier est vide.",
    );
  }

  if (
    file.size >
    INSPECTION_DOCUMENT_MAX_SIZE
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
  value: string | undefined,
) => {
  const message =
    value?.trim() ?? "";

  if (message.length > 2000) {
    throw new Error(
      "La légende ne peut pas dépasser 2 000 caractères.",
    );
  }

  return message || undefined;
};

const validateTarget = (
  input: UploadInspectionEvidenceInput,
) => {
  const targets = [
    input.roomId,
    input.itemId,
    input.meterReadingId,
    input.findingId,
  ].filter(Boolean);

  if (
    input.category === "overview" ||
    input.category === "other"
  ) {
    if (targets.length !== 0) {
      throw new Error(
        "Une preuve générale ne doit cibler aucun sous-élément.",
      );
    }

    return;
  }

  if (
    input.category === "room" &&
    (
      !input.roomId ||
      targets.length !== 1
    )
  ) {
    throw new Error(
      "Une preuve de pièce doit cibler exactement une pièce.",
    );
  }

  if (
    input.category === "item" &&
    (
      !input.itemId ||
      targets.length !== 1
    )
  ) {
    throw new Error(
      "Une preuve d’équipement doit cibler exactement un équipement.",
    );
  }

  if (
    input.category === "meter" &&
    (
      !input.meterReadingId ||
      targets.length !== 1
    )
  ) {
    throw new Error(
      "Une preuve de compteur doit cibler exactement un relevé.",
    );
  }

  if (
    input.category === "finding" &&
    (
      !input.findingId ||
      targets.length !== 1
    )
  ) {
    throw new Error(
      "Une preuve d’anomalie doit cibler exactement une anomalie.",
    );
  }
};

const buildInspectionStoragePath = (
  organizationId: string,
  userId: string,
  inspectionId: string,
  fileName: string,
) => {
  const storageFileName =
    `${crypto.randomUUID()}-${sanitizeStorageFileName(
      fileName,
    )}`;

  return [
    "agency",
    organizationId,
    userId,
    "inspection",
    inspectionId,
    storageFileName,
  ].join("/");
};

const removeStorageObject = async (
  storageBucket: string,
  storagePath: string,
) => {
  const {
    error,
  } =
    await supabase.storage
      .from(
        storageBucket,
      )
      .remove([
        storagePath,
      ]);

  return error;
};

const findRegisteredEvidence = async (
  inspectionId: string,
  storagePath: string,
) => {
  const {
    data:
      document,
    error:
      documentError,
  } =
    await supabase
      .from(
        "documents",
      )
      .select(
        "id, storage_bucket, storage_path",
      )
      .eq(
        "storage_bucket",
        INSPECTION_DOCUMENT_BUCKET,
      )
      .eq(
        "storage_path",
        storagePath,
      )
      .eq(
        "entity_type",
        "inspection",
      )
      .eq(
        "entity_id",
        inspectionId,
      )
      .maybeSingle();

  if (documentError) {
    throw documentError;
  }

  if (!document) {
    return null;
  }

  const {
    data:
      link,
    error:
      linkError,
  } =
    await supabase
      .from(
        "inspection_documents",
      )
      .select(
        "id, document_id, inspection_id, category",
      )
      .eq(
        "document_id",
        document.id,
      )
      .eq(
        "inspection_id",
        inspectionId,
      )
      .maybeSingle();

  if (linkError) {
    throw linkError;
  }

  if (!link) {
    throw new Error(
      "Le document existe mais sa liaison avec l’état des lieux est introuvable.",
    );
  }

  return {
    document,
    link,
  };
};

export const useInspectionDocumentMetadata = (
  inspectionId: string,
  links: InspectionDocumentSnapshot[],
) => {
  const documentIds =
    links
      .map(
        (link) =>
          link.document_id,
      )
      .sort();

  return useQuery<
    InspectionEvidenceDocument[]
  >({
    queryKey: [
      DOCUMENT_METADATA_KEY,
      inspectionId,
      documentIds.join("|"),
    ],

    queryFn:
      async () => {
        if (
          documentIds.length === 0
        ) {
          return [];
        }

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "documents",
            )
            .select(
              `
                id,
                name,
                mime_type,
                file_size,
                storage_bucket,
                storage_path,
                uploaded_at,
                uploaded_by
              `,
            )
            .in(
              "id",
              documentIds,
            );

        if (error) {
          throw error;
        }

        const byId =
          new Map(
            (
              data ??
              []
            ).map(
              (document) => [
                document.id,
                document,
              ],
            ),
          );

        return links.map(
          (link) => {
            const document =
              byId.get(
                link.document_id,
              );

            if (!document) {
              throw new Error(
                `Métadonnées introuvables pour le document ${link.document_id}.`,
              );
            }

            return {
              inspectionDocumentId:
                link.id,

              documentId:
                link.document_id,

              inspectionId,

              roomId:
                link.room_id,

              itemId:
                link.item_id,

              meterReadingId:
                link.meter_reading_id,

              findingId:
                link.finding_id,

              category:
                link.category,

              createdAt:
                link.created_at,

              name:
                document.name,

              mimeType:
                document.mime_type,

              fileSize:
                document.file_size,

              storageBucket:
                document.storage_bucket,

              storagePath:
                document.storage_path,

              uploadedAt:
                document.uploaded_at,

              uploadedBy:
                document.uploaded_by,
            };
          },
        );
      },

    staleTime:
      15_000,

    retry:
      false,
  });
};

export const createInspectionDocumentAccessUrl =
  async (
    document:
      InspectionEvidenceDocument,
    expiresIn =
      300,
  ) => {
    if (
      !document.storageBucket ||
      !document.storagePath
    ) {
      throw new Error(
        "Aucun fichier Storage n’est associé à ce document.",
      );
    }

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

    if (error) {
      throw error;
    }

    if (
      !data?.signedUrl
    ) {
      throw new Error(
        "Impossible de générer le lien sécurisé du document.",
      );
    }

    return data.signedUrl;
  };

export const useUploadInspectionEvidence =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            UploadInspectionEvidenceInput,
        ) => {
          validateTarget(
            input,
          );

          const mimeType =
            validateFile(
              input.file,
            );

          const message =
            normalizeMessage(
              input.message,
            );

          const {
            data:
              userData,
            error:
              userError,
          } =
            await supabase.auth
              .getUser();

          if (userError) {
            throw userError;
          }

          const user =
            userData.user;

          if (!user) {
            throw new Error(
              "Authentification requise.",
            );
          }

          const storagePath =
            buildInspectionStoragePath(
              input.organizationId,
              user.id,
              input.inspectionId,
              input.file.name,
            );

          const {
            error:
              uploadError,
          } =
            await supabase.storage
              .from(
                INSPECTION_DOCUMENT_BUCKET,
              )
              .upload(
                storagePath,
                input.file,
                {
                  cacheControl:
                    "3600",

                  upsert:
                    false,

                  contentType:
                    mimeType,
                },
              );

          if (uploadError) {
            throw uploadError;
          }

          const rpcArgs = {
            p_inspection_id:
              input.inspectionId,

            p_name:
              input.file.name.trim(),

            p_storage_path:
              storagePath,

            p_mime_type:
              mimeType,

            p_file_size:
              input.file.size,

            p_category:
              input.category,

            p_room_id:
              input.roomId,

            p_item_id:
              input.itemId,

            p_meter_reading_id:
              input.meterReadingId,

            p_finding_id:
              input.findingId,

            p_message:
              message,
          };

          const {
            data:
              registration,
            error:
              registrationError,
          } =
            await supabase.rpc(
              "register_inspection_document",
              rpcArgs,
            );

          if (
            !registrationError &&
            registration
          ) {
            return {
              storagePath,
              registration,
              recovered:
                false,
            };
          }

          /*
           * Do not immediately delete Storage here.
           *
           * A network error can happen after PostgreSQL committed
           * the registration but before the client received the
           * response. Verify the DB state first.
           */
          try {
            const existing =
              await findRegisteredEvidence(
                input.inspectionId,
                storagePath,
              );

            if (existing) {
              return {
                storagePath,
                registration:
                  existing,
                recovered:
                  true,
              };
            }
          } catch (
            verificationError
          ) {
            console.error(
              "[InspectionDocuments] État d'enregistrement ambigu. Le fichier Storage est conservé.",
              verificationError,
            );

            throw new Error(
              `${
                registrationError
                  ? registrationError.message
                  : "Enregistrement documentaire non confirmé."
              } Vérification impossible : le fichier Storage a été conservé par sécurité.`,
            );
          }

          const cleanupError =
            await removeStorageObject(
              INSPECTION_DOCUMENT_BUCKET,
              storagePath,
            );

          if (cleanupError) {
            console.error(
              "[InspectionDocuments] Impossible de nettoyer l'upload orphelin :",
              storagePath,
              cleanupError,
            );
          }

          throw (
            registrationError ??
            new Error(
              "Impossible d’enregistrer le document.",
            )
          );
        },

      onSuccess:
        async () => {
          await queryClient
            .invalidateQueries({
              queryKey: [
                "inspections",
              ],
            });
        },
    });
  };

export const useDetachInspectionEvidence =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          document:
            InspectionEvidenceDocument,
        ) => {
          /*
           * Keep the pre-existing Storage coordinates.
           * They are useful if the RPC commits but its response
           * is lost over the network.
           */
          const fallbackBucket =
            document.storageBucket;

          const fallbackPath =
            document.storagePath;

          const {
            data:
              result,
            error:
              detachError,
          } =
            await supabase.rpc(
              "detach_inspection_document",
              {
                p_inspection_document_id:
                  document.inspectionDocumentId,
              },
            );

          let dbDetached =
            !detachError;

          if (detachError) {
            /*
             * Determine whether the RPC really failed, or whether
             * PostgreSQL committed and only the response was lost.
             */
            const {
              data:
                existingLink,
              error:
                verificationError,
            } =
              await supabase
                .from(
                  "inspection_documents",
                )
                .select(
                  "id",
                )
                .eq(
                  "id",
                  document.inspectionDocumentId,
                )
                .maybeSingle();

            if (verificationError) {
              throw new Error(
                `${detachError.message} Vérification du détachement impossible. Aucun fichier Storage n’a été supprimé.`,
              );
            }

            if (existingLink) {
              throw detachError;
            }

            dbDetached =
              true;
          }

          if (!dbDetached) {
            throw new Error(
              "Le détachement du document n’a pas été confirmé.",
            );
          }

          const resultObject =
            isObject(result)
              ? result
              : null;

          const storageBucket =
            nullableString(
              resultObject
                ?.storage_bucket,
            ) ??
            fallbackBucket;

          const storagePath =
            nullableString(
              resultObject
                ?.storage_path,
            ) ??
            fallbackPath;

          if (
            !storageBucket ||
            !storagePath
          ) {
            return {
              result,
              storageRemoved:
                false,
              storageCleanupError:
                "Chemin Storage indisponible après détachement.",
            };
          }

          const cleanupError =
            await removeStorageObject(
              storageBucket,
              storagePath,
            );

          if (cleanupError) {
            console.error(
              "[InspectionDocuments] Document détaché mais objet Storage non supprimé :",
              storagePath,
              cleanupError,
            );

            return {
              result,
              storageRemoved:
                false,
              storageCleanupError:
                getErrorMessage(
                  cleanupError,
                ),
            };
          }

          return {
            result,
            storageRemoved:
              true,
            storageCleanupError:
              null,
          };
        },

      onSuccess:
        async () => {
          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey: [
                  "inspections",
                ],
              }),

            queryClient
              .invalidateQueries({
                queryKey: [
                  DOCUMENT_METADATA_KEY,
                ],
              }),
          ]);
        },
    });
  };