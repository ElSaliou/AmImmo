import {
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Home,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Wrench,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import {
  toast,
} from "sonner";

import {
  Button,
} from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  type TenantMaintenancePriority,
  type TenantMaintenanceStatus,
  type TenantPortalMaintenanceRequest,
  useCreateTenantMaintenanceRequest,
  useTenantPortalDashboard,
  useTenantPortalMaintenanceRequests,
} from "@/hooks/use-tenant-portal";

// ============================================================
// HELPERS
// ============================================================

const formatDate = (
  value: string | null,
) => {
  if (!value) {
    return "—";
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
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const getPriorityLabel = (
  priority:
    TenantMaintenancePriority,
) => {
  switch (
    priority
  ) {
    case "low":
      return "Basse";

    case "medium":
      return "Moyenne";

    case "high":
      return "Haute";

    case "urgent":
      return "Urgente";

    default:
      return priority;
  }
};

const getStatusLabel = (
  status:
    TenantMaintenanceStatus,
) => {
  switch (
    status
  ) {
    case "open":
      return "Ouverte";

    case "in_progress":
      return "En cours";

    case "resolved":
      return "Résolue";

    case "closed":
      return "Fermée";

    default:
      return status;
  }
};

// ============================================================
// BADGES
// ============================================================

const PriorityBadge = ({
  priority,
}: {
  priority:
    TenantMaintenancePriority;
}) => {
  const className =
    priority ===
    "urgent"
      ? "border-red-200 bg-red-50 text-red-700"
      : priority ===
          "high"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : priority ===
            "medium"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {getPriorityLabel(
        priority,
      )}
    </span>
  );
};

const StatusBadge = ({
  status,
}: {
  status:
    TenantMaintenanceStatus;
}) => {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold";

  switch (
    status
  ) {
    case "resolved":
      return (
        <span
          className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          Résolue
        </span>
      );

    case "closed":
      return (
        <span
          className={`${base} border-slate-200 bg-slate-100 text-slate-600`}
        >
          Fermée
        </span>
      );

    case "in_progress":
      return (
        <span
          className={`${base} border-amber-200 bg-amber-50 text-amber-700`}
        >
          <Clock3 className="h-3.5 w-3.5" />
          En cours
        </span>
      );

    default:
      return (
        <span
          className={`${base} border-blue-200 bg-blue-50 text-blue-700`}
        >
          <Wrench className="h-3.5 w-3.5" />
          Ouverte
        </span>
      );
  }
};

// ============================================================
// REQUEST CARD
// ============================================================

const MaintenanceCard = ({
  request,
}: {
  request:
    TenantPortalMaintenanceRequest;
}) => (
  <motion.article
    initial={{
      opacity: 0,
      y: 18,
    }}
    animate={{
      opacity: 1,
      y: 0,
    }}
    className="overflow-hidden rounded-3xl border bg-card shadow-sm"
  >
    <div className="border-b bg-gradient-to-r from-primary/5 via-background to-secondary/5 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={
                request.status
              }
            />

            <PriorityBadge
              priority={
                request.priority
              }
            />
          </div>

          <h2 className="mt-4 font-display text-xl font-bold text-foreground">
            {request.title}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-4 w-4" />

          {formatDate(
            request.createdAt,
          )}
        </div>
      </div>
    </div>

    <div className="space-y-5 p-5 sm:p-6">
      {request.description ? (
        <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
          {request.description}
        </p>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Aucune description.
        </p>
      )}

      <div className="rounded-2xl bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <Home className="h-5 w-5 shrink-0 text-primary" />

          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              Demande rattachée au logement
            </p>

            <p className="mt-0.5 truncate text-sm font-medium">
              Référence technique :{" "}
              {request.propertyId}
            </p>
          </div>
        </div>
      </div>
    </div>
  </motion.article>
);

// ============================================================
// FORM STATE
// ============================================================

