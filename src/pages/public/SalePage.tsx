import PageShell from "@/components/PageShell";
import { useMarketplaceListings } from "@/hooks/use-marketplace";
import ListingCard from "@/components/public/ListingCard";

const SalePage = () => {
  const { data: listings, isLoading } = useMarketplaceListings({ listing_type: "sale" });

  return (
    <div className="container py-10">
      <PageShell title="Biens à vendre" subtitle="Découvrez nos biens immobiliers à la vente">
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

export default SalePage;
