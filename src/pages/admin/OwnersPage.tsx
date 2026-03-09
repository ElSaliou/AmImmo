import PageShell from "@/components/PageShell";
import { useOwners, useCreateOwner, useDeleteOwner } from "@/hooks/use-owners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Users, Mail, Phone, Building2, Loader2, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

const initialForm = { full_name: "", email: "", phone: "", company: "", notes: "" };

const OwnersPage = () => {
  const { data: owners, isLoading } = useOwners();
  const createOwner = useCreateOwner();
  const deleteOwner = useDeleteOwner();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOwner.mutateAsync(form);
      toast.success("Propriétaire créé avec succès");
      setOpen(false);
      setForm(initialForm);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PageShell
      title="Propriétaires"
      subtitle="Gestion des propriétaires"
      actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Ajouter</Button>}
    >
      {isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : (owners ?? []).length === 0 ? (
        <EmptyState icon={Users} title="Aucun propriétaire" description="Ajoutez votre premier propriétaire." />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead className="font-semibold">Société</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners!.map((o) => (
                <TableRow key={o.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{o.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.email ?? "—"}</TableCell>
                  <TableCell className="text-sm">{o.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm">{o.company ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteOwner.mutate(o.id, { onSuccess: () => toast.success("Supprimé") })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
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
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg">Nouveau propriétaire</DialogTitle>
                <DialogDescription className="text-xs">
                  Renseignez les coordonnées du propriétaire
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">

            {/* Identité */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Identité
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="o-name">Nom complet <span className="text-destructive">*</span></Label>
                <Input id="o-name" placeholder="Jean-Pierre Diallo" value={form.full_name} onChange={set("full_name")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-company" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Société / Entreprise
                </Label>
                <Input id="o-company" placeholder="Ex: Diallo Immobilier SARL" value={form.company} onChange={set("company")} />
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
                  <Label htmlFor="o-email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
                  </Label>
                  <Input id="o-email" type="email" placeholder="jean@exemple.com" value={form.email} onChange={set("email")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o-phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Téléphone
                  </Label>
                  <Input id="o-phone" placeholder="+224 6XX XX XX XX" value={form.phone} onChange={set("phone")} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Notes internes
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="o-notes">Notes</Label>
                <Textarea id="o-notes" rows={2} placeholder="Informations complémentaires sur le propriétaire…" value={form.notes} onChange={set("notes")} />
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createOwner.isPending} className="min-w-[100px]">
                {createOwner.isPending ? (
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

export default OwnersPage;
