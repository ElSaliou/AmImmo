import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useCreateProperty, useUpdateProperty, useProperty } from "@/hooks/use-properties";
import { useOwners } from "@/hooks/use-owners";
import { useBuildings } from "@/hooks/use-buildings";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import type { PropertyInsert } from "@/types/real-estate";
import PropertyImageUpload from "./PropertyImageUpload";
import { Home, MapPin, Ruler, Users, Settings2, Plus, Loader2, Tag } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId?: string;
}

const defaultForm: PropertyInsert = {
  title: "",
  slug: "",
  description: "",
  price: 0,
  property_type: "apartment",
  listing_type: "long_rental",
  city: "",
  district: "",
  address: "",
  surface: 0,
  rooms: 1,
  bathrooms: 1,
  furnished: false,
  published: false,
  featured: false,
};

const propertyTypeLabels: Record<string, string> = {
  apartment: "Appartement",
  house: "Maison",
  villa: "Villa",
  studio: "Studio",
  commercial: "Commercial",
  land: "Terrain",
  other: "Autre",
};

const PropertyFormDialog = ({ open, onOpenChange, propertyId }: Props) => {
  const { data: existing } = useProperty(propertyId ?? "");
  const { data: owners } = useOwners();
  const { data: buildings } = useBuildings();
  const createMut = useCreateProperty();
  const updateMut = useUpdateProperty();
  const [form, setForm] = useState<PropertyInsert>(defaultForm);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const activePropertyId = propertyId ?? createdId;
  const isPending = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (propertyId && existing) {
      setForm({
        title: existing.title,
        slug: existing.slug,
        description: existing.description,
        price: Number(existing.price),
        property_type: existing.property_type,
        listing_type: existing.listing_type,
        city: existing.city,
        district: existing.district,
        address: existing.address,
        surface: Number(existing.surface),
        rooms: existing.rooms,
        bathrooms: existing.bathrooms,
        furnished: existing.furnished,
        published: existing.published,
        featured: existing.featured,
        owner_id: existing.owner_id,
        building_id: existing.building_id,
        latitude: existing.latitude ? Number(existing.latitude) : undefined,
        longitude: existing.longitude ? Number(existing.longitude) : undefined,
      });
    } else if (!propertyId) {
      setForm(defaultForm);
      setCreatedId(null);
    }
  }, [propertyId, existing]);

  useEffect(() => {
    if (!open) setCreatedId(null);
  }, [open]);

  const set = <K extends keyof PropertyInsert>(key: K, value: PropertyInsert[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || generateSlug(form.title);
    const payload = { ...form, slug };
    try {
      if (propertyId) {
        await updateMut.mutateAsync({ id: propertyId, ...payload });
        toast.success("Bien mis à jour");
      } else if (createdId) {
        await updateMut.mutateAsync({ id: createdId, ...payload });
        toast.success("Bien mis à jour");
      } else {
        const result = await createMut.mutateAsync(payload);
        setCreatedId(result.id);
        toast.success("Bien créé — ajoutez des photos ci-dessous");
        return;
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const SectionHeader = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" /> {label}
    </p>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {propertyId ? "Modifier le bien" : createdId ? "Compléter le bien" : "Nouveau bien"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {propertyId ? "Modifiez les informations du bien immobilier" : "Renseignez les informations du bien immobilier"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">

          {/* Identification */}
          <div className="space-y-3">
            <SectionHeader icon={Tag} label="Identification" />
            <div className="space-y-1.5">
              <Label htmlFor="p-title">Titre <span className="text-destructive">*</span></Label>
              <Input id="p-title" placeholder="Ex: Appartement T3 lumineux à Kaloum" value={form.title}
                onChange={(e) => { set("title", e.target.value); if (!propertyId && !createdId) set("slug", generateSlug(e.target.value)); }} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-slug">Slug URL</Label>
                <Input id="p-slug" placeholder="appartement-t3-kaloum" value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Prix (GNF)</Label>
                <Input id="p-price" type="number" min={0} placeholder="0" value={form.price ?? 0} onChange={(e) => set("price", Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type de bien</Label>
                <Select value={form.property_type ?? "apartment"} onValueChange={(v) => set("property_type", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(propertyTypeLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type d'offre</Label>
                <Select value={form.listing_type ?? "long_rental"} onValueChange={(v) => set("listing_type", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_rental">Location courte durée</SelectItem>
                    <SelectItem value="long_rental">Location longue durée</SelectItem>
                    <SelectItem value="sale">Vente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Localisation */}
          <div className="space-y-3">
            <SectionHeader icon={MapPin} label="Localisation" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-city">Ville</Label>
                <Input id="p-city" placeholder="Conakry" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-district">Quartier</Label>
                <Input id="p-district" placeholder="Kaloum, Ratoma…" value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-address">Adresse complète</Label>
              <Input id="p-address" placeholder="Numéro, rue, quartier" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-lat">Latitude</Label>
                <Input id="p-lat" type="number" step="any" placeholder="9.5370" value={form.latitude ?? ""} onChange={(e) => set("latitude", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-lng">Longitude</Label>
                <Input id="p-lng" type="number" step="any" placeholder="-13.6785" value={form.longitude ?? ""} onChange={(e) => set("longitude", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Caractéristiques */}
          <div className="space-y-3">
            <SectionHeader icon={Ruler} label="Caractéristiques" />
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-surface">Surface (m²)</Label>
                <Input id="p-surface" type="number" min={0} placeholder="0" value={form.surface ?? 0} onChange={(e) => set("surface", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-rooms">Pièces</Label>
                <Input id="p-rooms" type="number" min={0} placeholder="1" value={form.rooms ?? 1} onChange={(e) => set("rooms", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-baths">Salles de bain</Label>
                <Input id="p-baths" type="number" min={0} placeholder="1" value={form.bathrooms ?? 1} onChange={(e) => set("bathrooms", Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Propriétaire</Label>
                <Select value={form.owner_id ?? "__none__"} onValueChange={(v) => set("owner_id", v === "__none__" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {(owners ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Immeuble</Label>
                <Select value={form.building_id ?? "__none__"} onValueChange={(v) => set("building_id", v === "__none__" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {(buildings ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" rows={3} placeholder="Décrivez le bien, ses atouts, son environnement…" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <SectionHeader icon={Settings2} label="Options de publication" />
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                <Switch checked={form.furnished ?? false} onCheckedChange={(v) => set("furnished", v)} />
                <div>
                  <p className="text-sm font-medium">Meublé</p>
                  <p className="text-xs text-muted-foreground">Le bien est livré avec meubles</p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                <Switch checked={form.featured ?? false} onCheckedChange={(v) => set("featured", v)} />
                <div>
                  <p className="text-sm font-medium">Mis en avant</p>
                  <p className="text-xs text-muted-foreground">Affiché en priorité sur le site</p>
                </div>
              </label>
            </div>
          </div>

          {/* Image upload */}
          {activePropertyId && (
            <>
              <Separator />
              <div className="space-y-3">
                <SectionHeader icon={Home} label="Photos & médias" />
                <PropertyImageUpload propertyId={activePropertyId} />
              </div>
            </>
          )}

          <Separator />

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {activePropertyId && !propertyId ? "Terminer" : "Annuler"}
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-[120px]">
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {propertyId || createdId ? "Mise à jour…" : "Création…"}</>
              ) : (
                <><Plus className="h-4 w-4" /> {propertyId || createdId ? "Mettre à jour" : "Créer"}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyFormDialog;
