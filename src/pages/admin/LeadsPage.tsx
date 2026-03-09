import PageShell from "@/components/PageShell";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Search, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import type { LeadStatus } from "@/types/real-estate";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Nouveau" },
  { value: "contacted", label: "Contacté" },
  { value: "qualified", label: "Qualifié" },
  { value: "converted", label: "Converti" },
  { value: "lost", label: "Perdu" },
];

const statusColor: Record<string, string> = {
  new: "bg-info/15 text-info",
  contacted: "bg-warning/15 text-warning",
  qualified: "bg-secondary/15 text-secondary",
  converted: "bg-success/15 text-success",
  lost: "bg-destructive/15 text-destructive",
};

const LeadsPage = () => {
  const { data: leads, isLoading } = useLeads();
  const updateLead = useUpdateLead();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");

  const filtered = useMemo(() => {
    if (!leads) return [];
    return leads.filter((l) => {
      if (search && !l.full_name.toLowerCase().includes(search.toLowerCase()) && !l.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "__all__" && l.status !== filterStatus) return false;
      return true;
    });
  }, [leads, search, filterStatus]);

  return (
    <PageShell title="Leads" subtitle="Demandes et prospects entrants">
      {/* Filters */}
      <div className="premium-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par nom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="md:w-44 h-10"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous</SelectItem>
              {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Aucun lead trouvé" description={search || filterStatus !== "__all__" ? "Modifiez vos filtres." : "Les demandes du site public apparaîtront ici."} />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead className="font-semibold">Bien</TableHead>
                <TableHead className="font-semibold">Source</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l, i) => (
                <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {l.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{l.full_name}</p>
                        <p className="text-xs text-muted-foreground">{l.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{l.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm">{(l as any).property?.title ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{l.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={l.status} onValueChange={(v) => updateLead.mutate({ id: l.id, status: v as LeadStatus }, { onSuccess: () => toast.success("Statut mis à jour") })}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${statusColor[l.status]?.split(" ")[0] ?? "bg-muted"}`} />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("fr-FR")}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageShell>
  );
};

export default LeadsPage;
