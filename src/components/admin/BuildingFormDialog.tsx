import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Hash, Globe, Loader2, Plus, Users, StickyNote } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCreateBuilding, useUpdateBuilding } from "@/hooks/use-buildings";
import { useOwners } from "@/hooks/use-owners";
import { conakryCommunes } from "@/constants/real-estate";
import type { Building, BuildingInsert } from "@/types/real-estate";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  building?: Building | null;
}

const defaultForm: BuildingInsert = {
  name: "",
  address: "",
  city: "Conakry",
  commune: "",
  district: "",
  zip_code: "",
  country: "Guinée",
  total_units: 0,
  floors: 0,
  notes: "",
  owner_id: null,
  latitude: null,
  longitude: null,
};

const BuildingFormDialog = ({ open, onOpenChange, building }: Props) => {
  const createMut = useCreateBuilding();
  const updateMut = useUpdateBuilding();
  const { data: owners } = useOwners();
  const [form, setForm] = useState<BuildingInsert>(defaultForm);
  const isPending = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (building) {
      setForm({
        name: building.name,
        address: building.address,
        city: building.city,
        commune: building.commune,
        district: building.district,
        zip_code: building.zip_code,
        country: building.country,
        total_units: building.total_units,
        floors: building.floors,
        notes: building.notes,
        owner_id: building.owner_id,
        latitude: building.latitude !== null ? Number(building.latitude) : null,
        longitude: building.longitude !== null ? Number(building.longitude) : null,
      });
    } else {
      setForm(defaultForm);
    }
  }, [building, open]);

  const set = <K extends keyof BuildingInsert>(key: K, value: BuildingInsert[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (building) {
        await updateMut.mutateAsync({ id: building.id, ...form });
        toast.success("Immeuble mis à jour");
      } else {
        await createMut.mutateAsync(form);
        toast.success("Immeuble créé avec succès");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const Section = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" /> {label}
    </p>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {building ? "Modifier l'immeuble" : "Nouvel immeuble"}
              </DialogTitle>
              <DialogDescription className="text-xs">Renseignez les informations de l'immeuble</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-3">
            <Section icon={Building2} label="Identification" />
            <div className="space-y-1.5">
              <Label htmlFor="b-name">Nom de l'immeuble <span className="text-destructive">*</span></Label>
              <Input id="b-name" placeholder="Ex: Résidence Les Jardins" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-muted-foreground" /> Propriétaire</Label>
              <Select value={form.owner_id ?? "__none__"} onValueChange={(v) => set("owner_id", v === "__none__" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {(owners ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Section icon={MapPin} label="Localisation" />
            <div className="space-y-1.5">
              <Label htmlFor="b-address">Adresse complète</Label>
              <Input id="b-address" placeholder="Numéro, rue, quartier" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-city">Ville</Label>
                <Input id="b-city" placeholder="Conakry" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Commune</Label>
                <Select value={form.commune || "__none__"} onValueChange={(v) => set("commune", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Non renseignée</SelectItem>
                    {conakryCommunes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-district">Quartier</Label>
                <Input id="b-district" placeholder="Ex: Camayenne" value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-zip">Code postal</Label>
                <Input id="b-zip" placeholder="000" value={form.zip_code ?? ""} onChange={(e) => set("zip_code", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-country" className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Pays
              </Label>
              <Input id="b-country" placeholder="Guinée" value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-lat">Latitude</Label>
                <Input id="b-lat" type="number" step="any" placeholder="9.5370" value={form.latitude ?? ""} onChange={(e) => set("latitude", e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-lng">Longitude</Label>
                <Input id="b-lng" type="number" step="any" placeholder="-13.6785" value={form.longitude ?? ""} onChange={(e) => set("longitude", e.target.value ? Number(e.target.value) : null)} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Section icon={Hash} label="Configuration" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-units">Nombre d'unités / lots</Label>
                <Input id="b-units" type="number" min={0} value={form.total_units ?? 0} onChange={(e) => set("total_units", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-floors">Nombre d'étages</Label>
                <Input id="b-floors" type="number" min={0} value={form.floors ?? 0} onChange={(e) => set("floors", Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-notes" className="flex items-center gap-1">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground" /> Notes internes
              </Label>
              <Textarea id="b-notes" rows={3} placeholder="Informations complémentaires, accès, gardiennage…" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isPending} className="min-w-[110px]">
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {building ? "Mise à jour…" : "Création…"}</>
              ) : (
                <><Plus className="h-4 w-4" /> {building ? "Mettre à jour" : "Créer"}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BuildingFormDialog;
