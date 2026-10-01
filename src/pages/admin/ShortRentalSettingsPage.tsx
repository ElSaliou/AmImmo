import {
  useMemo,
  useState,
} from "react";

import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSignature,
  Settings2,
  Users,
} from "lucide-react";

import PageShell from "@/components/PageShell";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

import ShortRentalSettingsDialog from "@/components/admin/short-rental/ShortRentalSettingsDialog";
import ManagementTermsDialog from "@/components/admin/short-rental/ManagementTermsDialog";

import { useProperties } from "@/hooks/use-properties";

import { useShortRentalSettings } from "@/hooks/use-short-rental-settings";

import {
  ShortRentalManagementTerm,
  useShortRentalManagementTerms,
} from "@/hooks/use-short-rental-management-terms";

import { formatMoney } from "@/constants/real-estate";

const formatDateFr = (
  value?: string | null,
) => {
  if (!value) {
    return "—";
  }

  const [
    year,
    month,
    day,
  ] = value.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}/${month}/${year}`;
};

const getPricingModelLabel = (
  model: ShortRentalManagementTerm["pricing_model"],
) => {
  switch (model) {
    case "commission":
      return "Commission";

    case "fixed_fee":
      return "Forfait mensuel";

    case "commission_plus_fixed":
      return "Commission + forfait";

    case "per_booking":
      return "Par réservation";

    case "custom":
      return "Personnalisée";

    default:
      return model;
  }
};

const getManagementTermsSummary = (
  term: ShortRentalManagementTerm,
) => {
  switch (term.pricing_model) {
    case "commission":
      return `${Number(
        term.commission_rate ?? 0,
      ).toLocaleString("fr-FR", {
        maximumFractionDigits: 2,
      })} %`;

    case "fixed_fee":
      return `${formatMoney(
        Number(
          term.fixed_monthly_fee ?? 0,
        ),
        term.currency,
      )} / mois`;

    case "commission_plus_fixed":
      return `${Number(
        term.commission_rate ?? 0,
      ).toLocaleString("fr-FR", {
        maximumFractionDigits: 2,
      })} % + ${formatMoney(
        Number(
          term.fixed_monthly_fee ?? 0,
        ),
        term.currency,
      )} / mois`;

    case "per_booking":
      return `${formatMoney(
        Number(
          term.fee_per_booking ?? 0,
        ),
        term.currency,
      )} / réservation`;

    case "custom": {
      const parts: string[] = [];

      if (
        term.commission_rate != null
      ) {
        parts.push(
          `${Number(
            term.commission_rate,
          ).toLocaleString("fr-FR", {
            maximumFractionDigits: 2,
          })} %`,
        );
      }

      if (
        term.fixed_monthly_fee != null
      ) {
        parts.push(
          `${formatMoney(
            Number(
              term.fixed_monthly_fee,
            ),
            term.currency,
          )} / mois`,
        );
      }

      if (
        term.fee_per_booking != null
      ) {
        parts.push(
          `${formatMoney(
            Number(
              term.fee_per_booking,
            ),
            term.currency,
          )} / réservation`,
        );
      }

      return parts.length > 0
        ? parts.join(" + ")
        : "Voir conditions";
    }

    default:
      return "—";
  }
};

export default function ShortRentalSettingsPage() {
  const {
    data: properties,
    isLoading: propertiesLoading,
  } = useProperties({
    listing_type: "short_rental",
  });

  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsError,
  } = useShortRentalSettings();

  const {
    data: managementTerms,
    isLoading: managementTermsLoading,
    error: managementTermsError,
  } = useShortRentalManagementTerms();

  const [
    settingsDialogOpen,
    setSettingsDialogOpen,
  ] = useState(false);

  const [
    managementDialogOpen,
    setManagementDialogOpen,
  ] = useState(false);

  const [
    selectedProperty,
    setSelectedProperty,
  ] = useState<{
    id: string;
    title: string;
    owner_id: string | null;
  } | null>(null);

  const settingsByProperty =
    useMemo(() => {
      const map = new Map<
        string,
        NonNullable<
          typeof settings
        >[number]
      >();

      for (const setting of settings ?? []) {
        map.set(
          setting.property_id,
          setting,
        );
      }

      return map;
    }, [settings]);

  const activeManagementTermsByProperty =
    useMemo(() => {
      const map = new Map<
        string,
        ShortRentalManagementTerm
      >();

      for (const term of managementTerms ?? []) {
        if (!term.active) {
          continue;
        }

        map.set(
          term.property_id,
          term,
        );
      }

      return map;
    }, [managementTerms]);

  const configuredCount =
    useMemo(
      () =>
        (properties ?? []).filter(
          (property) =>
            settingsByProperty.has(
              property.id,
            ),
        ).length,
      [
        properties,
        settingsByProperty,
      ],
    );

  const activeCount =
    useMemo(
      () =>
        (properties ?? []).filter(
          (property) => {
            const setting =
              settingsByProperty.get(
                property.id,
              );

            return (
              setting?.active === true
            );
          },
        ).length,
      [
        properties,
        settingsByProperty,
      ],
    );

  const managementConfiguredCount =
    useMemo(
      () =>
        (properties ?? []).filter(
          (property) =>
            activeManagementTermsByProperty.has(
              property.id,
            ),
        ).length,
      [
        properties,
        activeManagementTermsByProperty,
      ],
    );

  const openSettings = (
    property: {
      id: string;
      title: string;
      owner_id?: string | null;
    },
  ) => {
    setSelectedProperty({
      id: property.id,
      title: property.title,
      owner_id:
        property.owner_id ?? null,
    });

    setSettingsDialogOpen(true);
  };

  const openManagementTerms = (
    property: {
      id: string;
      title: string;
      owner_id?: string | null;
    },
  ) => {
    setSelectedProperty({
      id: property.id,
      title: property.title,
      owner_id:
        property.owner_id ?? null,
    });

    setManagementDialogOpen(true);
  };

  const isLoading =
    propertiesLoading ||
    settingsLoading ||
    managementTermsLoading;

  return (
    <PageShell
      title="Location courte durée"
      subtitle="Configuration opérationnelle et conditions de gestion des logements exploités en courte durée"
    >
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="premium-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Biens courte durée
              </p>

              <p className="mt-2 text-2xl font-bold">
                {properties?.length ?? 0}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BedDouble className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="premium-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Configurés
              </p>

              <p className="mt-2 text-2xl font-bold">
                {configuredCount}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="premium-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Configurations actives
              </p>

              <p className="mt-2 text-2xl font-bold">
                {activeCount}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="premium-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Conditions de gestion
              </p>

              <p className="mt-2 text-2xl font-bold">
                {managementConfiguredCount}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {settingsError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de charger les paramètres courte durée.
        </div>
      )}

      {managementTermsError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de charger les conditions de gestion.
        </div>
      )}

      {isLoading ? (
        <TableSkeleton
          rows={5}
          columns={9}
        />
      ) : !properties ||
        properties.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucun bien en location courte durée"
          description="Définissez d'abord le type d'offre « Location courte durée » sur un bien depuis le module Biens."
        />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>
                  Bien
                </TableHead>

                <TableHead>
                  Tarif de base
                </TableHead>

                <TableHead>
                  Frais / caution
                </TableHead>

                <TableHead>
                  Séjour
                </TableHead>

                <TableHead>
                  Capacité
                </TableHead>

                <TableHead>
                  Horaires
                </TableHead>

                <TableHead>
                  Configuration
                </TableHead>

                <TableHead>
                  Gestion propriétaire
                </TableHead>

                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {properties.map(
                (property) => {
                  const setting =
                    settingsByProperty.get(
                      property.id,
                    );

                  const managementTerm =
                    activeManagementTermsByProperty.get(
                      property.id,
                    );

                  return (
                    <TableRow key={property.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {property.title}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {property.reference ??
                              "Sans référence"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        {setting ? (
                          <div>
                            <p className="font-semibold">
                              {formatMoney(
                                Number(
                                  setting.base_nightly_rate,
                                ),
                                setting.currency,
                              )}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              par nuit
                            </p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell>
                        {setting ? (
                          <div className="text-sm">
                            <p>
                              Ménage :{" "}
                              {formatMoney(
                                Number(
                                  setting.cleaning_fee,
                                ),
                                setting.currency,
                              )}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Caution :{" "}
                              {formatMoney(
                                Number(
                                  setting.security_deposit,
                                ),
                                setting.currency,
                              )}
                            </p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell>
                        {setting ? (
                          <div className="text-sm">
                            <p>
                              Min.{" "}
                              {setting.minimum_stay}{" "}
                              nuit
                              {setting.minimum_stay > 1
                                ? "s"
                                : ""}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Max.{" "}
                              {setting.maximum_stay ??
                                "illimité"}
                            </p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell>
                        {setting ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />

                            <span>
                              {setting.max_guests} max.
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell>
                        {setting ? (
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                            <div>
                              <p>
                                Arrivée{" "}
                                {setting.default_check_in_time.slice(
                                  0,
                                  5,
                                )}
                              </p>

                              <p>
                                Départ{" "}
                                {setting.default_check_out_time.slice(
                                  0,
                                  5,
                                )}
                              </p>
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell>
                        {!setting ? (
                          <Badge variant="outline">
                            À configurer
                          </Badge>
                        ) : setting.active ? (
                          <Badge>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {managementTerm ? (
                          <div className="space-y-1">
                            <Badge variant="outline">
                              {getPricingModelLabel(
                                managementTerm.pricing_model,
                              )}
                            </Badge>

                            <p className="text-sm font-medium">
                              {getManagementTermsSummary(
                                managementTerm,
                              )}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Depuis le{" "}
                              {formatDateFr(
                                managementTerm.effective_from,
                              )}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline">
                            À définir
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-2 xl:flex-row xl:justify-end">
                          <Button
                            variant={
                              setting
                                ? "outline"
                                : "default"
                            }
                            size="sm"
                            onClick={() =>
                              openSettings(
                                property,
                              )
                            }
                          >
                            <Settings2 className="mr-2 h-4 w-4" />

                            {setting
                              ? "Configuration"
                              : "Configurer"}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openManagementTerms(
                                property,
                              )
                            }
                          >
                            <FileSignature className="mr-2 h-4 w-4" />

                            {managementTerm
                              ? "Conditions"
                              : "Définir gestion"}
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

      <ShortRentalSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        propertyId={selectedProperty?.id}
        propertyTitle={selectedProperty?.title}
      />

      <ManagementTermsDialog
        open={managementDialogOpen}
        onOpenChange={setManagementDialogOpen}
        propertyId={selectedProperty?.id}
        propertyTitle={selectedProperty?.title}
        ownerId={selectedProperty?.owner_id}
        currentTerm={
          selectedProperty
            ? activeManagementTermsByProperty.get(
                selectedProperty.id,
              ) ?? null
            : null
        }
      />
    </PageShell>
  );
}