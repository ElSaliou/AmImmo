import PageShell from "@/components/PageShell";
import { useLeases, useCreateLease, useDeleteLease } from "@/hooks/use-leases";
import { useProperties } from "@/hooks/use-properties";
import { useTenants } from "@/hooks/use-tenants";
import { useOwners } from "@/hooks/use-owners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-warning/15 text-warning" },
  active: { label: "Actif", className: "bg-success/15 text-success" },
  expired: { label: "Expiré", className: "bg-muted text-muted-foreground" },
  terminated: { label: "Résilié", className: "bg-destructive/15 text-destructive" },
};

const ContractsPage = () => {
  const { data: leases, isLoading } = useLeases();
  const { data: properties } = useProperties();
  const { data: tenants } = useTenants();
  const { data: owners } = useOwners();
  const createLease = useCreateLease();
  const deleteLease = useDeleteLease();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ property_id: "", tenant_id: "", owner_id: "", start_date: "", end_date: "", monthly_rent: 0, deposit: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLease.mutateAsync({
        ...form,
        owner_id: form.owner_id || null,
        end_date: form.end_date || null,
      });
      toast.success("Contrat créé");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PageShell
      title="Contrats"
      subtitle="Gestion des baux et contrats"
      actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Ajouter</Button>}
    >
      {isLoading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : (leases ?? []).length === 0 ? (
        <EmptyState icon={FileText} title="Aucun contrat" description="Créez votre premier contrat de bail." />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Bien</TableHead>
                <TableHead className="font-semibold">Locataire</TableHead>
                <TableHead className="font-semibold">Début</TableHead>
                <TableHead className="font-semibold">Fin</TableHead>
                <TableHead className="font-semibold">Loyer</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases!.map((l) => {
                const cfg = statusLabels[l.status] ?? { label: l.status, className: "" };
                return (
                  <TableRow key={l.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">{(l as any).property?.title ?? "—"}</TableCell>
                    <TableCell className="text-sm">{(l as any).tenant?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(l.start_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.end_date ? new Date(l.end_date).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell className="font-semibold text-sm">{Number(l.monthly_rent).toLocaleString()} MAD</TableCell>
                    <TableCell><Badge className={`${cfg.className} text-xs border-0`}>{cfg.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteLease.mutate(l.id, { onSuccess: () => toast.success("Supprimé") })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Nouveau contrat</DialogTitle></DialogHeader>
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
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{(tenants ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Propriétaire</Label>
              <Select value={form.owner_id} onValueChange={(v) => setForm((f) => ({ ...f, owner_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>{(owners ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date début</Label><Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} required /></div>
              <div><Label>Date fin</Label><Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Loyer mensuel</Label><Input type="number" value={form.monthly_rent} onChange={(e) => setForm((f) => ({ ...f, monthly_rent: Number(e.target.value) }))} /></div>
              <div><Label>Caution</Label><Input type="number" value={form.deposit} onChange={(e) => setForm((f) => ({ ...f, deposit: Number(e.target.value) }))} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={createLease.isPending}>Créer</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default ContractsPage;
