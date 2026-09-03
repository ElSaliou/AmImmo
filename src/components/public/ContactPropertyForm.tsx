import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  Phone,
  Mail,
  User,
  Clock3,
  KeyRound,
  BadgeCheck,
  CircleOff,
  Wrench,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { useCreateLeadPublic } from "@/hooks/use-leads";

import type {
  PropertyStatus,
} from "@/types/real-estate";

interface Props {
  propertyId?: string;
  propertyTitle?: string;

  propertyStatus?: PropertyStatus | null;
}

const statusConfig: Record<
  PropertyStatus,
  {
    label: string;
    title: string;
    message: string;
    icon: typeof CheckCircle2;
    className: string;
    available: boolean;
  }
> = {
  published: {
    label: "Disponible",
    title: "Demander une visite",
    message:
      "Ce bien est actuellement disponible.",
    icon: CheckCircle2,
    className:
      "bg-emerald-600 text-white",
    available: true,
  },

  reserved: {
    label: "Réservé",
    title: "Ce bien est réservé",
    message:
      "Une réservation est actuellement en cours sur ce bien. Il n'est donc plus proposé à de nouveaux candidats pour le moment.",
    icon: Clock3,
    className:
      "bg-amber-500 text-white",
    available: false,
  },

  rented: {
    label: "Loué",
    title: "Ce bien a été loué",
    message:
      "Ce logement est désormais occupé et n'est plus disponible à la location.",
    icon: KeyRound,
    className:
      "bg-blue-600 text-white",
    available: false,
  },

  sold: {
    label: "Vendu",
    title: "Ce bien a été vendu",
    message:
      "La transaction concernant ce bien est terminée. Il n'est plus disponible à la vente.",
    icon: BadgeCheck,
    className:
      "bg-slate-800 text-white",
    available: false,
  },

  maintenance: {
    label: "Maintenance",
    title: "Temporairement indisponible",
    message:
      "Ce bien est actuellement en maintenance et ne peut pas faire l'objet d'une visite.",
    icon: Wrench,
    className:
      "bg-orange-600 text-white",
    available: false,
  },

  unavailable: {
    label: "Indisponible",
    title: "Ce bien n'est pas disponible",
    message:
      "Ce bien est temporairement retiré de la commercialisation.",
    icon: CircleOff,
    className:
      "bg-muted-foreground text-background",
    available: false,
  },

  draft: {
    label: "Brouillon",
    title: "Bien indisponible",
    message:
      "Ce bien n'est actuellement pas ouvert aux demandes.",
    icon: CircleOff,
    className:
      "bg-muted text-muted-foreground",
    available: false,
  },

  archived: {
    label: "Archivé",
    title: "Annonce archivée",
    message:
      "Cette annonce n'est plus commercialisée.",
    icon: CircleOff,
    className:
      "bg-muted text-muted-foreground",
    available: false,
  },
};

