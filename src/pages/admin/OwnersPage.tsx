import PageShell from "@/components/PageShell";
import { useOwners, useCreateOwner, useDeleteOwner } from "@/hooks/use-owners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const OwnersPage = () => {
  const { data: owners, isLoading } = useOwners();
  const createOwner = useCreateOwner();
  const deleteOwner = useDeleteOwner();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", company: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createOwner.mutateAsync(form); toast.success("Propriétaire créé"); setOpen(false); setForm({ full_name: "", email: "", phone: "", company: "" }); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <PageShell title="Propriétaires" subtitle="Gestion des propriétaires">
      <div className="flex justify-end mb-4"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button></div>
      {isLoading ? <p className="text-muted-foreground text-sm">Chargement...</p> : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Email</TableHead><TableHead>Téléphone</TableHead><TableHead>Société</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {(owners ?? []).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.full_name}</TableCell>
                  <TableCell>{o.email ?? "—"}</TableCell>
                  <TableCell>{o.phone ?? "—"}</TableCell>
                  <TableCell>{o.company ?? "—"}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => deleteOwner.mutate(o.id, { onSuccess: () => toast.success("Supprimé") })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {(owners ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun propriétaire</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau propriétaire</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Nom complet</Label><Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Société</Label><Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={createOwner.isPending}>Créer</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default OwnersPage;
