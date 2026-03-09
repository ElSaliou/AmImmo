import PageShell from "@/components/PageShell";

const DashboardPage = () => (
  <PageShell title="Dashboard" subtitle="Vue d'ensemble de votre activité immobilière">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {["Biens actifs", "Locataires", "Contrats en cours", "Leads"].map((label) => (
        <div key={label} className="rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">—</p>
        </div>
      ))}
    </div>
  </PageShell>
);

export default DashboardPage;
