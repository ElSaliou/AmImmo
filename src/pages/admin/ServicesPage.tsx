import {
  useMemo,
  useState,
} from "react";

import {
  Archive,
  CircleDollarSign,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Wrench,
} from "lucide-react";

import { toast } from "sonner";

import PageShell from "@/components/PageShell";
import EmptyState from "@/components/admin/EmptyState";
import TableSkeleton from "@/components/admin/TableSkeleton";
import ServiceFormDialog from "@/components/admin/ServiceFormDialog";

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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useArchiveService,
  usePublishService,
  useServices,
  useUnpublishService,
  type ServiceWithCategory,
} from "@/hooks/use-services";

import type {
  Service,
  ServiceStatus,
} from "@/types/real-estate";

const statusLabels: Record<
  ServiceStatus,
  string
> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

const statusClasses: Record<
  ServiceStatus,
  string
> = {
  draft:
    "bg-muted text-muted-foreground",

  published:
    "bg-success/15 text-success",

  archived:
    "bg-warning/15 text-warning",
};

const pricingLabels = {
  quote: "Sur devis",
  fixed: "Prix fixe",
  starting_from: "À partir de",
  free: "Gratuit",
} as const;

const formatPrice = (
  service: ServiceWithCategory,
) => {
  if (
    service.pricing_mode ===
    "quote"
  ) {
    return "Sur devis";
  }

  if (
    service.pricing_mode ===
    "free"
  ) {
    return "Gratuit";
  }

  if (
    service.starting_price ==
    null
  ) {
    return "—";
  }

  const formatted =
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits: 2,
      },
    ).format(
      Number(
        service.starting_price,
      ),
    );

  if (
    service.pricing_mode ===
    "starting_from"
  ) {
    return `À partir de ${formatted} ${service.currency}`;
  }

  return `${formatted} ${service.currency}`;
};

