import { motion } from 'framer-motion';

export function SavingsTicker({ amount, baseline = 350 }) {
  if (!amount || amount <= 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4 flex items-center gap-3">
      <span className="text-2xl">💰</span>
      <div>
        <p className="text-brand-500 font-bold text-lg">₹{amount.toLocaleString('en-IN')}</p>
        <p className="text-slate-400 text-xs">saved this month vs ₹{baseline}/trip on Uber/Ola</p>
      </div>
    </motion.div>
  );
}
