import PageShell from "@/components/PageShell";
import KPICard from "@/components/admin/KPICard";
import { useProperties } from "@/hooks/use-properties";
import { useLeads } from "@/hooks/use-leads";
import { useTenants } from "@/hooks/use-tenants";
import { useLeases } from "@/hooks/use-leases";
import { Building2, Home, Users, FileText, MessageSquare, TrendingUp, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const DashboardPage = () => {
  const { data: properties } = useProperties();
  const { data: leads } = useLeads();
  const { data: tenants } = useTenants();
  const { data: leases } = useLeases();

  const published = (properties ?? []).filter((p) => p.published).length;
  const draft = (properties ?? []).filter((p) => !p.published).length;
  const activeLeases = (leases ?? []).filter((l) => l.status === "active").length;
  const newLeads = (leads ?? []).filter((l) => l.status === "new").length;

  // Chart data
  const typeDistribution = [
    { name: "Location longue", value: (properties ?? []).filter(p => p.listing_type === "long_rental").length, color: "hsl(220, 72%, 20%)" },
    { name: "Location courte", value: (properties ?? []).filter(p => p.listing_type === "short_rental").length, color: "hsl(210, 92%, 45%)" },
    { name: "Vente", value: (properties ?? []).filter(p => p.listing_type === "sale").length, color: "hsl(36, 100%, 50%)" },
  ];

  const leadsByStatus = [
    { name: "Nouveaux", count: (leads ?? []).filter(l => l.status === "new").length },
    { name: "Contactés", count: (leads ?? []).filter(l => l.status === "contacted").length },
    { name: "Qualifiés", count: (leads ?? []).filter(l => l.status === "qualified").length },
    { name: "Convertis", count: (leads ?? []).filter(l => l.status === "converted").length },
    { name: "Perdus", count: (leads ?? []).filter(l => l.status === "lost").length },
  ];

  const recentLeads = (leads ?? []).slice(0, 5);

  const statusColor: Record<string, string> = {
    new: "bg-info/15 text-info",
    contacted: "bg-warning/15 text-warning",
    qualified: "bg-secondary/15 text-secondary",
    converted: "bg-success/15 text-success",
    lost: "bg-destructive/15 text-destructive",
  };

  return (
    <PageShell title="Dashboard" subtitle="Vue d'ensemble de votre activité immobilière">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard label="Biens totaux" value={(properties ?? []).length} icon={Home} color="primary" index={0} />
        <KPICard label="Biens publiés" value={published} icon={Eye} color="success" trend={`${draft} brouillons`} index={1} />
        <KPICard label="Locataires actifs" value={(tenants ?? []).length} icon={Users} color="info" index={2} />
        <KPICard label="Contrats actifs" value={activeLeases} icon={FileText} color="secondary" index={3} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard label="Leads totaux" value={(leads ?? []).length} icon={MessageSquare} color="warning" index={4} />
        <KPICard label="Nouveaux leads" value={newLeads} icon={TrendingUp} color="destructive" trend={newLeads > 0 ? "À traiter" : undefined} index={5} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie chart */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="premium-card p-6">
          <h3 className="font-semibold text-sm mb-4">Répartition par type d'offre</h3>
          {(properties ?? []).length === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {typeDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {typeDistribution.map((t) => (
              <div key={t.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                {t.name} ({t.value})
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bar chart */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="premium-card p-6">
          <h3 className="font-semibold text-sm mb-4">Leads par statut</h3>
          {(leads ?? []).length === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leadsByStatus} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Recent leads */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="premium-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Derniers leads</h3>
          <a href="/admin/leads" className="text-xs text-primary font-medium hover:underline">Voir tout →</a>
        </div>
        {recentLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucun lead pour le moment</p>
        ) : (
          <div className="space-y-3">
            {recentLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {l.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{l.full_name}</p>
                    <p className="text-xs text-muted-foreground">{l.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`${statusColor[l.status] ?? ""} text-xs border-0`}>{l.status}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </PageShell>
  );
};

export default DashboardPage;