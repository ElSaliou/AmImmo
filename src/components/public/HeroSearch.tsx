import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HeroSearch = () => {
  const navigate = useNavigate();
  const [listingType, setListingType] = useState("long_rental");
  const [city, setCity] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    const path = listingType === "sale" ? "/sale" : listingType === "short_rental" ? "/short-rental" : "/long-rental";
    navigate(`${path}${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div className="glass-card rounded-2xl p-2 max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row gap-2">
        {/* Type */}
        <Select value={listingType} onValueChange={setListingType}>
          <SelectTrigger className="md:w-52 h-12 border-0 bg-background/60 rounded-xl text-sm font-medium">
            <Home className="h-4 w-4 mr-2 text-secondary" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short_rental">Location courte durée</SelectItem>
            <SelectItem value="long_rental">Location longue durée</SelectItem>
            <SelectItem value="sale">Achat</SelectItem>
          </SelectContent>
        </Select>

        {/* City */}
        <div className="relative flex-1">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ville, quartier ou adresse..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="pl-10 h-12 border-0 bg-background/60 rounded-xl text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>

        {/* Search */}
        <Button
          onClick={handleSearch}
          variant="premium"
          size="lg"
          className="h-12 px-6 rounded-xl"
        >
          <Search className="h-4 w-4 mr-2" />
          Rechercher
        </Button>
      </div>
    </div>
  );
};

export default HeroSearch;