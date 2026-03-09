import PageShell from "@/components/PageShell";
import { useTenants, useCreateTenant, useDeleteTenant } from "@/hooks/use-tenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const TenantsPage = () => {
  const { data: tenants, isLoading } = useTenants();
  const createTenant = useCreateTenant();
  const deleteTenant = useDeleteTenant();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", id_number: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createTenant.mutateAsync(form); toast.success("Locataire créé"); setOpen(false); setForm({ full_name: "", email: "", phone: "", id_number: "" }); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <PageShell title="Locataires" subtitle="Gestion des locataires">
      <div className="flex justify-end mb-4"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button></div>
      {isLoading ? <p className="text-muted-foreground text-sm">Chargement...</p> : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Email</TableHead><TableHead>Téléphone</TableHead><TableHead>N° identité</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {(tenants ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell>{t.email ?? "—"}</TableCell>
                  <TableCell>{t.phone ?? "—"}</TableCell>
                  <TableCell>{t.id_number ?? "—"}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => deleteTenant.mutate(t.id, { onSuccess: () => toast.success("Supprimé") })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {(tenants ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun locataire</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau locataire</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Nom complet</Label><Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>N° identité</Label><Input value={form.id_number} onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value }))} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={createTenant.isPending}>Créer</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default TenantsPage;
