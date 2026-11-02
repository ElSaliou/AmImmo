import {
  Link,
  useParams,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import {
  ArrowLeft,
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
  usePublicServiceBySlug,
} from "@/hooks/use-public-services";
import ServiceQuoteForm from "@/components/public/ServiceQuoteForm";

import type {
  PublicServiceWithCategory,
} from "@/hooks/use-public-services";


const fadeUp = {
  initial: {
    opacity: 0,
    y: 20,
  },

  animate: {
    opacity: 1,
    y: 0,
  },

  transition: {
    duration: 0.45,
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


const ServiceDetailPage = () => {
  const {
    slug,
  } =
    useParams<{
      slug: string;
    }>();

  const {
    data: service,
    isLoading,
    isError,
    refetch,
  } =
    usePublicServiceBySlug(
      slug,
    );


  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container py-10 sm:py-14">
          <Skeleton className="mb-8 h-5 w-40" />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <Skeleton className="aspect-[16/9] w-full rounded-3xl" />

              <div className="space-y-4">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
              </div>

              <div className="premium-card space-y-3 p-6">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>

            <div>
              <div className="premium-card space-y-5 p-6">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (isError) {
    return (
      <div className="container py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <RefreshCw className="h-8 w-8 text-destructive" />
        </div>

        <h1 className="mt-5 font-display text-3xl font-bold">
          Impossible de charger cette prestation
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Une erreur est survenue pendant le chargement de la prestation.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={() =>
              void refetch()
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>

          <Button
            asChild
            variant="outline"
          >
            <Link to="/services">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux prestations
            </Link>
          </Button>
        </div>
      </div>
    );
  }


  if (!service) {
    return (
      <div className="container py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <BriefcaseBusiness className="h-8 w-8 text-muted-foreground/30" />
        </div>

        <h1 className="mt-5 font-display text-3xl font-bold">
          Prestation introuvable
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Cette prestation n'existe pas, n'est plus disponible ou n'est pas publiée.
        </p>

        <Button
          asChild
          variant="outline"
          className="mt-7"
        >
          <Link to="/services">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux prestations
          </Link>
        </Button>
      </div>
    );
  }


  const pricingLabel =
    getPricingLabel(
      service,
    );


  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container py-8 sm:py-10">
        <motion.div
          {...fadeUp}
          className="mb-6"
        >
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux prestations
          </Link>
        </motion.div>


        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
          <motion.main
            {...fadeUp}
            className="min-w-0 space-y-6"
          >
            <div className="overflow-hidden rounded-3xl bg-muted shadow-sm">
              {service.cover_image_url ? (
                <img
                  src={service.cover_image_url}
                  alt={service.title}
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center">
                  <ImageIcon className="h-20 w-20 text-muted-foreground/15" />
                </div>
              )}
            </div>

            <div>
              {service.category && (
                <Badge
                  variant="secondary"
                  className="mb-4"
                >
                  {service.category.name}
                </Badge>
              )}

              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {service.title}
              </h1>

              {service.short_description && (
                <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                  {service.short_description}
                </p>
              )}
            </div>

            <section className="premium-card p-6 sm:p-7">
              <h2 className="font-display text-2xl font-bold">
                À propos de cette prestation
              </h2>

              {service.description ? (
                <p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">
                  {service.description}
                </p>
              ) : (
                <p className="mt-4 leading-7 text-muted-foreground">
                  Notre équipe vous accompagne dans la définition de votre besoin
                  et vous propose une solution adaptée à votre projet immobilier.
                </p>
              )}
            </section>
          </motion.main>


          <motion.aside
            {...fadeUp}
            transition={{
              duration: 0.45,
              delay: 0.08,
            }}
            className="lg:sticky lg:top-24 lg:self-start"
          >
            <div className="premium-card overflow-hidden">
              <div className="gradient-primary p-6 text-primary-foreground">
                <p className="text-sm font-medium text-primary-foreground/75">
                  Tarif
                </p>

                <p className="mt-1 font-display text-2xl font-bold">
                  {pricingLabel}
                </p>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <h2 className="font-display text-xl font-bold">
                    Parlons de votre projet
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Décrivez votre besoin à notre équipe afin d'obtenir un
                    accompagnement personnalisé.
                  </p>
                </div>

                <div
                  id="devis"
                  className="rounded-2xl border bg-muted/30 p-4"
                >
                  <div className="mb-5">
                    <p className="text-sm font-medium">
                      Demande de devis
                    </p>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Décrivez votre besoin pour cette prestation. Notre équipe
                      vous répondra avec les informations adaptées à votre projet.
                    </p>
                  </div>

                  <ServiceQuoteForm
                    serviceId={service.id}
                    serviceTitle={service.title}
                  />
                </div>

                <Button
                  asChild
                  size="lg"
                  className="w-full"
                >
                  <Link to="/contact">
                    Demander un devis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                >
                  <Link to="/services">
                    Voir les autres prestations
                  </Link>
                </Button>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
};


export default ServiceDetailPage;