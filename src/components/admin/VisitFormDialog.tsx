import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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

import { useCreateVisit, useUpdateVisit } from "@/hooks/use-visits";

import {
  useCreateLeadActivity,
  useLeads,
  useUpdateLead,
} from "@/hooks/use-leads";

import { useProperties } from "@/hooks/use-properties";
import { visitStatusConfig } from "@/constants/real-estate";

import type {
  Visit,
  VisitInsert,
  VisitStatus,
} from "@/types/real-estate";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit?: Visit | null;
  leadId?: string;
  propertyId?: string;
}

const toLocalInput = (value?: string | null) => {
  if (!value) return "";

  const d = new Date(value);
  const offset = d.getTimezoneOffset();

  return new Date(
    d.getTime() - offset * 60_000,
  )
    .toISOString()
    .slice(0, 16);
};

const VisitFormDialog = ({
  open,
  onOpenChange,
  visit,
  leadId,
  propertyId,
}: Props) => {
  const createVisit = useCreateVisit();
  const updateVisit = useUpdateVisit();

  const updateLead = useUpdateLead();
  const createActivity = useCreateLeadActivity();

  const { data: leads } = useLeads();
  const { data: properties } = useProperties();

  const [form, setForm] = useState<VisitInsert>({
    visitor_name: "",
    visitor_email: "",
    visitor_phone: "",
    lead_id: leadId ?? null,
    property_id: propertyId ?? null,
    scheduled_at: null,
    status: "requested",
    notes: "",
    outcome: "",
  });

  const isPending =
    createVisit.isPending ||
    updateVisit.isPending ||
    updateLead.isPending ||
    createActivity.isPending;

  useEffect(() => {
    if (visit) {
      setForm({
        visitor_name: visit.visitor_name,
        visitor_email: visit.visitor_email,
        visitor_phone: visit.visitor_phone,
        lead_id: visit.lead_id,
        property_id: visit.property_id,
        scheduled_at: visit.scheduled_at,
        status: visit.status,
        notes: visit.notes,
        outcome: visit.outcome,
      });

      return;
    }

    const lead = (leads ?? []).find(
      (l) => l.id === leadId,
    );

    setForm({
      visitor_name: lead?.full_name ?? "",
      visitor_email: lead?.email ?? "",
      visitor_phone: lead?.phone ?? "",
      lead_id: leadId ?? null,
      property_id:
        propertyId ??
        lead?.property_id ??
        null,
      scheduled_at: null,
      status: "requested",
      notes: "",
      outcome: "",
    });
  }, [
    visit,
    open,
    leadId,
    propertyId,
    leads,
  ]);

  const set = <
    K extends keyof VisitInsert,
  >(
    key: K,
    value: VisitInsert[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleLeadChange = (
    value: string,
  ) => {
    const id =
      value === "__none__"
        ? null
        : value;

    const lead = (leads ?? []).find(
      (l) => l.id === id,
    );

    setForm((prev) => ({
      ...prev,
      lead_id: id,
      visitor_name:
        lead?.full_name ??
        prev.visitor_name,
      visitor_email:
        lead?.email ??
        prev.visitor_email,
      visitor_phone:
        lead?.phone ??
        prev.visitor_phone,
      property_id:
        lead?.property_id ??
        prev.property_id,
    }));
  };

  const createVisitActivity = async (
    leadId: string,
    status: VisitStatus,
    outcome?: string | null,
  ) => {
    /*
     * On ne crée automatiquement
     * l'activité détaillée que lorsque
     * la visite est réellement effectuée.
     *
     * Cela évite de polluer l'historique
     * à chaque simple modification.
     */
    if (status !== "done") {
      return;
    }

    /*
     * Si on modifie une visite qui était
     * déjà "done", on évite de créer
     * une deuxième activité identique.
     */
    if (
      visit &&
      visit.status === "done"
    ) {
      return;
    }

    const content = outcome?.trim()
      ? `Visite effectuée.\n\nCompte rendu :\n${outcome.trim()}`
      : "Visite effectuée.";

    await createActivity.mutateAsync({
      lead_id: leadId,
      kind: "visit",
      content,
    });
  };

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (!form.visitor_name.trim()) {
      toast.error(
        "Le nom du visiteur est obligatoire",
      );
      return;
    }

    try {
      const payload = {
        ...form,

        scheduled_at:
          form.scheduled_at
            ? new Date(
                form.scheduled_at,
              ).toISOString()
            : null,
      };

      /*
       * 1. Création / modification
       *    de la visite
       */
      if (visit) {
        await updateVisit.mutateAsync({
          id: visit.id,
          ...payload,
        });
      } else {
        await createVisit.mutateAsync(
          payload,
        );
      }

      /*
       * 2. Synchronisation automatique
       *    du pipeline du lead
       */
      if (payload.lead_id) {
        if (
          payload.status === "done"
        ) {
          await updateLead.mutateAsync({
            id: payload.lead_id,
            status: "visit_done",
          });

          /*
           * 3. Historique automatique
           */
          await createVisitActivity(
            payload.lead_id,
            "done",
            payload.outcome,
          );
        } else if (
          [
            "requested",
            "confirmed",
            "postponed",
          ].includes(
            payload.status ??
              "requested",
          )
        ) {
          /*
           * Ne pas rétrograder inutilement
           * un lead qui est déjà plus loin
           * dans le pipeline.
           */
          const currentLead = (
            leads ?? []
          ).find(
            (l) =>
              l.id ===
              payload.lead_id,
          );

          const advancedStatuses = [
            "visit_done",
            "application_received",
            "negotiation",
            "converted",
            "lost",
          ];

          if (
            !currentLead ||
            !advancedStatuses.includes(
              currentLead.status,
            )
          ) {
            await updateLead.mutateAsync({
              id: payload.lead_id,
              status:
                "visit_scheduled",
            });
          }
        }
      }

      toast.success(
        visit
          ? "Visite mise à jour"
          : "Visite créée",
      );

      onOpenChange(false);
    } catch (error: any) {
      console.error(
        "Erreur enregistrement visite:",
        error,
      );

      toast.error(
        error?.message ??
          "Impossible d'enregistrer la visite",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>

            <div>
              <DialogTitle>
                {visit
                  ? "Modifier la visite"
                  : "Planifier une visite"}
              </DialogTitle>

              <DialogDescription>
                Prospect, bien, créneau et
                compte rendu.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 pt-2"
        >
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Lead associé
              </Label>

              <Select
                value={
                  form.lead_id ??
                  "__none__"
                }
                onValueChange={
                  handleLeadChange
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun lead" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="__none__">
                    Aucun lead
                  </SelectItem>

                  {(leads ?? []).map(
                    (lead) => (
                      <SelectItem
                        key={lead.id}
                        value={lead.id}
                      >
                        {lead.full_name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Bien</Label>

              <Select
                value={
                  form.property_id ??
                  "__none__"
                }
                onValueChange={(v) =>
                  set(
                    "property_id",
                    v === "__none__"
                      ? null
                      : v,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun bien" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="__none__">
                    Aucun bien
                  </SelectItem>

                  {(properties ?? []).map(
                    (property) => (
                      <SelectItem
                        key={property.id}
                        value={
                          property.id
                        }
                      >
                        {
                          property.title
                        }
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Nom du visiteur *
              </Label>

              <Input
                value={
                  form.visitor_name
                }
                onChange={(e) =>
                  set(
                    "visitor_name",
                    e.target.value,
                  )
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Téléphone
              </Label>

              <Input
                value={
                  form.visitor_phone ??
                  ""
                }
                onChange={(e) =>
                  set(
                    "visitor_phone",
                    e.target.value,
                  )
                }
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>

              <Input
                type="email"
                value={
                  form.visitor_email ??
                  ""
                }
                onChange={(e) =>
                  set(
                    "visitor_email",
                    e.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Date et heure
              </Label>

              <Input
                type="datetime-local"
                value={toLocalInput(
                  form.scheduled_at,
                )}
                onChange={(e) =>
                  set(
                    "scheduled_at",
                    e.target.value ||
                      null,
                  )
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Statut</Label>

            <Select
              value={
                (form.status ??
                  "requested") as VisitStatus
              }
              onValueChange={(value) =>
                set(
                  "status",
                  value as VisitStatus,
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {Object.entries(
                  visitStatusConfig,
                ).map(
                  ([value, config]) => (
                    <SelectItem
                      key={value}
                      value={value}
                    >
                      {config.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>

            <Textarea
              rows={3}
              value={
                form.notes ?? ""
              }
              onChange={(e) =>
                set(
                  "notes",
                  e.target.value,
                )
              }
              placeholder="Accès, attentes du prospect, informations utiles…"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Compte rendu / résultat
            </Label>

            <Textarea
              rows={3}
              value={
                form.outcome ?? ""
              }
              onChange={(e) =>
                set(
                  "outcome",
                  e.target.value,
                )
              }
              placeholder="Impression du prospect, suite à donner…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(false)
              }
            >
              Annuler
            </Button>

            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              {visit
                ? "Enregistrer"
                : "Planifier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VisitFormDialog;
