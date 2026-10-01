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
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ShortRentalManagementTerm,
  ShortRentalPricingModel,
  useCreateShortRentalManagementTerm,
  useUpdateShortRentalManagementTerm,
} from "@/hooks/use-short-rental-management-terms";

interface ManagementTermsDialogProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  propertyId?: string;
  propertyTitle?: string;

  ownerId?: string | null;

  currentTerm?: ShortRentalManagementTerm | null;
}

const todayIso = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toNullableNumber = (
  value: string,
): number | null => {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
};

export default function ManagementTermsDialog({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
  ownerId,
  currentTerm,
}: ManagementTermsDialogProps) {
  const createTerm =
    useCreateShortRentalManagementTerm();

  const updateTerm =
    useUpdateShortRentalManagementTerm();

  const [pricingModel, setPricingModel] =
    useState<ShortRentalPricingModel>(
      "commission",
    );

  const [
    commissionRate,
    setCommissionRate,
  ] = useState("");

  const [
    fixedMonthlyFee,
    setFixedMonthlyFee,
  ] = useState("");

  const [
    feePerBooking,
    setFeePerBooking,
  ] = useState("");

  const [
    effectiveFrom,
    setEffectiveFrom,
  ] = useState(todayIso());

  const [
    effectiveTo,
    setEffectiveTo,
  ] = useState("");

  const [active, setActive] =
    useState(true);

  const [notes, setNotes] =
    useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    if (currentTerm) {
      setPricingModel(
        currentTerm.pricing_model,
      );

      setCommissionRate(
        currentTerm.commission_rate == null
          ? ""
          : String(
              currentTerm.commission_rate,
            ),
      );

      setFixedMonthlyFee(
        currentTerm.fixed_monthly_fee == null
          ? ""
          : String(
              currentTerm.fixed_monthly_fee,
            ),
      );

      setFeePerBooking(
        currentTerm.fee_per_booking == null
          ? ""
          : String(
              currentTerm.fee_per_booking,
            ),
      );

      setEffectiveFrom(
        currentTerm.effective_from,
      );

      setEffectiveTo(
        currentTerm.effective_to ?? "",
      );

      setActive(
        currentTerm.active,
      );

      setNotes(
        currentTerm.notes ?? "",
      );

      return;
    }

    setPricingModel(
      "commission",
    );

    setCommissionRate("");
    setFixedMonthlyFee("");
    setFeePerBooking("");

    setEffectiveFrom(
      todayIso(),
    );

    setEffectiveTo("");

    setActive(true);
    setNotes("");
  }, [
    open,
    currentTerm,
    propertyId,
  ]);

  const isPending =
    createTerm.isPending ||
    updateTerm.isPending;

  const handleSave = async () => {
    if (!propertyId) {
      toast.error(
        "Aucun logement sélectionné",
      );

      return;
    }

    if (!effectiveFrom) {
      toast.error(
        "La date de prise d'effet est obligatoire",
      );

      return;
    }

    if (
      effectiveTo &&
      effectiveTo < effectiveFrom
    ) {
      toast.error(
        "La date de fin ne peut pas être antérieure à la date de prise d'effet",
      );

      return;
    }

    const commission =
      toNullableNumber(
        commissionRate,
      );

    const fixedFee =
      toNullableNumber(
        fixedMonthlyFee,
      );

    const bookingFee =
      toNullableNumber(
        feePerBooking,
      );

    if (
      commission !== null &&
      (
        commission < 0 ||
        commission > 100
      )
    ) {
      toast.error(
        "La commission doit être comprise entre 0 et 100 %",
      );

      return;
    }

    if (
      fixedFee !== null &&
      fixedFee < 0
    ) {
      toast.error(
        "Le forfait mensuel ne peut pas être négatif",
      );

      return;
    }

    if (
      bookingFee !== null &&
      bookingFee < 0
    ) {
      toast.error(
        "Le montant par réservation ne peut pas être négatif",
      );

      return;
    }

    let normalizedCommission:
      | number
      | null = null;

    let normalizedFixedFee:
      | number
      | null = null;

    let normalizedBookingFee:
      | number
      | null = null;

    switch (pricingModel) {
      case "commission":
        if (commission === null) {
          toast.error(
            "Indiquez le taux de commission",
          );

          return;
        }

        normalizedCommission =
          commission;

        break;

      case "fixed_fee":
        if (fixedFee === null) {
          toast.error(
            "Indiquez le forfait mensuel",
          );

          return;
        }

        normalizedFixedFee =
          fixedFee;

        break;

      case "commission_plus_fixed":
        if (
          commission === null ||
          fixedFee === null
        ) {
          toast.error(
            "Indiquez la commission et le forfait mensuel",
          );

          return;
        }

        normalizedCommission =
          commission;

        normalizedFixedFee =
          fixedFee;

        break;

      case "per_booking":
        if (bookingFee === null) {
          toast.error(
            "Indiquez le montant facturé par réservation",
          );

          return;
        }

        normalizedBookingFee =
          bookingFee;

        break;

      case "custom":
        normalizedCommission =
          commission;

        normalizedFixedFee =
          fixedFee;

        normalizedBookingFee =
          bookingFee;

        break;
    }

    const values = {
      property_id:
        propertyId,

      owner_id:
        ownerId ?? null,

      pricing_model:
        pricingModel,

      commission_rate:
        normalizedCommission,

      fixed_monthly_fee:
        normalizedFixedFee,

      fee_per_booking:
        normalizedBookingFee,

      currency:
        "GNF",

      effective_from:
        effectiveFrom,

      effective_to:
        effectiveTo || null,

      active,

      notes:
        notes.trim(),
    };

    try {
      if (currentTerm?.id) {
        await updateTerm.mutateAsync({
          id: currentTerm.id,
          ...values,
        });

        toast.success(
          "Conditions de gestion mises à jour",
        );
      } else {
        await createTerm.mutateAsync(
          values,
        );

        toast.success(
          "Conditions de gestion enregistrées",
        );
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error(error);

      if (
        error?.code === "23505"
      ) {
        toast.error(
          "Ce logement possède déjà une formule de gestion active.",
        );

        return;
      }

      toast.error(
        error?.message ??
          "Impossible d'enregistrer les conditions de gestion",
      );
    }
  };

  const showCommission =
    pricingModel ===
      "commission" ||
    pricingModel ===
      "commission_plus_fixed" ||
    pricingModel ===
      "custom";

  const showFixedFee =
    pricingModel ===
      "fixed_fee" ||
    pricingModel ===
      "commission_plus_fixed" ||
    pricingModel ===
      "custom";

  const showBookingFee =
    pricingModel ===
      "per_booking" ||
    pricingModel ===
      "custom";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Conditions de gestion
          </DialogTitle>

          <DialogDescription>
            {propertyTitle ??
              "Conditions commerciales du logement"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          <div className="space-y-2">
            <Label>
              Formule propriétaire
            </Label>

            <Select
              value={pricingModel}
              onValueChange={(value) =>
                setPricingModel(
                  value as ShortRentalPricingModel,
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="commission">
                  Commission %
                </SelectItem>

                <SelectItem value="fixed_fee">
                  Forfait mensuel
                </SelectItem>

                <SelectItem value="commission_plus_fixed">
                  Commission + forfait
                </SelectItem>

                <SelectItem value="per_booking">
                  Montant par réservation
                </SelectItem>

                <SelectItem value="custom">
                  Formule personnalisée
                </SelectItem>
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground">
              Cette formule définit la rémunération d'ImmoPlate
              pour la gestion de ce logement. Elle est indépendante
              du tarif payé par le voyageur.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {showCommission && (
              <div className="space-y-2">
                <Label htmlFor="management-commission">
                  Commission ImmoPlate
                </Label>

                <div className="relative">
                  <Input
                    id="management-commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={commissionRate}
                    onChange={(event) =>
                      setCommissionRate(
                        event.target.value,
                      )
                    }
                    className="pr-10"
                    placeholder="15"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            )}

            {showFixedFee && (
              <div className="space-y-2">
                <Label htmlFor="management-fixed-fee">
                  Forfait mensuel
                </Label>

                <Input
                  id="management-fixed-fee"
                  type="number"
                  min="0"
                  value={fixedMonthlyFee}
                  onChange={(event) =>
                    setFixedMonthlyFee(
                      event.target.value,
                    )
                  }
                  placeholder="500000"
                />

                <p className="text-xs text-muted-foreground">
                  GNF / mois
                </p>
              </div>
            )}

            {showBookingFee && (
              <div className="space-y-2">
                <Label htmlFor="management-booking-fee">
                  Montant par réservation
                </Label>

                <Input
                  id="management-booking-fee"
                  type="number"
                  min="0"
                  value={feePerBooking}
                  onChange={(event) =>
                    setFeePerBooking(
                      event.target.value,
                    )
                  }
                  placeholder="200000"
                />

                <p className="text-xs text-muted-foreground">
                  GNF / réservation
                </p>
              </div>
            )}
          </div>

          {pricingModel === "custom" && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              La formule personnalisée permet de conserver plusieurs
              paramètres financiers. Décrivez précisément les règles
              particulières dans les notes contractuelles.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="management-effective-from">
                Prise d'effet
              </Label>

              <Input
                id="management-effective-from"
                type="date"
                value={effectiveFrom}
                onChange={(event) =>
                  setEffectiveFrom(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="management-effective-to">
                Fin
              </Label>

              <Input
                id="management-effective-to"
                type="date"
                value={effectiveTo}
                onChange={(event) =>
                  setEffectiveTo(
                    event.target.value,
                  )
                }
              />

              <p className="text-xs text-muted-foreground">
                Vide = sans date de fin définie
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>
                  Formule active
                </Label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Une seule formule peut être active simultanément
                  pour un même logement.
                </p>
              </div>

              <Switch
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="management-notes">
              Notes contractuelles
            </Label>

            <Textarea
              id="management-notes"
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              placeholder="Conditions particulières négociées avec le propriétaire..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              onOpenChange(false)
            }
          >
            Annuler
          </Button>

          <Button
            onClick={handleSave}
            disabled={
              !propertyId ||
              isPending
            }
          >
            {isPending
              ? "Enregistrement..."
              : currentTerm
                ? "Enregistrer les modifications"
                : "Enregistrer les conditions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}