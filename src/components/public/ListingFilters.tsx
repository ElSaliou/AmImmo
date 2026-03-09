import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, LayoutGrid, List, X } from "lucide-react";
import { useState } from "react";

interface FilterState {
  search: string;
  city: string;
  minPrice: string;
  maxPrice: string;
  rooms: string;
  propertyType: string;
}

interface Props {
  onFilter: (filters: FilterState) => void;
  viewMode: "grid" | "list";
  onViewChange: (mode: "grid" | "list") => void;
  resultCount?: number;
}

const ListingFilters = ({ onFilter, viewMode, onViewChange, resultCount }: Props) => {
  const [filters, setFilters] = useState<FilterState>({
    search: "", city: "", minPrice: "", maxPrice: "", rooms: "", propertyType: "",
  });
  const [expanded, setExpanded] = useState(false);

  const update = (key: keyof FilterState, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilter(next);
  };

  const reset = () => {
    const empty: FilterState = { search: "", city: "", minPrice: "", maxPrice: "", rooms: "", propertyType: "" };
    setFilters(empty);
    onFilter(empty);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="premium-card p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un bien..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="pl-9 h-10 border-border/60"
          />
        </div>
        <Button
          variant={expanded ? "secondary" : "outline"}
          size="default"
          onClick={() => setExpanded(!expanded)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filtres
        </Button>
        <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={() => onViewChange("grid")}
            className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ville</label>
            <Input
              placeholder="Toutes les villes"
              value={filters.city}
              onChange={(e) => update("city", e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Prix min</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => update("minPrice", e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Prix max</label>
            <Input
              type="number"
              placeholder="∞"
              value={filters.maxPrice}
              onChange={(e) => update("maxPrice", e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pièces min</label>
            <Select value={filters.rooms} onValueChange={(v) => update("rooms", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Result count + reset */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {resultCount !== undefined ? `${resultCount} bien${resultCount > 1 ? "s" : ""} trouvé${resultCount > 1 ? "s" : ""}` : ""}
        </span>
        {hasFilters && (
          <button onClick={reset} className="text-xs text-destructive flex items-center gap-1 hover:underline">
            <X className="h-3 w-3" /> Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
};

export default ListingFilters;