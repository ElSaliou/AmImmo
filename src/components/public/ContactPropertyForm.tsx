import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateLead } from "@/hooks/use-leads";
import { toast } from "sonner";

interface Props {
  propertyId?: string;
  propertyTitle?: string;
}

const ContactPropertyForm = ({ propertyId, propertyTitle }: Props) => {
  const createLead = useCreateLead();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLead.mutateAsync({
        ...form,
        property_id: propertyId ?? null,
        source: "website",
        status: "new",
      });
      toast.success("Votre demande a été envoyée !");
      setForm({ full_name: "", email: "", phone: "", message: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <h3 className="font-display font-semibold text-lg">
        {propertyTitle ? `Contacter pour : ${propertyTitle}` : "Nous contacter"}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label>Nom complet *</Label>
          <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required />
        </div>
        <div>
          <Label>Email *</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div>
          <Label>Message *</Label>
          <Textarea rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required />
        </div>
        <Button type="submit" className="w-full" disabled={createLead.isPending}>
          {createLead.isPending ? "Envoi..." : "Envoyer ma demande"}
        </Button>
      </form>
    </div>
  );
};

export default ContactPropertyForm;
