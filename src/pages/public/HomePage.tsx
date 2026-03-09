import { Link } from "react-router-dom";
import { useMarketplaceListings } from "@/hooks/use-marketplace";
import ListingCard from "@/components/public/ListingCard";
import HeroSearch from "@/components/public/HeroSearch";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Key, ShieldCheck, Headphones } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-property.jpg";
import villaImg from "@/assets/featured-villa.jpg";
import aptImg from "@/assets/featured-apartment.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6 },
};

const services = [
  { icon: Key, title: "Location", desc: "Courte et longue durée, des biens sélectionnés avec soin." },
  { icon: Building2, title: "Vente", desc: "Appartements, villas et terrains aux meilleurs prix du marché." },
  { icon: ShieldCheck, title: "Gestion", desc: "Gestion locative complète et suivi de maintenance." },
  { icon: Headphones, title: "Accompagnement", desc: "Un conseiller dédié pour chaque étape de votre projet." },
];

const HomePage = () => {
  const { data: featured } = useMarketplaceListings({ featured: true, limit: 6 });
  const { data: latest } = useMarketplaceListings({ limit: 8 });

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Luxury interior" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,25%,10%,0.65)] via-[hsl(220,25%,10%,0.5)] to-[hsl(220,25%,10%,0.75)]" />
        </div>
        <div className="relative container text-center z-10 pt-20 pb-16">
          <motion.div {...fadeUp}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/20 backdrop-blur-sm text-secondary text-sm font-medium mb-6">
              <Building2 className="h-3.5 w-3.5" /> Plateforme immobilière premium
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-[hsl(0,0%,100%)] mb-5 leading-tight">
              Votre prochain chez-vous<br />
              <span className="text-secondary">vous attend ici</span>
            </h1>
            <p className="text-lg text-[hsl(0,0%,100%,0.75)] max-w-2xl mx-auto mb-10 leading-relaxed">
              Découvrez des biens d'exception — location courte durée, longue durée ou achat.
              Une expérience immobilière moderne et transparente.
            </p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
            <HeroSearch />
          </motion.div>

          {/* Stats */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-8 mt-14"
          >
            {[
              { value: "500+", label: "Biens disponibles" },
              { value: "98%", label: "Clients satisfaits" },
              { value: "15+", label: "Villes couvertes" },
              { value: "24/7", label: "Support client" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-secondary">{stat.value}</p>
                <p className="text-sm text-[hsl(0,0%,100%,0.6)]">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section-padding">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Explorez nos offres
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Trouvez le bien qui correspond à vos besoins parmi nos trois catégories.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { img: aptImg, title: "Location courte durée", desc: "Séjours flexibles, appartements meublés", link: "/short-rental" },
              { img: heroImg, title: "Location longue durée", desc: "Baux classiques, logements de qualité", link: "/long-rental" },
              { img: villaImg, title: "Vente", desc: "Devenez propriétaire d'un bien d'exception", link: "/sale" },
            ].map((cat, i) => (
              <motion.div key={cat.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Link to={cat.link} className="group block relative h-80 rounded-2xl overflow-hidden premium-card-hover">
                  <img src={cat.img} alt={cat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,25%,8%,0.85)] via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-display font-bold text-[hsl(0,0%,100%)] mb-1">{cat.title}</h3>
                    <p className="text-sm text-[hsl(0,0%,100%,0.7)]">{cat.desc}</p>
                    <span className="inline-flex items-center gap-1 text-secondary text-sm font-semibold mt-3 group-hover:gap-2 transition-all">
                      Explorer <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {(featured ?? []).length > 0 && (
        <section className="section-padding bg-muted/50">
          <div className="container">
            <motion.div {...fadeUp} className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl font-display font-bold">Biens vedettes</h2>
                <p className="text-muted-foreground mt-1">Sélection exclusive de nos meilleurs biens</p>
              </div>
              <Link to="/sale">
                <Button variant="outline">
                  Voir tout <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured!.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* LATEST */}
      <section className="section-padding">
        <div className="container">
          <motion.div {...fadeUp} className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-display font-bold">Dernières annonces</h2>
              <p className="text-muted-foreground mt-1">Les biens les plus récemment publiés</p>
            </div>
          </motion.div>
          {(latest ?? []).length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune annonce publiée pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {latest!.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* SERVICES */}
      <section className="section-padding bg-muted/50">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Nos services</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Un accompagnement complet pour tous vos projets immobiliers.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s, i) => (
              <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <div className="premium-card p-6 text-center h-full">
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                    <s.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container">
          <motion.div {...fadeUp}>
            <div className="relative rounded-3xl overflow-hidden">
              <img src={villaImg} alt="CTA background" className="w-full h-64 md:h-80 object-cover" />
              <div className="absolute inset-0 gradient-primary opacity-85" />
              <div className="absolute inset-0 flex items-center justify-center text-center px-6">
                <div>
                  <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
                    Prêt à trouver votre bien idéal ?
                  </h2>
                  <p className="text-primary-foreground/75 mb-6 max-w-lg mx-auto">
                    Contactez notre équipe d'experts pour un accompagnement personnalisé.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to="/contact">
                      <Button variant="hero" size="lg">
                        Nous contacter
                      </Button>
                    </Link>
                    <Link to="/long-rental">
                      <Button variant="hero-outline" size="lg">
                        Explorer les biens
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;