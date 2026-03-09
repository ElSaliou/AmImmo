import PageShell from "@/components/PageShell";
import ContactPropertyForm from "@/components/public/ContactPropertyForm";

const ContactPage = () => (
  <div className="container py-10 max-w-xl mx-auto">
    <PageShell title="Contact" subtitle="Envoyez-nous un message, nous vous répondrons rapidement">
      <ContactPropertyForm />
    </PageShell>
  </div>
);

export default ContactPage;
