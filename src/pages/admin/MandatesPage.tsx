import PageShell from "@/components/PageShell";
import { useMandates, useDeleteMandate } from "@/hooks/use-mandates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, Search, FileSignature } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import MandateFormDialog from "@/components/admin/MandateFormDialog";

const typeLabels: Record<string, string> = { management: "Gestion", rental: "Location", sale: "Vente" };
const statusLabels: Record<string, string> = { draft: "Brouillon", active: "Actif", expired: "Expiré", terminated: "Résilié" };
const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  active: "default",
  expired: "secondary",
  terminated: "destructive",
};

const MandatesPage = () => {
  const { data: mandates, isLoading } = useMandates();
  const del = useDeleteMandate();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    return (mandates ?? []).filter((m: any) => {
      const q = search.toLowerCase();
      const matches =
        !q ||
        m.reference?.toLowerCase().includes(q) ||
        m.owner?.full_name?.toLowerCase().includes(q);
      return matches && (status === "all" || m.status === status) && (type === "all" || m.mandate_type === type);
    });
  }, [mandates, search, status, type]);

  return (
    <PageShell
      title="Mandats"
      subtitle="Mandats de gestion, de location et de vente confiés par les propriétaires"
      actions={
        <Button onClick={() => { setEditId(undefined); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Nouveau mandat
        </Button>
      }
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-card p-4 mb-6 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par référence ou propriétaire..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </motion.div>

      {isLoading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Aucun mandat"
          description={search || status !== "all" || type !== "all" ? "Aucun mandat ne correspond aux filtres." : "Créez le premier mandat pour confier un bien à l'agence."}
        />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Référence</TableHead>
                <TableHead className="font-semibold">Propriétaire</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Période</TableHead>
                <TableHead className="font-semibold">Commission</TableHead>
                <TableHead className="font-semibold">Biens</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m: any, i: number) => (
                <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{m.reference}</TableCell>
                  <TableCell>{m.owner?.full_name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{typeLabels[m.mandate_type]}</span>
                      {m.exclusive && <Badge variant="secondary" className="text-[10px]">Exclusif</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.start_date} {m.end_date ? `→ ${m.end_date}` : "→ indéterminée"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {Number(m.commission_rate) > 0 ? `${m.commission_rate}%` : ""}
                    {Number(m.commission_fixed) > 0 ? ` ${Number(m.commission_fixed).toLocaleString("fr-FR")} GNF` : ""}
                    {!Number(m.commission_rate) && !Number(m.commission_fixed) ? "—" : ""}
                  </TableCell>
                  <TableCell className="text-sm">{m.properties?.length ?? 0}</TableCell>
                  <TableCell><Badge variant={statusVariant[m.status]}>{statusLabels[m.status]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditId(m.id); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => del.mutate(m.id, { onSuccess: () => toast.success("Mandat supprimé"), onError: (e: any) => toast.error(e.message) })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MandateFormDialog open={open} onOpenChange={setOpen} mandateId={editId} />
    </PageShell>
  );
};

export default MandatesPage;
