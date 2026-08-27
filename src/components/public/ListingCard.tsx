import { Link } from "react-router-dom";
import {
  MapPin,
  Ruler,
  BedDouble,
  Bath,
  Home,
  Star,
  CheckCircle2,
  Clock3,
  KeyRound,
  BadgeCheck,
  CircleOff,
  Wrench,
} from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import FavoriteButton from "./FavoriteButton";

import {
  formatMoney,
  listingTypeLabels,
  propertyTypeLabels,
} from "@/constants/real-estate";

import type {
  MarketplaceListing,
  PropertyStatus,
} from "@/types/real-estate";

type MarketplaceListingWithStatus =
  MarketplaceListing & {
    status?: PropertyStatus | null;
  };

interface Props {
  listing: MarketplaceListingWithStatus;
  index?: number;
}

const typeColors: Record<string, string> = {
  short_rental:
    "bg-info text-info-foreground",

  long_rental:
    "bg-success text-success-foreground",

  sale:
    "bg-secondary text-secondary-foreground",
};

const statusConfig: Record<
  PropertyStatus,
  {
    label: string;
    className: string;
    icon: typeof CheckCircle2;
    available: boolean;
  }
> = {
  published: {
    label: "Disponible",
    className:
      "bg-emerald-600 text-white",
    icon: CheckCircle2,
    available: true,
  },

  reserved: {
    label: "Réservé",
    className:
      "bg-amber-500 text-white",
    icon: Clock3,
    available: false,
  },

  rented: {
    label: "Loué",
    className:
      "bg-blue-600 text-white",
    icon: KeyRound,
    available: false,
  },

  sold: {
    label: "Vendu",
    className:
      "bg-slate-800 text-white",
    icon: BadgeCheck,
    available: false,
  },

  maintenance: {
    label: "Maintenance",
    className:
      "bg-orange-600 text-white",
    icon: Wrench,
    available: false,
  },

  unavailable: {
    label: "Indisponible",
    className:
      "bg-muted-foreground text-background",
    icon: CircleOff,
    available: false,
  },

  draft: {
    label: "Brouillon",
    className:
      "bg-muted text-muted-foreground",
    icon: CircleOff,
    available: false,
  },

  archived: {
    label: "Archivé",
    className:
      "bg-muted text-muted-foreground",
    icon: CircleOff,
    available: false,
  },
};

const ListingCard = ({
  listing,
  index = 0,
}: Props) => {
  const status =
    listing.status ??
    "published";

  const commercialStatus =
    statusConfig[status];

  const StatusIcon =
    commercialStatus.icon;

  const isAvailable =
    commercialStatus.available;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
      }}
      className="relative"
    >
      {isAvailable && (
        <FavoriteButton
          propertyId={
            listing.property_id
          }
          className="absolute top-3 right-3 z-20"
        />
      )}

      <Link
        to={`/property/${listing.slug}`}
        className="group block premium-card-hover overflow-hidden"
      >
        {/* ================================= */}
        {/* IMAGE                             */}
        {/* ================================= */}

        <div className="relative aspect-[4/3] overflow-hidden">
          {listing.cover_image ? (
            <img
              src={
                listing.cover_image
              }
              alt={listing.title}
              loading="lazy"
              className={`w-full h-full object-cover transition-transform duration-500 ${
                isAvailable
                  ? "group-hover:scale-105"
                  : "group-hover:scale-[1.02]"
              }`}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Home className="h-12 w-12 text-muted-foreground/20" />
            </div>
          )}

          {/* Voile discret lorsque indisponible */}

          {!isAvailable && (
            <div className="absolute inset-0 bg-black/15 pointer-events-none" />
          )}

          {/* ================================= */}
          {/* BADGES GAUCHE                     */}
          {/* ================================= */}

          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
            <Badge
              className={`${
                typeColors[
                  listing.listing_type
                ] ?? "bg-muted"
              } text-xs font-semibold px-2.5 py-1 rounded-md border-0`}
            >
              {listingTypeLabels[
                listing.listing_type
              ] ??
                listing.listing_type}
            </Badge>

            {listing.featured && (
              <Badge className="bg-secondary text-secondary-foreground text-xs font-semibold px-2.5 py-1 rounded-md border-0">
                <Star className="h-3 w-3 mr-1 fill-current" />

                Vedette
              </Badge>
            )}
          </div>

          {/* ================================= */}
          {/* STATUT COMMERCIAL                 */}
          {/* ================================= */}

          <div className="absolute top-3 right-3 z-10">
            <Badge
              className={`${commercialStatus.className} border-0 shadow-md text-xs font-semibold px-2.5 py-1`}
            >
              <StatusIcon className="h-3.5 w-3.5 mr-1.5" />

              {
                commercialStatus.label
              }
            </Badge>
          </div>

          {/* ================================= */}
          {/* PRIX                              */}
          {/* ================================= */}

          <div className="absolute bottom-3 left-3 z-10">
            <div className="bg-foreground/80 backdrop-blur-sm text-background px-3 py-1.5 rounded-lg">
              <span className="text-lg font-bold">
                {formatMoney(
                  listing.price,
                  listing.currency,
                )}
              </span>

              {listing.listing_type !==
                "sale" && (
                <span className="text-xs opacity-80 ml-1">
                  /mois
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ================================= */}
        {/* CONTENU                           */}
        {/* ================================= */}

        <div className="p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-[15px]">
              {listing.title}
            </h3>

            <span className="text-[11px] text-muted-foreground shrink-0 pt-0.5">
              {propertyTypeLabels[
                listing.property_type
              ] ??
                listing.property_type}
            </span>
          </div>

          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-secondary shrink-0" />

            {[
              listing.district,
              listing.commune,
              listing.city,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span className="flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5" />

              {Number(
                listing.surface,
              )}{" "}
              m²
            </span>

            <span className="flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5" />

              {listing.bedrooms ??
                listing.rooms}{" "}
              ch
            </span>

            <span className="flex items-center gap-1.5">
              <Bath className="h-3.5 w-3.5" />

              {
                listing.bathrooms
              }{" "}
              sdb
            </span>
          </div>

          {/* ================================= */}
          {/* MESSAGE DE TRANSPARENCE           */}
          {/* ================================= */}

          {!isAvailable && (
            <div className="pt-2">
              <div className="rounded-md bg-muted/70 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <StatusIcon className="h-3.5 w-3.5 shrink-0" />

                {status ===
                  "reserved" &&
                  "Ce bien est actuellement réservé."}

                {status ===
                  "rented" &&
                  "Ce bien a été loué."}

                {status ===
                  "sold" &&
                  "Ce bien a été vendu."}

                {status ===
                  "maintenance" &&
                  "Ce bien est temporairement en maintenance."}

                {status ===
                  "unavailable" &&
                  "Ce bien n'est actuellement pas disponible."}
              </div>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default ListingCard;
