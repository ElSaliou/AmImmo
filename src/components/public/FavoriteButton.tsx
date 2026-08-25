import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  propertyId: string;
  className?: string;
  size?: "sm" | "md";
}

const FavoriteButton = ({ propertyId, className, size = "sm" }: Props) => {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(propertyId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowActive = await toggle(propertyId);
    toast.success(nowActive ? "Ajouté à vos favoris" : "Retiré de vos favoris");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "rounded-full bg-background/85 backdrop-blur-sm border border-border/60 flex items-center justify-center transition-all hover:scale-110",
        size === "sm" ? "h-9 w-9" : "h-11 w-11",
        className,
      )}
    >
      <Heart className={cn(size === "sm" ? "h-4 w-4" : "h-5 w-5", active ? "fill-destructive text-destructive" : "text-foreground")} />
    </button>
  );
};

export default FavoriteButton;
