import PageShell from "@/components/PageShell";
import { useBuildings, useCreateBuilding, useDeleteBuilding } from "@/hooks/use-buildings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <PageShell title="Immeubles" subtitle="Gestion des immeubles">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground text-sm">Chargement...</p> : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Unités</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(buildings ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.address}</TableCell>
                  <TableCell>{b.city}</TableCell>
                  <TableCell>{b.total_units}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteBuilding.mutate(b.id, { onSuccess: () => toast.success("Supprimé") })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(buildings ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun immeuble</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel immeuble</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></div>
              <div><Label>Code postal</Label><Input value={form.zip_code} onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))} /></div>
            </div>
            <div><Label>Nombre d'unités</Label><Input type="number" value={form.total_units} onChange={(e) => setForm((f) => ({ ...f, total_units: Number(e.target.value) }))} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={createBuilding.isPending}>Créer</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default BuildingsPage;
