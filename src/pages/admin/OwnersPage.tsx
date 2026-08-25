import PageShell from "@/components/PageShell";
import { useOwners, useDeleteOwner } from "@/hooks/use-owners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Users, Search, Pencil, Eye } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import OwnerFormDialog from "@/components/admin/OwnerFormDialog";

const OwnersPage = () => {
  const { data: owners, isLoading } = useOwners();
  const deleteOwner = useDeleteOwner();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");

  const filtered = useMemo(() => {
    return (owners ?? []).filter((o) => {
      const q = search.toLowerCase();
      const matches =
        !q ||
        o.full_name.toLowerCase().includes(q) ||
        (o.email ?? "").toLowerCase().includes(q) ||
        (o.phone ?? "").includes(q) ||
        (o.company ?? "").toLowerCase().includes(q) ||
        (o.city ?? "").toLowerCase().includes(q);
      return matches && (kind === "all" || o.kind === kind);
    });
  }, [owners, search, kind]);

  return (
    <PageShell
      title="Propriétaires"
      subtitle="Particuliers et entreprises confiant leurs biens à l'agence"
      actions={
        <Button onClick={() => { setEditId(undefined); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      }
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-card p-4 mb-6 grid gap-3 sm:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom, email, téléphone, société ou ville..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="individual">Particuliers</SelectItem>
            <SelectItem value="company">Entreprises</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {isLoading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Aucun propriétaire trouvé" description={search || kind !== "all" ? "Essayez de modifier votre recherche." : "Ajoutez votre premier propriétaire."} />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead className="font-semibold">Ville</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o, i) => (
                <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <Link to={`/admin/owners/${o.id}`} className="hover:text-primary transition-colors">
                      {o.full_name}
                    </Link>
                    {o.company && <span className="block text-xs text-muted-foreground">{o.company}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.kind === "company" ? "secondary" : "outline"}>
                      {o.kind === "company" ? "Entreprise" : "Particulier"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.email ?? "—"}</TableCell>
                  <TableCell className="text-sm">{o.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm">{o.city || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link to={`/admin/owners/${o.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditId(o.id); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => deleteOwner.mutate(o.id, { onSuccess: () => toast.success("Supprimé"), onError: (e: any) => toast.error(e.message) })}>
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

      <OwnerFormDialog open={open} onOpenChange={setOpen} ownerId={editId} />
    </PageShell>
  );
};

export default OwnersPage;
