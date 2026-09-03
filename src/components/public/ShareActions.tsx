import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Share2,
  Copy,
  MessageCircle,
  Facebook,
  Mail,
} from "lucide-react";

import { toast } from "sonner";

import type {
  PropertyStatus,
} from "@/types/real-estate";

interface Props {
  title: string;

  /**
   * Numéro WhatsApp de l'agence
   * au format international sans "+"
   */
  agencyPhone?: string;

  propertyStatus?: PropertyStatus | null;
}

const ShareActions = ({
  title,
  agencyPhone = "224620000000",
  propertyStatus = "published",
}: Props) => {
  const url =
    typeof window !== "undefined"
      ? window.location.href
      : "";

  const status =
    propertyStatus ?? "published";

  const isAvailable =
    status === "published";

  const statusLabels: Partial<
    Record<PropertyStatus, string>
  > = {
    published: "Disponible",
    reserved: "Réservé",
    rented: "Loué",
    sold: "Vendu",
    maintenance: "Maintenance",
    unavailable: "Indisponible",
  };

  const statusLabel =
    statusLabels[status] ??
    status;

  /*
   * Le statut est inclus dans le texte partagé.
   * Cela renforce la transparence.
   */
  const text =
    status === "published"
      ? `${title} — ${url}`
      : `${title} — Statut : ${statusLabel} — ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);

      toast.success(
        "Lien copié",
      );
    } catch {
      toast.error(
        "Impossible de copier le lien",
      );
    }
  };

  const nativeShare =
    async () => {
      if (
        navigator.share
      ) {
        try {
          await navigator.share({
            title:
              status ===
              "published"
                ? title
                : `${title} — ${statusLabel}`,

            text:
              status ===
              "published"
                ? undefined
                : `Statut du bien : ${statusLabel}`,

            url,
          });

          return true;
        } catch {
          return true;
        }
      }

      return false;
    };

  return (
    <div className="flex gap-2">
      {/* ================================= */}
      {/* CONTACT WHATSAPP                  */}
      {/* ================================= */}

      {isAvailable && (
        <Button
          variant="outline"
          className="flex-1"
          onClick={() =>
            window.open(
              `https://wa.me/${agencyPhone}?text=${encodeURIComponent(
                `Bonjour, je suis intéressé(e) par : ${text}`,
              )}`,
              "_blank",
            )
          }
        >
          <MessageCircle className="h-4 w-4 mr-2" />

          WhatsApp
        </Button>
      )}

      {/* ================================= */}
      {/* PARTAGE                           */}
      {/* ================================= */}

      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
        >
          <Button
            variant="outline"
            className={
              isAvailable
                ? undefined
                : "w-full"
            }
            onClick={async (
              e,
            ) => {
              if (
                await nativeShare()
              ) {
                e.preventDefault();
              }
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />

            Partager
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={copy}
          >
            <Copy className="h-4 w-4 mr-2" />

            Copier le lien
          </DropdownMenuItem>

          {/* WhatsApp de partage uniquement si disponible */}

          {isAvailable && (
            <DropdownMenuItem
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(
                    text,
                  )}`,
                  "_blank",
                )
              }
            >
              <MessageCircle className="h-4 w-4 mr-2" />

              Envoyer via WhatsApp
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() =>
              window.open(
                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  url,
                )}`,
                "_blank",
              )
            }
          >
            <Facebook className="h-4 w-4 mr-2" />

            Facebook
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              window.open(
                `mailto:?subject=${encodeURIComponent(
                  status ===
                    "published"
                    ? title
                    : `${title} — ${statusLabel}`,
                )}&body=${encodeURIComponent(
                  text,
                )}`,
              )
            }
          >
            <Mail className="h-4 w-4 mr-2" />

            Email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ShareActions;