const ContactPropertyForm = ({
  propertyId,
  propertyTitle,
  propertyStatus = "published",
}: Props) => {
  const createLead =
    useCreateLeadPublic();

  const [form, setForm] =
    useState({
      full_name: "",
      email: "",
      phone: "",
      message: "",
    });

  const status =
    propertyStatus ??
    "published";

  const config =
    statusConfig[status];

  const StatusIcon =
    config.icon;

  const isAvailable =
    config.available;

  const handleSubmit = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    /*
     * Sécurité côté interface :
     * même si quelqu'un tente de soumettre
     * le formulaire manuellement,
     * aucune demande n'est envoyée pour
     * un bien indisponible.
     */
    if (
      propertyId &&
      !isAvailable
    ) {
      toast.error(
        `Ce bien est actuellement ${config.label.toLowerCase()}.`,
      );

      return;
    }

    try {
      await createLead.mutateAsync({
        ...form,

        property_id:
          propertyId ?? null,

        source: "website",

        status: "new",
      });

      toast.success(
        "Votre demande a été envoyée avec succès !",
      );

      setForm({
        full_name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (err: any) {
      toast.error(
        err?.message ??
          "Impossible d'envoyer votre demande.",
      );
    }
  };

  /*
   * ==========================================================
   * BIEN NON DISPONIBLE
   * ==========================================================
   */

  if (
    propertyId &&
    !isAvailable
  ) {
    return (
      <motion.div
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="premium-card p-6 space-y-5"
      >
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <StatusIcon className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Badge
              className={`${config.className} border-0`}
            >
              <StatusIcon className="h-3.5 w-3.5 mr-1.5" />

              {config.label}
            </Badge>

            <h3 className="font-display font-semibold text-lg text-foreground">
              {config.title}
            </h3>
          </div>
        </div>

        {propertyTitle && (
          <p className="text-sm">
            <span className="text-muted-foreground">
              Bien :
            </span>{" "}

            <strong>
              {propertyTitle}
            </strong>
          </p>
        )}

        <div className="rounded-xl bg-muted/60 p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {config.message}
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm font-medium">
            Vous recherchez un bien similaire ?
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            Consultez les annonces actuellement disponibles.
          </p>
        </div>

        <Button
          asChild
          className="w-full"
          size="lg"
        >
          <Link to="/">
            Voir les biens disponibles

            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Le statut affiché correspond à l'état actuel du bien dans notre système de gestion.
        </p>
      </motion.div>
    );
  }

  /*
   * ==========================================================
   * BIEN DISPONIBLE / CONTACT GÉNÉRAL
   * ==========================================================
   */

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="premium-card p-6 space-y-5"
    >
      <div>
        {propertyId && (
          <Badge className="bg-emerald-600 text-white border-0 mb-3">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />

            Disponible
          </Badge>
        )}

        <h3 className="font-display font-semibold text-lg text-foreground">
          {propertyTitle
            ? "Demander une visite"
            : "Nous contacter"}
        </h3>

        {propertyTitle && (
          <p className="text-sm text-muted-foreground mt-1">
            Pour : {propertyTitle}
          </p>
        )}
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-4"
      >
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <User className="h-3 w-3" />
            Nom complet
          </Label>

          <Input
            value={
              form.full_name
            }
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                full_name:
                  e.target
                    .value,
              }))
            }
            placeholder="Votre nom"
            className="h-11"
            required
          />
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Mail className="h-3 w-3" />
            Email
          </Label>

          <Input
            type="email"
            value={
              form.email
            }
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                email:
                  e.target
                    .value,
              }))
            }
            placeholder="votre@email.com"
            className="h-11"
            required
          />
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            Téléphone
          </Label>

          <Input
            value={
              form.phone
            }
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                phone:
                  e.target
                    .value,
              }))
            }
            placeholder="+224 600 00 00 00"
            className="h-11"
          />
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5">
            Message
          </Label>

          <Textarea
            rows={4}
            value={
              form.message
            }
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                message:
                  e.target
                    .value,
              }))
            }
            placeholder="Décrivez votre besoin..."
            required
          />
        </div>

        <Button
          type="submit"
          variant="premium"
          className="w-full"
          size="lg"
          disabled={
            createLead.isPending
          }
        >
          <Send className="h-4 w-4" />

          {createLead.isPending
            ? "Envoi en cours..."
            : "Envoyer ma demande"}
        </Button>
      </form>

      {propertyId && (
        <div className="pt-3 border-t">
          <a
            href={`https://wa.me/${
              import.meta.env
                .VITE_AGENCY_WHATSAPP ??
              "224620000000"
            }?text=${encodeURIComponent(
              `Bonjour, je suis intéressé par le bien : ${propertyTitle}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-11 rounded-lg bg-[hsl(142,70%,45%)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>

            Contacter via WhatsApp
          </a>
        </div>
      )}
    </motion.div>
  );
};

export default ContactPropertyForm;