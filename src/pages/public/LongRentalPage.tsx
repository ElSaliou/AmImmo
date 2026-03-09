import PageShell from "@/components/PageShell";
import { useMarketplaceListings } from "@/hooks/use-marketplace";
import ListingCard from "@/components/public/ListingCard";

const LongRentalPage = () => {
  const { data: listings, isLoading } = useMarketplaceListings({ listing_type: "long_rental" });

  return (
    <div className="container py-10">
      <PageShell title="Locations longue durée" subtitle="Biens disponibles à la location longue durée">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement...</p>
        ) : (listings ?? []).length === 0 ? (
          <p className="text-muted-foreground">Aucune annonce disponible.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings!.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </PageShell>
    </div>
  );
};

export default LongRentalPage;
