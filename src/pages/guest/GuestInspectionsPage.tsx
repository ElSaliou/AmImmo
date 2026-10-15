import {
  ArrowRight,
  CalendarDays,
  FileCheck2,
  FileText,
  RefreshCw,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import { Button } from "@/components/ui/button";

import {
  type GuestInspectionListItem,
  useGuestInspections,
} from "@/hooks/use-guest-inspections";


const kindLabels:
  Record<string, string> = {
    checkin:
      "État des lieux d'entrée",

    checkout:
      "État des lieux de sortie",
  };


const statusLabels:
  Record<string, string> = {
    draft:
      "Brouillon",

    ready_for_signature:
      "À signer",

    finalized:
      "Finalisé",

    cancelled:
      "Annulé",
  };


const formatDateTime = (
  value: string | null,
) => {

  if (!value) {
    return "Date non renseignée";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    },
  ).format(date);
};


const GuestInspectionCard = ({
  inspection,
}: {
  inspection:
    GuestInspectionListItem;
}) => {

  const reference =
    inspection.reference ||
    inspection.id;

  return (
    <Link
      to={`/guest/inspections/${inspection.id}`}
      className="group block rounded-2xl border bg-background p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 shrink-0 text-primary" />

            <h2 className="truncate font-semibold">
              {
                kindLabels[
                  inspection.kind
                ] ??
                inspection.kind
              }
            </h2>
          </div>

          <p className="mt-2 break-all text-xs text-muted-foreground">
            Référence :{" "}
            {reference}
          </p>
        </div>

        <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium">
          {
            statusLabels[
              inspection.status
            ] ??
            inspection.status
          }
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />

          {
            formatDateTime(
              inspection.performed_at,
            )
          }
        </span>

        <span>
          Version{" "}
          {inspection.version}
        </span>

        {
          inspection.final_document_id
            ? (
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4" />
                PDF final disponible
              </span>
            )
            : null
        }
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 text-sm font-medium text-primary">
        Consulter

        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
};


export default function GuestInspectionsPage() {

  const inspectionsQuery =
    useGuestInspections();

  if (inspectionsQuery.isLoading) {
    return (
      <div className="rounded-2xl border bg-background p-6 shadow-sm">
        Chargement de vos états des lieux...
      </div>
    );
  }

  if (inspectionsQuery.isError) {
    return (
      <div className="space-y-4 rounded-2xl border border-destructive/40 bg-background p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">
            Impossible de charger vos états des lieux
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {
              inspectionsQuery.error
                instanceof Error
                ? inspectionsQuery.error.message
                : "Une erreur inconnue est survenue."
            }
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void inspectionsQuery.refetch()
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  const inspections =
    inspectionsQuery.data ??
    [];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Mes états des lieux
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Consultez les états des lieux associés à vos séjours,
          signez ceux qui nécessitent votre validation et accédez
          aux documents finaux lorsqu'ils sont disponibles.
        </p>
      </section>

      {
        inspections.length === 0
          ? (
            <section className="rounded-2xl border bg-background p-8 text-center shadow-sm">
              <FileCheck2 className="mx-auto h-10 w-10 text-muted-foreground" />

              <h2 className="mt-4 text-lg font-semibold">
                Aucun état des lieux disponible
              </h2>

              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                Aucun état des lieux n'est actuellement associé
                à vos réservations accessibles.
              </p>
            </section>
          )
          : (
            <section className="grid gap-4">
              {
                inspections.map(
                  (inspection) => (
                    <GuestInspectionCard
                      key={inspection.id}
                      inspection={inspection}
                    />
                  ),
                )
              }
            </section>
          )
      }
    </div>
  );
}