import PageShell from "@/components/PageShell";
import { useUnits, useCreateUnit, useDeleteUnit } from "@/hooks/use-units";
import { useBuildings } from "@/hooks/use-buildings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, DoorOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

const UnitsPage = () => {
  const { data: units, isLoading } = useUnits();
  const { data: buildings } = useBuildings();
  const createUnit = useCreateUnit();
  const deleteUnit = useDeleteUnit();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ building_id: "", label: "", floor: 0, area_sqm: 0, rooms: 1, bathrooms: 1 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUnit.mutateAsync(form);
      toast.success("Unité créée");
      setOpen(false);
      setForm({ building_id: "", label: "", floor: 0, area_sqm: 0, rooms: 1, bathrooms: 1 });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PageShell
      title="Unités"
      subtitle="Appartements et unités locatives"
      actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Ajouter</Button>}
    >
      {isLoading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : (units ?? []).length === 0 ? (
        <EmptyState icon={DoorOpen} title="Aucune unité" description="Créez un immeuble puis ajoutez des unités." />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Label</TableHead>
                <TableHead className="font-semibold">Immeuble</TableHead>
                <TableHead className="font-semibold">Étage</TableHead>
                <TableHead className="font-semibold">Surface</TableHead>
                <TableHead className="font-semibold">Pièces</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units!.map((u) => (
                <TableRow key={u.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{u.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(u as any).building?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{u.floor}</TableCell>
                  <TableCell className="text-sm">{Number(u.area_sqm)} m²</TableCell>
                  <TableCell className="text-sm">{u.rooms}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteUnit.mutate(u.id, { onSuccess: () => toast.success("Supprimé") })}>
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
          <DialogHeader><DialogTitle className="font-display">Nouvelle unité</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Immeuble</Label>
              <Select value={form.building_id} onValueChange={(v) => setForm((f) => ({ ...f, building_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{(buildings ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Label</Label><Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Étage</Label><Input type="number" value={form.floor} onChange={(e) => setForm((f) => ({ ...f, floor: Number(e.target.value) }))} /></div>
              <div><Label>Surface (m²)</Label><Input type="number" value={form.area_sqm} onChange={(e) => setForm((f) => ({ ...f, area_sqm: Number(e.target.value) }))} /></div>
              <div><Label>Pièces</Label><Input type="number" value={form.rooms} onChange={(e) => setForm((f) => ({ ...f, rooms: Number(e.target.value) }))} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={createUnit.isPending}>Créer</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default UnitsPage;
