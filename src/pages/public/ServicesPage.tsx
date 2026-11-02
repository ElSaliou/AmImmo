import {
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import {
  ArrowRight,
  BriefcaseBusiness,
  ImageIcon,
  RefreshCw,
} from "lucide-react";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Skeleton,
} from "@/components/ui/skeleton";

import {
  usePublicServiceCategories,
  usePublicServices,
} from "@/hooks/use-public-services";

import type {
  PublicServiceWithCategory,
} from "@/hooks/use-public-services";


const fadeUp = {
  initial: {
    opacity: 0,
    y: 20,
  },

  whileInView: {
    opacity: 1,
    y: 0,
  },

  viewport: {
    once: true,
    margin: "-40px",
  },

  transition: {
    duration: 0.5,
  },
};


const formatMoney = (
  value: number,
  currency: string,
) =>
  `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(value)} ${currency}`;


const getPricingLabel = (
  service:
    PublicServiceWithCategory,
) => {
  if (
    service.pricing_mode ===
      "free"
  ) {
    return "Gratuit";
  }

  if (
    service.pricing_mode ===
      "quote"
  ) {
    return "Sur devis";
  }

  if (
    service.starting_price ===
      null
  ) {
    return "Tarif sur demande";
  }

  const formattedPrice =
    formatMoney(
      Number(
        service.starting_price,
      ),
      service.currency,
    );

  if (
    service.pricing_mode ===
      "starting_from"
  ) {
    return `À partir de ${formattedPrice}`;
  }

  return formattedPrice;
};


