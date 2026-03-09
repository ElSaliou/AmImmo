import PageShell from "@/components/PageShell";
import { useMarketplaceListings } from "@/hooks/use-marketplace";
import { Building2, MapPin } from "lucide-react";

const MapPage = () => {
  const { data: listings } = useMarketplaceListings();

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-display font-bold mb-2">Carte immobilière</h1>
      <p className="text-muted-foreground mb-6">Explorez les biens disponibles sur la carte</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: "70vh" }}>
        {/* Map placeholder */}
        <div className="lg:col-span-2 premium-card flex items-center justify-center bg-muted/50">
          <div className="text-center">
            <MapPin className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Carte interactive</p>
            <p className="text-sm text-muted-foreground mt-1">Intégration cartographique à venir</p>
          </div>
        </div>

        {/* Listing sidebar */}
        <div className="overflow-y-auto space-y-3 pr-1">
          {(listings ?? []).length === 0 ? (
            <div className="text-center py-10">
              <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun bien à afficher</p>
            </div>
          ) : (
            listings!.map((l) => (
              <a
                key={l.id}
                href={`/property/${l.slug}`}
                className="premium-card p-4 flex gap-3 hover:shadow-[var(--shadow-lg)] transition-all"
              >
                <div className="w-20 h-20 rounded-lg bg-muted shrink-0 overflow-hidden">
                  {l.cover_image ? (
                    <img src={l.cover_image} alt={l.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Building2 className="h-6 w-6 text-muted-foreground/20" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{l.title}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{l.city}</p>
                  <p className="font-bold text-sm mt-1">{Number(l.price).toLocaleString()} {l.currency}</p>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;