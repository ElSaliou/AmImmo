import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  AlertTriangle,
  ExternalLink,
  FileImage,
  FileText,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  InspectionDocumentSnapshot,
  InspectionFindingSnapshot,
  InspectionMeterSnapshot,
  InspectionRoomSnapshot,
  InspectionStatus,
} from "@/hooks/use-inspections";

import {
  createInspectionDocumentAccessUrl,
  useDetachInspectionEvidence,
  useInspectionDocumentMetadata,
  useUploadInspectionEvidence,
  type InspectionDocumentCategory,
  type InspectionEvidenceDocument,
} from "@/hooks/use-inspection-documents";

type InspectionDocumentEditorProps = {
  inspectionId: string;
  organizationId: string;
  status: InspectionStatus;

  documents: InspectionDocumentSnapshot[];
  rooms: InspectionRoomSnapshot[];
  meters: InspectionMeterSnapshot[];
  findings: InspectionFindingSnapshot[];
};

type CategoryOption = {
  value: InspectionDocumentCategory;
  label: string;
};

const NONE_VALUE =
  "__none__";

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: "overview",
    label: "Vue générale",
  },
  {
    value: "room",
    label: "Pièce",
  },
  {
    value: "item",
    label: "Équipement / élément",
  },
  {
    value: "meter",
    label: "Compteur",
  },
  {
    value: "finding",
    label: "Anomalie / constat",
  },
  {
    value: "other",
    label: "Autre",
  },
];

const CATEGORY_LABELS =
  Object.fromEntries(
    CATEGORY_OPTIONS.map(
      (option) => [
        option.value,
        option.label,
      ],
    ),
  ) as Record<string, string>;

const getErrorMessage = (
  error: unknown,
) =>
  error instanceof Error
    ? error.message
    : "Une erreur est survenue.";

