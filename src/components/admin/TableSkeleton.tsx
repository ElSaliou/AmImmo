import { motion } from "framer-motion";

interface Props {
  rows?: number;
  columns?: number;
}

const TableSkeleton = ({ rows = 5, columns = 5 }: Props) => (
  <div className="premium-card overflow-hidden">
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-4"
        >
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
          {Array.from({ length: columns - 1 }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-muted rounded animate-pulse"
              style={{ width: `${60 + Math.random() * 40}%`, flex: 1 }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  </div>
);

export default TableSkeleton;
