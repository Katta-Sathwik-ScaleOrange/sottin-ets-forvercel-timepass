import { clsx } from 'clsx';

const variants = {
  default: 'bg-surface-3 text-slate-300',
  success: 'bg-green-500/10 text-green-400',
  warning: 'bg-yellow-500/10 text-yellow-400',
  danger: 'bg-red-500/10 text-red-400',
  brand: 'bg-brand-500/10 text-brand-500',
};

export function Badge({ label, variant = 'default', className = '' }) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {label}
    </span>
  );
}
