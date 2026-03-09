import PageShell from "@/components/PageShell";
import ContactPropertyForm from "@/components/public/ContactPropertyForm";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { motion } from "framer-motion";

const ContactPage = () => (
  <div className="container py-10">
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-display font-bold mb-2">Contactez-nous</h1>
      <p className="text-muted-foreground mb-10">Notre équipe est à votre disposition pour répondre à vos questions.</p>
    </motion.div>

    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
      <div className="lg:col-span-2 space-y-6">
        {[
          { icon: MapPin, title: "Adresse", value: "Quartier Almamya, Kaloum, Conakry" },
          { icon: Phone, title: "Téléphone", value: "+224 621 000 000" },
          { icon: Mail, title: "Email", value: "contact@immoplate.com" },
          { icon: Clock, title: "Horaires", value: "Lun-Ven : 9h-18h | Sam : 9h-13h" },
        ].map((info) => (
          <div key={info.title} className="premium-card p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <info.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{info.title}</p>
              <p className="text-sm text-muted-foreground">{info.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="lg:col-span-3">
        <ContactPropertyForm />
      </div>
    </div>
  </div>
);

export default ContactPage;