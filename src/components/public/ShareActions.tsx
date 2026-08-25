import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Share2, Copy, MessageCircle, Facebook, Mail } from "lucide-react";
import { toast } from "sonner";

interface Props {
  title: string;
  /** Numéro WhatsApp de l'agence au format international, sans "+" */
  agencyPhone?: string;
}

const ShareActions = ({ title, agencyPhone = "224620000000" }: Props) => {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = `${title} — ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return true;
      } catch {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="flex-1"
        onClick={() => window.open(`https://wa.me/${agencyPhone}?text=${encodeURIComponent(`Bonjour, je suis intéressé(e) par : ${text}`)}`, "_blank")}
      >
        <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" onClick={async (e) => { if (await nativeShare()) e.preventDefault(); }}>
            <Share2 className="h-4 w-4 mr-2" /> Partager
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={copy}><Copy className="h-4 w-4 mr-2" /> Copier le lien</DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")}>
            <MessageCircle className="h-4 w-4 mr-2" /> Envoyer via WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank")}>
            <Facebook className="h-4 w-4 mr-2" /> Facebook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`)}>
            <Mail className="h-4 w-4 mr-2" /> Email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ShareActions;
