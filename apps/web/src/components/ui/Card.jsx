import { clsx } from 'clsx';

export function Card({ children, className = '', onClick, glass = false }) {
  return (
    <div onClick={onClick}
      className={clsx(
        'rounded-2xl border border-surface-border p-4',
        glass ? 'bg-white/5 backdrop-blur-sm' : 'bg-surface-2',
        onClick && 'cursor-pointer hover:border-slate-500 transition-colors active:scale-[0.98]',
        className
      )}>
      {children}
    </div>
  );
}
