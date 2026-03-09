import PageShell from "@/components/PageShell";
import { useProperties } from "@/hooks/use-properties";
import { useLeads } from "@/hooks/use-leads";
import { useTenants } from "@/hooks/use-tenants";
import { useLeases } from "@/hooks/use-leases";

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg border bg-card p-5">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
  </div>
);

const DashboardPage = () => {
  const { data: properties } = useProperties();
  const { data: leads } = useLeads();
  const { data: tenants } = useTenants();
  const { data: leases } = useLeases();

  const published = (properties ?? []).filter((p) => p.published).length;
  const activeLeases = (leases ?? []).filter((l) => l.status === "active").length;
  const newLeads = (leads ?? []).filter((l) => l.status === "new").length;

  return (
    <PageShell title="Dashboard" subtitle="Vue d'ensemble de votre activité immobilière">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Biens totaux" value={(properties ?? []).length} />
        <StatCard label="Biens publiés" value={published} />
        <StatCard label="Locataires" value={(tenants ?? []).length} />
        <StatCard label="Contrats actifs" value={activeLeases} />
        <StatCard label="Leads" value={(leads ?? []).length} />
        <StatCard label="Nouveaux leads" value={newLeads} />
      </div>
    </PageShell>
  );
};

export default DashboardPage;
