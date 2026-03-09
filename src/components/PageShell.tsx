import { motion } from "framer-motion";

interface PageShellProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

const PageShell = ({ title, subtitle, children, actions }: PageShellProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    {children}
  </motion.div>
);

export default PageShell;