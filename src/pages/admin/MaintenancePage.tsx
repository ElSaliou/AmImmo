import PageShell from "@/components/PageShell";
import { useMaintenanceRequests, useCreateMaintenance } from "@/hooks/use-maintenance";
import { useProperties } from "@/hooks/use-properties";
import { useTenants } from "@/hooks/use-tenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const MaintenancePage = () => {
  const { data: requests, isLoading } = useMaintenanceRequests();
  const { data: properties } = useProperties();
  const { data: tenants } = useTenants();
  const createMaintenance = useCreateMaintenance();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ property_id: "", tenant_id: "", title: "", description: "", priority: "medium" as const });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMaintenance.mutateAsync({ ...form, tenant_id: form.tenant_id || undefined });
      toast.success("Demande créée");
      setOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const priorityColor: Record<string, string> = { low: "bg-muted", medium: "bg-secondary", high: "bg-accent", urgent: "bg-destructive text-destructive-foreground" };

  return (
    <PageShell title="Maintenance" subtitle="Demandes de maintenance et interventions">
      <div className="flex justify-end mb-4"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouvelle demande</Button></div>
      {isLoading ? <p className="text-muted-foreground text-sm">Chargement...</p> : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Bien</TableHead><TableHead>Locataire</TableHead><TableHead>Priorité</TableHead><TableHead>Statut</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {(requests ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{(r as any).property?.title ?? "—"}</TableCell>
                  <TableCell>{(r as any).tenant?.full_name ?? "—"}</TableCell>
                  <TableCell><Badge className={priorityColor[r.priority] ?? ""} variant="secondary">{r.priority}</Badge></TableCell>
                  <TableCell className="capitalize">{r.status}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                </TableRow>
              ))}
              {(requests ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune demande</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle demande de maintenance</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Bien</Label><Select value={form.property_id} onValueChange={(v) => setForm((f) => ({ ...f, property_id: v }))}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{(properties ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Locataire</Label><Select value={form.tenant_id} onValueChange={(v) => setForm((f) => ({ ...f, tenant_id: v }))}><SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger><SelectContent>{(tenants ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Titre</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Priorité</Label><Select value={form.priority} onValueChange={(v: any) => setForm((f) => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Basse</SelectItem><SelectItem value="medium">Moyenne</SelectItem><SelectItem value="high">Haute</SelectItem><SelectItem value="urgent">Urgente</SelectItem></SelectContent></Select></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={createMaintenance.isPending}>Créer</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default MaintenancePage;
