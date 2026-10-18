import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import {
  type ShortRentalDeposit,
} from "@/hooks/use-short-rental-deposit";

import {
  type ShortRentalCheckoutFinding,
  type ShortRentalDepositDeduction,
  type ShortRentalDepositResolution,
  useApproveShortRentalDepositResolution,
  useCancelShortRentalDepositResolution,
  useDeleteShortRentalDepositDeduction,
  useExecuteShortRentalDepositResolution,
  usePrepareShortRentalDepositResolution,
  useShortRentalDepositResolution,
  useUpsertShortRentalDepositDeduction,
} from "@/hooks/use-short-rental-deposit-resolution";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Textarea,
} from "@/components/ui/textarea";


type Props = {
  bookingId: string;
  deposit: ShortRentalDeposit;
};


const formatMoney = (
  value:
    | number
    | null
    | undefined,
  currency = "GNF",
) => {
  const amount =
    Number(
      value ?? 0,
    );

  return (
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits: 2,
      },
    ).format(
      Number.isFinite(amount)
        ? amount
        : 0,
    ) +
    " " +
    currency
  );
};


const getErrorMessage = (
  error: unknown,
) => {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message ??
        "Erreur inconnue",
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erreur inconnue";
};


const getResolutionStatusLabel = (
  status: string,
) => {
  switch (status) {
    case "draft":
      return "Brouillon";

    case "approved":
      return "Approuvée";

    case "processing":
      return "En exécution";

    case "completed":
      return "Terminée";

    case "cancelled":
      return "Annulée";

    default:
      return status;
  }
};


const getResolutionBadgeVariant = (
  status: string,
):
  | "default"
  | "secondary"
  | "destructive"
  | "outline" => {
  switch (status) {
    case "completed":
      return "default";

    case "approved":
      return "secondary";

    case "processing":
      return "outline";

    case "cancelled":
      return "destructive";

    default:
      return "outline";
  }
};


type FindingRowProps = {
  bookingId: string;

  resolution:
    ShortRentalDepositResolution;

  finding:
    ShortRentalCheckoutFinding;

  deduction:
    | ShortRentalDepositDeduction
    | null;
};


