import { motion } from "framer-motion";

interface PageShellProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const PageShell = ({ title, subtitle, children }: PageShellProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="mb-6">
      <h1 className="text-2xl font-bold font-display text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {children}
  </motion.div>
);

export default PageShell;
