import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  ShieldCheck,
  Sparkles,
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


const RecentInspection = ({
  inspection,
}: {
  inspection:
    GuestInspectionListItem;
}) => {
  const pending =
    inspection.status ===
    "ready_for_signature";

  return (
    <Link
      to={`/guest/inspections/${inspection.id}`}
      className="group flex flex-col gap-4 rounded-2xl border bg-background p-5 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-4">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            pending
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700",
          ].join(" ")}
        >
          {pending ? (
            <Clock3 className="h-5 w-5" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0">
          <p className="font-semibold">
            {
              kindLabels[
                inspection.kind
              ] ??
              inspection.kind
            }
          </p>

          <p className="mt-1 truncate text-xs text-muted-foreground">
            {inspection.reference ??
              inspection.id}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            {formatDateTime(
              inspection.performed_at,
            )}
            {" · "}
            Version{" "}
            {inspection.version}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            pending
              ? "bg-amber-100 text-amber-800"
              : inspection.status ===
                  "finalized"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {pending
            ? "Signature requise"
            : inspection.status ===
                "finalized"
              ? "Finalisé"
              : inspection.status}
        </span>

        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </Link>
  );
};


const GuestHomePage = () => {
  const inspectionsQuery =
    useGuestInspections();

  const inspections =
    inspectionsQuery.data ??
    [];

  const pendingInspections =
    inspections.filter(
      (inspection) =>
        inspection.status ===
        "ready_for_signature",
    );

  const finalizedInspections =
    inspections.filter(
      (inspection) =>
        inspection.status ===
        "finalized",
    );

  const finalDocuments =
    inspections.filter(
      (inspection) =>
        Boolean(
          inspection.final_document_id,
        ),
    );

  const nextAction =
    pendingInspections[0] ??
    null;

  const recentInspections =
    inspections.slice(
      0,
      3,
    );

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-10">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-primary-foreground/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm font-medium ring-1 ring-primary-foreground/15">
            <Sparkles className="h-4 w-4 text-secondary" />
            Votre séjour, simplement
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl min-[900px]:whitespace-nowrap lg:text-[2.65rem]">
            Bienvenue dans votre espace voyageur
          </h1>

          <p className="mt-4 text-sm leading-7 text-primary-foreground/80 sm:text-base min-[900px]:whitespace-nowrap">
            Retrouvez vos états des lieux, les signatures en attente
            et vos documents définitifs dans un espace unique et sécurisé.
          </p>

          {nextAction ? (
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mt-7 rounded-xl shadow-lg"
            >
              <Link
                to={`/guest/inspections/${nextAction.id}`}
              >
                <FileCheck2 className="mr-2 h-5 w-5" />
                Signer mon état des lieux
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mt-7 rounded-xl shadow-lg"
            >
              <Link to="/guest/inspections">
                Voir mes états des lieux
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Clock3 className="h-6 w-6" />
            </div>

            <span className="text-3xl font-bold tracking-tight">
              {pendingInspections.length}
            </span>
          </div>

          <p className="mt-5 font-semibold">
            À signer
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            État(s) des lieux nécessitant votre validation.
          </p>
        </article>

        <article className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <span className="text-3xl font-bold tracking-tight">
              {finalizedInspections.length}
            </span>
          </div>

          <p className="mt-5 font-semibold">
            Finalisés
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Documents validés et verrouillés.
          </p>
        </article>

        <article className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>

            <span className="text-3xl font-bold tracking-tight">
              {finalDocuments.length}
            </span>
          </div>

          <p className="mt-5 font-semibold">
            PDF disponibles
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Documents définitifs accessibles dans votre espace.
          </p>
        </article>
      </section>

      {nextAction ? (
        <section className="overflow-hidden rounded-3xl border border-amber-200 bg-amber-50 shadow-sm">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                <FileCheck2 className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                  Action requise
                </p>

                <h2 className="mt-2 font-display text-2xl font-bold text-amber-950">
                  Votre état des lieux est prêt à être signé
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900/80">
                  L'agence a terminé sa validation. Consultez le contenu
                  et signez la version{" "}
                  <strong>
                    {nextAction.version}
                  </strong>{" "}
                  pour permettre la finalisation du dossier.
                </p>
              </div>
            </div>

            <Button
              asChild
              size="lg"
              className="rounded-xl"
            >
              <Link
                to={`/guest/inspections/${nextAction.id}`}
              >
                Consulter et signer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h2 className="font-display text-xl font-bold">
                Tout est à jour
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Vous n'avez actuellement aucun état des lieux en attente de signature.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Documents
              </p>

              <h2 className="mt-2 font-display text-2xl font-bold">
                Mes derniers états des lieux
              </h2>
            </div>

            <Button
              asChild
              variant="ghost"
              className="rounded-xl"
            >
              <Link to="/guest/inspections">
                Tout voir
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {inspectionsQuery.isLoading ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Chargement de vos états des lieux...
              </div>
            ) : recentInspections.length ===
              0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Aucun état des lieux n'est encore disponible.
              </div>
            ) : (
              recentInspections.map(
                (inspection) => (
                  <RecentInspection
                    key={
                      inspection.id
                    }
                    inspection={
                      inspection
                    }
                  />
                ),
              )
            )}
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Parcours de sortie
          </p>

          <h2 className="mt-2 font-display text-2xl font-bold">
            Comment ça fonctionne ?
          </h2>

          <div className="mt-6 space-y-5">
            {[
              [
                "1",
                "Validation agence",
                "L'agence vérifie et signe l'état des lieux.",
              ],
              [
                "2",
                "Votre signature",
                "Vous recevez l'état des lieux et le signez en ligne.",
              ],
              [
                "3",
                "Document final",
                "Le PDF définitif est verrouillé et archivé.",
              ],
              [
                "4",
                "Traitement de la caution",
                "La caution peut ensuite être restituée ou partiellement retenue selon les constats.",
              ],
            ].map(
              ([
                step,
                title,
                description,
              ]) => (
                <div
                  key={step}
                  className="flex gap-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {step}
                  </div>

                  <div>
                    <p className="font-semibold">
                      {title}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    </div>
  );
};


export default GuestHomePage;

