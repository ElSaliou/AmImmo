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
import { Plus, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Basse", className: "bg-muted text-muted-foreground" },
  medium: { label: "Moyenne", className: "bg-info/15 text-info" },
  high: { label: "Haute", className: "bg-warning/15 text-warning" },
  urgent: { label: "Urgente", className: "bg-destructive text-destructive-foreground" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Ouverte", className: "bg-info/15 text-info" },
  in_progress: { label: "En cours", className: "bg-warning/15 text-warning" },
  resolved: { label: "Résolue", className: "bg-success/15 text-success" },
  closed: { label: "Fermée", className: "bg-muted text-muted-foreground" },
};

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
      setForm({ property_id: "", tenant_id: "", title: "", description: "", priority: "medium" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PageShell
      title="Maintenance"
      subtitle="Demandes de maintenance et interventions"
      actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nouvelle demande</Button>}
    >
      {isLoading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : (requests ?? []).length === 0 ? (
        <EmptyState icon={Wrench} title="Aucune demande" description="Les demandes de maintenance apparaîtront ici." />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Titre</TableHead>
                <TableHead className="font-semibold">Bien</TableHead>
                <TableHead className="font-semibold">Locataire</TableHead>
                <TableHead className="font-semibold">Priorité</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests!.map((r) => {
                const pCfg = priorityConfig[r.priority] ?? { label: r.priority, className: "" };
                const sCfg = statusConfig[r.status] ?? { label: r.status, className: "" };
                return (
                  <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">{r.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(r as any).property?.title ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(r as any).tenant?.full_name ?? "—"}</TableCell>
                    <TableCell><Badge className={`${pCfg.className} text-xs border-0`}>{pCfg.label}</Badge></TableCell>
                    <TableCell><Badge className={`${sCfg.className} text-xs border-0`} variant="secondary">{sCfg.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Nouvelle demande de maintenance</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Bien</Label>
              <Select value={form.property_id} onValueChange={(v) => setForm((f) => ({ ...f, property_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{(properties ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Locataire</Label>
              <Select value={form.tenant_id} onValueChange={(v) => setForm((f) => ({ ...f, tenant_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>{(tenants ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Titre</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div>
              <Label>Priorité</Label>
              <Select value={form.priority} onValueChange={(v: any) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={createMaintenance.isPending}>Créer</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default MaintenancePage;
