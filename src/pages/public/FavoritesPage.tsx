import { useFavorites } from "@/hooks/use-favorites";
import { useListingsByPropertyIds } from "@/hooks/use-marketplace";
import ListingCard from "@/components/public/ListingCard";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const FavoritesPage = () => {
  const { ids, persisted } = useFavorites();
  const { data: listings, isLoading } = useListingsByPropertyIds(ids);

  return (
    <div className="container py-10 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold">Mes favoris</h1>
        <p className="text-muted-foreground mt-1">
          {persisted
            ? "Vos biens enregistrés, synchronisés sur votre compte."
            : "Vos biens enregistrés sur cet appareil. Connectez-vous pour les synchroniser."}
        </p>
      </motion.div>

      {isLoading && ids.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="premium-card animate-pulse">
              <div className="aspect-[4/3] bg-muted rounded-t-xl" />
              <div className="p-4 space-y-3"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : (listings ?? []).length === 0 ? (
        <div className="text-center py-20">
          <Heart className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun favori pour le moment.</p>
          <Link to="/long-rental" className="text-primary font-medium text-sm mt-3 inline-block hover:underline">
            Parcourir les biens disponibles
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings!.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
