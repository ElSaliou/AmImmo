import { useParams } from "react-router-dom";
import { useMarketplaceListing } from "@/hooks/use-marketplace";
import PageShell from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { MapPin, Ruler, BedDouble, Bath, Home } from "lucide-react";
import ContactPropertyForm from "@/components/public/ContactPropertyForm";

const typeLabels: Record<string, string> = {
  short_rental: "Courte durée",
  long_rental: "Longue durée",
  sale: "Vente",
};

const PropertyDetailPage = () => {
  const { id: slug } = useParams<{ id: string }>();
  const { data: listing, isLoading } = useMarketplaceListing(slug ?? "");

  if (isLoading) return <div className="container py-10 text-muted-foreground">Chargement...</div>;
  if (!listing) return <div className="container py-10 text-muted-foreground">Bien introuvable.</div>;

  return (
    <div className="container py-10">
      <PageShell title={listing.title} subtitle={`${listing.district ? listing.district + ", " : ""}${listing.city}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Images */}
          <div className="lg:col-span-2 space-y-4">
            {(listing.images ?? []).length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {listing.images.map((img: any, i: number) => (
                  <img key={img.id} src={img.url} alt={img.alt || listing.title} className={`rounded-lg object-cover w-full ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`} />
                ))}
              </div>
            ) : (
              <div className="aspect-[16/9] bg-muted rounded-lg flex items-center justify-center">
                <Home className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{typeLabels[listing.listing_type] ?? listing.listing_type}</Badge>
                <Badge variant="secondary" className="capitalize">{listing.property_type}</Badge>
                {listing.furnished && <Badge variant="outline">Meublé</Badge>}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{listing.city}</span>
                <span className="flex items-center gap-1"><Ruler className="h-4 w-4" />{Number(listing.surface)} m²</span>
                <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{listing.rooms} pièces</span>
                <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{listing.bathrooms} sdb</span>
              </div>

              <p className="text-3xl font-bold">
                {Number(listing.price).toLocaleString()} {listing.currency}
                {listing.listing_type !== "sale" && <span className="text-base font-normal text-muted-foreground">/mois</span>}
              </p>

              {listing.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{listing.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact sidebar */}
          <div>
            <ContactPropertyForm propertyId={listing.property_id} propertyTitle={listing.title} />
          </div>
        </div>
      </PageShell>
    </div>
  );
};

export default PropertyDetailPage;