function FindingDeductionRow({
  bookingId,
  resolution,
  finding,
  deduction,
}: FindingRowProps) {
  const [
    amount,
    setAmount,
  ] = useState(
    deduction
      ? String(
          deduction.deduction_amount,
        )
      : "",
  );

  const [
    reason,
    setReason,
  ] = useState(
    deduction?.reason ?? "",
  );


  useEffect(() => {
    setAmount(
      deduction
        ? String(
            deduction.deduction_amount,
          )
        : "",
    );

    setReason(
      deduction?.reason ?? "",
    );
  }, [
    deduction?.id,
    deduction?.deduction_amount,
    deduction?.reason,
  ]);


  const upsertDeduction =
    useUpsertShortRentalDepositDeduction(
      bookingId,
    );

  const deleteDeduction =
    useDeleteShortRentalDepositDeduction(
      bookingId,
    );


  const pending =
    upsertDeduction.isPending ||
    deleteDeduction.isPending;


  const handleSave = async () => {
    const normalized =
      amount
        .trim()
        .replace(
          /\s/g,
          "",
        )
        .replace(
          ",",
          ".",
        );

    const parsedAmount =
      normalized === ""
        ? 0
        : Number(
            normalized,
          );


    if (
      !Number.isFinite(
        parsedAmount,
      ) ||
      parsedAmount < 0
    ) {
      toast.error(
        "Le montant de retenue est invalide.",
      );

      return;
    }


    try {
      if (parsedAmount === 0) {
        if (deduction) {
          await deleteDeduction.mutateAsync({
            resolutionId:
              resolution.id,

            findingId:
              finding.id,
          });

          toast.success(
            "Retenue supprimée.",
          );
        }

        return;
      }


      if (!reason.trim()) {
        toast.error(
          "Un motif de retenue est obligatoire.",
        );

        return;
      }


      await upsertDeduction.mutateAsync({
        resolutionId:
          resolution.id,

        findingId:
          finding.id,

        amount:
          parsedAmount,

        reason:
          reason.trim(),
      });


      toast.success(
        deduction
          ? "Retenue mise à jour."
          : "Retenue ajoutée.",
      );
    }
    catch (error) {
      toast.error(
        getErrorMessage(
          error,
        ),
      );
    }
  };


  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {finding.title}
            </p>

            {finding.severity && (
              <Badge variant="outline">
                {finding.severity}
              </Badge>
            )}

            {finding.resolved && (
              <Badge variant="secondary">
                Constat résolu
              </Badge>
            )}
          </div>

          {finding.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {finding.description}
            </p>
          )}

          <p className="mt-2 text-sm">
            Estimation EDL :{" "}
            <span className="font-medium">
              {finding.estimated_cost === null
                ? "Non renseignée"
                : formatMoney(
                    finding.estimated_cost,
                    resolution.currency,
                  )}
            </span>
          </p>

          {deduction?.estimated_cost_snapshot !==
            null &&
            deduction?.estimated_cost_snapshot !==
              undefined && (
              <p className="mt-1 text-xs text-muted-foreground">
                Estimation figée lors de la décision :{" "}
                {formatMoney(
                  deduction.estimated_cost_snapshot,
                  resolution.currency,
                )}
              </p>
            )}
        </div>

        <div className="w-full space-y-3 lg:max-w-md">
          <div>
            <Label>
              Montant réellement retenu
            </Label>

            <Input
              className="mt-1"
              type="number"
              min="0"
              step="1"
              value={amount}
              disabled={pending}
              onChange={(event) =>
                setAmount(
                  event.target.value,
                )
              }
              placeholder="0"
            />
          </div>

          <div>
            <Label>
              Motif de la retenue
            </Label>

            <Textarea
              className="mt-1"
              value={reason}
              disabled={pending}
              onChange={(event) =>
                setReason(
                  event.target.value,
                )
              }
              placeholder="Ex. réparation, remplacement ou remise en état..."
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant={
                deduction
                  ? "outline"
                  : "default"
              }
              disabled={pending}
              onClick={handleSave}
            >
              {pending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}

              {deduction
                ? "Mettre à jour"
                : "Ajouter la retenue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function DepositResolutionCard({
  bookingId,
  deposit,
}: Props) {
  const {
    data: context,
    isLoading,
    isError,
    error,
  } =
    useShortRentalDepositResolution(
      bookingId,
    );


  const prepareResolution =
    usePrepareShortRentalDepositResolution(
      bookingId,
    );

  const approveResolution =
    useApproveShortRentalDepositResolution(
      bookingId,
    );

  const cancelResolution =
    useCancelShortRentalDepositResolution(
      bookingId,
    );

  const executeResolution =
    useExecuteShortRentalDepositResolution(
      bookingId,
    );


  const [
    decisionNotes,
    setDecisionNotes,
  ] = useState("");

  const [
    cancellationReason,
    setCancellationReason,
  ] = useState("");

  const [
    releasePaymentMethod,
    setReleasePaymentMethod,
  ] = useState("");

  const [
    executionNotes,
    setExecutionNotes,
  ] = useState("");


  const inspection =
    context?.inspection ?? null;

  const resolution =
    context?.resolution ?? null;

  const findings =
    context?.findings ?? [];

  const deductions =
    context?.deductions ?? [];


  useEffect(() => {
    setDecisionNotes(
      resolution?.decision_notes ??
        "",
    );
  }, [
    resolution?.id,
    resolution?.decision_notes,
  ]);


  const deductionByFinding =
    useMemo(
      () =>
        new Map(
          deductions.map(
            (deduction) => [
              deduction.inspection_finding_id,
              deduction,
            ],
          ),
        ),
      [deductions],
    );


  const operationPending =
    prepareResolution.isPending ||
    approveResolution.isPending ||
    cancelResolution.isPending ||
    executeResolution.isPending;


  const handlePrepare = async () => {
    try {
      await prepareResolution.mutateAsync();

      toast.success(
        "Décision de caution préparée.",
      );
    }
    catch (error) {
      toast.error(
        getErrorMessage(
          error,
        ),
      );
    }
  };


  const handleApprove = async () => {
    if (!resolution) {
      return;
    }

    const confirmed =
      window.confirm(
        [
          "Approuver cette décision de caution ?",
          "",
          `Retenue : ${formatMoney(
            resolution.deduction_amount,
            resolution.currency,
          )}`,
          `Restitution : ${formatMoney(
            resolution.release_amount,
            resolution.currency,
          )}`,
          "",
          "Après approbation, le détail des retenues ne sera plus modifiable.",
        ].join(
          "\n",
        ),
      );

    if (!confirmed) {
      return;
    }


    try {
      await approveResolution.mutateAsync({
        resolutionId:
          resolution.id,

        notes:
          decisionNotes.trim(),
      });

      toast.success(
        "Décision de caution approuvée.",
      );
    }
    catch (error) {
      toast.error(
        getErrorMessage(
          error,
        ),
      );
    }
  };


  const handleCancel = async () => {
    if (!resolution) {
      return;
    }

    if (
      !cancellationReason.trim()
    ) {
      toast.error(
        "Le motif d'annulation est obligatoire.",
      );

      return;
    }


    try {
      await cancelResolution.mutateAsync({
        resolutionId:
          resolution.id,

        reason:
          cancellationReason.trim(),
      });

      setCancellationReason("");

      toast.success(
        "Décision annulée. Une nouvelle décision peut être préparée.",
      );
    }
    catch (error) {
      toast.error(
        getErrorMessage(
          error,
        ),
      );
    }
  };


  const handleExecute = async () => {
    if (!resolution) {
      return;
    }


    if (
      resolution.release_amount > 0 &&
      !releasePaymentMethod
    ) {
      toast.error(
        "Sélectionnez le moyen de restitution.",
      );

      return;
    }


    const confirmed =
      window.confirm(
        [
          "Exécuter définitivement cette décision ?",
          "",
          `Retenue : ${formatMoney(
            resolution.deduction_amount,
            resolution.currency,
          )}`,
          `Restitution : ${formatMoney(
            resolution.release_amount,
            resolution.currency,
          )}`,
          "",
          "Cette opération produira les mouvements financiers et comptables correspondants.",
        ].join(
          "\n",
        ),
      );


    if (!confirmed) {
      return;
    }


    try {
      const result =
        await executeResolution.mutateAsync({
          resolutionId:
            resolution.id,

          releasePaymentMethod:
            resolution.release_amount > 0
              ? releasePaymentMethod
              : null,

          notes:
            executionNotes.trim(),
        });


      toast.success(
        result.reused
          ? "Cette décision avait déjà été exécutée."
          : "Décision de caution exécutée avec succès.",
      );
    }
    catch (error) {
      toast.error(
        getErrorMessage(
          error,
        ),
      );
    }
  };


  return (
    <div className="rounded-xl border bg-muted/20 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />

            <p className="font-semibold">
              Décision après état des lieux
            </p>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Décidez précisément la part de caution à retenir et la part à restituer après l'état des lieux de sortie.
          </p>
        </div>

        {resolution && (
          <Badge
            variant={getResolutionBadgeVariant(
              resolution.status,
            )}
          >
            {getResolutionStatusLabel(
              resolution.status,
            )}
          </Badge>
        )}
      </div>


      {isLoading ? (
        <div className="flex min-h-[100px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <Alert
          variant="destructive"
          className="mt-4"
        >
          <XCircle className="h-4 w-4" />

          <AlertDescription>
            Impossible de charger la décision de caution :{" "}
            {getErrorMessage(
              error,
            )}
          </AlertDescription>
        </Alert>
      ) : !inspection ? (
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />

          <AlertDescription>
            Aucun état des lieux de sortie n'est encore rattaché à cette réservation. La décision de caution sera disponible après sa création et sa finalisation.
          </AlertDescription>
        </Alert>
      ) : !inspection.finalized_at ? (
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />

          <AlertDescription>
            L'état des lieux de sortie existe mais n'est pas encore finalisé. Aucune retenue ou restitution ne peut être décidée avant sa finalisation.
          </AlertDescription>
        </Alert>
      ) : !resolution ? (
        <div className="mt-4 space-y-4">
          <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />

            <AlertDescription>
              L'état des lieux de sortie est finalisé.{" "}
              <span className="font-medium">
                {formatMoney(
                  deposit.held_amount,
                  deposit.currency,
                )}
              </span>{" "}
              de caution reste à résoudre.
            </AlertDescription>
          </Alert>

          {deposit.held_amount > 0 ? (
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={
                  operationPending ||
                  !bookingId
                }
                onClick={handlePrepare}
              >
                {prepareResolution.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}

                Préparer la décision
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun montant de caution n'est encore disponible à résoudre.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">
                Caution à résoudre
              </p>

              <p className="mt-1 font-semibold">
                {formatMoney(
                  resolution.available_amount_snapshot,
                  resolution.currency,
                )}
              </p>
            </div>

            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">
                Retenue décidée
              </p>

              <p className="mt-1 font-semibold">
                {formatMoney(
                  resolution.deduction_amount,
                  resolution.currency,
                )}
              </p>
            </div>

            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">
                À restituer
              </p>

              <p className="mt-1 font-semibold">
                {formatMoney(
                  resolution.release_amount,
                  resolution.currency,
                )}
              </p>
            </div>
          </div>


          {resolution.status === "draft" && (
            <>
              <div>
                <div className="mb-3">
                  <p className="font-medium">
                    Retenues par constat
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Le coût estimé dans l'EDL reste une indication. Le montant réellement retenu doit être décidé séparément.
                  </p>
                </div>

                {findings.length === 0 ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />

                    <AlertDescription>
                      Aucun constat n'a été enregistré sur l'état des lieux de sortie. La décision peut être approuvée avec restitution intégrale de la caution.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {findings.map(
                      (finding) => (
                        <FindingDeductionRow
                          key={finding.id}
                          bookingId={bookingId}
                          resolution={resolution}
                          finding={finding}
                          deduction={
                            deductionByFinding.get(
                              finding.id,
                            ) ??
                            null
                          }
                        />
                      ),
                    )}
                  </div>
                )}
              </div>


              <div className="rounded-lg border bg-background p-4">
                <Label>
                  Note de décision
                </Label>

                <Textarea
                  className="mt-2"
                  value={decisionNotes}
                  disabled={operationPending}
                  onChange={(event) =>
                    setDecisionNotes(
                      event.target.value,
                    )
                  }
                  placeholder="Observations générales sur la décision..."
                />

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    disabled={operationPending}
                    onClick={handleApprove}
                  >
                    {approveResolution.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}

                    Approuver la décision
                  </Button>
                </div>
              </div>
            </>
          )}


          {(
            resolution.status === "approved" ||
            resolution.status === "completed"
          ) &&
            deductions.length > 0 && (
              <div>
                <p className="mb-3 font-medium">
                  Retenues décidées
                </p>

                <div className="space-y-2">
                  {deductions.map(
                    (deduction) => {
                      const finding =
                        findings.find(
                          (item) =>
                            item.id ===
                            deduction.inspection_finding_id,
                        );

                      return (
                        <div
                          key={deduction.id}
                          className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium">
                              {finding?.title ??
                                "Constat EDL"}
                            </p>

                            <p className="text-sm text-muted-foreground">
                              {deduction.reason}
                            </p>
                          </div>

                          <p className="font-semibold">
                            {formatMoney(
                              deduction.deduction_amount,
                              resolution.currency,
                            )}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}


          {resolution.status === "approved" && (
            <div className="rounded-lg border bg-background p-4">
              <div className="mb-4">
                <p className="font-medium">
                  Exécution financière
                </p>

                <p className="text-sm text-muted-foreground">
                  L'exécution crée atomiquement la retenue éventuelle et la restitution du solde.
                </p>
              </div>

              {resolution.release_amount > 0 && (
                <div>
                  <Label>
                    Moyen de restitution
                  </Label>

                  <Select
                    value={releasePaymentMethod}
                    onValueChange={
                      setReleasePaymentMethod
                    }
                    disabled={operationPending}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner un moyen de restitution" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="cash">
                        Espèces
                      </SelectItem>

                      <SelectItem value="transfer">
                        Virement
                      </SelectItem>

                      <SelectItem value="mobile_money">
                        Mobile Money
                      </SelectItem>

                      <SelectItem value="card">
                        Carte
                      </SelectItem>

                      <SelectItem value="cheque">
                        Chèque
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="mt-4">
                <Label>
                  Note d'exécution
                </Label>

                <Textarea
                  className="mt-2"
                  value={executionNotes}
                  disabled={operationPending}
                  onChange={(event) =>
                    setExecutionNotes(
                      event.target.value,
                    )
                  }
                  placeholder="Référence ou observation complémentaire..."
                />
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  disabled={operationPending}
                  onClick={handleExecute}
                >
                  {executeResolution.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  Exécuter la décision
                </Button>
              </div>
            </div>
          )}


          {resolution.status === "processing" && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />

              <AlertDescription>
                La résolution est marquée en cours d'exécution. Cet état ne devrait pas persister après la transaction ; n'effectuez aucune opération manuelle sur la caution.
              </AlertDescription>
            </Alert>
          )}


          {resolution.status === "completed" && (
            <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />

              <AlertDescription>
                <span className="font-medium">
                  Décision exécutée.
                </span>{" "}
                La caution a été entièrement résolue :{" "}
                {formatMoney(
                  resolution.deduction_amount,
                  resolution.currency,
                )}{" "}
                retenu
                {resolution.deduction_amount > 1
                  ? "s"
                  : ""}{" "}
                et{" "}
                {formatMoney(
                  resolution.release_amount,
                  resolution.currency,
                )}{" "}
                restitué
                {resolution.release_amount > 1
                  ? "s"
                  : ""}.
              </AlertDescription>
            </Alert>
          )}


          {(
            resolution.status === "draft" ||
            resolution.status === "approved"
          ) && (
            <div className="rounded-lg border border-dashed p-4">
              <Label>
                Motif d'annulation de la décision
              </Label>

              <Input
                className="mt-2"
                value={cancellationReason}
                disabled={operationPending}
                onChange={(event) =>
                  setCancellationReason(
                    event.target.value,
                  )
                }
                placeholder="Obligatoire uniquement pour annuler"
              />

              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={operationPending}
                  onClick={handleCancel}
                >
                  {cancelResolution.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  Annuler cette décision
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}