import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { MarketplaceListing } from "@/types/real-estate";
import { MapPin, Ruler, BedDouble, Bath, Home, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import FavoriteButton from "./FavoriteButton";
import { formatMoney, listingTypeLabels, propertyTypeLabels } from "@/constants/real-estate";

interface Props {
  listing: MarketplaceListing;
  index?: number;
}

const ListingListItem = ({ listing, index = 0 }: Props) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3, delay: index * 0.04 }}
    className="relative"
  >
    <FavoriteButton propertyId={listing.property_id} className="absolute top-3 right-3 z-10" />
    <Link
      to={`/property/${listing.slug}`}
      className="group premium-card flex flex-col md:flex-row overflow-hidden"
    >
      <div className="md:w-72 aspect-video md:aspect-auto overflow-hidden shrink-0">
        {listing.cover_image ? (
          <img src={listing.cover_image} alt={listing.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center min-h-[160px]">
            <Home className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
      </div>
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">{listingTypeLabels[listing.listing_type]}</Badge>
            <Badge variant="outline" className="text-xs">{propertyTypeLabels[listing.property_type] ?? listing.property_type}</Badge>
            {listing.furnished && <Badge variant="outline" className="text-xs">Meublé</Badge>}
          </div>
          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-1">{listing.title}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-secondary" />
            {[listing.district, listing.commune, listing.city].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Ruler className="h-4 w-4" />{Number(listing.surface)} m²</span>
            <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{listing.bedrooms ?? listing.rooms} ch</span>
            <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{listing.bathrooms} sdb</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-foreground">{formatMoney(listing.price, listing.currency)}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  </motion.div>
);

export default ListingListItem;
