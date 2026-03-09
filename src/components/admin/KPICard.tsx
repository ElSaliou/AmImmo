import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: "primary" | "secondary" | "success" | "info" | "warning" | "destructive";
  index?: number;
}

const colorMap = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

const KPICard = ({ label, value, icon: Icon, trend, color = "primary", index = 0 }: KPICardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
    className="kpi-card group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colorMap[color])}>
        <Icon className="h-5 w-5" />
      </div>
      {trend && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {trend}
        </span>
      )}
    </div>
    <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
  </motion.div>
);

export default KPICard;