const initialForm = {
  title:
    "",

  description:
    "",

  priority:
    "medium" as
      TenantMaintenancePriority,
};

// ============================================================
// PAGE
// ============================================================

const TenantMaintenancePage =
  () => {
    const {
      data:
        requests = [],
      isLoading,
      isError,
      error,
      refetch,
    } =
      useTenantPortalMaintenanceRequests();

    const {
      data:
        dashboard,
    } =
      useTenantPortalDashboard();

    const createRequest =
      useCreateTenantMaintenanceRequest();

    const [
      dialogOpen,
      setDialogOpen,
    ] =
      useState(false);

    const [
      form,
      setForm,
    ] =
      useState(
        initialForm,
      );

    const activeProperty =
      dashboard
        ?.activeLease
        ?.property;

    const openCount =
      requests.filter(
        (
          request,
        ) =>
          request.status ===
            "open" ||
          request.status ===
            "in_progress",
      ).length;

    const resolvedCount =
      requests.filter(
        (
          request,
        ) =>
          request.status ===
            "resolved" ||
          request.status ===
            "closed",
      ).length;

    const urgentCount =
      requests.filter(
        (
          request,
        ) =>
          request.priority ===
            "urgent" &&
          request.status !==
            "resolved" &&
          request.status !==
            "closed",
      ).length;

    const handleSubmit =
      async (
        event:
          React.FormEvent,
      ) => {
        event.preventDefault();

        try {
          await createRequest.mutateAsync({
            title:
              form.title,

            description:
              form.description,

            priority:
              form.priority,
          });

          toast.success(
            "Votre demande de maintenance a été créée.",
          );

          setForm(
            initialForm,
          );

          setDialogOpen(
            false,
          );
        } catch (
          submitError:
            unknown
        ) {
          toast.error(
            submitError instanceof
              Error
              ? submitError.message
              : "Impossible de créer la demande.",
          );
        }
      };

    if (isLoading) {
      return (
        <div className="container flex min-h-[520px] items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

            <p className="mt-4 text-sm text-muted-foreground">
              Chargement de vos demandes...
            </p>
          </div>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="container py-12">
          <div className="rounded-3xl border border-destructive/20 bg-card p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-destructive">
              Impossible de charger vos demandes
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof
              Error
                ? error.message
                : "Une erreur est survenue."}
            </p>

            <Button
              variant="outline"
              className="mt-5 rounded-xl"
              onClick={() => {
                void refetch();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="container space-y-8 py-8 sm:py-10">
          <Button
            asChild
            variant="ghost"
            className="-ml-3"
          >
            <Link to="/tenant">
              <ArrowLeft className="h-4 w-4" />
              Tableau de bord
            </Link>
          </Button>

          {/* HERO */}

          <section className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm ring-1 ring-primary-foreground/15">
                  <Wrench className="h-4 w-4 text-secondary" />
                  Assistance logement
                </div>

                <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
                  Maintenance
                </h1>

                <p className="mt-3 max-w-2xl text-primary-foreground/75">
                  Signalez un problème dans votre logement et
                  suivez l'avancement de vos demandes.
                </p>
              </div>

              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="rounded-xl shadow-lg"
                onClick={() =>
                  setDialogOpen(
                    true,
                  )
                }
              >
                <Plus className="h-5 w-5" />
                Nouvelle demande
              </Button>
            </div>
          </section>

          {/* KPI */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Total
              </p>

              <p className="mt-2 text-3xl font-bold">
                {requests.length}
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                Demandes enregistrées
              </p>
            </div>

            <div className="rounded-3xl border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">
                En cours
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-700">
                {openCount}
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                Ouvertes ou en traitement
              </p>
            </div>

            <div className="rounded-3xl border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Résolues
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {resolvedCount}
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                Terminées ou fermées
              </p>
            </div>

            <div className="rounded-3xl border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Urgentes
              </p>

              <p className="mt-2 text-3xl font-bold text-red-700">
                {urgentCount}
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                Encore actives
              </p>
            </div>
          </section>

          {/* PROPERTY */}

          <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Home className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Logement concerné
                </p>

                <p className="mt-1 font-display text-lg font-bold">
                  {activeProperty
                    ?.title ??
                    "Logement du bail actif"}
                </p>

                {activeProperty
                  ?.reference && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {
                      activeProperty.reference
                    }
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* REQUESTS */}

          {requests.length ===
          0 ? (
            <section className="rounded-3xl border bg-card p-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
                <Wrench className="h-8 w-8 text-muted-foreground" />
              </div>

              <h2 className="mt-5 font-display text-xl font-bold">
                Aucune demande de maintenance
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                Si vous constatez un problème dans votre logement,
                créez une demande. Elle sera automatiquement rattachée
                à votre bail actif.
              </p>

              <Button
                type="button"
                className="mt-6 rounded-xl"
                onClick={() =>
                  setDialogOpen(
                    true,
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Créer ma première demande
              </Button>
            </section>
          ) : (
            <section className="space-y-4">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  Mes demandes
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Suivez le traitement des problèmes signalés.
                </p>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                {requests.map(
                  (
                    request,
                  ) => (
                    <MaintenanceCard
                      key={
                        request.id
                      }
                      request={
                        request
                      }
                    />
                  ),
                )}
              </div>
            </section>
          )}
        </div>

        {/* CREATE DIALOG */}

        <Dialog
          open={
            dialogOpen
          }
          onOpenChange={
            (
              open,
            ) => {
              if (
                !createRequest.isPending
              ) {
                setDialogOpen(
                  open,
                );
              }
            }
          }
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Nouvelle demande de maintenance
              </DialogTitle>

              <DialogDescription>
                Décrivez le problème rencontré. La demande sera
                automatiquement rattachée à votre logement actuel.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5"
            >
              <div className="rounded-2xl border bg-muted/40 p-4">
                <div className="flex items-start gap-3">
                  <Home className="mt-0.5 h-5 w-5 text-primary" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Logement
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {activeProperty
                        ?.title ??
                        "Logement associé au bail actif"}
                    </p>

                    {activeProperty
                      ?.reference && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {
                          activeProperty.reference
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance-title">
                  Titre du problème
                </Label>

                <Input
                  id="maintenance-title"
                  value={
                    form.title
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        title:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Ex. Fuite d'eau dans la salle de bain"
                  maxLength={
                    150
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Priorité
                </Label>

                <Select
                  value={
                    form.priority
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        priority:
                          value as
                            TenantMaintenancePriority,
                      }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="low">
                      Basse
                    </SelectItem>

                    <SelectItem value="medium">
                      Moyenne
                    </SelectItem>

                    <SelectItem value="high">
                      Haute
                    </SelectItem>

                    <SelectItem value="urgent">
                      Urgente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance-description">
                  Description
                </Label>

                <Textarea
                  id="maintenance-description"
                  value={
                    form.description
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        description:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Décrivez le problème, son emplacement et depuis quand vous l'avez constaté."
                  rows={
                    6
                  }
                  maxLength={
                    1500
                  }
                  required
                />

                <p className="text-right text-xs text-muted-foreground">
                  {
                    form
                      .description
                      .length
                  }
                  /1500
                </p>
              </div>

              {form.priority ===
                "urgent" && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

                  <p className="text-sm leading-6">
                    Utilisez la priorité urgente uniquement lorsqu'une
                    intervention rapide est réellement nécessaire.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    createRequest.isPending
                  }
                  onClick={() =>
                    setDialogOpen(
                      false,
                    )
                  }
                >
                  Annuler
                </Button>

                <Button
                  type="submit"
                  disabled={
                    createRequest.isPending
                  }
                >
                  {createRequest.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Envoyer la demande
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  };

export default TenantMaintenancePage;