import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, LayoutGrid, List, X } from "lucide-react";
import { useState } from "react";
import { conakryCommunes, propertyTypeLabels } from "@/constants/real-estate";

export interface FilterState {
  search: string;
  city: string;
  commune: string;
  minPrice: string;
  maxPrice: string;
  rooms: string;
  bedrooms: string;
  propertyType: string;
  furnished: string;
}

export const emptyFilters: FilterState = {
  search: "", city: "", commune: "", minPrice: "", maxPrice: "", rooms: "", bedrooms: "", propertyType: "", furnished: "",
};

interface Props {
  onFilter: (filters: FilterState) => void;
  viewMode: "grid" | "list";
  onViewChange: (mode: "grid" | "list") => void;
  resultCount?: number;
}

const ALL = "__all__";

const ListingFilters = ({ onFilter, viewMode, onViewChange, resultCount }: Props) => {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [expanded, setExpanded] = useState(false);

  const update = (key: keyof FilterState, value: string) => {
    const next = { ...filters, [key]: value === ALL ? "" : value };
    setFilters(next);
    onFilter(next);
  };

  const reset = () => {
    setFilters(emptyFilters);
    onFilter(emptyFilters);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="premium-card p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un bien, un quartier..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="pl-9 h-10 border-border/60"
          />
        </div>
        <Button variant={expanded ? "secondary" : "outline"} onClick={() => setExpanded(!expanded)}>
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filtres
        </Button>
        <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={() => onViewChange("grid")}
            aria-label="Vue grille"
            className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewChange("list")}
            aria-label="Vue liste"
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
            <Input placeholder="Toutes les villes" value={filters.city} onChange={(e) => update("city", e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Commune</label>
            <Select value={filters.commune || ALL} onValueChange={(v) => update("commune", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {conakryCommunes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Type de bien</label>
            <Select value={filters.propertyType || ALL} onValueChange={(v) => update("propertyType", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {Object.entries(propertyTypeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Meublé</label>
            <Select value={filters.furnished || ALL} onValueChange={(v) => update("furnished", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Peu importe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Peu importe</SelectItem>
                <SelectItem value="yes">Meublé</SelectItem>
                <SelectItem value="no">Non meublé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Prix min (GNF)</label>
            <Input type="number" placeholder="0" value={filters.minPrice} onChange={(e) => update("minPrice", e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Prix max (GNF)</label>
            <Input type="number" placeholder="∞" value={filters.maxPrice} onChange={(e) => update("maxPrice", e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pièces min</label>
            <Select value={filters.rooms || ALL} onValueChange={(v) => update("rooms", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Chambres min</label>
            <Select value={filters.bedrooms || ALL} onValueChange={(v) => update("bedrooms", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
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
