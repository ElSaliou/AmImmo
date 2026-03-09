import PageShell from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, Globe, Palette, Bell } from "lucide-react";
import { motion } from "framer-motion";

const sections = [
  {
    icon: Building2,
    title: "Informations de l'agence",
    description: "Nom, adresse et coordonnées de votre agence.",
    fields: [
      { label: "Nom de l'agence", placeholder: "ImmoPlate", value: "ImmoPlate" },
      { label: "Email", placeholder: "contact@immoplate.com", value: "contact@immoplate.com" },
      { label: "Téléphone", placeholder: "+212 600 000 000", value: "+212 600 000 000" },
    ],
  },
  {
    icon: Globe,
    title: "Site public",
    description: "Configuration du site vitrine.",
    fields: [
      { label: "URL du site", placeholder: "https://immoplate.com", value: "" },
      { label: "Devise par défaut", placeholder: "MAD", value: "MAD" },
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Paramètres des notifications et alertes.",
    fields: [
      { label: "Email de notification", placeholder: "alerts@immoplate.com", value: "" },
    ],
  },
];

const SettingsPage = () => (
  <PageShell title="Paramètres" subtitle="Configuration de la plateforme">
    <div className="space-y-6 max-w-3xl">
      {sections.map((section, i) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <Card className="premium-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.label}>
                  <Label className="text-sm">{field.label}</Label>
                  <Input defaultValue={field.value} placeholder={field.placeholder} className="mt-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      ))}
      <div className="flex justify-end">
        <Button variant="premium" size="lg">Enregistrer les modifications</Button>
      </div>
    </div>
  </PageShell>
);

export default SettingsPage;
