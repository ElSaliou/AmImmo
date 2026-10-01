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
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  PropertyBlock,
  useCreatePropertyBlock,
  useUpdatePropertyBlock,
} from "@/hooks/use-property-blocks";

interface PropertyBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  propertyId?: string;
  propertyTitle?: string;

  block?: PropertyBlock | null;

  defaultStartDate?: string;
  defaultEndDate?: string;
}

type BlockType =
  | "manual"
  | "maintenance"
  | "owner_use"
  | "administrative"
  | "external_booking"
  | "other";

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  manual: "Blocage manuel",
  maintenance: "Maintenance",
  owner_use: "Usage propriétaire",
  administrative: "Administratif",
  external_booking: "Réservation externe",
  other: "Autre",
};

export default function PropertyBlockDialog({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
  block,
  defaultStartDate,
  defaultEndDate,
}: PropertyBlockDialogProps) {
  const createBlock = useCreatePropertyBlock();
  const updateBlock = useUpdatePropertyBlock();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [blockType, setBlockType] =
    useState<BlockType>("manual");

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [externalReference, setExternalReference] =
    useState("");

  useEffect(() => {
    if (!open) return;

    if (block) {
      setStartDate(block.start_date);
      setEndDate(block.end_date);

      setBlockType(block.block_type as BlockType);

      setReason(block.reason ?? "");
      setNotes(block.notes ?? "");
      setExternalReference(block.external_reference ?? "");

      return;
    }

    setStartDate(defaultStartDate ?? "");
    setEndDate(defaultEndDate ?? "");

    setBlockType("manual");
    setReason("");
    setNotes("");
    setExternalReference("");
  }, [
    open,
    block,
    defaultStartDate,
    defaultEndDate,
  ]);

  const isPending =
    createBlock.isPending ||
    updateBlock.isPending;

  const handleSave = async () => {
    if (!propertyId) {
      toast.error("Aucun logement sélectionné");
      return;
    }

    if (!startDate || !endDate) {
      toast.error(
        "Les dates de début et de fin sont obligatoires",
      );
      return;
    }

    if (endDate <= startDate) {
      toast.error(
        "La date de fin doit être postérieure à la date de début",
      );
      return;
    }

    const values = {
      property_id: propertyId,
      start_date: startDate,
      end_date: endDate,
      block_type: blockType,
      reason: reason.trim() || null,
      notes: notes.trim(),
      external_reference:
        externalReference.trim() || null,
    };

    try {
      if (block?.id) {
        await updateBlock.mutateAsync({
          id: block.id,
          ...values,
        });

        toast.success("Blocage mis à jour");
      } else {
        await createBlock.mutateAsync(values);

        toast.success("Période bloquée");
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.message ??
          "Impossible d'enregistrer le blocage",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {block
              ? "Modifier le blocage"
              : "Bloquer une période"}
          </DialogTitle>

          <DialogDescription>
            {propertyTitle ??
              "Indisponibilité du logement"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="block-start">
                Début
              </Label>

              <Input
                id="block-start"
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-end">
                Fin
              </Label>

              <Input
                id="block-end"
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
              />

              <p className="text-xs text-muted-foreground">
                La date de fin est libérée pour une
                nouvelle arrivée.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Type de blocage
            </Label>

            <Select
              value={blockType}
              onValueChange={(value) =>
                setBlockType(value as BlockType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {(
                  Object.entries(
                    BLOCK_TYPE_LABELS,
                  ) as [
                    BlockType,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem
                    key={value}
                    value={value}
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="block-reason">
              Motif
            </Label>

            <Input
              id="block-reason"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              placeholder="Ex. travaux de climatisation"
            />
          </div>

          {blockType === "external_booking" && (
            <div className="space-y-2">
              <Label htmlFor="block-reference">
                Référence externe
              </Label>

              <Input
                id="block-reference"
                value={externalReference}
                onChange={(event) =>
                  setExternalReference(
                    event.target.value,
                  )
                }
                placeholder="Ex. Airbnb HM123456"
              />

              <p className="text-xs text-muted-foreground">
                Référence Airbnb, Booking.com,
                agence partenaire, etc.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="block-notes">
              Notes
            </Label>

            <Textarea
              id="block-notes"
              rows={3}
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Informations complémentaires..."
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">
              Convention du calendrier
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              La période utilise [début, fin). Par
              exemple, un blocage du 10 au 15 bloque
              les nuits des 10, 11, 12, 13 et 14.
              Une nouvelle arrivée est possible le 15.
            </p>
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
            disabled={isPending}
            onClick={handleSave}
          >
            {isPending
              ? "Enregistrement..."
              : block
                ? "Enregistrer"
                : "Bloquer la période"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}