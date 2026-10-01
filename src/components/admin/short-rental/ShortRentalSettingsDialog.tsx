import { useEffect, useState } from "react";
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
  useShortRentalSetting,
  useUpsertShortRentalSettings,
} from "@/hooks/use-short-rental-settings";

interface ShortRentalSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string;
  propertyTitle?: string;
}

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function ShortRentalSettingsDialog({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
}: ShortRentalSettingsDialogProps) {
  const {
    data: existing,
    isLoading,
  } = useShortRentalSetting(propertyId);

  const saveSettings = useUpsertShortRentalSettings();

  const [baseNightlyRate, setBaseNightlyRate] = useState("0");
  const [cleaningFee, setCleaningFee] = useState("0");
  const [securityDeposit, setSecurityDeposit] = useState("0");

  const [minimumStay, setMinimumStay] = useState("1");
  const [maximumStay, setMaximumStay] = useState("");
  const [maxGuests, setMaxGuests] = useState("1");

  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");

  const [instantBooking, setInstantBooking] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;

    if (existing) {
      setBaseNightlyRate(
        String(existing.base_nightly_rate ?? 0),
      );

      setCleaningFee(
        String(existing.cleaning_fee ?? 0),
      );

      setSecurityDeposit(
        String(existing.security_deposit ?? 0),
      );

      setMinimumStay(
        String(existing.minimum_stay ?? 1),
      );

      setMaximumStay(
        existing.maximum_stay == null
          ? ""
          : String(existing.maximum_stay),
      );

      setMaxGuests(
        String(existing.max_guests ?? 1),
      );

      setCheckInTime(
        existing.default_check_in_time?.slice(0, 5) ?? "14:00",
      );

      setCheckOutTime(
        existing.default_check_out_time?.slice(0, 5) ?? "11:00",
      );

      setInstantBooking(
        Boolean(existing.instant_booking),
      );

      setActive(
        existing.active !== false,
      );

      return;
    }

    setBaseNightlyRate("0");
    setCleaningFee("0");
    setSecurityDeposit("0");

    setMinimumStay("1");
    setMaximumStay("");
    setMaxGuests("1");

    setCheckInTime("14:00");
    setCheckOutTime("11:00");

    setInstantBooking(false);
    setActive(true);
  }, [open, existing, propertyId]);

  const handleSave = async () => {
    if (!propertyId) return;

    const minStay = Math.max(
      1,
      Math.trunc(
        toNumber(minimumStay, 1),
      ),
    );

    const maxStay =
      maximumStay.trim() === ""
        ? null
        : Math.max(
            minStay,
            Math.trunc(
              toNumber(maximumStay, minStay),
            ),
          );

    const guests = Math.max(
      1,
      Math.trunc(
        toNumber(maxGuests, 1),
      ),
    );

    try {
      await saveSettings.mutateAsync({
        property_id: propertyId,

        currency: "GNF",

        base_nightly_rate: Math.max(
          0,
          toNumber(baseNightlyRate),
        ),

        cleaning_fee: Math.max(
          0,
          toNumber(cleaningFee),
        ),

        security_deposit: Math.max(
          0,
          toNumber(securityDeposit),
        ),

        minimum_stay: minStay,
        maximum_stay: maxStay,
        max_guests: guests,

        default_check_in_time: checkInTime,
        default_check_out_time: checkOutTime,

        instant_booking: instantBooking,
        active,
      });

      toast.success(
        existing
          ? "Configuration mise à jour"
          : "Configuration courte durée créée",
      );

      onOpenChange(false);
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer la configuration",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Configuration courte durée
          </DialogTitle>

          <DialogDescription>
            {propertyTitle ?? "Paramètres du bien"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Chargement...
          </div>
        ) : (
          <div className="grid gap-6 py-2">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="base-nightly-rate">
                  Tarif de base / nuit
                </Label>

                <Input
                  id="base-nightly-rate"
                  type="number"
                  min="0"
                  value={baseNightlyRate}
                  onChange={(event) =>
                    setBaseNightlyRate(event.target.value)
                  }
                />

                <p className="text-xs text-muted-foreground">
                  GNF
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cleaning-fee">
                  Frais de ménage
                </Label>

                <Input
                  id="cleaning-fee"
                  type="number"
                  min="0"
                  value={cleaningFee}
                  onChange={(event) =>
                    setCleaningFee(event.target.value)
                  }
                />

                <p className="text-xs text-muted-foreground">
                  GNF
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="security-deposit">
                  Caution
                </Label>

                <Input
                  id="security-deposit"
                  type="number"
                  min="0"
                  value={securityDeposit}
                  onChange={(event) =>
                    setSecurityDeposit(event.target.value)
                  }
                />

                <p className="text-xs text-muted-foreground">
                  GNF
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="minimum-stay">
                  Séjour minimum
                </Label>

                <Input
                  id="minimum-stay"
                  type="number"
                  min="1"
                  step="1"
                  value={minimumStay}
                  onChange={(event) =>
                    setMinimumStay(event.target.value)
                  }
                />

                <p className="text-xs text-muted-foreground">
                  nuits
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maximum-stay">
                  Séjour maximum
                </Label>

                <Input
                  id="maximum-stay"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Illimité"
                  value={maximumStay}
                  onChange={(event) =>
                    setMaximumStay(event.target.value)
                  }
                />

                <p className="text-xs text-muted-foreground">
                  Vide = illimité
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-guests">
                  Voyageurs maximum
                </Label>

                <Input
                  id="max-guests"
                  type="number"
                  min="1"
                  step="1"
                  value={maxGuests}
                  onChange={(event) =>
                    setMaxGuests(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="check-in-time">
                  Heure de check-in
                </Label>

                <Input
                  id="check-in-time"
                  type="time"
                  value={checkInTime}
                  onChange={(event) =>
                    setCheckInTime(event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="check-out-time">
                  Heure de check-out
                </Label>

                <Input
                  id="check-out-time"
                  type="time"
                  value={checkOutTime}
                  onChange={(event) =>
                    setCheckOutTime(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>
                    Réservation instantanée
                  </Label>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Autorise une réservation sans validation manuelle.
                  </p>
                </div>

                <Switch
                  checked={instantBooking}
                  onCheckedChange={setInstantBooking}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>
                    Configuration active
                  </Label>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Rend cette configuration opérationnelle pour le bien.
                  </p>
                </div>

                <Switch
                  checked={active}
                  onCheckedChange={setActive}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>

          <Button
            onClick={handleSave}
            disabled={
              !propertyId ||
              isLoading ||
              saveSettings.isPending
            }
          >
            {saveSettings.isPending
              ? "Enregistrement..."
              : existing
                ? "Enregistrer les modifications"
                : "Configurer le bien"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}