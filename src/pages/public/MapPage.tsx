import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMarketplaceListings } from "@/hooks/use-marketplace";
import { Building2, MapPin, BedDouble, Ruler, Bath } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MarketplaceListing } from "@/types/real-estate";

// Fix default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const typeLabels: Record<string, string> = {
  short_rental: "Courte durée",
  long_rental: "Longue durée",
  sale: "Vente",
};

const typeColors: Record<string, string> = {
  short_rental: "bg-info text-info-foreground",
  long_rental: "bg-success text-success-foreground",
  sale: "bg-secondary text-secondary-foreground",
};

const MapPage = () => {
  const { data: listings, isLoading } = useMarketplaceListings();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Listings with coordinates
  const geoListings = (listings ?? []).filter(
    (l) => l.latitude != null && l.longitude != null
  );

  // Init map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    leafletMap.current = L.map(mapRef.current, {
      center: [33.57, -7.59], // Casablanca default
      zoom: 12,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(leafletMap.current);
    markersRef.current = L.layerGroup().addTo(leafletMap.current);

    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!leafletMap.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    geoListings.forEach((l) => {
      const marker = L.marker([Number(l.latitude), Number(l.longitude)]);
      marker.bindPopup(
        `<div style="min-width:180px">
          <strong>${l.title}</strong><br/>
          <span>${Number(l.price).toLocaleString()} ${l.currency}</span><br/>
          <span>${l.city}</span><br/>
          <a href="/property/${l.slug}" style="color:#2563eb">Voir le bien →</a>
        </div>`
      );
      marker.on("click", () => setSelected(l.id));
      markersRef.current!.addLayer(marker);
    });

    // Fit bounds if markers exist
    if (geoListings.length > 0) {
      const bounds = L.latLngBounds(
        geoListings.map((l) => [Number(l.latitude), Number(l.longitude)] as [number, number])
      );
      leafletMap.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [listings]);

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-display font-bold mb-1">Carte immobilière</h1>
      <p className="text-muted-foreground mb-6">
        Explorez les biens disponibles sur la carte
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: "75vh" }}>
        {/* Map */}
        <div className="lg:col-span-2 premium-card overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 z-[1000] bg-background/60 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          <div ref={mapRef} className="w-full h-full rounded-xl" />
          {!isLoading && geoListings.length === 0 && (listings ?? []).length > 0 && (
            <div className="absolute inset-0 z-[1000] bg-background/70 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm font-medium">
                  Aucun bien n'a de coordonnées GPS
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ajoutez latitude/longitude à vos biens
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="premium-card p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-muted rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))
          ) : (listings ?? []).length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun bien à afficher</p>
            </div>
          ) : (
            (listings ?? []).map((l) => (
              <SidebarItem
                key={l.id}
                listing={l}
                isSelected={selected === l.id}
                onSelect={() => {
                  setSelected(l.id);
                  if (l.latitude && l.longitude && leafletMap.current) {
                    leafletMap.current.flyTo(
                      [Number(l.latitude), Number(l.longitude)],
                      15,
                      { duration: 0.8 }
                    );
                  }
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const SidebarItem = ({
  listing: l,
  isSelected,
  onSelect,
}: {
  listing: MarketplaceListing;
  isSelected: boolean;
  onSelect: () => void;
}) => (
  <div
    onClick={onSelect}
    className={`premium-card p-3.5 flex gap-3 cursor-pointer transition-all hover:shadow-md ${
      isSelected ? "ring-2 ring-primary shadow-md" : ""
    }`}
  >
    <div className="w-20 h-20 rounded-lg bg-muted shrink-0 overflow-hidden">
      {l.cover_image ? (
        <img src={l.cover_image} alt={l.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Building2 className="h-6 w-6 text-muted-foreground/20" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-1">
        <Link
          to={`/property/${l.slug}`}
          className="font-semibold text-sm truncate hover:text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {l.title}
        </Link>
        <Badge className={`${typeColors[l.listing_type] ?? "bg-muted"} text-[10px] px-1.5 py-0 border-0 shrink-0`}>
          {typeLabels[l.listing_type] ?? l.listing_type}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
        <MapPin className="h-3 w-3" />
        {l.city}
      </p>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
        <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{Number(l.surface)} m²</span>
        <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{l.rooms}</span>
        <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{l.bathrooms}</span>
      </div>
      <p className="font-bold text-sm mt-1 text-primary">
        {Number(l.price).toLocaleString()} {l.currency}
      </p>
    </div>
  </div>
);

export default MapPage;