const ServicesPage = () => {
  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] =
    useState<string | null>(
      null,
    );

  const {
    data: categories = [],
    isLoading:
      categoriesLoading,
    isError:
      categoriesError,
    refetch:
      refetchCategories,
  } =
    usePublicServiceCategories();

  const {
    data: services = [],
    isLoading:
      servicesLoading,
    isError:
      servicesError,
    refetch:
      refetchServices,
  } =
    usePublicServices();


  const filteredServices =
    useMemo(
      () => {
        if (
          !selectedCategoryId
        ) {
          return services;
        }

        return services.filter(
          (service) =>
            service.category_id ===
            selectedCategoryId,
        );
      },
      [
        services,
        selectedCategoryId,
      ],
    );


  const isLoading =
    categoriesLoading ||
    servicesLoading;

  const hasError =
    categoriesError ||
    servicesError;


  const handleRetry =
    () => {
      void Promise.all([
        refetchCategories(),
        refetchServices(),
      ]);
    };


  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="border-b bg-muted/30">
        <div className="container py-12 sm:py-16">
          <motion.div
            {...fadeUp}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg">
              <BriefcaseBusiness className="h-7 w-7 text-primary-foreground" />
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Nos prestations
            </p>

            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Des services immobiliers pensés pour vos projets
            </h1>

            <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
              Découvrez les prestations proposées par notre agence et choisissez
              l'accompagnement adapté à votre besoin.
            </p>
          </motion.div>
        </div>
      </section>


      {/* CONTENT */}
      <section className="py-10 sm:py-14">
        <div className="container">

          {/* CATEGORY FILTERS */}
          {!categoriesError &&
            !categoriesLoading &&
            categories.length >
              0 && (
              <motion.div
                {...fadeUp}
                className="mb-9 flex flex-wrap justify-center gap-2"
              >
                <Button
                  type="button"
                  variant={
                    selectedCategoryId ===
                    null
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setSelectedCategoryId(
                      null,
                    )
                  }
                >
                  Toutes
                </Button>

                {categories.map(
                  (category) => (
                    <Button
                      key={
                        category.id
                      }
                      type="button"
                      variant={
                        selectedCategoryId ===
                        category.id
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setSelectedCategoryId(
                          category.id,
                        )
                      }
                    >
                      {category.name}
                    </Button>
                  ),
                )}
              </motion.div>
            )}


          {/* LOADING */}
          {isLoading && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({
                length: 6,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="premium-card overflow-hidden"
                  >
                    <Skeleton className="aspect-[16/9] w-full rounded-none" />

                    <div className="space-y-4 p-6">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-7 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-9 w-32" />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}


          {/* ERROR */}
          {!isLoading &&
            hasError && (
              <div className="mx-auto max-w-xl py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                  <RefreshCw className="h-7 w-7 text-destructive" />
                </div>

                <h2 className="mt-5 font-display text-2xl font-bold">
                  Impossible de charger les prestations
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Une erreur est survenue pendant le chargement. Vous pouvez
                  réessayer dans quelques instants.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-6"
                  onClick={
                    handleRetry
                  }
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Réessayer
                </Button>
              </div>
            )}


          {/* EMPTY */}
          {!isLoading &&
            !hasError &&
            filteredServices.length ===
              0 && (
              <div className="mx-auto max-w-xl py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <BriefcaseBusiness className="h-8 w-8 text-muted-foreground/40" />
                </div>

                <h2 className="mt-5 font-display text-2xl font-bold">
                  Aucune prestation disponible
                </h2>

                <p className="mt-2 text-muted-foreground">
                  {selectedCategoryId
                    ? "Aucune prestation n'est publiée dans cette catégorie pour le moment."
                    : "Nos prochaines prestations seront bientôt disponibles ici."}
                </p>

                {selectedCategoryId && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6"
                    onClick={() =>
                      setSelectedCategoryId(
                        null,
                      )
                    }
                  >
                    Voir toutes les prestations
                  </Button>
                )}
              </div>
            )}


          {/* SERVICE GRID */}
          {!isLoading &&
            !hasError &&
            filteredServices.length >
              0 && (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredServices.map(
                  (
                    service,
                    index,
                  ) => (
                    <motion.article
                      key={
                        service.id
                      }
                      {...fadeUp}
                      transition={{
                        duration:
                          0.45,
                        delay:
                          Math.min(
                            index *
                              0.05,
                            0.25,
                          ),
                      }}
                      className="premium-card group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                        {service.cover_image_url ? (
                          <img
                            src={
                              service.cover_image_url
                            }
                            alt={
                              service.title
                            }
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
                          </div>
                        )}

                        {service.category && (
                          <Badge className="absolute left-4 top-4 border-0 bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background/90">
                            {
                              service
                                .category
                                .name
                            }
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-6">
                        <h2 className="font-display text-xl font-bold">
                          {
                            service.title
                          }
                        </h2>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {service.short_description ||
                            service.description ||
                            "Découvrez cette prestation et contactez notre équipe pour obtenir plus d'informations."}
                        </p>

                        <div className="mt-5 border-t pt-5">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Tarif
                          </p>

                          <p className="mt-1 font-semibold text-primary">
                            {
                              getPricingLabel(
                                service,
                              )
                            }
                          </p>
                        </div>

                        <div className="mt-auto pt-6">
                          <Button
                            asChild
                            className="w-full"
                          >
                            <Link
                              to={`/services/${service.slug}`}
                            >
                              Découvrir

                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </motion.article>
                  ),
                )}
              </div>
            )}
        </div>
      </section>


      {/* FINAL CTA */}
      <section className="pb-14 sm:pb-16">
        <div className="container">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-[2rem] gradient-primary px-6 py-10 text-center text-primary-foreground shadow-xl sm:px-10 sm:py-12"
          >
            <h2 className="font-display text-3xl font-bold">
              Vous ne savez pas quelle prestation choisir ?
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-primary-foreground/75">
              Présentez-nous votre projet. Notre équipe vous orientera vers la
              solution la plus adaptée à votre besoin.
            </p>

            <Button
              asChild
              variant="hero"
              size="lg"
              className="mt-7"
            >
              <Link to="/contact">
                Nous contacter

                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};


export default ServicesPage;