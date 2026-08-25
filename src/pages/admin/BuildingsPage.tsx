import PageShell from "@/components/PageShell";
import { useBuildings, useDeleteBuilding } from "@/hooks/use-buildings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Building2, Search, Pencil, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import BuildingFormDialog from "@/components/admin/BuildingFormDialog";
import { conakryCommunes } from "@/constants/real-estate";
import type { Building } from "@/types/real-estate";
import { motion } from "framer-motion";

const BuildingsPage = () => {
  const { data: buildings, isLoading } = useBuildings();
  const deleteBuilding = useDeleteBuilding();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [search, setSearch] = useState("");
  const [commune, setCommune] = useState("__all__");

  const filtered = useMemo(() => {
    if (!buildings) return [];
    return buildings.filter((b) => {
      const q = search.toLowerCase();
      if (q && !b.name.toLowerCase().includes(q) && !b.city.toLowerCase().includes(q) && !b.district.toLowerCase().includes(q)) return false;
      if (commune !== "__all__" && b.commune !== commune) return false;
      return true;
    });
  }, [buildings, search, commune]);

  const totalUnits = filtered.reduce((s, b) => s + (b.total_units ?? 0), 0);

  return (
    <PageShell
      title="Immeubles"
      subtitle="Gestion du patrimoine bâti"
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
            <Input placeholder="Rechercher par nom, ville ou quartier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <Select value={commune} onValueChange={setCommune}>
            <SelectTrigger className="md:w-48 h-10"><SelectValue placeholder="Commune" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les communes</SelectItem>
              {conakryCommunes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {filtered.length} immeuble{filtered.length > 1 ? "s" : ""} · {totalUnits} unité{totalUnits > 1 ? "s" : ""} déclarée{totalUnits > 1 ? "s" : ""}
          </p>
        )}
      </motion.div>

      {isLoading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun immeuble"
          description={search || commune !== "__all__" ? "Modifiez vos filtres." : "Ajoutez votre premier immeuble pour commencer."}
        />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Localisation</TableHead>
                <TableHead className="font-semibold">Propriétaire</TableHead>
                <TableHead className="font-semibold">Étages</TableHead>
                <TableHead className="font-semibold">Unités</TableHead>
                <TableHead className="font-semibold">GPS</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.address || "—"}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      <span>{b.city || "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {[b.commune, b.district].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{(b as any).owner?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{b.floors}</TableCell>
                  <TableCell className="text-sm">{b.total_units}</TableCell>
                  <TableCell>
                    {b.latitude !== null && b.longitude !== null ? (
                      <Badge variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" /> Géolocalisé</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(b as Building); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteBuilding.mutate(b.id, { onSuccess: () => toast.success("Supprimé") })}>
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

      <BuildingFormDialog open={open} onOpenChange={setOpen} building={editing} />
    </PageShell>
  );
};

export default BuildingsPage;
