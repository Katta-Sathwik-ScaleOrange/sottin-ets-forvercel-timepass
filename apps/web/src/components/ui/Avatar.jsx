import { clsx } from 'clsx';

export function Avatar({ src, name, size = 'md', className = '' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return src ? (
    <img src={src} alt={name} className={clsx('rounded-full object-cover', sizes[size], className)} />
  ) : (
    <div className={clsx('rounded-full bg-brand-500/20 text-brand-500 font-semibold flex items-center justify-center', sizes[size], className)}>
      {initials}
    </div>
  );
}
