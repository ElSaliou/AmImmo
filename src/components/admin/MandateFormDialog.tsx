import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOwners } from "@/hooks/use-owners";
import { useProperties } from "@/hooks/use-properties";
import { useCreateMandate, useUpdateMandate, useMandate, type MandateInsert } from "@/hooks/use-mandates";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { FileSignature, Percent, CalendarRange, Home, Loader2, Paperclip } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mandateId?: string;
  defaultOwnerId?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const defaultForm = {
  owner_id: "",
  mandate_type: "management",
  exclusive: false,
  start_date: today(),
  end_date: "",
  commission_rate: 10,
  commission_fixed: 0,
  conditions: "",
  document_url: "",
  status: "draft",
} as any;

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h4 className="text-sm font-semibold">{title}</h4>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{children}</div>
  </div>
);

const MandateFormDialog = ({ open, onOpenChange, mandateId, defaultOwnerId }: Props) => {
  const { data: owners } = useOwners();
  const { data: properties } = useProperties();
  const { data: existing } = useMandate(mandateId);
  const createMut = useCreateMandate();
  const updateMut = useUpdateMandate();
  const [form, setForm] = useState<any>(defaultForm);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);

  useEffect(() => {
    if (mandateId && existing) {
      setForm({ ...defaultForm, ...existing, end_date: existing.end_date ?? "" });
      setPropertyIds((existing.properties ?? []).map((p: any) => p.property_id));
    } else if (!mandateId) {
      setForm({ ...defaultForm, owner_id: defaultOwnerId ?? "" });
      setPropertyIds([]);
    }
  }, [mandateId, existing, open, defaultOwnerId]);

  const pending = createMut.isPending || updateMut.isPending;

  const ownerProperties = (properties ?? []).filter((p: any) => !form.owner_id || p.owner_id === form.owner_id);

  const toggleProperty = (id: string) =>
    setPropertyIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.owner_id) return toast.error("Sélectionnez un propriétaire");
    const payload: MandateInsert & { propertyIds?: string[] } = {
      owner_id: form.owner_id,
      mandate_type: form.mandate_type,
      exclusive: form.exclusive,
      start_date: form.start_date,
      end_date: form.end_date || null,
      commission_rate: Number(form.commission_rate) || 0,
      commission_fixed: Number(form.commission_fixed) || 0,
      conditions: form.conditions ?? "",
      document_url: form.document_url || null,
      status: form.status,
      propertyIds,
    } as any;
    try {
      if (mandateId) {
        await updateMut.mutateAsync({ id: mandateId, ...payload } as any);
        toast.success("Mandat mis à jour");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Mandat créé");
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
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {mandateId ? "Modifier le mandat" : "Nouveau mandat"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Mandat de gestion, de location ou de vente confié par un propriétaire
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 pt-2">
          <Section icon={FileSignature} title="Mandat">
            <div className="space-y-1.5">
              <Label>Propriétaire *</Label>
              <Select value={form.owner_id} onValueChange={(v) => { setForm((f: any) => ({ ...f, owner_id: v })); setPropertyIds([]); }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {(owners ?? []).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type de mandat *</Label>
              <Select value={form.mandate_type} onValueChange={(v) => setForm((f: any) => ({ ...f, mandate_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="management">Gestion</SelectItem>
                  <SelectItem value="rental">Location</SelectItem>
                  <SelectItem value="sale">Vente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                  <SelectItem value="terminated">Résilié</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Exclusivité</Label>
                <p className="text-xs text-muted-foreground">Mandat exclusif</p>
              </div>
              <Switch checked={!!form.exclusive} onCheckedChange={(v) => setForm((f: any) => ({ ...f, exclusive: v }))} />
            </div>
          </Section>

          <Separator />

          <Section icon={CalendarRange} title="Durée">
            <div className="space-y-1.5">
              <Label>Date de début *</Label>
              <Input type="date" value={form.start_date ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date de fin</Label>
              <Input type="date" value={form.end_date ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, end_date: e.target.value }))} />
            </div>
          </Section>

          <Separator />

          <Section icon={Percent} title="Rémunération de l'agence">
            <div className="space-y-1.5">
              <Label>Commission (%)</Label>
              <Input type="number" step="0.1" value={form.commission_rate} onChange={(e) => setForm((f: any) => ({ ...f, commission_rate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Commission fixe (GNF)</Label>
              <Input type="number" value={form.commission_fixed} onChange={(e) => setForm((f: any) => ({ ...f, commission_fixed: e.target.value }))} />
            </div>
          </Section>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Biens couverts</h4>
            </div>
            {ownerProperties.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun bien rattaché à ce propriétaire.</p>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-lg border divide-y">
                {ownerProperties.map((p: any) => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                    <input type="checkbox" checked={propertyIds.includes(p.id)} onChange={() => toggleProperty(p.id)} className="accent-primary" />
                    <span className="flex-1 truncate">{p.title}</span>
                    <span className="text-xs text-muted-foreground">{p.reference ?? ""}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Conditions & document</h4>
            </div>
            <Textarea rows={3} value={form.conditions ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, conditions: e.target.value }))} placeholder="Conditions particulières du mandat…" />
            <Input value={form.document_url ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, document_url: e.target.value }))} placeholder="Lien vers le mandat signé (PDF)" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mandateId ? "Enregistrer" : "Créer le mandat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MandateFormDialog;
