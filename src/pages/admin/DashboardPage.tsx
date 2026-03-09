import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import KPICard from "@/components/admin/KPICard";
import { useProperties } from "@/hooks/use-properties";
import { useLeads } from "@/hooks/use-leads";
import { useTenants } from "@/hooks/use-tenants";
import { useLeases } from "@/hooks/use-leases";
import { useBuildings } from "@/hooks/use-buildings";
import { useOwners } from "@/hooks/use-owners";
import { useMaintenanceRequests } from "@/hooks/use-maintenance";
import {
  Home, Users, FileText, MessageSquare, TrendingUp, Eye,
  Building2, Wallet, Percent, Wrench, UserCheck, ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend,
} from "recharts";
import { useMemo } from "react";

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const DashboardPage = () => {
  const { data: properties } = useProperties();
  const { data: leads } = useLeads();
  const { data: tenants } = useTenants();
  const { data: leases } = useLeases();
  const { data: buildings } = useBuildings();
  const { data: owners } = useOwners();
  const { data: maintenance } = useMaintenanceRequests();

  // ── Computed KPIs ──
  const totalProperties = (properties ?? []).length;
  const published = (properties ?? []).filter((p) => p.published).length;
  const draft = (properties ?? []).filter((p) => !p.published).length;
  const activeLeases = (leases ?? []).filter((l) => l.status === "active");
  const newLeads = (leads ?? []).filter((l) => l.status === "new").length;
  const openMaintenance = (maintenance ?? []).filter((m) => m.status === "open" || m.status === "in_progress").length;

  // Monthly revenue from active leases
  const monthlyRevenue = useMemo(
    () => activeLeases.reduce((sum, l) => sum + Number(l.monthly_rent), 0),
    [activeLeases]
  );

  // Occupation rate: active leases / total rental properties
  const rentalProperties = (properties ?? []).filter(
    (p) => p.listing_type === "long_rental" || p.listing_type === "short_rental"
  ).length;
  const occupancyRate = rentalProperties > 0
    ? Math.round((activeLeases.length / rentalProperties) * 100)
    : 0;

  // ── Chart data ──

  // Revenue by month (from active leases start_date, projected monthly_rent)
  const revenueByMonth = useMemo(() => {
    const now = new Date();
    const months: { name: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      // Count leases active during this month
      const rev = (leases ?? [])
        .filter((l) => {
          if (l.status !== "active" && l.status !== "expired") return false;
          const start = new Date(l.start_date);
          const end = l.end_date ? new Date(l.end_date) : now;
          const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
          const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
          return start <= monthEnd && end >= monthStart;
        })
        .reduce((s, l) => s + Number(l.monthly_rent), 0);
      months.push({ name: MONTHS_FR[d.getMonth()], revenue: rev });
    }
    return months;
  }, [leases]);

  // Property type distribution
  const typeDistribution = [
    { name: "Location longue", value: (properties ?? []).filter((p) => p.listing_type === "long_rental").length, color: "hsl(220, 72%, 20%)" },
    { name: "Location courte", value: (properties ?? []).filter((p) => p.listing_type === "short_rental").length, color: "hsl(210, 92%, 45%)" },
    { name: "Vente", value: (properties ?? []).filter((p) => p.listing_type === "sale").length, color: "hsl(36, 100%, 50%)" },
  ];

  // Property status distribution
  const statusDistribution = [
    { name: "Publiés", value: (properties ?? []).filter((p) => p.status === "published").length, color: "hsl(152, 60%, 40%)" },
    { name: "Brouillons", value: (properties ?? []).filter((p) => p.status === "draft").length, color: "hsl(220, 14%, 70%)" },
    { name: "Loués", value: (properties ?? []).filter((p) => p.status === "rented").length, color: "hsl(210, 92%, 45%)" },
    { name: "Vendus", value: (properties ?? []).filter((p) => p.status === "sold").length, color: "hsl(36, 100%, 50%)" },
    { name: "Archivés", value: (properties ?? []).filter((p) => p.status === "archived").length, color: "hsl(0, 72%, 51%)" },
  ].filter((s) => s.value > 0);

  // Leads by status
  const leadsByStatus = [
    { name: "Nouveaux", count: (leads ?? []).filter((l) => l.status === "new").length },
    { name: "Contactés", count: (leads ?? []).filter((l) => l.status === "contacted").length },
    { name: "Qualifiés", count: (leads ?? []).filter((l) => l.status === "qualified").length },
    { name: "Convertis", count: (leads ?? []).filter((l) => l.status === "converted").length },
    { name: "Perdus", count: (leads ?? []).filter((l) => l.status === "lost").length },
  ];

  // Occupancy radial data
  const occupancyData = [
    { name: "Occupation", value: occupancyRate, fill: occupancyRate >= 70 ? "hsl(152, 60%, 40%)" : occupancyRate >= 40 ? "hsl(38, 92%, 50%)" : "hsl(0, 72%, 51%)" },
  ];

  const recentLeads = (leads ?? []).slice(0, 5);

  const statusColor: Record<string, string> = {
    new: "bg-info/15 text-info",
    contacted: "bg-warning/15 text-warning",
    qualified: "bg-secondary/15 text-secondary",
    converted: "bg-success/15 text-success",
    lost: "bg-destructive/15 text-destructive",
  };

  const statusLabels: Record<string, string> = {
    new: "Nouveau",
    contacted: "Contacté",
    qualified: "Qualifié",
    converted: "Converti",
    lost: "Perdu",
  };

  const formatCurrency = (val: number) =>
    val >= 1_000_000
      ? `${(val / 1_000_000).toFixed(1)}M`
      : val >= 1_000
        ? `${(val / 1_000).toFixed(0)}K`
        : val.toString();

  return (
    <PageShell title="Dashboard" subtitle="Vue d'ensemble de votre activité immobilière">
      {/* Row 1: Financial & Occupation KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Revenus mensuels"
          value={`${formatCurrency(monthlyRevenue)} GNF`}
          icon={Wallet}
          color="success"
          trend={activeLeases.length > 0 ? `${activeLeases.length} contrats` : undefined}
          index={0}
        />
        <KPICard
          label="Taux d'occupation"
          value={`${occupancyRate}%`}
          icon={Percent}
          color={occupancyRate >= 70 ? "success" : occupancyRate >= 40 ? "warning" : "destructive"}
          trend={`${activeLeases.length}/${rentalProperties} biens`}
          index={1}
        />
        <KPICard
          label="Biens totaux"
          value={totalProperties}
          icon={Home}
          color="primary"
          trend={published > 0 ? `${published} publiés` : undefined}
          index={2}
        />
        <KPICard
          label="Contrats actifs"
          value={activeLeases.length}
          icon={FileText}
          color="info"
          index={3}
        />
      </div>

      {/* Row 2: Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KPICard label="Immeubles" value={(buildings ?? []).length} icon={Building2} color="primary" index={4} />
        <KPICard label="Propriétaires" value={(owners ?? []).length} icon={Users} color="secondary" index={5} />
        <KPICard label="Locataires" value={(tenants ?? []).length} icon={UserCheck} color="info" index={6} />
        <KPICard label="Leads" value={(leads ?? []).length} icon={MessageSquare} color="warning" index={7} />
        <KPICard label="Nouveaux leads" value={newLeads} icon={TrendingUp} color="destructive" trend={newLeads > 0 ? "À traiter" : undefined} index={8} />
        <KPICard label="Maintenance" value={openMaintenance} icon={Wrench} color={openMaintenance > 0 ? "warning" : "success"} trend={openMaintenance > 0 ? "En cours" : "RAS"} index={9} />
      </div>

      {/* Charts Row 1: Revenue + Occupation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="premium-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Revenus mensuels (6 derniers mois)</h3>
            <span className="text-xs text-muted-foreground font-medium">{formatCurrency(monthlyRevenue)} GNF/mois</span>
          </div>
          {revenueByMonth.every((m) => m.revenue === 0) ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
              Aucun contrat actif pour calculer les revenus
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152, 60%, 40%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(152, 60%, 40%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={formatCurrency} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  formatter={(value: number) => [`${value.toLocaleString()} GNF`, "Revenus"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(152, 60%, 40%)" strokeWidth={2.5} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="premium-card p-6 flex flex-col items-center justify-center"
        >
          <h3 className="font-semibold text-sm mb-2 self-start">Taux d'occupation</h3>
          {rentalProperties === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm text-center">
              Aucun bien locatif
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  barSize={14}
                  data={occupancyData}
                  startAngle={210}
                  endAngle={-30}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    background={{ fill: "hsl(var(--muted))" }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="-mt-20 text-center">
                <p className="text-4xl font-bold text-foreground">{occupancyRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeLeases.length} loué{activeLeases.length > 1 ? "s" : ""} sur {rentalProperties}
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Charts Row 2: Distribution + Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="premium-card p-6"
        >
          <h3 className="font-semibold text-sm mb-4">Par type d'offre</h3>
          {totalProperties === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {typeDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {typeDistribution.map((t) => (
                  <div key={t.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                    {t.name} ({t.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="premium-card p-6"
        >
          <h3 className="font-semibold text-sm mb-4">Par statut</h3>
          {totalProperties === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {statusDistribution.map((t) => (
                  <div key={t.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                    {t.name} ({t.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="premium-card p-6"
        >
          <h3 className="font-semibold text-sm mb-4">Leads par statut</h3>
          {(leads ?? []).length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leadsByStatus} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Recent leads */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="premium-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Derniers leads</h3>
          <Link to="/admin/leads" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            Voir tout <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucun lead pour le moment</p>
        ) : (
          <div className="space-y-3">
            {recentLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {l.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{l.full_name}</p>
                    <p className="text-xs text-muted-foreground">{l.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`${statusColor[l.status] ?? ""} text-xs border-0`}>
                    {statusLabels[l.status] ?? l.status}
                  </Badge>
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
