import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Paperclip,
} from "lucide-react";

import { toast } from "sonner";

import {
  getRealEstateErrorMessage,
} from "@/lib/real-estate-errors";

import {
  type LeaseAmendmentChanges,
  useApplyLeaseAmendment,
  useLeaseAmendments,
  useLeaseTermVersions,
} from "@/hooks/use-leases";

import {
  createDocumentAccessUrl,
  ENTITY_DOCUMENT_ALLOWED_TYPES,
  ENTITY_DOCUMENT_MAX_SIZE,
  useDocumentsByEntityIds,
  useUploadEntityDocuments,
} from "@/hooks/use-documents";

import type {
  Document as DocumentRecord,
} from "@/types/real-estate";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

type AmendmentField =
  keyof LeaseAmendmentChanges;

export interface LeaseAmendmentDialogLease {
  id: string;
  reference: string | null;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  charges: number;
  due_day: number;
  deposit: number;
}

interface LeaseAmendmentDialogProps {
  lease: LeaseAmendmentDialogLease | null;
  onClose: () => void;
}

interface AmendmentValues {
  monthly_rent: string;
  charges: string;
  due_day: string;
  deposit: string;
  end_date: string;
}

const fieldLabels: Record<
  AmendmentField,
  string
> = {
  monthly_rent: "Loyer mensuel",
  charges: "Charges mensuelles",
  due_day: "Jour d'échéance",
  deposit: "Dépôt de garantie",
  end_date: "Date de fin",
};

const financialFields =
  new Set<AmendmentField>([
    "monthly_rent",
    "charges",
    "due_day",
  ]);

const numericFields: Array<{
  key:
    | "monthly_rent"
    | "charges"
    | "due_day"
    | "deposit";
  label: string;
  min: number;
  max?: number;
}> = [
  {
    key: "monthly_rent",
    label: "Loyer mensuel",
    min: 1,
  },
  {
    key: "charges",
    label: "Charges mensuelles",
    min: 0,
  },
  {
    key: "due_day",
    label: "Jour d'échéance",
    min: 1,
    max: 31,
  },
  {
    key: "deposit",
    label: "Dépôt de garantie",
    min: 0,
  },
];

const documentSelectionError =
  (
    files: File[],
  ) => {
    for (
      const file
      of files
    ) {
      if (
        file.size >
        ENTITY_DOCUMENT_MAX_SIZE
      ) {
        return `${file.name} dépasse la taille maximale de 10 Mo.`;
      }

      if (
        !file.type ||
        !ENTITY_DOCUMENT_ALLOWED_TYPES.includes(
          file.type as (
            typeof ENTITY_DOCUMENT_ALLOWED_TYPES
          )[number],
        )
      ) {
        return `${file.name} : format non autorisé. Utilisez PDF, JPG, PNG ou WEBP.`;
      }
    }

    return null;
  };

const emptySelection =
  (): Record<
    AmendmentField,
    boolean
  > => ({
    monthly_rent: false,
    charges: false,
    due_day: false,
    deposit: false,
    end_date: false,
  });

const getTodayInputValue =
  () => {
    const today =
      new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() + 1,
      ).padStart(
        2,
        "0",
      );

    const day =
      String(
        today.getDate(),
      ).padStart(
        2,
        "0",
      );

    return `${year}-${month}-${day}`;
  };

const addOneDay =
  (
    value: string,
  ) => {
    const [
      year,
      month,
      day,
    ] = value
      .split("-")
      .map(Number);

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day,
        ),
      );

    date.setUTCDate(
      date.getUTCDate() + 1,
    );

    return date
      .toISOString()
      .slice(0, 10);
  };

const firstFinancialDate =
  (
    minimumDate: string,
  ) => {
    if (
      minimumDate.endsWith(
        "-01",
      )
    ) {
      return minimumDate;
    }

    const [
      year,
      month,
    ] = minimumDate
      .split("-")
      .map(Number);

    return new Date(
      Date.UTC(
        year,
        month,
        1,
      ),
    )
      .toISOString()
      .slice(0, 10);
  };

