import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateOwner, useUpdateOwner, useOwner } from "@/hooks/use-owners";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import type { OwnerInsert } from "@/types/real-estate";
import { Users, MapPin, IdCard, Landmark, Smartphone, StickyNote, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ownerId?: string;
}

const defaultForm: OwnerInsert = {
  full_name: "",
  kind: "individual",
  email: "",
  phone: "",
  company: "",
  address: "",
  city: "",
  id_type: "",
  id_number: "",
  tax_number: "",
  rccm: "",
  bank_name: "",
  bank_account: "",
  mobile_money_provider: "",
  mobile_money_number: "",
  notes: "",
};

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h4 className="text-sm font-semibold">{title}</h4>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{children}</div>
  </div>
);

const OwnerFormDialog = ({ open, onOpenChange, ownerId }: Props) => {
  const { data: existing } = useOwner(ownerId);
  const createMut = useCreateOwner();
  const updateMut = useUpdateOwner();
  const [form, setForm] = useState<OwnerInsert>(defaultForm);

  useEffect(() => {
    if (ownerId && existing) {
      setForm({ ...defaultForm, ...existing });
    } else if (!ownerId) {
      setForm(defaultForm);
    }
  }, [ownerId, existing, open]);

  const set = (k: keyof OwnerInsert) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const isCompany = form.kind === "company";
  const pending = createMut.isPending || updateMut.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Le nom est obligatoire");
    try {
      if (ownerId) {
        await updateMut.mutateAsync({ id: ownerId, ...form });
        toast.success("Propriétaire mis à jour");
      } else {
        await createMut.mutateAsync(form);
        toast.success("Propriétaire créé");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {ownerId ? "Modifier le propriétaire" : "Nouveau propriétaire"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Fiche complète : identité, coordonnées, pièces et coordonnées de paiement
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 pt-2">
          <Section icon={Users} title="Identité">
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.kind ?? "individual"} onValueChange={(v) => setForm((f) => ({ ...f, kind: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Particulier</SelectItem>
                  <SelectItem value="company">Entreprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isCompany ? "Représentant / Nom *" : "Nom complet *"}</Label>
              <Input value={form.full_name} onChange={set("full_name")} placeholder="Mamadou Diallo" />
            </div>
            {isCompany && (
              <>
                <div className="space-y-1.5">
                  <Label>Raison sociale</Label>
                  <Input value={form.company ?? ""} onChange={set("company")} placeholder="Sogex SARL" />
                </div>
                <div className="space-y-1.5">
                  <Label>RCCM</Label>
                  <Input value={form.rccm ?? ""} onChange={set("rccm")} placeholder="GN-CKY-2024-B-1234" />
                </div>
              </>
            )}
          </Section>

          <Separator />

          <Section icon={MapPin} title="Coordonnées">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ""} onChange={set("email")} placeholder="contact@exemple.gn" />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.phone ?? ""} onChange={set("phone")} placeholder="+224 620 00 00 00" />
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input value={form.address ?? ""} onChange={set("address")} placeholder="Quartier Kipé, Ratoma" />
            </div>
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input value={form.city ?? ""} onChange={set("city")} placeholder="Conakry" />
            </div>
          </Section>

          <Separator />

          <Section icon={IdCard} title="Pièces & fiscalité">
            <div className="space-y-1.5">
              <Label>Type de pièce</Label>
              <Select value={form.id_type || "none"} onValueChange={(v) => setForm((f) => ({ ...f, id_type: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non renseigné</SelectItem>
                  <SelectItem value="cni">Carte nationale d'identité</SelectItem>
                  <SelectItem value="passport">Passeport</SelectItem>
                  <SelectItem value="residence">Carte de séjour</SelectItem>
                  <SelectItem value="driving">Permis de conduire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Numéro de pièce</Label>
              <Input value={form.id_number ?? ""} onChange={set("id_number")} placeholder="00123456789" />
            </div>
            <div className="space-y-1.5">
              <Label>NIF / Numéro fiscal</Label>
              <Input value={form.tax_number ?? ""} onChange={set("tax_number")} placeholder="123456789" />
            </div>
          </Section>

          <Separator />

          <Section icon={Landmark} title="Coordonnées bancaires">
            <div className="space-y-1.5">
              <Label>Banque</Label>
              <Input value={form.bank_name ?? ""} onChange={set("bank_name")} placeholder="BICIGUI" />
            </div>
            <div className="space-y-1.5">
              <Label>Numéro de compte / IBAN</Label>
              <Input value={form.bank_account ?? ""} onChange={set("bank_account")} placeholder="GN00 0000 0000 0000" />
            </div>
          </Section>

          <Separator />

          <Section icon={Smartphone} title="Mobile Money">
            <div className="space-y-1.5">
              <Label>Opérateur</Label>
              <Select
                value={form.mobile_money_provider || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, mobile_money_provider: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non renseigné</SelectItem>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                  <SelectItem value="paycard">PayCard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Numéro Mobile Money</Label>
              <Input value={form.mobile_money_number ?? ""} onChange={set("mobile_money_number")} placeholder="+224 620 00 00 00" />
            </div>
          </Section>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Notes internes</h4>
            </div>
            <Textarea rows={3} value={form.notes ?? ""} onChange={set("notes")} placeholder="Informations complémentaires…" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {ownerId ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OwnerFormDialog;
