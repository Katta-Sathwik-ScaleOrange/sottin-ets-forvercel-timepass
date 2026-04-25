import { motion } from 'framer-motion';

export function ProgressBar({ progress = 0, className = '' }) {
  return (
    <div className={`h-1 bg-surface-3 rounded-full overflow-hidden ${className}`}>
      <motion.div
        className="h-full bg-brand-500 rounded-full"
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}
