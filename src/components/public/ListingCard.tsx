import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { MarketplaceListing } from "@/types/real-estate";
import { Home, MapPin, Ruler, BedDouble, Bath } from "lucide-react";

interface Props {
  listing: MarketplaceListing;
}

const typeLabels: Record<string, string> = {
  short_rental: "Courte durée",
  long_rental: "Longue durée",
  sale: "Vente",
};

const ListingCard = ({ listing }: Props) => (
  <Link
    to={`/property/${listing.slug}`}
    className="group rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow"
  >
    {/* Image */}
    <div className="aspect-[4/3] bg-muted flex items-center justify-center">
      {listing.cover_image ? (
        <img src={listing.cover_image} alt={listing.title} className="w-full h-full object-cover" />
      ) : (
        <Home className="h-10 w-10 text-muted-foreground/30" />
      )}
    </div>

    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs capitalize">
          {typeLabels[listing.listing_type] ?? listing.listing_type}
        </Badge>
        {listing.featured && <Badge className="bg-secondary text-secondary-foreground text-xs">★ À la une</Badge>}
      </div>

      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
        {listing.title}
      </h3>

      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" />
        {listing.district ? `${listing.district}, ` : ""}{listing.city}
      </p>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{Number(listing.surface)} m²</span>
        <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{listing.rooms}</span>
        <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{listing.bathrooms}</span>
      </div>

      <p className="text-lg font-bold text-foreground">
        {Number(listing.price).toLocaleString()} {listing.currency}
        {listing.listing_type !== "sale" && <span className="text-sm font-normal text-muted-foreground">/mois</span>}
      </p>
    </div>
  </Link>
);

export default ListingCard;
