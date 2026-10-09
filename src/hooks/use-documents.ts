import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

import type {
  Document as DocumentRecord,
  DocumentInsert,
} from "@/types/real-estate";

const KEY =
  "documents";

export const ENTITY_DOCUMENTS_BUCKET =
  "entity-documents";

export const ENTITY_DOCUMENT_MAX_SIZE =
  10 * 1024 * 1024;

export const ENTITY_DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export interface UploadEntityDocumentsInput {
  entityType: string;
  entityId: string;
  files: File[];
}

const getRandomId =
  () => {
    if (
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  };

const sanitizeFileName =
  (
    fileName:
      string,
  ) => {
    const normalized =
      fileName
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          "",
        )
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "-",
        )
        .replace(
          /-+/g,
          "-",
        )
        .replace(
          /^-+|-+$/g,
          "",
        );

    return (
      normalized ||
      "document"
    );
  };

const sanitizePathSegment =
  (
    value:
      string,
  ) =>
    value
      .trim()
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      )
      .replace(
        /-+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      );

const getFileType =
  (
    file:
      File,
  ) => {
    if (
      file.type ===
      "application/pdf"
    ) {
      return "pdf";
    }

    if (
      file.type.startsWith(
        "image/",
      )
    ) {
      return "image";
    }

    return "document";
  };

const validateEntityDocument =
  (
    file:
      File,
  ) => {
    if (
      file.size >
      ENTITY_DOCUMENT_MAX_SIZE
    ) {
      throw new Error(
        `${file.name} dépasse la taille maximale de 10 Mo.`,
      );
    }

    if (
      !file.type ||
      !ENTITY_DOCUMENT_ALLOWED_TYPES.includes(
        file.type as (
          typeof ENTITY_DOCUMENT_ALLOWED_TYPES
        )[number],
      )
    ) {
      throw new Error(
        `${file.name} : format non autorisé. Utilisez PDF, JPG, PNG ou WEBP.`,
      );
    }
  };

export const createDocumentAccessUrl =
  async (
    document:
      DocumentRecord,
    expiresIn =
      300,
  ) => {
    if (
      document.storage_bucket &&
      document.storage_path
    ) {
      const {
        data,
        error,
      } = await supabase.storage
        .from(
          document.storage_bucket,
        )
        .createSignedUrl(
          document.storage_path,
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
    }

    if (
      document.file_url
    ) {
      return document.file_url;
    }

    throw new Error(
      "Aucun fichier n'est associé à ce document.",
    );
  };

export const useDocuments =
  (
    entityType?:
      string,
    entityId?:
      string,
  ) =>
    useQuery({
      queryKey: [
        KEY,
        entityType,
        entityId,
      ],

      queryFn:
        async (): Promise<
          DocumentRecord[]
        > => {
          let query =
            supabase
              .from(
                "documents",
              )
              .select("*")
              .order(
                "uploaded_at",
                {
                  ascending:
                    false,
                },
              );

          if (
            entityType
          ) {
            query =
              query.eq(
                "entity_type",
                entityType,
              );
          }

          if (
            entityId
          ) {
            query =
              query.eq(
                "entity_id",
                entityId,
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
            data ??
            []
          );
        },
    });

export const useDocumentsByEntityIds =
  (
    entityType:
      string,
    entityIds:
      string[],
  ) => {
    const normalizedIds =
      [
        ...new Set(
          entityIds,
        ),
      ].sort();

    return useQuery({
      queryKey: [
        KEY,
        entityType,
        "entity-ids",
        normalizedIds,
      ],

      enabled:
        Boolean(
          entityType,
        ) &&
        normalizedIds.length >
          0,

      queryFn:
        async (): Promise<
          DocumentRecord[]
        > => {
          if (
            normalizedIds.length ===
            0
          ) {
            return [];
          }

          const {
            data,
            error,
          } = await supabase
            .from(
              "documents",
            )
            .select("*")
            .eq(
              "entity_type",
              entityType,
            )
            .in(
              "entity_id",
              normalizedIds,
            )
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
            data ??
            []
          );
        },
    });
  };

export const useCreateDocument =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            DocumentInsert,
        ) => {
          const {
            data,
            error,
          } = await supabase
            .from(
              "documents",
            )
            .insert(
              input,
            )
            .select()
            .single();

          if (error) {
            throw error;
          }

          return data;
        },

      onSuccess:
        () =>
          queryClient
            .invalidateQueries({
              queryKey: [
                KEY,
              ],
            }),
    });
  };

