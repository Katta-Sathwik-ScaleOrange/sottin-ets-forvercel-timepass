import { clsx } from 'clsx';

export function Input({ className = '', ...props }) {
  return (
    <input
      className={clsx(
        'w-full bg-surface-2 border border-surface-border rounded-2xl px-4 py-3',
        'text-white placeholder-slate-500 outline-none text-base',
        'focus:border-brand-500/50 transition-colors',
        className
      )}
      autoComplete="off"
      {...props}
    />
  );
}
