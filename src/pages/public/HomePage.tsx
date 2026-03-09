import PageShell from "@/components/PageShell";
import { useMarketplaceListings } from "@/hooks/use-marketplace";
import ListingCard from "@/components/public/ListingCard";

const HomePage = () => {
  const { data: featured } = useMarketplaceListings({ featured: true, limit: 6 });
  const { data: latest } = useMarketplaceListings({ limit: 8 });

  return (
    <div>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Trouvez votre bien immobilier idéal
          </h1>
          <p className="text-lg opacity-80 max-w-2xl mx-auto">
            Location courte durée, longue durée ou achat — explorez notre catalogue de biens sélectionnés.
          </p>
        </div>
      </section>

      {/* Featured */}
      {(featured ?? []).length > 0 && (
        <section className="container py-14">
          <h2 className="text-2xl font-display font-bold mb-6">Biens à la une</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured!.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      {/* Latest */}
      <section className="container py-14">
        <h2 className="text-2xl font-display font-bold mb-6">Dernières annonces</h2>
        {(latest ?? []).length === 0 ? (
          <p className="text-muted-foreground">Aucune annonce publiée pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {latest!.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