const formatDate =
  (
    value:
      | string
      | null
      | undefined,
  ) => {
    if (!value) {
      return "Sans date de fin";
    }

    const [
      year,
      month,
      day,
    ] = value
      .slice(0, 10)
      .split("-");

    if (
      !year ||
      !month ||
      !day
    ) {
      return value;
    }

    return `${day}/${month}/${year}`;
  };

const formatMoney =
  (
    value:
      | number
      | string
      | null
      | undefined,
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    const numberValue =
      Number(value);

    if (
      !Number.isFinite(
        numberValue,
      )
    ) {
      return "—";
    }

    return `${numberValue.toLocaleString(
      "fr-FR",
    )} GNF`;
  };

const isAmendmentField =
  (
    value: string,
  ): value is AmendmentField =>
    value in fieldLabels;

const snapshotValue =
  (
    snapshot: unknown,
    field: AmendmentField,
  ) => {
    if (
      !snapshot ||
      typeof snapshot !==
        "object" ||
      Array.isArray(snapshot)
    ) {
      return null;
    }

    return (
      snapshot as Record<
        string,
        unknown
      >
    )[field];
  };

const formatTermValue =
  (
    field: AmendmentField,
    value: unknown,
  ) => {
    if (
      field ===
        "monthly_rent" ||
      field ===
        "charges" ||
      field ===
        "deposit"
    ) {
      return formatMoney(
        value as
          | number
          | string
          | null,
      );
    }

    if (
      field ===
      "due_day"
    ) {
      return value ===
        null ||
        value ===
          undefined
        ? "—"
        : `Jour ${String(
            value,
          )}`;
    }

    return formatDate(
      typeof value ===
        "string"
        ? value
        : null,
    );
  };

