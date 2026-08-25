import { useState, useMemo } from "react";
import { useMarketplaceListings } from "@/hooks/use-marketplace";
import ListingCard from "@/components/public/ListingCard";
import ListingFilters, { emptyFilters, type FilterState } from "@/components/public/ListingFilters";
import ListingListItem from "@/components/public/ListingListItem";
import type { ListingType } from "@/types/real-estate";
import { Building2 } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  listingType: ListingType;
  title: string;
  subtitle: string;
}

const ListingPage = ({ listingType, title, subtitle }: Props) => {
  const { data: listings, isLoading } = useMarketplaceListings({ listing_type: listingType });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  const filtered = useMemo(() => {
    if (!listings) return [];
    return listings.filter((l) => {
      const q = filters.search.toLowerCase();
      if (
        q &&
        !l.title.toLowerCase().includes(q) &&
        !l.city.toLowerCase().includes(q) &&
        !(l.district ?? "").toLowerCase().includes(q) &&
        !(l.commune ?? "").toLowerCase().includes(q)
      )
        return false;
      if (filters.city && !l.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.commune && l.commune !== filters.commune) return false;
      if (filters.propertyType && l.property_type !== filters.propertyType) return false;
      if (filters.furnished === "yes" && !l.furnished) return false;
      if (filters.furnished === "no" && l.furnished) return false;
      if (filters.minPrice && Number(l.price) < Number(filters.minPrice)) return false;
      if (filters.maxPrice && Number(l.price) > Number(filters.maxPrice)) return false;
      if (filters.rooms && l.rooms < Number(filters.rooms)) return false;
      if (filters.bedrooms && (l.bedrooms ?? 0) < Number(filters.bedrooms)) return false;
      return true;
    });
  }, [listings, filters]);

  return (
    <div className="container py-10 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </motion.div>

      <ListingFilters
        onFilter={setFilters}
        viewMode={viewMode}
        onViewChange={setViewMode}
        resultCount={filtered.length}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="premium-card animate-pulse">
              <div className="aspect-[4/3] bg-muted rounded-t-xl" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun bien trouvé pour ces critères.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((l, i) => <ListingListItem key={l.id} listing={l} index={i} />)}
        </div>
      )}
    </div>
  );
};

export default ListingPage;
