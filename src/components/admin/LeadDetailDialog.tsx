import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";

import {
  useCreateLeadActivity,
  useLeadActivities,
  useUpdateLead,
} from "@/hooks/use-leads";

import { useVisits } from "@/hooks/use-visits";

import {
  formatDateTime,
  formatMoney,
  leadPipeline,
  leadSourceLabels,
  leadStatusColor,
  leadStatusLabel,
  visitStatusConfig,
} from "@/constants/real-estate";

import VisitFormDialog from "@/components/admin/VisitFormDialog";

import type {
  Lead,
  LeadStatus,
} from "@/types/real-estate";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  lead:
    | (Lead & {
        property?: {
          id: string;
          title: string;
          city?: string;
          commune?: string;
        } | null;
      })
    | null;
}

const pipelineLabels: Partial<
  Record<LeadStatus, string>
> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  visit_scheduled: "Visite planifiée",
  visit_done: "Visite effectuée",
  application_received: "Dossier reçu",
  negotiation: "Négociation",
  converted: "Converti",
  lost: "Perdu",
};

const LeadDetailDialog = ({
  open,
  onOpenChange,
  lead,
}: Props) => {
  const { data: activities } =
    useLeadActivities(lead?.id);

  const { data: visits } =
    useVisits({
      leadId: lead?.id,
    });

  const updateLead =
    useUpdateLead();

  const createActivity =
    useCreateLeadActivity();

  const [note, setNote] =
    useState("");

  const [visitOpen, setVisitOpen] =
    useState(false);

  const [localStatus, setLocalStatus] =
    useState<LeadStatus>("new");

  useEffect(() => {
    if (lead?.status) {
      setLocalStatus(
        lead.status as LeadStatus,
      );
    }
  }, [lead?.id, lead?.status]);

  const orderedActivities =
    useMemo(
      () => activities ?? [],
      [activities],
    );

  if (!lead) {
    return null;
  }

  const getStatusLabel = (
    status: LeadStatus,
  ) =>
    pipelineLabels[status] ??
    leadStatusLabel(status);

  const addNote = async () => {
    const content = note.trim();

    if (!content) {
      return;
    }

    try {
      await createActivity.mutateAsync({
        lead_id: lead.id,
        kind: "note",
        content,
      });

      setNote("");

      toast.success(
        "Note ajoutée",
      );
    } catch (error: any) {
      console.error(
        "Erreur ajout note :",
        error,
      );

      toast.error(
        error?.message ??
          "Impossible d'ajouter la note",
      );
    }
  };

  const handleStatusChange =
    async (
      newStatus: LeadStatus,
    ) => {
      const previousStatus =
        localStatus;

      if (
        previousStatus ===
        newStatus
      ) {
        return;
      }

      const previousLabel =
        getStatusLabel(
          previousStatus,
        );

      const newLabel =
        getStatusLabel(
          newStatus,
        );

      try {
        /*
         * 1. Mise à jour du statut
         */
        await updateLead.mutateAsync({
          id: lead.id,
          status: newStatus,
        });

        /*
         * Affichage immédiat dans
         * la fiche ouverte.
         */
        setLocalStatus(
          newStatus,
        );

        /*
         * 2. Journalisation automatique
         */
        try {
          await createActivity.mutateAsync({
            lead_id: lead.id,
            kind: "status_change",
            content:
              `Pipeline : ${previousLabel} → ${newLabel}`,
          });
        } catch (
          activityError: any
        ) {
          console.error(
            "Statut mis à jour mais historique non créé :",
            activityError,
          );

          toast.warning(
            "Le statut a été mis à jour, mais l'historique n'a pas pu être enregistré.",
          );

          return;
        }

        toast.success(
          `Prospect passé à « ${newLabel} »`,
        );
      } catch (error: any) {
        console.error(
          "Erreur changement de pipeline :",
          error,
        );

        toast.error(
          error?.message ??
            "Impossible de modifier le statut",
        );
      }
    };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={
          onOpenChange
        }
      >
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8">
              <div>
                <DialogTitle className="text-xl">
                  {lead.full_name}
                </DialogTitle>

                <DialogDescription>
                  Fiche prospect et
                  historique commercial
                </DialogDescription>
              </div>

              <Badge
                className={`${leadStatusColor(
                  localStatus,
                )} border-0`}
              >
                {leadStatusLabel(
                  localStatus,
                )}
              </Badge>
            </div>
          </DialogHeader>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <div className="premium-card p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {lead.email}
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {lead.phone || "—"}
                  </div>

                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    {leadSourceLabels[
                      lead.source
                    ] ?? lead.source}
                  </div>

                  <div className="flex items-center gap-2">
                    <WalletCards className="h-4 w-4 text-muted-foreground" />

                    {lead.budget_min ||
                    lead.budget_max
                      ? `${formatMoney(
                          lead.budget_min ??
                            0,
                        )} – ${formatMoney(
                          lead.budget_max ??
                            0,
                        )}`
                      : "Budget non renseigné"}
                  </div>
                </div>

                {lead.property && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">
                      Bien :
                    </span>{" "}

                    <strong>
                      {
                        lead.property
                          .title
                      }
                    </strong>
                  </p>
                )}

                {lead.search_criteria && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">
                      Recherche :
                    </span>{" "}

                    {
                      lead.search_criteria
                    }
                  </p>
                )}

                {lead.message && (
                  <p className="text-sm rounded-lg bg-muted/50 p-3 whitespace-pre-line">
                    {lead.message}
                  </p>
                )}
              </div>

              <div className="premium-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    Historique
                  </h3>

                  <span className="text-xs text-muted-foreground">
                    {
                      orderedActivities.length
                    }{" "}
                    activité(s)
                  </span>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) =>
                      setNote(
                        e.target.value,
                      )
                    }
                    placeholder="Ajouter une note commerciale…"
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        e.preventDefault();
                        addNote();
                      }
                    }}
                  />

                  <Button
                    onClick={
                      addNote
                    }
                    disabled={
                      !note.trim() ||
                      createActivity.isPending
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </div>

                <Separator />

                {orderedActivities.length ===
                0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Aucune activité
                    enregistrée.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orderedActivities.map(
                      (
                        activity,
                      ) => (
                        <div
                          key={
                            activity.id
                          }
                          className="border-l-2 border-primary/30 pl-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase"
                            >
                              {activity.kind ===
                              "status_change"
                                ? "Pipeline"
                                : activity.kind ===
                                    "visit"
                                  ? "Visite"
                                  : activity.kind}
                            </Badge>

                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(
                                activity.created_at,
                              )}
                            </span>
                          </div>

                          <p className="text-sm mt-1 whitespace-pre-line">
                            {
                              activity.content
                            }
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="premium-card p-4 space-y-3">
                <h3 className="font-semibold">
                  Pipeline
                </h3>

                <Select
                  value={
                    localStatus
                  }
                  onValueChange={(
                    value,
                  ) =>
                    handleStatusChange(
                      value as LeadStatus,
                    )
                  }
                  disabled={
                    updateLead.isPending ||
                    createActivity.isPending
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {leadPipeline.map(
                      (step) => (
                        <SelectItem
                          key={
                            step.value
                          }
                          value={
                            step.value
                          }
                        >
                          {
                            step.label
                          }
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() =>
                    setVisitOpen(
                      true,
                    )
                  }
                >
                  <CalendarClock className="h-4 w-4" />
                  Planifier une visite
                </Button>
              </div>

              <div className="premium-card p-4 space-y-3">
                <h3 className="font-semibold">
                  Visites
                </h3>

                {(visits ?? [])
                  .length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Aucune visite
                    planifiée.
                  </p>
                ) : (
                  (visits ?? [])
                    .slice(0, 5)
                    .map(
                      (visit) => (
                        <div
                          key={
                            visit.id
                          }
                          className="rounded-lg border p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium">
                              {formatDateTime(
                                visit.scheduled_at,
                              )}
                            </span>

                            <Badge
                              className={`${visitStatusConfig[
                                visit.status
                              ].color} border-0 text-[10px]`}
                            >
                              {
                                visitStatusConfig[
                                  visit.status
                                ].label
                              }
                            </Badge>
                          </div>

                          {visit.outcome && (
                            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
                              {
                                visit.outcome
                              }
                            </p>
                          )}
                        </div>
                      ),
                    )
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VisitFormDialog
        open={visitOpen}
        onOpenChange={
          setVisitOpen
        }
        leadId={lead.id}
        propertyId={
          lead.property_id ??
          undefined
        }
      />
    </>
  );
};

export default LeadDetailDialog;