const formatFileSize = (
  size: number | null,
) => {
  if (
    size === null ||
    !Number.isFinite(size)
  ) {
    return "Taille inconnue";
  }

  if (size < 1024) {
    return `${size} o`;
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${(
      size /
      1024
    ).toFixed(1)} Ko`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} Mo`;
};

const isImageDocument = (
  document: InspectionEvidenceDocument,
) =>
  document.mimeType?.startsWith(
    "image/",
  ) ?? false;

export function InspectionDocumentEditor({
  inspectionId,
  organizationId,
  status,
  documents,
  rooms,
  meters,
  findings,
}: InspectionDocumentEditorProps) {
  const canEdit =
    status === "draft";

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    category,
    setCategory,
  ] =
    useState<InspectionDocumentCategory>(
      "overview",
    );

  const [
    targetId,
    setTargetId,
  ] =
    useState(
      NONE_VALUE,
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    actionError,
    setActionError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    actionWarning,
    setActionWarning,
  ] =
    useState<string | null>(
      null,
    );

  const metadata =
    useInspectionDocumentMetadata(
      inspectionId,
      documents,
    );

  const uploadEvidence =
    useUploadInspectionEvidence();

  const detachEvidence =
    useDetachInspectionEvidence();

  const itemOptions =
    useMemo(
      () =>
        rooms.flatMap(
          (room) =>
            room.items.map(
              (item) => ({
                id:
                  item.id,

                label:
                  `${room.name} · ${item.name}`,
              }),
            ),
        ),
      [rooms],
    );

  const roomLookup =
    useMemo(
      () =>
        new Map(
          rooms.map(
            (room) => [
              room.id,
              room.name,
            ],
          ),
        ),
      [rooms],
    );

  const itemLookup =
    useMemo(
      () =>
        new Map(
          itemOptions.map(
            (item) => [
              item.id,
              item.label,
            ],
          ),
        ),
      [itemOptions],
    );

  const meterLookup =
    useMemo(
      () =>
        new Map(
          meters.map(
            (meter) => [
              meter.id,
              [
                meter.meter_type,
                meter.meter_number,
              ]
                .filter(Boolean)
                .join(" · ") ||
                "Compteur",
            ],
          ),
        ),
      [meters],
    );

  const findingLookup =
    useMemo(
      () =>
        new Map(
          findings.map(
            (finding) => [
              finding.id,
              finding.title ||
                "Constat",
            ],
          ),
        ),
      [findings],
    );

  const requiresTarget =
    category === "room" ||
    category === "item" ||
    category === "meter" ||
    category === "finding";

  const busy =
    uploadEvidence.isPending ||
    detachEvidence.isPending;

  const resetForm = () => {
    setSelectedFile(
      null,
    );

    setCategory(
      "overview",
    );

    setTargetId(
      NONE_VALUE,
    );

    setMessage("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };

  const handleCategoryChange = (
    value: string,
  ) => {
    setCategory(
      value as InspectionDocumentCategory,
    );

    setTargetId(
      NONE_VALUE,
    );

    setActionError(
      null,
    );

    setActionWarning(
      null,
    );
  };

  const handleUpload = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !canEdit ||
      !selectedFile
    ) {
      return;
    }

    if (
      requiresTarget &&
      targetId === NONE_VALUE
    ) {
      setActionError(
        "Sélectionnez l’élément auquel rattacher le document.",
      );

      return;
    }

    setActionError(
      null,
    );

    setActionWarning(
      null,
    );

    const input = {
      inspectionId,
      organizationId,
      file:
        selectedFile,
      category,
      message:
        message.trim() ||
        undefined,
    } as const;

    try {
      if (
        category ===
        "room"
      ) {
        await uploadEvidence.mutateAsync({
          ...input,
          roomId:
            targetId,
        });
      } else if (
        category ===
        "item"
      ) {
        await uploadEvidence.mutateAsync({
          ...input,
          itemId:
            targetId,
        });
      } else if (
        category ===
        "meter"
      ) {
        await uploadEvidence.mutateAsync({
          ...input,
          meterReadingId:
            targetId,
        });
      } else if (
        category ===
        "finding"
      ) {
        await uploadEvidence.mutateAsync({
          ...input,
          findingId:
            targetId,
        });
      } else {
        await uploadEvidence.mutateAsync(
          input,
        );
      }

      resetForm();
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
        ),
      );
    }
  };

  const handleOpen = async (
    document:
      InspectionEvidenceDocument,
  ) => {
    setActionError(
      null,
    );

    setActionWarning(
      null,
    );

    /*
     * Open the tab synchronously from the user's click.
     * Waiting for the signed URL before window.open() can cause
     * browsers to classify the new tab as a blocked popup.
     */
    const previewWindow =
      window.open(
        "about:blank",
        "_blank",
      );

    if (!previewWindow) {
      setActionError(
        "Le navigateur a bloqué l’ouverture du document. Autorisez les fenêtres contextuelles pour ce site.",
      );

      return;
    }

    previewWindow.opener =
      null;

    try {
      const url =
        await createInspectionDocumentAccessUrl(
          document,
        );

      previewWindow.location.replace(
        url,
      );
    } catch (error) {
      previewWindow.close();

      setActionError(
        getErrorMessage(
          error,
        ),
      );
    }
  };

  const handleDelete = async (
    document:
      InspectionEvidenceDocument,
  ) => {
    if (
      !canEdit ||
      busy
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Supprimer le document « ${document.name} » de cet état des lieux ?`,
      );

    if (!confirmed) {
      return;
    }

    setActionError(
      null,
    );

    setActionWarning(
      null,
    );

    try {
      const result =
        await detachEvidence.mutateAsync(
          document,
        );

      if (
        result.storageCleanupError
      ) {
        setActionWarning(
          `Le document a été retiré de l’état des lieux, mais le nettoyage du fichier Storage n’a pas pu être confirmé : ${result.storageCleanupError}`,
        );
      }
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
        ),
      );
    }
  };

  const getTargetLabel = (
    document:
      InspectionEvidenceDocument,
  ) => {
    if (document.roomId) {
      return (
        roomLookup.get(
          document.roomId,
        ) ??
        "Pièce liée"
      );
    }

    if (document.itemId) {
      return (
        itemLookup.get(
          document.itemId,
        ) ??
        "Équipement lié"
      );
    }

    if (
      document.meterReadingId
    ) {
      return (
        meterLookup.get(
          document.meterReadingId,
        ) ??
        "Compteur lié"
      );
    }

    if (document.findingId) {
      return (
        findingLookup.get(
          document.findingId,
        ) ??
        "Constat lié"
      );
    }

    return "État des lieux";
  };

  const renderTargetSelect =
    () => {
      if (
        category ===
        "overview" ||
        category ===
        "other"
      ) {
        return null;
      }

      if (
        category ===
        "room"
      ) {
        return (
          <div className="space-y-2">
            <Label>
              Pièce
            </Label>

            <Select
              value={
                targetId
              }
              onValueChange={
                setTargetId
              }
              disabled={
                busy
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une pièce" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem
                  value={
                    NONE_VALUE
                  }
                >
                  Sélectionner
                </SelectItem>

                {rooms.map(
                  (room) => (
                    <SelectItem
                      key={
                        room.id
                      }
                      value={
                        room.id
                      }
                    >
                      {
                        room.name
                      }
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        );
      }

      if (
        category ===
        "item"
      ) {
        return (
          <div className="space-y-2">
            <Label>
              Équipement / élément
            </Label>

            <Select
              value={
                targetId
              }
              onValueChange={
                setTargetId
              }
              disabled={
                busy
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un élément" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem
                  value={
                    NONE_VALUE
                  }
                >
                  Sélectionner
                </SelectItem>

                {itemOptions.map(
                  (item) => (
                    <SelectItem
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {
                        item.label
                      }
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        );
      }

      if (
        category ===
        "meter"
      ) {
        return (
          <div className="space-y-2">
            <Label>
              Compteur
            </Label>

            <Select
              value={
                targetId
              }
              onValueChange={
                setTargetId
              }
              disabled={
                busy
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un compteur" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem
                  value={
                    NONE_VALUE
                  }
                >
                  Sélectionner
                </SelectItem>

                {meters.map(
                  (meter) => (
                    <SelectItem
                      key={
                        meter.id
                      }
                      value={
                        meter.id
                      }
                    >
                      {meterLookup.get(
                        meter.id,
                      )}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          <Label>
            Anomalie / constat
          </Label>

          <Select
            value={
              targetId
            }
            onValueChange={
              setTargetId
            }
            disabled={
              busy
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un constat" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem
                value={
                  NONE_VALUE
                }
              >
                Sélectionner
              </SelectItem>

              {findings.map(
                (finding) => (
                  <SelectItem
                    key={
                      finding.id
                    }
                    value={
                      finding.id
                    }
                  >
                    {
                      finding.title
                    }
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      );
    };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          Photos et documents
        </h2>

        <p className="text-sm text-muted-foreground">
          Ajoutez les photos et justificatifs servant de preuves à l’état des lieux.
        </p>
      </div>

      {!canEdit && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Les preuves sont en lecture seule car cet état des lieux n’est plus en brouillon.
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {actionWarning && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          {actionWarning}
        </div>
      )}

      {canEdit && (
        <form
          className="space-y-4 rounded-lg border bg-muted/20 p-4"
          onSubmit={
            handleUpload
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inspection-document-file">
                Fichier
              </Label>

              <Input
                ref={
                  fileInputRef
                }
                id="inspection-document-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setSelectedFile(
                    event.currentTarget
                      .files?.[0] ??
                      null,
                  );

                  setActionError(
                    null,
                  );
                }}
                disabled={
                  busy
                }
              />

              <p className="text-xs text-muted-foreground">
                PDF, JPEG, PNG ou WebP — 10 Mo maximum.
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Type de preuve
              </Label>

              <Select
                value={
                  category
                }
                onValueChange={
                  handleCategoryChange
                }
                disabled={
                  busy
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {CATEGORY_OPTIONS.map(
                    (option) => (
                      <SelectItem
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
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {renderTargetSelect()}

          <div className="space-y-2">
            <Label htmlFor="inspection-document-message">
              Légende / observation
            </Label>

            <Textarea
              id="inspection-document-message"
              value={
                message
              }
              onChange={(event) =>
                setMessage(
                  event.target.value,
                )
              }
              rows={3}
              maxLength={
                2000
              }
              placeholder="Optionnel"
              disabled={
                busy
              }
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                busy ||
                !selectedFile ||
                (
                  requiresTarget &&
                  targetId ===
                    NONE_VALUE
                )
              }
            >
              <Upload className="mr-2 h-4 w-4" />

              {uploadEvidence.isPending
                ? "Envoi..."
                : "Ajouter la preuve"}
            </Button>
          </div>
        </form>
      )}

      {metadata.isLoading && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Chargement des documents...
        </div>
      )}

      {metadata.error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(
            metadata.error,
          )}
        </div>
      )}

      {!metadata.isLoading &&
        !metadata.error &&
        (
          metadata.data?.length ??
          0
        ) === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Paperclip className="mx-auto h-8 w-8 text-muted-foreground" />

            <p className="mt-3 font-medium">
              Aucune preuve documentaire
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {canEdit
                ? "Ajoutez des photos ou documents pour compléter cet état des lieux."
                : "Aucun document n’a été joint à cet état des lieux."}
            </p>
          </div>
        )}

      {(metadata.data?.length ??
        0) > 0 && (
        <div className="space-y-3">
          {metadata.data?.map(
            (document) => (
              <article
                key={
                  document.inspectionDocumentId
                }
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      {isImageDocument(
                        document,
                      ) ? (
                        <FileImage className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="break-all font-medium">
                        {
                          document.name
                        }
                      </p>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {CATEGORY_LABELS[
                            document.category
                          ] ??
                            document.category}
                        </span>

                        <span>
                          {getTargetLabel(
                            document,
                          )}
                        </span>

                        <span>
                          {formatFileSize(
                            document.fileSize,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void handleOpen(
                          document,
                        )
                      }
                      disabled={
                        busy
                      }
                    >
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Ouvrir
                    </Button>

                    {canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void handleDelete(
                            document,
                          )
                        }
                        disabled={
                          busy
                        }
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}