const LeaseAmendmentDialog =
  ({
    lease,
    onClose,
  }: LeaseAmendmentDialogProps) => {
    const {
      data:
        termVersions = [],
      isLoading:
        termVersionsLoading,
      error:
        termVersionsError,
    } =
      useLeaseTermVersions(
        lease?.id,
      );

    const {
      data:
        amendments = [],
      isLoading:
        amendmentsLoading,
      error:
        amendmentsError,
    } =
      useLeaseAmendments(
        lease?.id,
      );

    const applyAmendment =
      useApplyLeaseAmendment();

    const uploadDocuments =
      useUploadEntityDocuments();

    const amendmentIds =
      useMemo(
        () =>
          amendments.map(
            (
              amendment,
            ) =>
              amendment.id,
          ),
        [
          amendments,
        ],
      );

    const {
      data:
        amendmentDocuments = [],
      isLoading:
        amendmentDocumentsLoading,
      error:
        amendmentDocumentsError,
    } =
      useDocumentsByEntityIds(
        "lease_amendment",
        amendmentIds,
      );

    const documentsByAmendmentId =
      useMemo(
        () => {
          const grouped =
            new Map<
              string,
              DocumentRecord[]
            >();

          for (
            const document
            of amendmentDocuments
          ) {
            const current =
              grouped.get(
                document.entity_id,
              ) ?? [];

            current.push(
              document,
            );

            grouped.set(
              document.entity_id,
              current,
            );
          }

          return grouped;
        },
        [
          amendmentDocuments,
        ],
      );

    const latestVersion =
      termVersions[0] ??
      null;

    const baseTerms =
      useMemo(
        () => ({
          monthly_rent:
            Number(
              latestVersion
                ?.monthly_rent ??
                lease
                  ?.monthly_rent ??
                0,
            ),

          charges:
            Number(
              latestVersion
                ?.charges ??
                lease?.charges ??
                0,
            ),

          due_day:
            Number(
              latestVersion
                ?.due_day ??
                lease?.due_day ??
                1,
            ),

          deposit:
            Number(
              latestVersion
                ?.deposit ??
                lease?.deposit ??
                0,
            ),

          end_date:
            latestVersion
              ? latestVersion
                  .end_date
              : lease
                  ?.end_date ??
                null,

          effective_from:
            latestVersion
              ?.effective_from ??
            lease
              ?.start_date ??
            "",

          version_no:
            Number(
              latestVersion
                ?.version_no ??
                1,
            ),
        }),
        [
          latestVersion,
          lease,
        ],
      );

    const today =
      getTodayInputValue();

    const minEffectiveDate =
      useMemo(
        () => {
          if (
            !baseTerms
              .effective_from
          ) {
            return today;
          }

          const next =
            addOneDay(
              baseTerms
                .effective_from,
            );

          return next >
            today
            ? next
            : today;
        },
        [
          baseTerms
            .effective_from,
          today,
        ],
      );

    const [
      selected,
      setSelected,
    ] = useState(
      emptySelection(),
    );

    const [
      values,
      setValues,
    ] =
      useState<AmendmentValues>({
        monthly_rent: "",
        charges: "",
        due_day: "",
        deposit: "",
        end_date: "",
      });

    const [
      effectiveDate,
      setEffectiveDate,
    ] = useState("");

    const [
      reason,
      setReason,
    ] = useState("");

    const [
      pendingFiles,
      setPendingFiles,
    ] =
      useState<File[]>([]);

    const [
      uploadingAmendmentId,
      setUploadingAmendmentId,
    ] =
      useState<
        string | null
      >(null);

    const [
      openingDocumentId,
      setOpeningDocumentId,
    ] =
      useState<
        string | null
      >(null);

    useEffect(() => {
      if (!lease) {
        return;
      }

      setSelected(
        emptySelection(),
      );

      setValues({
        monthly_rent:
          String(
            baseTerms
              .monthly_rent,
          ),

        charges:
          String(
            baseTerms
              .charges,
          ),

        due_day:
          String(
            baseTerms
              .due_day,
          ),

        deposit:
          String(
            baseTerms
              .deposit,
          ),

        end_date:
          baseTerms
            .end_date ??
          "",
      });

      setReason("");

      setPendingFiles(
        [],
      );

      const financialDefault =
        firstFinancialDate(
          minEffectiveDate,
        );

      if (
        baseTerms.end_date &&
        financialDefault >
          baseTerms.end_date
      ) {
        setEffectiveDate(
          minEffectiveDate,
        );
      } else {
        setEffectiveDate(
          financialDefault,
        );
      }
    }, [
      lease,
      latestVersion?.id,
      minEffectiveDate,
      baseTerms.monthly_rent,
      baseTerms.charges,
      baseTerms.due_day,
      baseTerms.deposit,
      baseTerms.end_date,
    ]);

    if (!lease) {
      return null;
    }

    const selectedFields =
      (
        Object.keys(
          selected,
        ) as AmendmentField[]
      ).filter(
        (field) =>
          selected[field],
      );

    const toggleField =
      (
        field:
          AmendmentField,
      ) => {
        setSelected(
          (previous) => ({
            ...previous,
            [field]:
              !previous[
                field
              ],
          }),
        );
      };

    const documentErrorMessage =
      (
        error: unknown,
      ) => {
        if (
          error instanceof Error
        ) {
          return error.message;
        }

        if (
          typeof error ===
            "object" &&
          error !== null &&
          "message" in error
        ) {
          return String(
            (
              error as {
                message?:
                  unknown;
              }
            ).message ??
              "",
          );
        }

        return "Une erreur est survenue pendant le traitement du document.";
      };

    const handleOpenDocument =
      async (
        document:
          DocumentRecord,
      ) => {
        const popup =
          window.open(
            "about:blank",
            "_blank",
          );

        if (
          !popup
        ) {
          toast.error(
            "Autorisez les fenêtres contextuelles pour ouvrir cette pièce jointe.",
          );

          return;
        }

        popup.opener =
          null;

        setOpeningDocumentId(
          document.id,
        );

        try {
          const url =
            await createDocumentAccessUrl(
              document,
            );

          popup.location.href =
            url;
        } catch (
          error: unknown
        ) {
          popup.close();

          toast.error(
            documentErrorMessage(
              error,
            ),
          );
        } finally {
          setOpeningDocumentId(
            null,
          );
        }
      };

    const handleHistoryUpload =
      async (
        amendmentId:
          string,
        files:
          File[],
      ) => {
        if (
          files.length ===
          0
        ) {
          return;
        }

        const validationError =
          documentSelectionError(
            files,
          );

        if (
          validationError
        ) {
          toast.error(
            validationError,
          );

          return;
        }

        setUploadingAmendmentId(
          amendmentId,
        );

        try {
          await uploadDocuments
            .mutateAsync({
              entityType:
                "lease_amendment",

              entityId:
                amendmentId,

              files,
            });

          toast.success(
            files.length ===
              1
              ? "Pièce jointe ajoutée à l'avenant."
              : `${files.length} pièces jointes ajoutées à l'avenant.`,
          );
        } catch (
          error: unknown
        ) {
          toast.error(
            documentErrorMessage(
              error,
            ),
          );
        } finally {
          setUploadingAmendmentId(
            null,
          );
        }
      };

    const handleSubmit =
      async () => {
        if (
          termVersionsLoading
        ) {
          return;
        }

        const attachmentError =
          documentSelectionError(
            pendingFiles,
          );

        if (
          attachmentError
        ) {
          toast.error(
            attachmentError,
          );

          return;
        }

        if (
          !effectiveDate
        ) {
          toast.error(
            "La date d'effet est obligatoire.",
          );

          return;
        }

        if (
          effectiveDate <
          minEffectiveDate
        ) {
          toast.error(
            `La date d'effet doit être postérieure au ${formatDate(
              baseTerms
                .effective_from,
            )}.`,
          );

          return;
        }

        if (
          baseTerms.end_date &&
          effectiveDate >
            baseTerms.end_date
        ) {
          toast.error(
            "La date d'effet ne peut pas dépasser la date de fin contractuelle actuellement applicable.",
          );

          return;
        }

        if (
          !reason.trim()
        ) {
          toast.error(
            "Le motif de l'avenant est obligatoire.",
          );

          return;
        }

        if (
          selectedFields
            .length === 0
        ) {
          toast.error(
            "Sélectionnez au moins une condition à modifier.",
          );

          return;
        }

        const changes:
          LeaseAmendmentChanges =
          {};

        if (
          selected
            .monthly_rent
        ) {
          if (
            !values
              .monthly_rent
              .trim()
          ) {
            toast.error(
              "Le nouveau loyer est obligatoire.",
            );

            return;
          }

          const value =
            Number(
              values
                .monthly_rent,
            );

          if (
            !Number.isFinite(
              value,
            ) ||
            value <= 0
          ) {
            toast.error(
              "Le loyer doit être supérieur à zéro.",
            );

            return;
          }

          if (
            value !==
            baseTerms
              .monthly_rent
          ) {
            changes.monthly_rent =
              value;
          }
        }

        if (
          selected.charges
        ) {
          if (
            !values
              .charges
              .trim()
          ) {
            toast.error(
              "Le montant des charges est obligatoire.",
            );

            return;
          }

          const value =
            Number(
              values.charges,
            );

          if (
            !Number.isFinite(
              value,
            ) ||
            value < 0
          ) {
            toast.error(
              "Les charges ne peuvent pas être négatives.",
            );

            return;
          }

          if (
            value !==
            baseTerms.charges
          ) {
            changes.charges =
              value;
          }
        }

        if (
          selected.due_day
        ) {
          if (
            !values
              .due_day
              .trim()
          ) {
            toast.error(
              "Le jour d'échéance est obligatoire.",
            );

            return;
          }

          const value =
            Number(
              values.due_day,
            );

          if (
            !Number.isInteger(
              value,
            ) ||
            value < 1 ||
            value > 31
          ) {
            toast.error(
              "Le jour d'échéance doit être compris entre 1 et 31.",
            );

            return;
          }

          if (
            value !==
            baseTerms.due_day
          ) {
            changes.due_day =
              value;
          }
        }

        if (
          selected.deposit
        ) {
          if (
            !values
              .deposit
              .trim()
          ) {
            toast.error(
              "Le dépôt de garantie est obligatoire.",
            );

            return;
          }

          const value =
            Number(
              values.deposit,
            );

          if (
            !Number.isFinite(
              value,
            ) ||
            value < 0
          ) {
            toast.error(
              "Le dépôt de garantie ne peut pas être négatif.",
            );

            return;
          }

          if (
            value !==
            baseTerms.deposit
          ) {
            changes.deposit =
              value;
          }
        }

        if (
          selected.end_date
        ) {
          const value =
            values.end_date ||
            null;

          if (
            value &&
            value <
              effectiveDate
          ) {
            toast.error(
              "La nouvelle date de fin ne peut pas être antérieure à la date d'effet de l'avenant.",
            );

            return;
          }

          if (
            value !==
            baseTerms.end_date
          ) {
            changes.end_date =
              value;
          }
        }

        const changedKeys =
          Object.keys(
            changes,
          ) as AmendmentField[];

        if (
          changedKeys.length ===
          0
        ) {
          toast.error(
            "Les valeurs sélectionnées sont identiques aux conditions contractuelles de référence.",
          );

          return;
        }

        const hasFinancialChange =
          changedKeys.some(
            (field) =>
              financialFields.has(
                field,
              ),
          );

        if (
          hasFinancialChange &&
          effectiveDate.slice(
            8,
            10,
          ) !== "01"
        ) {
          toast.error(
            "Une modification du loyer, des charges ou du jour d'échéance doit prendre effet le premier jour d'un mois.",
          );

          return;
        }

        try {
          const result =
            await applyAmendment
              .mutateAsync({
                leaseId:
                  lease.id,

                effectiveDate,

                reason:
                  reason.trim(),

                changes,
              });

          if (
            pendingFiles.length >
            0
          ) {
            try {
              await uploadDocuments
                .mutateAsync({
                  entityType:
                    "lease_amendment",

                  entityId:
                    result.amendment_id,

                  files:
                    pendingFiles,
                });
            } catch (
              uploadError:
                unknown
            ) {
              toast.warning(
                `Avenant ${result.amendment_reference} enregistré, mais les pièces jointes n'ont pas pu être ajoutées. L'avenant est conservé ; ajoutez les pièces depuis l'historique. ${documentErrorMessage(
                  uploadError,
                )}`,
              );

              return;
            }
          }

          toast.success(
            pendingFiles.length >
              0
              ? `Avenant ${result.amendment_reference} enregistré avec ${pendingFiles.length} pièce(s) jointe(s). Version contractuelle n°${result.version_no}.`
              : `Avenant ${result.amendment_reference} enregistré. Version contractuelle n°${result.version_no}.`,
          );

          onClose();
        } catch (
          error: unknown
        ) {
          toast.error(
            getRealEstateErrorMessage(
              error,
              "Impossible d'appliquer l'avenant.",
            ),
          );
        }
      };

    return (
      <Dialog
        open={Boolean(lease)}
        onOpenChange={(
          value,
        ) => {
          if (
            !value &&
            !applyAmendment
              .isPending &&
            !uploadDocuments
              .isPending
          ) {
            onClose();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Avenant au bail{" "}
              {lease.reference ??
                ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    Conditions contractuelles de référence
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Version n°
                    {
                      baseTerms.version_no
                    }{" "}
                    — effective depuis le{" "}
                    {formatDate(
                      baseTerms
                        .effective_from,
                    )}
                  </p>
                </div>

                {baseTerms
                  .effective_from >
                today ? (
                  <Badge variant="secondary">
                    Version planifiée
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Version applicable
                  </Badge>
                )}
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Loyer
                  </p>
                  <p className="font-medium">
                    {formatMoney(
                      baseTerms
                        .monthly_rent,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Charges
                  </p>
                  <p className="font-medium">
                    {formatMoney(
                      baseTerms
                        .charges,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Échéance
                  </p>
                  <p className="font-medium">
                    Jour{" "}
                    {
                      baseTerms
                        .due_day
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Dépôt
                  </p>
                  <p className="font-medium">
                    {formatMoney(
                      baseTerms
                        .deposit,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Fin contractuelle
                  </p>
                  <p className="font-medium">
                    {formatDate(
                      baseTerms
                        .end_date,
                    )}
                  </p>
                </div>
              </div>
            </div>

            {termVersionsError ? (
              <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Impossible de charger les versions contractuelles.
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Date d'effet *
                </Label>

                <Input
                  type="date"
                  value={
                    effectiveDate
                  }
                  min={
                    minEffectiveDate
                  }
                  max={
                    baseTerms
                      .end_date ??
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setEffectiveDate(
                      event.target
                        .value,
                    )
                  }
                />

                <p className="text-xs text-muted-foreground">
                  Un nouvel avenant doit être postérieur à la dernière version contractuelle.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Motif *
                </Label>

                <Textarea
                  value={reason}
                  rows={3}
                  onChange={(
                    event,
                  ) =>
                    setReason(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Ex. révision annuelle du loyer, prolongation du bail..."
                />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-start gap-2">
                <Paperclip className="mt-0.5 h-4 w-4 shrink-0" />

                <div>
                  <p className="text-sm font-semibold">
                    Pièces jointes
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Facultatif — les fichiers seront rattachés à l'avenant après sa création.
                  </p>
                </div>
              </div>

              <Input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                disabled={
                  applyAmendment
                    .isPending ||
                  uploadDocuments
                    .isPending
                }
                onChange={(
                  event,
                ) => {
                  const files =
                    Array.from(
                      event.target
                        .files ??
                        [],
                    );

                  event.target.value =
                    "";

                  const validationError =
                    documentSelectionError(
                      files,
                    );

                  if (
                    validationError
                  ) {
                    toast.error(
                      validationError,
                    );

                    return;
                  }

                  setPendingFiles(
                    files,
                  );
                }}
              />

              <p className="text-xs text-muted-foreground">
                PDF, JPG, PNG ou WEBP — 10 Mo maximum par fichier.
              </p>

              {pendingFiles.length >
              0 ? (
                <div className="space-y-2 pt-1">
                  {pendingFiles.map(
                    (
                      file,
                      index,
                    ) => (
                      <div
                        key={`${file.name}-${file.size}-${index}`}
                        className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs"
                      >
                        <FileText className="h-4 w-4 shrink-0" />

                        <span className="min-w-0 flex-1 truncate">
                          {file.name}
                        </span>

                        <button
                          type="button"
                          className="text-destructive hover:underline"
                          disabled={
                            applyAmendment
                              .isPending ||
                            uploadDocuments
                              .isPending
                          }
                          onClick={() =>
                            setPendingFiles(
                              (
                                previous,
                              ) =>
                                previous.filter(
                                  (
                                    _,
                                    fileIndex,
                                  ) =>
                                    fileIndex !==
                                    index,
                                ),
                            )
                          }
                        >
                          Retirer
                        </button>
                      </div>
                    ),
                  )}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">
                  Conditions à modifier
                </p>

                <p className="text-xs text-muted-foreground">
                  Cochez uniquement les clauses concernées par cet avenant.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {numericFields.map(
                  ({
                    key,
                    label,
                    min,
                    max,
                  }) => (
                    <div
                      key={key}
                      className="rounded-lg border p-3"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={
                            selected[
                              key
                            ]
                          }
                          onChange={() =>
                            toggleField(
                              key,
                            )
                          }
                          className="h-4 w-4"
                        />

                        <Label>
                          {label}
                        </Label>
                      </div>

                      <Input
                        type="number"
                        min={min}
                        max={max}
                        value={
                          values[key]
                        }
                        disabled={
                          !selected[
                            key
                          ]
                        }
                        onChange={(
                          event,
                        ) =>
                          setValues(
                            (
                              previous,
                            ) => ({
                              ...previous,
                              [key]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />

                      <p className="mt-1 text-xs text-muted-foreground">
                        Actuel :{" "}
                        {key ===
                        "due_day"
                          ? `Jour ${
                              baseTerms[
                                key
                              ]
                            }`
                          : formatMoney(
                              baseTerms[
                                key
                              ],
                            )}
                      </p>
                    </div>
                  ),
                )}

                <div className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        selected
                          .end_date
                      }
                      onChange={() =>
                        toggleField(
                          "end_date",
                        )
                      }
                      className="h-4 w-4"
                    />

                    <Label>
                      Date de fin
                    </Label>
                  </div>

                  <Input
                    type="date"
                    value={
                      values.end_date
                    }
                    min={
                      effectiveDate ||
                      undefined
                    }
                    disabled={
                      !selected
                        .end_date
                    }
                    onChange={(
                      event,
                    ) =>
                      setValues(
                        (
                          previous,
                        ) => ({
                          ...previous,
                          end_date:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />

                  <p className="mt-1 text-xs text-muted-foreground">
                    Actuel :{" "}
                    {formatDate(
                      baseTerms
                        .end_date,
                    )}
                  </p>

                  {selected
                    .end_date ? (
                    <button
                      type="button"
                      className="mt-2 text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() =>
                        setValues(
                          (
                            previous,
                          ) => ({
                            ...previous,
                            end_date:
                              "",
                          }),
                        )
                      }
                    >
                      Passer en durée indéterminée
                    </button>
                  ) : null}
                </div>
              </div>

              {selectedFields.some(
                (field) =>
                  financialFields.has(
                    field,
                  ),
              ) ? (
                <div className="flex gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                  <p>
                    Toute modification du loyer, des charges ou du jour d'échéance doit prendre effet le premier jour d'un mois. Une facture déjà créée sur la période concernée peut bloquer l'avenant.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={
                  applyAmendment
                    .isPending ||
                  uploadDocuments
                    .isPending
                }
              >
                Annuler
              </Button>

              <Button
                type="button"
                onClick={() =>
                  void handleSubmit()
                }
                disabled={
                  applyAmendment
                    .isPending ||
                  uploadDocuments
                    .isPending ||
                  termVersionsLoading
                }
              >
                {applyAmendment
                  .isPending ||
                uploadDocuments
                  .isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}

                Enregistrer l'avenant
              </Button>
            </div>

            <div className="border-t pt-5">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />

                <div>
                  <p className="text-sm font-semibold">
                    Historique des avenants
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Historique immuable des modifications contractuelles.
                  </p>
                </div>
              </div>

              {amendmentDocumentsError ? (
                <div className="mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  Impossible de charger les pièces jointes des avenants.
                </div>
              ) : null}

              {amendmentsError ? (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  Impossible de charger l'historique des avenants.
                </div>
              ) : amendmentsLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : amendments.length ===
                0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Aucun avenant enregistré pour ce bail.
                </p>
              ) : (
                <div className="space-y-3">
                  {amendments.map(
                    (
                      amendment,
                    ) => (
                      <div
                        key={
                          amendment.id
                        }
                        className="rounded-lg border p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">
                              {
                                amendment.reference
                              }
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Effet au{" "}
                              {formatDate(
                                amendment
                                  .effective_date,
                              )}
                            </p>
                          </div>

                          {amendment
                            .effective_date >
                          today ? (
                            <Badge variant="secondary">
                              Planifié
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Applicable
                            </Badge>
                          )}
                        </div>

                        <p className="mt-2 text-sm">
                          {
                            amendment.reason
                          }
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {amendment
                            .changed_fields
                            .map(
                              (
                                field,
                              ) => (
                                <Badge
                                  key={
                                    field
                                  }
                                  variant="secondary"
                                >
                                  {isAmendmentField(
                                    field,
                                  )
                                    ? fieldLabels[
                                        field
                                      ]
                                    : field}
                                </Badge>
                              ),
                            )}
                        </div>

                        <div className="mt-4 rounded-md border bg-muted/20 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4" />

                              <p className="text-xs font-semibold">
                                Pièces jointes
                              </p>
                            </div>

                            <label
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                uploadingAmendmentId !==
                                  null ||
                                uploadDocuments
                                  .isPending
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer hover:bg-muted"
                              }`}
                            >
                              {uploadingAmendmentId ===
                              amendment.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Paperclip className="h-3.5 w-3.5" />
                              )}

                              Ajouter

                              <input
                                type="file"
                                multiple
                                accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                                className="sr-only"
                                disabled={
                                  uploadingAmendmentId !==
                                    null ||
                                  uploadDocuments
                                    .isPending
                                }
                                onChange={(
                                  event,
                                ) => {
                                  const files =
                                    Array.from(
                                      event.target
                                        .files ??
                                        [],
                                    );

                                  event.target.value =
                                    "";

                                  void handleHistoryUpload(
                                    amendment.id,
                                    files,
                                  );
                                }}
                              />
                            </label>
                          </div>

                          {amendmentDocumentsError ? (
                            <p className="mt-2 text-xs text-destructive">
                              Pièces jointes indisponibles.
                            </p>
                          ) : amendmentDocumentsLoading ? (
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Chargement des pièces...
                            </div>
                          ) : (
                            documentsByAmendmentId.get(
                              amendment.id,
                            ) ?? []
                          ).length ===
                          0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Aucune pièce jointe.
                            </p>
                          ) : (
                            <div className="mt-2 space-y-1.5">
                              {(
                                documentsByAmendmentId.get(
                                  amendment.id,
                                ) ?? []
                              ).map(
                                (
                                  document,
                                ) => (
                                  <button
                                    key={
                                      document.id
                                    }
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded-md bg-background px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted"
                                    disabled={
                                      openingDocumentId ===
                                      document.id
                                    }
                                    onClick={() =>
                                      void handleOpenDocument(
                                        document,
                                      )
                                    }
                                  >
                                    {openingDocumentId ===
                                    document.id ? (
                                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5 shrink-0" />
                                    )}

                                    <span className="min-w-0 flex-1 truncate">
                                      {
                                        document.name
                                      }
                                    </span>

                                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  </button>
                                ),
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 space-y-1.5 text-xs">
                          {amendment
                            .changed_fields
                            .filter(
                              isAmendmentField,
                            )
                            .map(
                              (
                                field,
                              ) => (
                                <div
                                  key={
                                    field
                                  }
                                  className="flex flex-wrap justify-between gap-2"
                                >
                                  <span className="text-muted-foreground">
                                    {
                                      fieldLabels[
                                        field
                                      ]
                                    }
                                  </span>

                                  <span className="font-medium">
                                    {formatTermValue(
                                      field,
                                      snapshotValue(
                                        amendment
                                          .previous_terms,
                                        field,
                                      ),
                                    )}{" "}
                                    →{" "}
                                    {formatTermValue(
                                      field,
                                      snapshotValue(
                                        amendment
                                          .new_terms,
                                        field,
                                      ),
                                    )}
                                  </span>
                                </div>
                              ),
                            )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

export default LeaseAmendmentDialog;
