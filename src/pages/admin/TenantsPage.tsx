import PageShell from "@/components/PageShell";
import { useTenants, useCreateTenant, useDeleteTenant } from "@/hooks/use-tenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, UserCheck, Mail, Phone, CreditCard, Loader2, FileText, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

const initialForm = { full_name: "", email: "", phone: "", id_number: "", notes: "" };

const TenantsPage = () => {
  const { data: tenants, isLoading } = useTenants();
  const createTenant = useCreateTenant();
  const deleteTenant = useDeleteTenant();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!tenants) return [];
    if (!search) return tenants;
    const q = search.toLowerCase();
    return tenants.filter((t) =>
      t.full_name.toLowerCase().includes(q) ||
      (t.email && t.email.toLowerCase().includes(q)) ||
      (t.phone && t.phone.includes(q)) ||
      (t.id_number && t.id_number.toLowerCase().includes(q))
    );
  }, [tenants, search]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTenant.mutateAsync(form);
      toast.success("Locataire créé avec succès");
      setOpen(false);
      setForm(initialForm);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PageShell
      title="Locataires"
      subtitle="Gestion des locataires"
      actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Ajouter</Button>}
    >
      {/* Search */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom, email, téléphone ou N° identité..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
      </motion.div>

      {isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCheck} title="Aucun locataire trouvé" description={search ? "Essayez de modifier votre recherche." : "Ajoutez votre premier locataire."} />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead className="font-semibold">N° identité</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t, i) => (
                <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.email ?? "—"}</TableCell>
                  <TableCell className="text-sm">{t.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm">{t.id_number ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteTenant.mutate(t.id, { onSuccess: () => toast.success("Supprimé") })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg">Nouveau locataire</DialogTitle>
                <DialogDescription className="text-xs">
                  Renseignez les informations du locataire
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">

            {/* Identité */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" /> Identité
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="t-name">Nom complet <span className="text-destructive">*</span></Label>
                <Input id="t-name" placeholder="Mamadou Camara" value={form.full_name} onChange={set("full_name")} required />
              </div>
            </div>

            <Separator />

            {/* Contact */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Contact
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t-email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
                  </Label>
                  <Input id="t-email" type="email" placeholder="mamadou@exemple.com" value={form.email} onChange={set("email")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Téléphone
                  </Label>
                  <Input id="t-phone" placeholder="+224 6XX XX XX XX" value={form.phone} onChange={set("phone")} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Pièce d'identité */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Pièce d'identité
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="t-id" className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Numéro d'identité
                </Label>
                <Input id="t-id" placeholder="CNI, Passeport, CIM…" value={form.id_number} onChange={set("id_number")} />
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Notes internes
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="t-notes">Notes</Label>
                <Textarea id="t-notes" rows={2} placeholder="Informations complémentaires sur le locataire…" value={form.notes} onChange={set("notes")} />
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createTenant.isPending} className="min-w-[100px]">
                {createTenant.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Création…</>
                ) : (
                  <><Plus className="h-4 w-4" /> Créer</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default TenantsPage;
