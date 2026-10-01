import {
  useMemo,
  useState,
} from "react";

import {
  BadgePercent,
  CalendarRange,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";

import PageShell from "@/components/PageShell";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

import RatePeriodDialog from "@/components/admin/short-rental/RatePeriodDialog";

import { useProperties } from "@/hooks/use-properties";

import {
  PropertyRatePeriod,
  useDeletePropertyRatePeriod,
  usePropertyRatePeriods,
} from "@/hooks/use-property-rate-periods";

import { useShortRentalSettings } from "@/hooks/use-short-rental-settings";

import {
  formatDate,
  formatMoney,
} from "@/constants/real-estate";

export default function ShortRentalRatesPage() {
  const {
    data: properties,
    isLoading:
      propertiesLoading,
  } = useProperties({
    listing_type:
      "short_rental",
  });

  const {
    data: settings,
    isLoading:
      settingsLoading,
  } =
    useShortRentalSettings();

  const [
    selectedPropertyId,
    setSelectedPropertyId,
  ] =
    useState<string>(
      "__all__",
    );

  const {
    data: ratePeriods,
    isLoading:
      ratesLoading,
    error:
      ratesError,
  } =
    usePropertyRatePeriods(
      selectedPropertyId ===
        "__all__"
        ? undefined
        : selectedPropertyId,
    );

  const deleteRate =
    useDeletePropertyRatePeriod();

  const [
    dialogOpen,
    setDialogOpen,
  ] = useState(false);

  const [
    editingRate,
    setEditingRate,
  ] =
    useState<PropertyRatePeriod | null>(
      null,
    );

  const [
    dialogPropertyId,
    setDialogPropertyId,
  ] =
    useState<string>();

  const propertiesById =
    useMemo(() => {
      const map =
        new Map<
          string,
          NonNullable<
            typeof properties
          >[number]
        >();

      for (const property of
        properties ?? []) {
        map.set(
          property.id,
          property,
        );
      }

      return map;
    }, [properties]);

  const settingsByProperty =
    useMemo(() => {
      const map =
        new Map<
          string,
          NonNullable<
            typeof settings
          >[number]
        >();

      for (const setting of
        settings ?? []) {
        map.set(
          setting.property_id,
          setting,
        );
      }

      return map;
    }, [settings]);

  const activeRatesCount =
    useMemo(
      () =>
        (
          ratePeriods ??
          []
        ).filter(
          (rate) =>
            rate.active,
        ).length,
      [ratePeriods],
    );

  const configuredPropertiesCount =
    useMemo(
      () =>
        (
          properties ??
          []
        ).filter((property) =>
          settingsByProperty.has(
            property.id,
          ),
        ).length,
      [
        properties,
        settingsByProperty,
      ],
    );

  const selectedProperty =
    selectedPropertyId ===
    "__all__"
      ? null
      : propertiesById.get(
          selectedPropertyId,
        );

  const openCreateDialog =
    () => {
      if (
        !properties ||
        properties.length ===
          0
      ) {
        toast.error(
          "Aucun bien en location courte durée",
        );

        return;
      }

      if (
        selectedPropertyId ===
        "__all__"
      ) {
        if (
          properties.length ===
          1
        ) {
          setDialogPropertyId(
            properties[0].id,
          );
        } else {
          toast.error(
            "Sélectionnez d'abord un bien",
          );

          return;
        }
      } else {
        setDialogPropertyId(
          selectedPropertyId,
        );
      }

      setEditingRate(
        null,
      );

      setDialogOpen(
        true,
      );
    };

  const openEditDialog =
    (
      rate: PropertyRatePeriod,
    ) => {
      setEditingRate(
        rate,
      );

      setDialogPropertyId(
        rate.property_id,
      );

      setDialogOpen(
        true,
      );
    };

  const handleDelete =
    async (
      rate: PropertyRatePeriod,
    ) => {
      const confirmed =
        window.confirm(
          `Supprimer la période tarifaire « ${rate.name} » ?`,
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteRate.mutateAsync(
          rate.id,
        );

        toast.success(
          "Période tarifaire supprimée",
        );
      } catch (error) {
        console.error(
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de supprimer cette période",
        );
      }
    };

  const isLoading =
    propertiesLoading ||
    settingsLoading ||
    ratesLoading;

  return (
    <PageShell
      title="Tarifs courte durée"
      subtitle="Gestion du tarif de base et des périodes tarifaires saisonnières"
      actions={
        <Button
          onClick={
            openCreateDialog
          }
        >
          <Plus className="mr-2 h-4 w-4" />

          Nouvelle période
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="premium-card p-5">
          <p className="text-sm text-muted-foreground">
            Biens courte durée
          </p>

          <p className="mt-2 text-2xl font-bold">
            {properties?.length ??
              0}
          </p>
        </div>

        <div className="premium-card p-5">
          <p className="text-sm text-muted-foreground">
            Biens configurés
          </p>

          <p className="mt-2 text-2xl font-bold">
            {
              configuredPropertiesCount
            }
          </p>
        </div>

        <div className="premium-card p-5">
          <p className="text-sm text-muted-foreground">
            Périodes actives
          </p>

          <p className="mt-2 text-2xl font-bold">
            {
              activeRatesCount
            }
          </p>
        </div>
      </div>

      <div className="premium-card mb-6 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="w-full md:max-w-sm">
            <p className="mb-2 text-sm font-medium">
              Bien
            </p>

            <Select
              value={
                selectedPropertyId
              }
              onValueChange={
                setSelectedPropertyId
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un bien" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__all__">
                  Tous les biens
                </SelectItem>

                {(properties ??
                  []).map(
                  (
                    property,
                  ) => (
                    <SelectItem
                      key={
                        property.id
                      }
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

          {selectedProperty && (
            <div className="rounded-lg border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Tarif de base
              </p>

              {settingsByProperty.get(
                selectedProperty.id,
              ) ? (
                <p className="font-semibold">
                  {formatMoney(
                    Number(
                      settingsByProperty.get(
                        selectedProperty.id,
                      )!
                        .base_nightly_rate,
                    ),
                    settingsByProperty.get(
                      selectedProperty.id,
                    )!
                      .currency,
                  )}{" "}
                  / nuit
                </p>
              ) : (
                <p className="text-sm text-destructive">
                  Bien non
                  configuré
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border bg-muted/20 p-3">
          <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

          <p className="text-xs text-muted-foreground">
            Le tarif de base
            est défini dans
            « Courte durée ».
            Les périodes
            ci-dessous ne
            servent qu'à
            remplacer ce tarif
            sur certaines
            dates. En cas de
            chevauchement, la
            priorité numérique
            la plus élevée
            prévaut.
          </p>
        </div>
      </div>

      {ratesError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de
          charger les périodes
          tarifaires.
        </div>
      )}

      {isLoading ? (
        <TableSkeleton
          rows={5}
          columns={8}
        />
      ) : !ratePeriods ||
        ratePeriods.length ===
          0 ? (
        <EmptyState
          icon={
            CalendarRange
          }
          title="Aucune période tarifaire"
          description="Le tarif de base reste applicable tant qu'aucune période saisonnière n'est définie."
        />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>
                  Période
                </TableHead>

                <TableHead>
                  Bien
                </TableHead>

                <TableHead>
                  Début
                </TableHead>

                <TableHead>
                  Fin
                </TableHead>

                <TableHead>
                  Tarif / nuit
                </TableHead>

                <TableHead>
                  Séjour min.
                </TableHead>

                <TableHead>
                  Priorité
                </TableHead>

                <TableHead>
                  Statut
                </TableHead>

                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {ratePeriods.map(
                (rate) => {
                  const property =
                    propertiesById.get(
                      rate.property_id,
                    );

                  return (
                    <TableRow
                      key={
                        rate.id
                      }
                    >
                      <TableCell>
                        <p className="font-medium">
                          {
                            rate.name
                          }
                        </p>
                      </TableCell>

                      <TableCell>
                        <p className="text-sm">
                          {property?.title ??
                            "Bien inconnu"}
                        </p>

                        {property?.reference && (
                          <p className="text-xs text-muted-foreground">
                            {
                              property.reference
                            }
                          </p>
                        )}
                      </TableCell>

                      <TableCell>
                        {formatDate(
                          rate.start_date,
                        )}
                      </TableCell>

                      <TableCell>
                        {formatDate(
                          rate.end_date,
                        )}
                      </TableCell>

                      <TableCell>
                        <p className="font-semibold">
                          {formatMoney(
                            Number(
                              rate.nightly_rate,
                            ),
                            settingsByProperty.get(
                              rate.property_id,
                            )
                              ?.currency ??
                              "GNF",
                          )}
                        </p>
                      </TableCell>

                      <TableCell>
                        {rate.minimum_stay ??
                          "Défaut"}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {
                            rate.priority
                          }
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {rate.active ? (
                          <Badge>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              openEditDialog(
                                rate,
                              )
                            }
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDelete(
                                rate,
                              )
                            }
                            disabled={
                              deleteRate.isPending
                            }
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                },
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <RatePeriodDialog
        open={
          dialogOpen
        }
        onOpenChange={
          setDialogOpen
        }
        propertyId={
          dialogPropertyId
        }
        propertyTitle={
          dialogPropertyId
            ? propertiesById.get(
                dialogPropertyId,
              )?.title
            : undefined
        }
        ratePeriod={
          editingRate
        }
      />
    </PageShell>
  );
}