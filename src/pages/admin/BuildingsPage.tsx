import PageShell from "@/components/PageShell";
import { useBuildings, useCreateBuilding, useDeleteBuilding } from "@/hooks/use-buildings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

const BuildingsPage = () => {
  const { data: buildings, isLoading } = useBuildings();
  const createBuilding = useCreateBuilding();
  const deleteBuilding = useDeleteBuilding();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", zip_code: "", country: "Maroc", total_units: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBuilding.mutateAsync(form);
      toast.success("Immeuble créé");
      setOpen(false);
      setForm({ name: "", address: "", city: "", zip_code: "", country: "Maroc", total_units: 0 });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

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
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Nouvel immeuble</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></div>
              <div><Label>Code postal</Label><Input value={form.zip_code} onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))} /></div>
            </div>
            <div><Label>Nombre d'unités</Label><Input type="number" value={form.total_units} onChange={(e) => setForm((f) => ({ ...f, total_units: Number(e.target.value) }))} /></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={createBuilding.isPending}>Créer</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default BuildingsPage;
