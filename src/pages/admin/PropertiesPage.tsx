import PageShell from "@/components/PageShell";
import { useProperties, useDeleteProperty, useTogglePublish } from "@/hooks/use-properties";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Pencil, Trash2, Plus, Search, Home, Armchair } from "lucide-react";
import { useState, useMemo } from "react";
import PropertyFormDialog from "@/components/admin/PropertyFormDialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import {
  conakryCommunes,
  formatDate,
  formatMoney,
  listingTypeLabels,
  propertyStatusLabels,
  propertyTypeLabels,
} from "@/constants/real-estate";

const statusClass: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/15 text-success",
  archived: "bg-destructive/15 text-destructive",
  rented: "bg-info/15 text-info",
  sold: "bg-secondary/15 text-secondary",
  reserved: "bg-warning/15 text-warning",
  maintenance: "bg-warning/15 text-warning",
  unavailable: "bg-muted text-muted-foreground",
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
  const [filterPropertyType, setFilterPropertyType] = useState<string>("__all__");
  const [filterCommune, setFilterCommune] = useState<string>("__all__");

  const filtered = useMemo(() => {
    if (!properties) return [];
    return properties.filter((p) => {
      const q = search.toLowerCase();
      if (
        q &&
        !p.title.toLowerCase().includes(q) &&
        !p.city.toLowerCase().includes(q) &&
        !(p.commune ?? "").toLowerCase().includes(q) &&
        !(p.reference ?? "").toLowerCase().includes(q)
      )
        return false;
      if (filterType !== "__all__" && p.listing_type !== filterType) return false;
      if (filterStatus !== "__all__" && p.status !== filterStatus) return false;
      if (filterPropertyType !== "__all__" && p.property_type !== filterPropertyType) return false;
      if (filterCommune !== "__all__" && p.commune !== filterCommune) return false;
      return true;
    });
  }, [properties, search, filterType, filterStatus, filterPropertyType, filterCommune]);

  const publishedCount = filtered.filter((p) => p.published).length;

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
            <Input placeholder="Rechercher par titre, référence, ville ou commune..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="md:w-40 h-10"><SelectValue placeholder="Type d'offre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les offres</SelectItem>
              {Object.entries(listingTypeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPropertyType} onValueChange={setFilterPropertyType}>
            <SelectTrigger className="md:w-40 h-10"><SelectValue placeholder="Type de bien" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les biens</SelectItem>
              {Object.entries(propertyTypeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCommune} onValueChange={setFilterCommune}>
            <SelectTrigger className="md:w-36 h-10"><SelectValue placeholder="Commune" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes</SelectItem>
              {conakryCommunes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="md:w-36 h-10"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous</SelectItem>
              {Object.entries(propertyStatusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {filtered.length} bien{filtered.length > 1 ? "s" : ""} · {publishedCount} publié{publishedCount > 1 ? "s" : ""} sur le site
          </p>
        )}
      </motion.div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={7} />
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
                <TableHead className="font-semibold">Prix / charges</TableHead>
                <TableHead className="font-semibold">Localisation</TableHead>
                <TableHead className="font-semibold">Dispo.</TableHead>
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
                      {(() => {
                        const cover = p.images?.slice().sort((a: any, b: any) => a.position - b.position)?.[0];
                        return cover ? (
                          <img src={cover.url} alt={p.title} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Home className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        );
                      })()}
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          {p.title}
                          {p.furnished && <span title="Meublé"><Armchair className="h-3.5 w-3.5 text-secondary" /></span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.reference ? `${p.reference} · ` : ""}{Number(p.surface)} m² · {p.rooms} pcs · {p.bedrooms} ch
                          {p.floor !== null ? ` · étage ${p.floor}` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{propertyTypeLabels[p.property_type] ?? p.property_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-medium">
                      {listingTypeLabels[p.listing_type] ?? p.listing_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p className="font-semibold">{formatMoney(p.price, p.currency)}</p>
                    {Number(p.charges) > 0 && (
                      <p className="text-xs text-muted-foreground">+ {formatMoney(p.charges, p.currency)} charges</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{p.city}</p>
                    <p className="text-xs text-muted-foreground">{[p.commune, p.district].filter(Boolean).join(" · ") || "—"}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.available_from ? formatDate(p.available_from) : "—"}</TableCell>
                  <TableCell>
                    <Badge className={`${statusClass[p.status] ?? ""} text-xs border-0`}>
                      {propertyStatusLabels[p.status] ?? p.status}
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
