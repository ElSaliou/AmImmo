import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  RefreshCw,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  type GuestInspectionListItem,
  useGuestInspections,
} from "@/hooks/use-guest-inspections";

import { cn } from "@/lib/utils";


type InspectionFilter =
  | "all"
  | "pending"
  | "finalized";


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
  const pending =
    inspection.status ===
    "ready_for_signature";

  const finalized =
    inspection.status ===
    "finalized";

  const reference =
    inspection.reference ||
    inspection.id;

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-3xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        pending &&
          "border-amber-200",
      )}
    >
      <div
        className={cn(
          "h-1 w-full",
          pending
            ? "bg-amber-500"
            : finalized
              ? "bg-emerald-500"
              : "bg-muted",
        )}
      />

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                pending
                  ? "bg-amber-100 text-amber-700"
                  : finalized
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-primary/10 text-primary",
              )}
            >
              {pending ? (
                <Clock3 className="h-6 w-6" />
              ) : finalized ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <FileCheck2 className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold">
                  {
                    kindLabels[
                      inspection.kind
                    ] ??
                    inspection.kind
                  }
                </h2>

                <Badge
                  variant="outline"
                  className={cn(
                    pending &&
                      "border-amber-300 bg-amber-50 text-amber-800",
                    finalized &&
                      "border-emerald-300 bg-emerald-50 text-emerald-800",
                  )}
                >
                  {
                    statusLabels[
                      inspection.status
                    ] ??
                    inspection.status
                  }
                </Badge>
              </div>

              <p className="mt-2 break-all text-xs font-medium text-muted-foreground">
                Référence :{" "}
                {reference}
              </p>

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
                      <span className="inline-flex items-center gap-2 font-medium text-emerald-700">
                        <FileText className="h-4 w-4" />
                        PDF final disponible
                      </span>
                    )
                    : null
                }
              </div>
            </div>
          </div>

          <Button
            asChild
            variant={
              pending
                ? "default"
                : "outline"
            }
            className="shrink-0 rounded-xl"
          >
            <Link
              to={`/guest/inspections/${inspection.id}`}
            >
              {pending
                ? "Consulter et signer"
                : "Consulter"}

              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>

        {pending ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              Votre signature est requise
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-900/80">
              L'agence a terminé sa validation. Consultez attentivement
              le document avant de signer la version actuelle.
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
};


export default function GuestInspectionsPage() {
  const inspectionsQuery =
    useGuestInspections();

  const [
    filter,
    setFilter,
  ] =
    useState<InspectionFilter>(
      "all",
    );

  const inspections =
    inspectionsQuery.data ??
    [];

  const pendingCount =
    inspections.filter(
      (inspection) =>
        inspection.status ===
        "ready_for_signature",
    ).length;

  const finalizedCount =
    inspections.filter(
      (inspection) =>
        inspection.status ===
        "finalized",
    ).length;

  const filteredInspections =
    useMemo(
      () =>
        inspections.filter(
          (inspection) => {
            if (
              filter ===
              "pending"
            ) {
              return (
                inspection.status ===
                "ready_for_signature"
              );
            }

            if (
              filter ===
              "finalized"
            ) {
              return (
                inspection.status ===
                "finalized"
              );
            }

            return true;
          },
        ),
      [
        inspections,
        filter,
      ],
    );

  if (
    inspectionsQuery.isLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <p className="mt-4 text-sm text-muted-foreground">
            Chargement de vos états des lieux...
          </p>
        </div>
      </div>
    );
  }

  if (
    inspectionsQuery.isError
  ) {
    return (
      <div className="space-y-4 rounded-3xl border border-destructive/30 bg-card p-6 shadow-sm">
        <div>
          <h1 className="font-display text-xl font-bold">
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
          className="rounded-xl"
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-9">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm font-medium ring-1 ring-primary-foreground/15">
            <FileCheck2 className="h-4 w-4 text-secondary" />
            Documents de séjour
          </div>

          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Mes états des lieux
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-primary-foreground/80 sm:text-base">
            Consultez vos documents, signez les versions en attente
            et retrouvez vos PDF définitifs.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() =>
            setFilter(
              "all",
            )
          }
          className={cn(
            "rounded-3xl border bg-card p-5 text-left shadow-sm transition hover:border-primary/25",
            filter ===
              "all" &&
              "border-primary ring-1 ring-primary/10",
          )}
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Tous
          </p>

          <p className="mt-3 text-3xl font-bold">
            {inspections.length}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            États des lieux
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter(
              "pending",
            )
          }
          className={cn(
            "rounded-3xl border bg-card p-5 text-left shadow-sm transition hover:border-amber-300",
            filter ===
              "pending" &&
              "border-amber-400 ring-1 ring-amber-200",
          )}
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
            Action requise
          </p>

          <p className="mt-3 text-3xl font-bold">
            {pendingCount}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            À signer
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter(
              "finalized",
            )
          }
          className={cn(
            "rounded-3xl border bg-card p-5 text-left shadow-sm transition hover:border-emerald-300",
            filter ===
              "finalized" &&
              "border-emerald-400 ring-1 ring-emerald-200",
          )}
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            Terminés
          </p>

          <p className="mt-3 text-3xl font-bold">
            {finalizedCount}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Finalisés
          </p>
        </button>
      </section>

      {
        filteredInspections.length ===
        0
          ? (
            <section className="rounded-3xl border bg-card p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <FileCheck2 className="h-7 w-7 text-muted-foreground" />
              </div>

              <h2 className="mt-5 font-display text-xl font-bold">
                Aucun état des lieux dans cette catégorie
              </h2>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Les états des lieux associés à vos réservations
                apparaîtront automatiquement ici.
              </p>
            </section>
          )
          : (
            <section className="grid gap-4">
              {
                filteredInspections.map(
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
