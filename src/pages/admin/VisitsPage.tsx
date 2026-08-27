import { useMemo, useState } from "react";
import { CalendarClock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/admin/EmptyState";
import TableSkeleton from "@/components/admin/TableSkeleton";
import VisitFormDialog from "@/components/admin/VisitFormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteVisit, useVisits } from "@/hooks/use-visits";
import { formatDateTime, visitStatusConfig } from "@/constants/real-estate";
import type { Visit, VisitStatus } from "@/types/real-estate";

const VisitsPage = () => {
  const { data: visits, isLoading } = useVisits();
  const deleteVisit = useDeleteVisit();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("__all__");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Visit | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (visits ?? []).filter((visit) => {
      if (status !== "__all__" && visit.status !== status) return false;
      if (!q) return true;
      return [visit.visitor_name, visit.visitor_email, visit.visitor_phone, (visit as any).property?.title, (visit as any).lead?.full_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [visits, search, status]);

  const upcoming = filtered.filter((visit) => visit.scheduled_at && new Date(visit.scheduled_at) >= new Date() && !["done", "cancelled"].includes(visit.status)).length;

  return (
    <PageShell
      title="Visites"
      subtitle={`${upcoming} visite${upcoming > 1 ? "s" : ""} à venir`}
      actions={<Button variant="premium" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Planifier</Button>}
    >
      <div className="premium-card p-4 mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Prospect, téléphone, bien…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-48"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les statuts</SelectItem>
            {Object.entries(visitStatusConfig).map(([value, cfg]) => <SelectItem key={value} value={value}>{cfg.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TableSkeleton rows={6} columns={6} /> : filtered.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Aucune visite" description="Planifiez une première visite depuis un lead ou depuis cette page." />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Créneau</TableHead><TableHead>Visiteur</TableHead><TableHead>Bien</TableHead><TableHead>Lead</TableHead><TableHead>Statut</TableHead><TableHead>Compte rendu</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((visit) => (
                <TableRow key={visit.id} className="group">
                  <TableCell className="text-sm font-medium">{formatDateTime(visit.scheduled_at)}</TableCell>
                  <TableCell><p className="text-sm font-medium">{visit.visitor_name}</p><p className="text-xs text-muted-foreground">{visit.visitor_phone || visit.visitor_email || "—"}</p></TableCell>
                  <TableCell className="text-sm">{(visit as any).property?.title ?? "—"}</TableCell>
                  <TableCell className="text-sm">{(visit as any).lead?.full_name ?? "—"}</TableCell>
                  <TableCell><Badge className={`${visitStatusConfig[visit.status as VisitStatus].color} border-0`}>{visitStatusConfig[visit.status as VisitStatus].label}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[220px]"><span className="line-clamp-2">{visit.outcome || visit.notes || "—"}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(visit as Visit); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteVisit.mutate(visit.id, { onSuccess: () => toast.success("Visite supprimée") })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VisitFormDialog open={open} onOpenChange={setOpen} visit={editing} />
    </PageShell>
  );
};

export default VisitsPage;
