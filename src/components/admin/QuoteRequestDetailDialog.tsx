import {
  useEffect,
  useState,
} from "react";

import {
  Building2,
  Clock3,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  Save,
  Send,
  UserPlus,
  UserRound,
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useAnswerQuoteRequest,
  useLinkQuoteRequestToLead,
  useQuoteRequest,
  useUpdateQuoteRequestNotes,
  useUpdateQuoteRequestStatus,
  type QuoteRequestWithRelations,
} from "@/hooks/use-quote-requests";

import {
  useCreateLead,
} from "@/hooks/use-leads";

import type {
  QuoteRequestStatus,
} from "@/types/real-estate";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteRequest:
    | QuoteRequestWithRelations
    | null;
}

const statusLabels: Record<
  QuoteRequestStatus,
  string
> = {
  new: "Nouvelle",
  in_progress: "En cours",
  answered: "Répondue",
  closed: "Clôturée",
  cancelled: "Annulée",
};

const statusClasses: Record<
  QuoteRequestStatus,
  string
> = {
  new:
    "bg-primary/15 text-primary",

  in_progress:
    "bg-warning/15 text-warning",

  answered:
    "bg-success/15 text-success",

  closed:
    "bg-muted text-muted-foreground",

  cancelled:
    "bg-destructive/15 text-destructive",
};

const formatDateTime = (
  value: string | null,
) => {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
};