export const useUploadEntityDocuments =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            UploadEntityDocumentsInput,
        ) => {
          const entityType =
            input.entityType.trim();

          if (
            !entityType
          ) {
            throw new Error(
              "Le type d'entité documentaire est obligatoire.",
            );
          }

          if (
            !input.entityId
          ) {
            throw new Error(
              "L'entité documentaire est introuvable.",
            );
          }

          if (
            input.files.length ===
            0
          ) {
            return [] as DocumentRecord[];
          }

          input.files.forEach(
            validateEntityDocument,
          );

          const pathEntityType =
            sanitizePathSegment(
              entityType,
            );

          if (
            !pathEntityType
          ) {
            throw new Error(
              "Le type d'entité documentaire est invalide.",
            );
          }

          const createdDocuments:
            DocumentRecord[] =
            [];

          const uploadedPaths:
            string[] =
            [];

          try {
            for (
              const file
              of input.files
            ) {
              const cleanName =
                sanitizeFileName(
                  file.name,
                );

              const storagePath =
                `${pathEntityType}/${input.entityId}/${getRandomId()}-${cleanName}`;

              const {
                error:
                  uploadError,
              } =
                await supabase.storage
                  .from(
                    ENTITY_DOCUMENTS_BUCKET,
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
                        file.type,
                    },
                  );

              if (
                uploadError
              ) {
                throw uploadError;
              }

              uploadedPaths.push(
                storagePath,
              );

              const documentInput:
                DocumentInsert =
                {
                  entity_type:
                    entityType,

                  entity_id:
                    input.entityId,

                  name:
                    file.name,

                  file_url:
                    null,

                  file_type:
                    getFileType(
                      file,
                    ),

                  storage_bucket:
                    ENTITY_DOCUMENTS_BUCKET,

                  storage_path:
                    storagePath,

                  mime_type:
                    file.type,

                  file_size:
                    file.size,
                };

              const {
                data:
                  insertedDocument,
                error:
                  insertError,
              } = await supabase
                .from(
                  "documents",
                )
                .insert(
                  documentInput,
                )
                .select()
                .single();

              if (
                insertError
              ) {
                throw insertError;
              }

              createdDocuments.push(
                insertedDocument,
              );
            }

            return createdDocuments;
          } catch (
            error
          ) {
            if (
              createdDocuments.length >
              0
            ) {
              await supabase
                .from(
                  "documents",
                )
                .delete()
                .in(
                  "id",
                  createdDocuments.map(
                    (
                      document,
                    ) =>
                      document.id,
                  ),
                );
            }

            if (
              uploadedPaths.length >
              0
            ) {
              await supabase.storage
                .from(
                  ENTITY_DOCUMENTS_BUCKET,
                )
                .remove(
                  uploadedPaths,
                );
            }

            throw error;
          }
        },

      onSuccess:
        async () => {
          await queryClient
            .invalidateQueries({
              queryKey: [
                KEY,
              ],
            });
        },
    });
  };

export const useDeleteDocument =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          id:
            string,
        ) => {
          const {
            error,
          } = await supabase
            .from(
              "documents",
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

      onSuccess:
        () =>
          queryClient
            .invalidateQueries({
              queryKey: [
                KEY,
              ],
            }),
    });
  };