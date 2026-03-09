import PageShell from "@/components/PageShell";
import { useBuildings, useCreateBuilding, useDeleteBuilding } from "@/hooks/use-buildings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Building2, MapPin, Hash, Globe, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import { motion, AnimatePresence } from "framer-motion";

const initialForm = { name: "", address: "", city: "", zip_code: "", country: "Guinée", total_units: 0 };

const BuildingsPage = () => {
  const { data: buildings, isLoading } = useBuildings();
  const createBuilding = useCreateBuilding();
  const deleteBuilding = useDeleteBuilding();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBuilding.mutateAsync(form);
      toast.success("Immeuble créé avec succès");
      setOpen(false);
      setForm(initialForm);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: key === "total_units" ? Number(e.target.value) : e.target.value }));

  return (
    <PageShell
      title="Immeubles"
      subtitle="Gestion des immeubles"
      actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Ajouter</Button>}
    >
      {isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : (buildings ?? []).length === 0 ? (
        <EmptyState icon={Building2} title="Aucun immeuble" description="Ajoutez votre premier immeuble pour commencer." />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Adresse</TableHead>
                <TableHead className="font-semibold">Ville</TableHead>
                <TableHead className="font-semibold">Unités</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings!.map((b) => (
                <TableRow key={b.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.address || "—"}</TableCell>
                  <TableCell className="text-sm">{b.city || "—"}</TableCell>
                  <TableCell className="text-sm">{b.total_units}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteBuilding.mutate(b.id, { onSuccess: () => toast.success("Supprimé") })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg">Nouvel immeuble</DialogTitle>
                <DialogDescription className="text-xs">
                  Renseignez les informations de l'immeuble
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Identification */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Identification
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="b-name">Nom de l'immeuble <span className="text-destructive">*</span></Label>
                <Input id="b-name" placeholder="Ex: Résidence Les Jardins" value={form.name} onChange={set("name")} required />
              </div>
            </div>

            <Separator />

            {/* Localisation */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Localisation
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="b-address">Adresse complète</Label>
                <Input id="b-address" placeholder="Numéro, rue, quartier" value={form.address} onChange={set("address")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="b-city">Ville</Label>
                  <Input id="b-city" placeholder="Conakry" value={form.city} onChange={set("city")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b-zip">Code postal</Label>
                  <Input id="b-zip" placeholder="000" value={form.zip_code} onChange={set("zip_code")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-country" className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Pays
                </Label>
                <Input id="b-country" placeholder="Guinée" value={form.country} onChange={set("country")} />
              </div>
            </div>

            <Separator />

            {/* Configuration */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" /> Configuration
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="b-units">Nombre d'unités / lots</Label>
                <Input id="b-units" type="number" min={0} placeholder="0" value={form.total_units} onChange={set("total_units")} />
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createBuilding.isPending} className="min-w-[100px]">
                {createBuilding.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Création…</>
                ) : (
                  <><Plus className="h-4 w-4" /> Créer</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default BuildingsPage;
