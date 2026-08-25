import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DoorOpen, Ruler, Loader2, Plus, CalendarClock, StickyNote, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCreateUnit, useUpdateUnit } from "@/hooks/use-units";
import { useBuildings } from "@/hooks/use-buildings";
import { unitKindLabels, unitStatusLabels } from "@/constants/real-estate";
import type { Unit, UnitInsert } from "@/types/real-estate";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unit?: Unit | null;
}

const defaultForm: UnitInsert = {
  building_id: "",
  label: "",
  kind: "apartment",
  status: "available",
  floor: 0,
  area_sqm: 0,
  rooms: 1,
  bedrooms: 1,
  bathrooms: 1,
  price: 0,
  furnished: false,
  available_from: null,
  notes: "",
};

const UnitFormDialog = ({ open, onOpenChange, unit }: Props) => {
  const createMut = useCreateUnit();
  const updateMut = useUpdateUnit();
  const { data: buildings } = useBuildings();
  const [form, setForm] = useState<UnitInsert>(defaultForm);
  const isPending = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (unit) {
      setForm({
        building_id: unit.building_id,
        label: unit.label,
        kind: unit.kind,
        status: unit.status,
        floor: unit.floor,
        area_sqm: Number(unit.area_sqm),
        rooms: unit.rooms,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        price: Number(unit.price),
        furnished: unit.furnished,
        available_from: unit.available_from,
        notes: unit.notes,
      });
    } else {
      setForm(defaultForm);
    }
  }, [unit, open]);

  const set = <K extends keyof UnitInsert>(key: K, value: UnitInsert[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.building_id) {
      toast.error("Sélectionnez un immeuble");
      return;
    }
    try {
      if (unit) {
        await updateMut.mutateAsync({ id: unit.id, ...form });
        toast.success("Unité mise à jour");
      } else {
        await createMut.mutateAsync(form);
        toast.success("Unité créée");
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
              <DoorOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">{unit ? "Modifier l'unité" : "Nouvelle unité"}</DialogTitle>
              <DialogDescription className="text-xs">Lot rattaché à un immeuble</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-3">
            <Section icon={Building2} label="Rattachement" />
            <div className="space-y-1.5">
              <Label>Immeuble <span className="text-destructive">*</span></Label>
              <Select value={form.building_id || undefined} onValueChange={(v) => set("building_id", v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {(buildings ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-label">Label <span className="text-destructive">*</span></Label>
                <Input id="u-label" placeholder="Ex: A-201" value={form.label} onChange={(e) => set("label", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Type d'unité</Label>
                <Select value={form.kind ?? "apartment"} onValueChange={(v) => set("kind", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(unitKindLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Section icon={Ruler} label="Caractéristiques" />
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-floor">Étage</Label>
                <Input id="u-floor" type="number" value={form.floor ?? 0} onChange={(e) => set("floor", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-area">Surface (m²)</Label>
                <Input id="u-area" type="number" min={0} value={form.area_sqm ?? 0} onChange={(e) => set("area_sqm", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-price">Loyer (GNF)</Label>
                <Input id="u-price" type="number" min={0} value={form.price ?? 0} onChange={(e) => set("price", Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-rooms">Pièces</Label>
                <Input id="u-rooms" type="number" min={0} value={form.rooms ?? 1} onChange={(e) => set("rooms", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-bedrooms">Chambres</Label>
                <Input id="u-bedrooms" type="number" min={0} value={form.bedrooms ?? 0} onChange={(e) => set("bedrooms", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-baths">Salles de bain</Label>
                <Input id="u-baths" type="number" min={0} value={form.bathrooms ?? 1} onChange={(e) => set("bathrooms", Number(e.target.value))} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Section icon={CalendarClock} label="Disponibilité" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status ?? "available"} onValueChange={(v) => set("status", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(unitStatusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-avail">Disponible à partir du</Label>
                <Input id="u-avail" type="date" value={form.available_from ?? ""} onChange={(e) => set("available_from", e.target.value || null)} />
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <Switch checked={form.furnished ?? false} onCheckedChange={(v) => set("furnished", v)} />
              <div>
                <p className="text-sm font-medium">Meublé</p>
                <p className="text-xs text-muted-foreground">L'unité est livrée avec meubles</p>
              </div>
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="u-notes" className="flex items-center gap-1">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground" /> Notes internes
              </Label>
              <Textarea id="u-notes" rows={3} placeholder="État, travaux, particularités…" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isPending} className="min-w-[110px]">
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {unit ? "Mise à jour…" : "Création…"}</>
              ) : (
                <><Plus className="h-4 w-4" /> {unit ? "Mettre à jour" : "Créer"}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UnitFormDialog;
