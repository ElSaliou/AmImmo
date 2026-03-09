import { useParams, Link } from "react-router-dom";
import { useMarketplaceListing, useMarketplaceListings } from "@/hooks/use-marketplace";
import { Badge } from "@/components/ui/badge";
import { MapPin, Ruler, BedDouble, Bath, Home, ChevronLeft, Star, Armchair, Globe } from "lucide-react";
import ContactPropertyForm from "@/components/public/ContactPropertyForm";
import ListingCard from "@/components/public/ListingCard";
import PanoramaViewer from "@/components/public/PanoramaViewer";
import { motion } from "framer-motion";
import { useState } from "react";

const typeLabels: Record<string, string> = {
  short_rental: "Courte durée",
  long_rental: "Longue durée",
  sale: "Vente",
};

const PropertyDetailPage = () => {
  const { id: slug } = useParams<{ id: string }>();
  const { data: listing, isLoading } = useMarketplaceListing(slug ?? "");
  const { data: similar } = useMarketplaceListings({ listing_type: listing?.listing_type, limit: 4 });
  const [selectedImg, setSelectedImg] = useState(0);

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-[16/9] bg-muted rounded-2xl animate-pulse" />
            <div className="grid grid-cols-4 gap-2">{Array.from({length:4}).map((_,i) => <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />)}</div>
          </div>
          <div className="space-y-4">
            <div className="h-80 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container py-20 text-center">
        <Home className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">Bien introuvable.</p>
        <Link to="/" className="text-primary font-medium text-sm mt-4 inline-block hover:underline">Retour à l'accueil</Link>
      </div>
    );
  }

  const images = listing.images ?? [];
  const similarFiltered = (similar ?? []).filter(s => s.property_id !== listing.property_id).slice(0, 3);

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Retour aux annonces
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Gallery + Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Gallery */}
          {images.length > 0 ? (
            <div className="space-y-3">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden">
                <img
                  src={images[selectedImg]?.url}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.slice(0, 4).map((img: any, i: number) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImg(i)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        i === selectedImg ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[16/9] bg-muted rounded-2xl flex items-center justify-center">
              <Home className="h-20 w-20 text-muted-foreground/15" />
            </div>
          )}

          {/* Title + badges */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className="bg-primary text-primary-foreground">{typeLabels[listing.listing_type]}</Badge>
              <Badge variant="outline" className="capitalize">{listing.property_type}</Badge>
              {listing.furnished && <Badge variant="outline"><Armchair className="h-3 w-3 mr-1" /> Meublé</Badge>}
              {listing.featured && <Badge className="bg-secondary text-secondary-foreground"><Star className="h-3 w-3 mr-1 fill-current" /> Vedette</Badge>}
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">{listing.title}</h1>
            <p className="text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-secondary" />
              {listing.district ? `${listing.district}, ` : ""}{listing.city}
            </p>
          </div>

          {/* Price */}
          <div className="premium-card p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Prix</p>
              <p className="text-3xl font-bold text-foreground">
                {Number(listing.price).toLocaleString()} {listing.currency}
                {listing.listing_type !== "sale" && <span className="text-base font-normal text-muted-foreground ml-1">/mois</span>}
              </p>
            </div>
            <div className="flex gap-6">
              {[
                { icon: Ruler, value: `${Number(listing.surface)} m²`, label: "Surface" },
                { icon: BedDouble, value: listing.rooms, label: "Pièces" },
                { icon: Bath, value: listing.bathrooms, label: "Sdb" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <s.icon className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="font-semibold text-sm">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="premium-card p-6">
              <h3 className="font-display font-semibold text-lg mb-3">Description</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          {/* Amenities */}
          {(listing.amenities ?? []).length > 0 && (
            <div className="premium-card p-6">
              <h3 className="font-display font-semibold text-lg mb-3">Équipements</h3>
              <div className="flex flex-wrap gap-2">
                {listing.amenities!.map((a: string) => (
                  <Badge key={a} variant="secondary" className="px-3 py-1">{a}</Badge>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right: Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <ContactPropertyForm propertyId={listing.property_id} propertyTitle={listing.title} />
        </motion.div>
      </div>

      {/* Similar */}
      {similarFiltered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <h2 className="text-2xl font-display font-bold mb-6">Biens similaires</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {similarFiltered.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PropertyDetailPage;