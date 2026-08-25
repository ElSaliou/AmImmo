import PageShell from "@/components/PageShell";
import { useUnits, useDeleteUnit } from "@/hooks/use-units";
import { useBuildings } from "@/hooks/use-buildings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, DoorOpen, Search, Pencil, Armchair } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import UnitFormDialog from "@/components/admin/UnitFormDialog";
import { unitKindLabels, unitStatusColor, unitStatusLabels, formatMoney, formatDate } from "@/constants/real-estate";
import type { Unit } from "@/types/real-estate";
import { motion } from "framer-motion";

const UnitsPage = () => {
  const { data: units, isLoading } = useUnits();
  const { data: buildings } = useBuildings();
  const deleteUnit = useDeleteUnit();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState("__all__");
  const [kind, setKind] = useState("__all__");
  const [status, setStatus] = useState("__all__");

  const filtered = useMemo(() => {
    if (!units) return [];
    return units.filter((u) => {
      const q = search.toLowerCase();
      if (q && !u.label.toLowerCase().includes(q) && !((u as any).building?.name ?? "").toLowerCase().includes(q)) return false;
      if (building !== "__all__" && u.building_id !== building) return false;
      if (kind !== "__all__" && u.kind !== kind) return false;
      if (status !== "__all__" && u.status !== status) return false;
      return true;
    });
  }, [units, search, building, kind, status]);

  const available = filtered.filter((u) => u.status === "available").length;

  return (
    <PageShell
      title="Unités"
      subtitle="Lots et unités locatives"
      actions={
        <Button onClick={() => { setEditing(null); setOpen(true); }} variant="premium">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      }
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par label ou immeuble..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <Select value={building} onValueChange={setBuilding}>
            <SelectTrigger className="md:w-44 h-10"><SelectValue placeholder="Immeuble" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les immeubles</SelectItem>
              {(buildings ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="md:w-40 h-10"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les types</SelectItem>
              {Object.entries(unitKindLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-40 h-10"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les statuts</SelectItem>
              {Object.entries(unitStatusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {filtered.length} unité{filtered.length > 1 ? "s" : ""} · {available} disponible{available > 1 ? "s" : ""}
          </p>
        )}
      </motion.div>

      {isLoading ? (
        <TableSkeleton rows={4} columns={7} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="Aucune unité"
          description={search || building !== "__all__" ? "Modifiez vos filtres." : "Créez un immeuble puis ajoutez des unités."}
        />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Unité</TableHead>
                <TableHead className="font-semibold">Immeuble</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Composition</TableHead>
                <TableHead className="font-semibold">Loyer</TableHead>
                <TableHead className="font-semibold">Disponibilité</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <p className="font-medium text-sm">{u.label}</p>
                    <p className="text-xs text-muted-foreground">Étage {u.floor} · {Number(u.area_sqm)} m²</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(u as any).building?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5">
                      {unitKindLabels[u.kind]}
                      {u.furnished && <Armchair className="h-3.5 w-3.5 text-secondary" title="Meublé" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.rooms} pcs · {u.bedrooms} ch · {u.bathrooms} sdb</TableCell>
                  <TableCell className="text-sm font-medium">{formatMoney(u.price)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.available_from ? formatDate(u.available_from) : "—"}</TableCell>
                  <TableCell>
                    <Badge className={`${unitStatusColor[u.status]} text-xs border-0`}>{unitStatusLabels[u.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(u as Unit); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteUnit.mutate(u.id, { onSuccess: () => toast.success("Supprimé") })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <UnitFormDialog open={open} onOpenChange={setOpen} unit={editing} />
    </PageShell>
  );
};

export default UnitsPage;
