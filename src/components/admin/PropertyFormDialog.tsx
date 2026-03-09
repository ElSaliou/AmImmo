import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateProperty, useUpdateProperty, useProperty } from "@/hooks/use-properties";
import { useOwners } from "@/hooks/use-owners";
import { useBuildings } from "@/hooks/use-buildings";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import type { PropertyInsert } from "@/types/real-estate";

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

const PropertyFormDialog = ({ open, onOpenChange, propertyId }: Props) => {
  const { data: existing } = useProperty(propertyId ?? "");
  const { data: owners } = useOwners();
  const { data: buildings } = useBuildings();
  const createMut = useCreateProperty();
  const updateMut = useUpdateProperty();
  const [form, setForm] = useState<PropertyInsert>(defaultForm);

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
    } else {
      setForm(defaultForm);
    }
  }, [propertyId, existing]);

  const set = <K extends keyof PropertyInsert>(key: K, value: PropertyInsert[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || generateSlug(form.title);
    const payload = { ...form, slug };

    try {
      if (propertyId) {
        await updateMut.mutateAsync({ id: propertyId, ...payload });
        toast.success("Bien mis à jour");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Bien créé");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{propertyId ? "Modifier le bien" : "Nouveau bien"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titre</Label>
              <Input value={form.title} onChange={(e) => { set("title", e.target.value); if (!propertyId) set("slug", generateSlug(e.target.value)); }} required />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} />
            </div>
            <div>
              <Label>Prix</Label>
              <Input type="number" value={form.price ?? 0} onChange={(e) => set("price", Number(e.target.value))} />
            </div>
            <div>
              <Label>Type de bien</Label>
              <Select value={form.property_type ?? "apartment"} onValueChange={(v) => set("property_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["apartment", "house", "villa", "studio", "commercial", "land", "other"].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
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
            <div>
              <Label>Ville</Label>
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <Label>Quartier</Label>
              <Input value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Adresse</Label>
              <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div>
              <Label>Surface (m²)</Label>
              <Input type="number" value={form.surface ?? 0} onChange={(e) => set("surface", Number(e.target.value))} />
            </div>
            <div>
              <Label>Pièces</Label>
              <Input type="number" value={form.rooms ?? 1} onChange={(e) => set("rooms", Number(e.target.value))} />
            </div>
            <div>
              <Label>Salles de bain</Label>
              <Input type="number" value={form.bathrooms ?? 1} onChange={(e) => set("bathrooms", Number(e.target.value))} />
            </div>
            <div>
              <Label>Propriétaire</Label>
              <Select value={form.owner_id ?? ""} onValueChange={(v) => set("owner_id", v || null)}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  {(owners ?? []).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Immeuble</Label>
              <Select value={form.building_id ?? ""} onValueChange={(v) => set("building_id", v || null)}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  {(buildings ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.furnished ?? false} onCheckedChange={(v) => set("furnished", v)} />
              <Label>Meublé</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.featured ?? false} onCheckedChange={(v) => set("featured", v)} />
              <Label>Mis en avant</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
              {propertyId ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyFormDialog;