const ServicesPage = () => {
  const {
    data: services = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useServices();

  const publishService =
    usePublishService();

  const unpublishService =
    useUnpublishService();

  const archiveService =
    useArchiveService();

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [
    editingService,
    setEditingService,
  ] =
    useState<Service | null>(
      null,
    );

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      ServiceStatus | "__all__"
    >("__all__");

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return services.filter(
        (service) => {
          if (
            statusFilter !==
              "__all__" &&
            service.status !==
              statusFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            service.title,
            service.slug,
            service.short_description,
            service.category?.name,
          ].some((value) =>
            String(
              value ?? "",
            )
              .toLowerCase()
              .includes(query),
          );
        },
      );
    }, [
      services,
      search,
      statusFilter,
    ]);

  const publishedCount =
    services.filter(
      (service) =>
        service.status ===
        "published",
    ).length;

  const draftCount =
    services.filter(
      (service) =>
        service.status ===
        "draft",
    ).length;

  const handleCreate = () => {
    setEditingService(null);
    setDialogOpen(true);
  };

  const handleEdit = (
    service: ServiceWithCategory,
  ) => {
    setEditingService(
      service as Service,
    );

    setDialogOpen(true);
  };

  const handlePublish = async (
    service: ServiceWithCategory,
  ) => {
    try {
      await publishService.mutateAsync(
        service.id,
      );

      toast.success(
        `"${service.title}" est maintenant publiée.`,
      );
    } catch (publishError) {
      toast.error(
        publishError instanceof Error
          ? publishError.message
          : "Publication impossible.",
      );
    }
  };

  const handleUnpublish = async (
    service: ServiceWithCategory,
  ) => {
    try {
      await unpublishService.mutateAsync(
        service.id,
      );

      toast.success(
        `"${service.title}" est repassée en brouillon.`,
      );
    } catch (unpublishError) {
      toast.error(
        unpublishError instanceof Error
          ? unpublishError.message
          : "Dépublication impossible.",
      );
    }
  };

  const handleArchive = async (
    service: ServiceWithCategory,
  ) => {
    const confirmed =
      window.confirm(
        `Archiver la prestation "${service.title}" ?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await archiveService.mutateAsync(
        service.id,
      );

      toast.success(
        `"${service.title}" a été archivée.`,
      );
    } catch (archiveError) {
      toast.error(
        archiveError instanceof Error
          ? archiveError.message
          : "Archivage impossible.",
      );
    }
  };

  const actionPending =
    publishService.isPending ||
    unpublishService.isPending ||
    archiveService.isPending;

  return (
    <PageShell
      title="Prestations"
      subtitle="Administration et publication des services proposés par l'agence"
      actions={
        <Button
          variant="premium"
          onClick={handleCreate}
        >
          <Plus className="h-4 w-4" />
          Nouvelle prestation
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="premium-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total
          </p>

          <p className="mt-2 text-2xl font-bold">
            {services.length}
          </p>
        </div>

        <div className="premium-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Publiées
          </p>

          <p className="mt-2 text-2xl font-bold">
            {publishedCount}
          </p>
        </div>

        <div className="premium-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Brouillons
          </p>

          <p className="mt-2 text-2xl font-bold">
            {draftCount}
          </p>
        </div>
      </div>

      <div className="premium-card mb-6 p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              className="pl-9"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Rechercher une prestation ou une catégorie..."
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(
                value as
                  | ServiceStatus
                  | "__all__",
              )
            }
          >
            <SelectTrigger className="md:w-48">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="__all__">
                Tous les statuts
              </SelectItem>

              <SelectItem value="draft">
                Brouillons
              </SelectItem>

              <SelectItem value="published">
                Publiées
              </SelectItem>

              <SelectItem value="archived">
                Archivées
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isLoading &&
          !isError && (
            <p className="mt-3 text-xs text-muted-foreground">
              {filtered.length} prestation
              {filtered.length > 1
                ? "s"
                : ""}
            </p>
          )}
      </div>

      {isLoading ? (
        <TableSkeleton
          rows={5}
          columns={7}
        />
      ) : isError ? (
        <div className="premium-card p-8 text-center">
          <Wrench className="mx-auto h-8 w-8 text-destructive" />

          <h3 className="mt-4 font-semibold">
            Impossible de charger les prestations
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Une erreur inconnue est survenue."}
          </p>

          <Button
            variant="outline"
            className="mt-5"
            onClick={() =>
              refetch()
            }
          >
            Réessayer
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={
            services.length === 0
              ? "Aucune prestation"
              : "Aucun résultat"
          }
          description={
            services.length === 0
              ? "Créez la première prestation de l'agence."
              : "Aucune prestation ne correspond aux filtres actuels."
          }
        />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>
                  Prestation
                </TableHead>

                <TableHead>
                  Catégorie
                </TableHead>

                <TableHead>
                  Tarification
                </TableHead>

                <TableHead>
                  Ordre
                </TableHead>

                <TableHead>
                  Statut
                </TableHead>

                <TableHead>
                  Publication
                </TableHead>

                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map(
                (service) => (
                  <TableRow
                    key={service.id}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {
                            service.title
                          }
                        </p>

                        <p className="text-xs text-muted-foreground">
                          /{service.slug}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      {service.category
                        ?.name ??
                        "—"}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />

                        <span className="text-sm">
                          {formatPrice(
                            service,
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {
                          pricingLabels[
                            service.pricing_mode
                          ]
                        }
                      </p>
                    </TableCell>

                    <TableCell>
                      {
                        service.display_order
                      }
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={
                          statusClasses[
                            service.status
                          ]
                        }
                      >
                        {
                          statusLabels[
                            service.status
                          ]
                        }
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {service.published_at
                        ? new Date(
                            service.published_at,
                          ).toLocaleDateString(
                            "fr-FR",
                          )
                        : "—"}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Modifier"
                          onClick={() =>
                            handleEdit(
                              service,
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {service.status ===
                          "published" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Dépublier"
                            disabled={
                              actionPending
                            }
                            onClick={() =>
                              handleUnpublish(
                                service,
                              )
                            }
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        ) : service.status !==
                          "archived" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Publier"
                            disabled={
                              actionPending
                            }
                            onClick={() =>
                              handlePublish(
                                service,
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : null}

                        {service.status !==
                          "archived" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Archiver"
                            disabled={
                              actionPending
                            }
                            onClick={() =>
                              handleArchive(
                                service,
                              )
                            }
                          >
                            <Archive className="h-4 w-4 text-warning" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ServiceFormDialog
        open={dialogOpen}
        onOpenChange={(
          open,
        ) => {
          setDialogOpen(open);

          if (!open) {
            setEditingService(
              null,
            );
          }
        }}
        service={
          editingService
        }
      />
    </PageShell>
  );
};

export default ServicesPage;