const QuoteRequestDetailDialog = ({
  open,
  onOpenChange,
  quoteRequest,
}: Props) => {
  const {
    data: liveQuoteRequest,
  } = useQuoteRequest(
    quoteRequest?.id,
  );

  const currentQuoteRequest =
    liveQuoteRequest ??
    quoteRequest;

  const updateStatus =
    useUpdateQuoteRequestStatus();

  const updateNotes =
    useUpdateQuoteRequestNotes();

  const answerRequest =
    useAnswerQuoteRequest();

  const createLead =
    useCreateLead();

  const linkQuoteToLead =
    useLinkQuoteRequestToLead();

  const [
    internalNotes,
    setInternalNotes,
  ] = useState("");

  const [
    agencyResponse,
    setAgencyResponse,
  ] = useState("");

  useEffect(() => {
    if (
      !open ||
      !currentQuoteRequest
    ) {
      return;
    }

    setInternalNotes(
      currentQuoteRequest.internal_notes ??
        "",
    );

    setAgencyResponse(
      currentQuoteRequest.agency_response ??
        "",
    );
  }, [
    open,
    currentQuoteRequest,
  ]);

  if (!currentQuoteRequest) {
    return null;
  }

  const isPending =
    updateStatus.isPending ||
    updateNotes.isPending ||
    answerRequest.isPending ||
    createLead.isPending ||
    linkQuoteToLead.isPending;

  const handleStatusChange =
    async (
      value: string,
    ) => {
      const status =
        value as QuoteRequestStatus;

      if (
        status ===
        "answered"
      ) {
        return;
      }

      try {
        await updateStatus.mutateAsync({
          id: currentQuoteRequest.id,
          status,
        });

        toast.success(
          "Statut de la demande mis à jour.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de modifier le statut.",
        );
      }
    };

  const handleSaveNotes =
    async () => {
      try {
        await updateNotes.mutateAsync({
          id: currentQuoteRequest.id,
          internalNotes,
        });

        toast.success(
          "Notes internes enregistrées.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer les notes.",
        );
      }
    };

  const handleAnswer =
    async () => {
      try {
        await answerRequest.mutateAsync({
          id: currentQuoteRequest.id,
          response:
            agencyResponse,
        });

        toast.success(
          "Réponse agence enregistrée.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer la réponse.",
        );
      }
    };

  const handleConvertToLead =
    async () => {
      if (
        currentQuoteRequest.lead_id ||
        currentQuoteRequest.lead
      ) {
        toast.error(
          "Cette demande est déjà rattachée à un prospect CRM.",
        );

        return;
      }

      try {
        const lead =
          await createLead.mutateAsync({
            full_name:
              currentQuoteRequest.customer_name,

            email:
              currentQuoteRequest.customer_email,

            phone:
              currentQuoteRequest.customer_phone,

            message:
              currentQuoteRequest.message,

            source:
              "service_quote",

            status:
              "new",

            property_id:
              currentQuoteRequest.property_id,
          });

        try {
          await linkQuoteToLead.mutateAsync({
            quoteRequestId:
              currentQuoteRequest.id,

            leadId:
              lead.id,
          });
        } catch (linkError) {
          console.error(
            "[QuoteRequestDetailDialog] Lead créé mais rattachement du devis échoué :",
            linkError,
          );

          toast.error(
            "Le prospect CRM a été créé, mais le rattachement automatique à la demande a échoué. Aucun second prospect ne doit être créé.",
          );

          return;
        }

        toast.success(
          "Prospect CRM créé et rattaché à la demande.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de créer le prospect CRM.",
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle>
                Demande de devis
              </DialogTitle>

              <DialogDescription>
                Consultation, traitement et réponse de l'agence.
              </DialogDescription>
            </div>

            <Badge
              className={
                statusClasses[
                  currentQuoteRequest.status
                ]
              }
            >
              {
                statusLabels[
                  currentQuoteRequest.status
                ]
              }
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <section className="grid gap-4 rounded-xl border p-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />

                <div>
                  <p className="text-xs text-muted-foreground">
                    Client
                  </p>

                  <p className="font-medium">
                    {
                      currentQuoteRequest.customer_name
                    }
                  </p>
                </div>
              </div>

              {currentQuoteRequest.customer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />

                  <a
                    href={`mailto:${currentQuoteRequest.customer_email}`}
                    className="text-sm hover:underline"
                  >
                    {
                      currentQuoteRequest.customer_email
                    }
                  </a>
                </div>
              )}

              {currentQuoteRequest.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />

                  <a
                    href={`tel:${currentQuoteRequest.customer_phone}`}
                    className="text-sm hover:underline"
                  >
                    {
                      currentQuoteRequest.customer_phone
                    }
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MessageSquareText className="mt-0.5 h-4 w-4 text-muted-foreground" />

                <div>
                  <p className="text-xs text-muted-foreground">
                    Prestation
                  </p>

                  <p className="font-medium">
                    {currentQuoteRequest.service
                      ?.title ??
                      "Non précisée"}
                  </p>
                </div>
              </div>

              {currentQuoteRequest.property && (
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Bien associé
                    </p>

                    <p className="text-sm">
                      {
                        currentQuoteRequest.property
                          .title
                      }
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />

                <div>
                  <p className="text-xs text-muted-foreground">
                    Reçue le
                  </p>

                  <p className="text-sm">
                    {formatDateTime(
                      currentQuoteRequest.created_at,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold">
              Objet
            </p>

            <p className="rounded-lg bg-muted/50 p-3 text-sm">
              {currentQuoteRequest.subject ||
                "Demande de devis"}
            </p>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold">
              Message du client
            </p>

            <div className="whitespace-pre-wrap rounded-lg border p-4 text-sm">
              {
                currentQuoteRequest.message
              }
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div>
              <Label>
                Statut
              </Label>

              <p className="mt-1 text-xs text-muted-foreground">
                Le statut « Répondue » est appliqué automatiquement lors de l'enregistrement d'une réponse agence.
              </p>
            </div>

            <Select
              value={
                currentQuoteRequest.status
              }
              onValueChange={
                handleStatusChange
              }
              disabled={isPending}
            >
              <SelectTrigger className="md:w-64">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="new">
                  Nouvelle
                </SelectItem>

                <SelectItem value="in_progress">
                  En cours
                </SelectItem>

                <SelectItem
                  value="answered"
                  disabled
                >
                  Répondue
                </SelectItem>

                <SelectItem value="closed">
                  Clôturée
                </SelectItem>

                <SelectItem value="cancelled">
                  Annulée
                </SelectItem>
              </SelectContent>
            </Select>
          </section>

          <Separator />

          <section className="space-y-3">
            <div>
              <Label htmlFor="quote-internal-notes">
                Notes internes
              </Label>

              <p className="mt-1 text-xs text-muted-foreground">
                Ces informations restent réservées à l'agence.
              </p>
            </div>

            <Textarea
              id="quote-internal-notes"
              rows={4}
              value={
                internalNotes
              }
              onChange={(event) =>
                setInternalNotes(
                  event.target.value,
                )
              }
              placeholder="Ajouter des informations de suivi..."
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={
                  handleSaveNotes
                }
              >
                {updateNotes.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                Enregistrer les notes
              </Button>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div>
              <Label htmlFor="quote-agency-response">
                Réponse de l'agence
              </Label>

              <p className="mt-1 text-xs text-muted-foreground">
                L'enregistrement de cette réponse passe automatiquement la demande au statut « Répondue ».
              </p>
            </div>

            <Textarea
              id="quote-agency-response"
              rows={6}
              value={
                agencyResponse
              }
              onChange={(event) =>
                setAgencyResponse(
                  event.target.value,
                )
              }
              placeholder="Rédiger la réponse commerciale..."
            />

            {currentQuoteRequest.responded_at && (
              <p className="text-xs text-muted-foreground">
                Dernière réponse enregistrée le{" "}
                {formatDateTime(
                  currentQuoteRequest.responded_at,
                )}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={
                  isPending ||
                  !agencyResponse.trim()
                }
                onClick={
                  handleAnswer
                }
              >
                {answerRequest.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}

                Enregistrer la réponse
              </Button>
            </div>
          </section>

          <Separator />

                    <section className="rounded-xl border p-4">
            <p className="text-sm font-semibold">
              CRM
            </p>

            {currentQuoteRequest.lead ? (
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {
                      currentQuoteRequest.lead
                        .full_name
                    }
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Prospect CRM rattaché
                  </p>

                  {currentQuoteRequest.lead.email && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {
                        currentQuoteRequest.lead
                          .email
                      }
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {
                      currentQuoteRequest.lead
                        .status
                    }
                  </Badge>

                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Aucun prospect CRM n'est encore rattaché à cette demande.
                  Créez le prospect uniquement après qualification commerciale.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={
                    handleConvertToLead
                  }
                >
                  {createLead.isPending ||
                  linkQuoteToLead.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}

                  Créer le prospect CRM
                </Button>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteRequestDetailDialog;