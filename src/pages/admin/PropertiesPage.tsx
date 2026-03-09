import PageShell from "@/components/PageShell";
import { useProperties, useDeleteProperty, useTogglePublish } from "@/hooks/use-properties";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Pencil, Trash2, Plus, Search, Home } from "lucide-react";
import { useState, useMemo } from "react";
import PropertyFormDialog from "@/components/admin/PropertyFormDialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  published: { label: "Publié", className: "bg-success/15 text-success" },
  archived: { label: "Archivé", className: "bg-destructive/15 text-destructive" },
  rented: { label: "Loué", className: "bg-info/15 text-info" },
  sold: { label: "Vendu", className: "bg-secondary/15 text-secondary" },
};

const typeLabels: Record<string, string> = {
  short_rental: "Courte durée",
  long_rental: "Longue durée",
  sale: "Vente",
};

const PropertiesPage = () => {
  const { data: properties, isLoading } = useProperties();
  const deleteProp = useDeleteProperty();
  const togglePublish = useTogglePublish();
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("__all__");
  const [filterStatus, setFilterStatus] = useState<string>("__all__");

  const filtered = useMemo(() => {
    if (!properties) return [];
    return properties.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.city.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "__all__" && p.listing_type !== filterType) return false;
      if (filterStatus !== "__all__" && p.status !== filterStatus) return false;
      return true;
    });
  }, [properties, search, filterType, filterStatus]);

  return (
    <PageShell
      title="Biens immobiliers"
      subtitle="Gestion de l'inventaire des biens"
      actions={
        <Button onClick={() => { setEditId(undefined); setFormOpen(true); }} variant="premium">
          <Plus className="h-4 w-4" /> Ajouter un bien
        </Button>
      }
    >
      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par titre ou ville..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="md:w-48 h-10"><SelectValue placeholder="Type d'offre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les types</SelectItem>
              <SelectItem value="short_rental">Courte durée</SelectItem>
              <SelectItem value="long_rental">Longue durée</SelectItem>
              <SelectItem value="sale">Vente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="md:w-40 h-10"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="published">Publié</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Home} title="Aucun bien trouvé" description={search || filterType !== "__all__" || filterStatus !== "__all__" ? "Essayez de modifier vos filtres." : "Ajoutez votre premier bien immobilier."} />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Bien</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Offre</TableHead>
                <TableHead className="font-semibold">Prix</TableHead>
                <TableHead className="font-semibold">Ville</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Home className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{Number(p.surface)} m² · {p.rooms} pcs</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{p.property_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-medium">
                      {typeLabels[p.listing_type] ?? p.listing_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-sm">{Number(p.price).toLocaleString()} {p.currency}</TableCell>
                  <TableCell className="text-sm">{p.city}</TableCell>
                  <TableCell>
                    <Badge className={`${statusConfig[p.status]?.className ?? ""} text-xs border-0`}>
                      {statusConfig[p.status]?.label ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => togglePublish.mutate({ id: p.id, published: !p.published }, { onSuccess: () => toast.success(p.published ? "Bien dépublié" : "Bien publié") })}
                        title={p.published ? "Dépublier" : "Publier"}
                      >
                        {p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-success" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditId(p.id); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteProp.mutate(p.id, { onSuccess: () => toast.success("Bien supprimé") })}>
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

      <PropertyFormDialog open={formOpen} onOpenChange={setFormOpen} propertyId={editId} />
    </PageShell>
  );
};

export default PropertiesPage;
