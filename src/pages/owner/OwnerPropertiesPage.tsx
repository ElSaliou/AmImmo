import {
  Armchair,
  Building2,
  CalendarDays,
  Home,
  MapPin,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import {
  useMyOwnerProperties,
  type OwnerProperty,
} from "@/hooks/use-owner-portal";

import {
  Badge,
} from "@/components/ui/badge";

// ============================================================
// STATUS UI
// ============================================================

const statusClass:
  Record<
    string,
    string
  > = {
  draft:
    "bg-muted text-muted-foreground",

  published:
    "bg-success/15 text-success",

  archived:
    "bg-destructive/15 text-destructive",

  rented:
    "bg-info/15 text-info",

  sold:
    "bg-secondary/15 text-secondary",

  reserved:
    "bg-warning/15 text-warning",

  maintenance:
    "bg-orange-500/15 text-orange-600",

  unavailable:
    "bg-muted text-muted-foreground",
};

// ============================================================
// LABELS
// ============================================================

const STATUS_LABELS:
  Record<
    string,
    string
  > = {
  draft: "Brouillon",
  published: "Disponible",
  archived: "Archivé",
  rented: "Loué",
  sold: "Vendu",
  reserved: "Réservé",
  maintenance: "Maintenance",
  unavailable: "Indisponible",
};

const PROPERTY_TYPE_LABELS:
  Record<
    string,
    string
  > = {
  apartment:
    "Appartement",
  house:
    "Maison",
  villa:
    "Villa",
  studio:
    "Studio",
  commercial:
    "Local commercial",
  land:
    "Terrain",
  other:
    "Autre",
  office:
    "Bureau",
  shop:
    "Boutique",
  warehouse:
    "Entrepôt",
  parking:
    "Parking",
};

const LISTING_TYPE_LABELS:
  Record<
    string,
    string
  > = {
  short_rental:
    "Location courte durée",

  long_rental:
    "Location longue durée",

  sale:
    "Vente",
};

// ============================================================
// HELPERS
// ============================================================

function formatMoney(
  value:
    | number
    | null
    | undefined,
  currency = "GNF",
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(
    Number(
      value,
    ),
  )} ${currency}`;
}

function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

// ============================================================
// PROPERTY NAME
// ============================================================

function getPropertyName(
  property:
    OwnerProperty,
) {
  return (
    property.title ||
    property.name ||
    property.reference ||
    `Bien ${property.id.slice(
      0,
      8,
    )}`
  );
}

// ============================================================
// LOCATION
// ============================================================

function getLocation(
  property:
    OwnerProperty,
) {
  return [
    property.address,
    property.district,
    property.commune,
    property.city,
  ]
    .filter(
      Boolean,
    )
    .join(
      " · ",
    ) ||
    "Localisation non renseignée";
}

// ============================================================
// PRICE
// ============================================================

function getPropertyPrice(
  property:
    OwnerProperty,
) {
  const value =
    property.monthly_rent ??
    property.rent ??
    property.sale_price ??
    property.price ??
    null;

  return formatMoney(
    value,
    property.currency ||
      "GNF",
  );
}

// ============================================================
// KPI CARD
// ============================================================

type KpiCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
};

const KpiCard = ({
  title,
  value,
  subtitle,
  icon,
}: KpiCardProps) => {
  return (
    <div className="premium-card min-w-0 p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground sm:text-sm">
            {title}
          </p>

          <p className="mt-1 break-words text-xl font-bold tracking-tight sm:text-2xl">
            {value}
          </p>

          <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            {subtitle}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10">
          {icon}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PROPERTY DETAIL ITEM
// ============================================================

type PropertyDetailItemProps = {
  label: string;
  value: React.ReactNode;
};

const PropertyDetailItem = ({
  label,
  value,
}: PropertyDetailItemProps) => {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground sm:text-xs">
        {label}
      </p>

      <div className="mt-1 break-words text-sm font-semibold leading-snug text-foreground sm:text-base">
        {value}
      </div>
    </div>
  );
};

// ============================================================
// PROPERTY CARD
// ============================================================

const PropertyCard = ({
  property,
  index,
}: {
  property:
    OwnerProperty;
  index:
    number;
}) => {
  const status =
    property.status ??
    "unknown";

  const statusLabel =
    STATUS_LABELS[
      status
    ] ??
    status;

  const propertyType =
    property.property_type
      ? PROPERTY_TYPE_LABELS[
          property
            .property_type
        ] ??
        property.property_type
      : "Bien immobilier";

  const listingType =
    property.listing_type
      ? LISTING_TYPE_LABELS[
          property
            .listing_type
        ] ??
        property.listing_type
      : "—";

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay:
          index *
          0.04,
      }}
      className="premium-card min-w-0 overflow-hidden transition-shadow hover:shadow-md"
    >
      {/* ====================================================== */}
      {/* HEADER                                                 */}
      {/* ====================================================== */}

      <div className="border-b bg-muted/30 p-4 sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
              <Building2 className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start gap-2">
                <h2 className="min-w-0 break-words text-sm font-semibold leading-snug text-foreground sm:text-base">
                  {getPropertyName(
                    property,
                  )}
                </h2>

                {(property as any).furnished && (
                  <Armchair className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                )}
              </div>

              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
                {property.reference && (
                  <span className="break-all font-medium">
                    {property.reference}
                  </span>
                )}

                {property.reference && (
                  <span className="text-muted-foreground/60">
                    ·
                  </span>
                )}

                <span className="break-words">
                  {propertyType}
                </span>
              </div>
            </div>
          </div>

          <Badge
            className={`${
              statusClass[
                status
              ] ??
              "bg-muted text-muted-foreground"
            } shrink-0 whitespace-nowrap border-0 text-[10px] sm:text-xs`}
          >
            {statusLabel}
          </Badge>
        </div>
      </div>

      {/* ====================================================== */}
      {/* BODY                                                   */}
      {/* ====================================================== */}

      <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
        {/* ==================================================== */}
        {/* LOCALISATION                                        */}
        {/* ==================================================== */}

        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              Localisation
            </p>

            <p className="mt-1 break-words text-sm font-medium leading-relaxed">
              {getLocation(
                property,
              )}
            </p>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TYPE D'OPERATION                                     */}
        {/* ==================================================== */}

        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Home className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              Type d'opération
            </p>

            <p className="mt-1 break-words text-sm font-medium leading-relaxed">
              {listingType}
            </p>
          </div>
        </div>

        {/* ==================================================== */}
        {/* DISPONIBILITE                                       */}
        {/* ==================================================== */}

        {property.available_from && (
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                Disponible à partir du
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDate(
                  property.available_from,
                )}
              </p>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* DETAILS                                              */}
        {/* ==================================================== */}

        <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 rounded-xl bg-muted/40 p-3.5 sm:gap-x-6 sm:p-4">
          {property.bedrooms !=
            null && (
            <PropertyDetailItem
              label="Chambres"
              value={
                property.bedrooms
              }
            />
          )}

          {(property.surface !=
            null ||
            property.area !=
              null) && (
            <PropertyDetailItem
              label="Surface"
              value={
                <>
                  {property.surface ??
                    property.area}{" "}
                  m²
                </>
              }
            />
          )}

          <div
            className={
              property.charges_monthly !=
                null &&
              Number(
                property.charges_monthly,
              ) > 0
                ? "min-w-0"
                : "col-span-2 min-w-0 sm:col-span-1"
            }
          >
            <PropertyDetailItem
              label={
                property.listing_type ===
                "sale"
                  ? "Prix de vente"
                  : "Loyer"
              }
              value={
                <span className="break-words">
                  {getPropertyPrice(
                    property,
                  )}
                </span>
              }
            />
          </div>

          {property.charges_monthly !=
            null &&
            Number(
              property.charges_monthly,
            ) >
              0 && (
              <PropertyDetailItem
                label="Charges"
                value={
                  <span className="break-words">
                    {formatMoney(
                      property.charges_monthly,
                      property.currency ||
                        "GNF",
                    )}
                  </span>
                }
              />
            )}
        </div>

        {/* ==================================================== */}
        {/* READ ONLY                                            */}
        {/* ==================================================== */}

        <div className="border-t pt-4">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />

            <span className="min-w-0">
              Informations synchronisées avec votre dossier ImmoPlate.
            </span>
          </p>
        </div>
      </div>
    </motion.article>
  );
};

// ============================================================
// OWNER PROPERTIES PAGE
// ============================================================

const OwnerPropertiesPage =
  () => {
    const {
      data:
        properties,
      isLoading,
      isError,
      error,
      refetch,
    } =
      useMyOwnerProperties();

    // ========================================================
    // KPI
    // ========================================================

    const total =
      properties?.length ??
      0;

    const rented =
      properties?.filter(
        (property) =>
          property.status ===
          "rented",
      ).length ??
      0;

    const available =
      properties?.filter(
        (property) =>
          property.status ===
          "published",
      ).length ??
      0;

    const sold =
      properties?.filter(
        (property) =>
          property.status ===
          "sold",
      ).length ??
      0;

    // ========================================================
    // LOADING
    // ========================================================

    if (isLoading) {
      return (
        <div className="flex min-h-[20rem] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }

    // ========================================================
    // ERROR
    // ========================================================

    if (isError) {
      return (
        <div className="premium-card border-destructive/20 bg-destructive/5 p-5 sm:p-6">
          <h1 className="font-semibold text-destructive">
            Impossible de charger vos biens
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Une erreur est survenue
            pendant la récupération de
            votre patrimoine.
          </p>

          {error instanceof Error && (
            <p className="mt-3 break-words text-xs text-destructive">
              {
                error.message
              }
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              void refetch()
            }
            className="mt-5 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Réessayer
          </button>
        </div>
      );
    }

    // ========================================================
    // UI
    // ========================================================

    return (
      <div className="min-w-0 space-y-5 sm:space-y-6">
        {/* ==================================================== */}
        {/* PAGE HEADER                                          */}
        {/* ==================================================== */}

        <section className="min-w-0">
          <h1 className="break-words font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Mes biens immobiliers
          </h1>

          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Consultez votre patrimoine immobilier et son état de commercialisation.
          </p>
        </section>

        {/* ==================================================== */}
        {/* KPI                                                  */}
        {/* ==================================================== */}

        <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            title="Total des biens"
            value={
              total
            }
            subtitle="Patrimoine enregistré"
            icon={
              <Building2 className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Biens loués"
            value={
              rented
            }
            subtitle="Actuellement en location"
            icon={
              <Home className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Disponibles"
            value={
              available
            }
            subtitle="En commercialisation"
            icon={
              <Home className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Biens vendus"
            value={
              sold
            }
            subtitle="Ventes finalisées"
            icon={
              <Building2 className="h-5 w-5" />
            }
          />
        </section>

        {/* ==================================================== */}
        {/* TITLE LIST                                           */}
        {/* ==================================================== */}

        <section className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold sm:text-lg">
              Mon patrimoine
            </h2>

            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {
                total
              }{" "}
              bien
              {total >
              1
                ? "s"
                : ""}{" "}
              associé
              {total >
              1
                ? "s"
                : ""}{" "}
              à votre compte.
            </p>
          </div>

          <Badge
            variant="outline"
            className="w-fit shrink-0 bg-background"
          >
            Lecture seule
          </Badge>
        </section>

        {/* ==================================================== */}
        {/* EMPTY                                                */}
        {/* ==================================================== */}

        {!properties?.length ? (
          <section className="premium-card p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>

            <h2 className="mt-4 font-semibold">
              Aucun bien enregistré
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Aucun bien immobilier
              n'est actuellement associé
              à votre compte propriétaire.
            </p>
          </section>
        ) : (
          // ==================================================
          // CARDS
          // ==================================================

          <section className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {properties.map(
              (
                property,
                index,
              ) => (
                <PropertyCard
                  key={
                    property.id
                  }
                  property={
                    property
                  }
                  index={
                    index
                  }
                />
              ),
            )}
          </section>
        )}
      </div>
    );
  };

export default OwnerPropertiesPage;