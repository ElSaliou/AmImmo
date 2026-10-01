import {
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  PropertyRatePeriod,
  useCreatePropertyRatePeriod,
  useUpdatePropertyRatePeriod,
} from "@/hooks/use-property-rate-periods";

interface RatePeriodDialogProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  propertyId?: string;

  propertyTitle?: string;

  ratePeriod?: PropertyRatePeriod | null;
}

const toNumber = (
  value: string,
  fallback = 0,
) => {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : fallback;
};

export default function RatePeriodDialog({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
  ratePeriod,
}: RatePeriodDialogProps) {
  const createRate =
    useCreatePropertyRatePeriod();

  const updateRate =
    useUpdatePropertyRatePeriod();

  const [
    name,
    setName,
  ] = useState("");

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  const [
    nightlyRate,
    setNightlyRate,
  ] = useState("0");

  const [
    minimumStay,
    setMinimumStay,
  ] = useState("");

  const [
    priority,
    setPriority,
  ] = useState("10");

  const [
    active,
    setActive,
  ] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (ratePeriod) {
      setName(
        ratePeriod.name,
      );

      setStartDate(
        ratePeriod.start_date,
      );

      setEndDate(
        ratePeriod.end_date,
      );

      setNightlyRate(
        String(
          ratePeriod.nightly_rate,
        ),
      );

      setMinimumStay(
        ratePeriod.minimum_stay ==
          null
          ? ""
          : String(
              ratePeriod.minimum_stay,
            ),
      );

      setPriority(
        String(
          ratePeriod.priority,
        ),
      );

      setActive(
        ratePeriod.active,
      );

      return;
    }

    setName("");
    setStartDate("");
    setEndDate("");
    setNightlyRate("0");
    setMinimumStay("");
    setPriority("10");
    setActive(true);
  }, [
    open,
    ratePeriod,
  ]);

  const isEditing =
    Boolean(
      ratePeriod?.id,
    );

  const isPending =
    createRate.isPending ||
    updateRate.isPending;

  const handleSave =
    async () => {
      if (!propertyId) {
        toast.error(
          "Aucun bien sélectionné",
        );

        return;
      }

      if (!name.trim()) {
        toast.error(
          "Le nom de la période est obligatoire",
        );

        return;
      }

      if (
        !startDate ||
        !endDate
      ) {
        toast.error(
          "Les dates de début et de fin sont obligatoires",
        );

        return;
      }

      if (
        endDate <=
        startDate
      ) {
        toast.error(
          "La date de fin doit être postérieure à la date de début",
        );

        return;
      }

      const rate =
        Math.max(
          0,
          toNumber(
            nightlyRate,
          ),
        );

      if (rate <= 0) {
        toast.error(
          "Le tarif par nuit doit être supérieur à zéro",
        );

        return;
      }

      const minStay =
        minimumStay.trim() ===
        ""
          ? null
          : Math.max(
              1,
              Math.trunc(
                toNumber(
                  minimumStay,
                  1,
                ),
              ),
            );

      const priorityValue =
        Math.trunc(
          toNumber(
            priority,
            0,
          ),
        );

      const values = {
        property_id:
          propertyId,

        name:
          name.trim(),

        start_date:
          startDate,

        end_date:
          endDate,

        nightly_rate:
          rate,

        minimum_stay:
          minStay,

        priority:
          priorityValue,

        active,
      };

      try {
        if (
          ratePeriod?.id
        ) {
          await updateRate.mutateAsync(
            {
              id:
                ratePeriod.id,

              ...values,
            },
          );

          toast.success(
            "Période tarifaire mise à jour",
          );
        } else {
          await createRate.mutateAsync(
            values,
          );

          toast.success(
            "Période tarifaire créée",
          );
        }

        onOpenChange(
          false,
        );
      } catch (error) {
        console.error(
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer la période tarifaire",
        );
      }
    };

  return (
    <Dialog
      open={open}
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Modifier la période tarifaire"
              : "Nouvelle période tarifaire"}
          </DialogTitle>

          <DialogDescription>
            {propertyTitle ??
              "Tarification du bien"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="rate-name">
              Nom de la période
            </Label>

            <Input
              id="rate-name"
              placeholder="Ex. Haute saison, Tabaski, Nouvel An..."
              value={
                name
              }
              onChange={(
                event,
              ) =>
                setName(
                  event
                    .target
                    .value,
                )
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rate-start-date">
                Début
              </Label>

              <Input
                id="rate-start-date"
                type="date"
                value={
                  startDate
                }
                onChange={(
                  event,
                ) =>
                  setStartDate(
                    event
                      .target
                      .value,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate-end-date">
                Fin
              </Label>

              <Input
                id="rate-end-date"
                type="date"
                value={
                  endDate
                }
                onChange={(
                  event,
                ) =>
                  setEndDate(
                    event
                      .target
                      .value,
                  )
                }
              />

              <p className="text-xs text-muted-foreground">
                La date de fin
                correspond au
                check-out : elle
                n'est pas facturée
                comme une nuit.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rate-nightly">
                Tarif / nuit
              </Label>

              <Input
                id="rate-nightly"
                type="number"
                min="0"
                value={
                  nightlyRate
                }
                onChange={(
                  event,
                ) =>
                  setNightlyRate(
                    event
                      .target
                      .value,
                  )
                }
              />

              <p className="text-xs text-muted-foreground">
                GNF
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate-minimum-stay">
                Séjour min.
              </Label>

              <Input
                id="rate-minimum-stay"
                type="number"
                min="1"
                step="1"
                placeholder="Par défaut"
                value={
                  minimumStay
                }
                onChange={(
                  event,
                ) =>
                  setMinimumStay(
                    event
                      .target
                      .value,
                  )
                }
              />

              <p className="text-xs text-muted-foreground">
                Vide = réglage
                général du bien
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate-priority">
                Priorité
              </Label>

              <Input
                id="rate-priority"
                type="number"
                step="1"
                value={
                  priority
                }
                onChange={(
                  event,
                ) =>
                  setPriority(
                    event
                      .target
                      .value,
                  )
                }
              />

              <p className="text-xs text-muted-foreground">
                Plus élevée =
                prioritaire
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>
                  Période active
                </Label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Une période
                  inactive est
                  conservée mais
                  ignorée dans la
                  tarification.
                </p>
              </div>

              <Switch
                checked={
                  active
                }
                onCheckedChange={
                  setActive
                }
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">
              Règle de priorité
            </p>

            <p className="mt-1 text-muted-foreground">
              Lorsque plusieurs
              périodes couvrent la
              même nuit, celle
              possédant la priorité
              numérique la plus
              élevée doit être
              appliquée.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              onOpenChange(
                false,
              )
            }
          >
            Annuler
          </Button>

          <Button
            onClick={
              handleSave
            }
            disabled={
              isPending
            }
          >
            {isPending
              ? "Enregistrement..."
              : isEditing
                ? "Enregistrer"
                : "Créer la période"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}