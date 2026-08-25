import { useParams, Link } from "react-router-dom";
import { useMarketplaceListing, useSimilarListings } from "@/hooks/use-marketplace";
import { Badge } from "@/components/ui/badge";
import { MapPin, Ruler, BedDouble, Bath, Home, ChevronLeft, Star, Armchair, Globe, Video, Maximize, CalendarClock, Building2, Layers } from "lucide-react";
import ContactPropertyForm from "@/components/public/ContactPropertyForm";
import ListingCard from "@/components/public/ListingCard";
import PanoramaViewer from "@/components/public/PanoramaViewer";
import MediaLightbox, { type MediaItem } from "@/components/public/MediaLightbox";
import FavoriteButton from "@/components/public/FavoriteButton";
import ShareActions from "@/components/public/ShareActions";
import { formatDate, formatMoney, listingTypeLabels, propertyTypeLabels } from "@/constants/real-estate";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

const PropertyDetailPage = () => {
  const { id: slug } = useParams<{ id: string }>();
  const { data: listing, isLoading } = useMarketplaceListing(slug ?? "");
  const { data: similar } = useSimilarListings({
    propertyId: listing?.property_id,
    listingType: listing?.listing_type,
    propertyType: listing?.property_type,
    commune: listing?.commune ?? undefined,
    city: listing?.city,
    limit: 3,
  });
  const [selectedImg, setSelectedImg] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = listing?.images ?? [];
  const videos = listing?.videos ?? [];
  const panoramas = images.filter((img: any) => img.is_panorama);
  const regularImages = images.filter((img: any) => !img.is_panorama);
  const standardVideos = videos.filter((v: any) => v.video_type === "standard");
  const tour360Videos = videos.filter((v: any) => v.video_type === "tour_360");
  const similarFiltered = similar ?? [];


  const mediaItems: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = [];
    regularImages.forEach((img: any) => items.push({ type: "image", url: img.url, alt: img.alt }));
    standardVideos.forEach((v: any) => items.push({ type: "video", url: v.url, title: v.title }));
    panoramas.forEach((p: any) => items.push({ type: "panorama", url: p.url }));
    tour360Videos.forEach((v: any) => items.push({ type: "video", url: v.url, title: v.title }));
    return items;
  }, [regularImages, standardVideos, panoramas, tour360Videos]);

  const openLightbox = (mediaType: string, indexInGroup: number) => {
    let offset = 0;
    if (mediaType === "image") offset = 0;
    else if (mediaType === "video") offset = regularImages.length;
    else if (mediaType === "panorama") offset = regularImages.length + standardVideos.length;
    else if (mediaType === "tour360") offset = regularImages.length + standardVideos.length + panoramas.length;
    setLightboxIndex(offset + indexInGroup);
  };

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

  return (
    <div className="container py-8">
      {/* Lightbox */}
      {lightboxIndex !== null && mediaItems.length > 0 && (
        <MediaLightbox
          items={mediaItems}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

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
          {regularImages.length > 0 ? (
            <div className="space-y-3">
              <div
                className="aspect-[16/9] rounded-2xl overflow-hidden relative group cursor-pointer"
                onClick={() => openLightbox("image", selectedImg)}
              >
                <img
                  src={regularImages[selectedImg]?.url}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Maximize className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
              {regularImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {regularImages.slice(0, 4).map((img: any, i: number) => (
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

          {/* Standard Videos */}
          {standardVideos.length > 0 && (
            <div className="premium-card p-6 space-y-4">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Vidéos
              </h3>
              {standardVideos.map((vid: any, i: number) => (
                <div
                  key={vid.id}
                  className="aspect-video rounded-xl overflow-hidden bg-black relative group cursor-pointer"
                  onClick={() => openLightbox("video", i)}
                >
                  <video src={vid.url} className="w-full h-full object-contain" preload="metadata" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Maximize className="h-8 w-8 text-white opacity-60 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 360° Virtual Tour - Panorama Images */}
          {panoramas.length > 0 && (
            <div className="premium-card p-6 space-y-4">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-info" />
                Visite virtuelle 360°
              </h3>
              {panoramas.map((pano: any, i: number) => (
                <div key={pano.id} className="aspect-[16/9] rounded-xl overflow-hidden relative">
                  <PanoramaViewer imageUrl={pano.url} />
                  <button
                    onClick={() => openLightbox("panorama", i)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
                    title="Plein écran"
                  >
                    <Maximize className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 360° Tour Videos */}
          {tour360Videos.length > 0 && (
            <div className="premium-card p-6 space-y-4">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-secondary" />
                Visite guidée 360° (vidéo)
              </h3>
              {tour360Videos.map((vid: any, i: number) => (
                <div
                  key={vid.id}
                  className="aspect-video rounded-xl overflow-hidden bg-black relative group cursor-pointer"
                  onClick={() => openLightbox("tour360", i)}
                >
                  <video src={vid.url} className="w-full h-full object-contain" preload="metadata" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Maximize className="h-8 w-8 text-white opacity-60 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Title + badges */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className="bg-primary text-primary-foreground">{listingTypeLabels[listing.listing_type]}</Badge>
              <Badge variant="outline">{propertyTypeLabels[listing.property_type] ?? listing.property_type}</Badge>
              {listing.furnished && <Badge variant="outline"><Armchair className="h-3 w-3 mr-1" /> Meublé</Badge>}
              {listing.featured && <Badge className="bg-secondary text-secondary-foreground"><Star className="h-3 w-3 mr-1 fill-current" /> Vedette</Badge>}
            </div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">{listing.title}</h1>
              <FavoriteButton propertyId={listing.property_id} size="md" className="shrink-0" />
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-secondary" />
              {[listing.district, listing.commune, listing.city].filter(Boolean).join(", ")}
            </p>
          </div>

          {/* Price */}
          <div className="premium-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Prix</p>
              <p className="text-3xl font-bold text-foreground">
                {formatMoney(listing.price, listing.currency)}
                {listing.listing_type !== "sale" && <span className="text-base font-normal text-muted-foreground ml-1">/mois</span>}
              </p>
              {Number(listing.charges ?? 0) > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  + {formatMoney(listing.charges, listing.currency)} de charges
                </p>
              )}
              {listing.available_from && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" /> Disponible à partir du {formatDate(listing.available_from)}
                </p>
              )}
            </div>
            <div className="flex gap-6">
              {[
                { icon: Ruler, value: `${Number(listing.surface)} m²`, label: "Surface" },
                { icon: Building2, value: listing.rooms, label: "Pièces" },
                { icon: BedDouble, value: listing.bedrooms ?? listing.rooms, label: "Chambres" },
                { icon: Bath, value: listing.bathrooms, label: "Sdb" },
                ...(listing.floor !== null && listing.floor !== undefined
                  ? [{ icon: Layers, value: listing.floor, label: "Étage" }]
                  : []),
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
