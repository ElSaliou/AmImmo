import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { MarketplaceListing } from "@/types/real-estate";
import { MapPin, Ruler, BedDouble, Bath, Home, Star } from "lucide-react";
import { motion } from "framer-motion";
import FavoriteButton from "./FavoriteButton";
import { formatMoney, listingTypeLabels, propertyTypeLabels } from "@/constants/real-estate";

interface Props {
  listing: MarketplaceListing;
  index?: number;
}

const typeColors: Record<string, string> = {
  short_rental: "bg-info text-info-foreground",
  long_rental: "bg-success text-success-foreground",
  sale: "bg-secondary text-secondary-foreground",
};

const ListingCard = ({ listing, index = 0 }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
    className="relative"
  >
    <FavoriteButton propertyId={listing.property_id} className="absolute top-3 right-3 z-10" />
    <Link
      to={`/property/${listing.slug}`}
      className="group block premium-card-hover overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {listing.cover_image ? (
          <img
            src={listing.cover_image}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Home className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          <Badge className={`${typeColors[listing.listing_type] ?? "bg-muted"} text-xs font-semibold px-2.5 py-1 rounded-md border-0`}>
            {listingTypeLabels[listing.listing_type] ?? listing.listing_type}
          </Badge>
          {listing.featured && (
            <Badge className="bg-secondary text-secondary-foreground text-xs font-semibold px-2.5 py-1 rounded-md border-0">
              <Star className="h-3 w-3 mr-1 fill-current" /> Vedette
            </Badge>
          )}
        </div>

        {/* Price overlay */}
        <div className="absolute bottom-3 left-3">
          <div className="bg-foreground/80 backdrop-blur-sm text-background px-3 py-1.5 rounded-lg">
            <span className="text-lg font-bold">{formatMoney(listing.price, listing.currency)}</span>
            {listing.listing_type !== "sale" && (
              <span className="text-xs opacity-80 ml-1">/mois</span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-[15px]">
            {listing.title}
          </h3>
          <span className="text-[11px] text-muted-foreground shrink-0 pt-0.5">
            {propertyTypeLabels[listing.property_type] ?? listing.property_type}
          </span>
        </div>

        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-secondary shrink-0" />
          {[listing.district, listing.commune, listing.city].filter(Boolean).join(", ")}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span className="flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5" />{Number(listing.surface)} m²
          </span>
          <span className="flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5" />{listing.bedrooms ?? listing.rooms} ch
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="h-3.5 w-3.5" />{listing.bathrooms} sdb
          </span>
        </div>
      </div>
    </Link>
  </motion.div>
);

export default ListingCard;
