import { clsx } from 'clsx';

export function Chip({ label, selected = false, onClick, disabled = false, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={clsx(
        'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 select-none active:scale-95 border',
        selected ? 'bg-brand-500/20 border-brand-500 text-brand-500' : 'bg-surface-2 border-surface-border text-slate-400 hover:border-slate-500',
        disabled && 'opacity-40 cursor-not-allowed', className
      )}>
      {label}
    </button>
  );
}

export function ChipGroup({ options, selected = [], onChange, max = null }) {
  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter(v => v !== value));
    else { if (max && selected.length >= max) return; onChange([...selected, value]); }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (<Chip key={opt.value} label={opt.label} selected={selected.includes(opt.value)} onClick={() => toggle(opt.value)} />))}
    </div>
  );
}

export function ChipRadio({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (<Chip key={opt.value} label={opt.label} selected={value === opt.value} onClick={() => onChange(opt.value)} />))}
    </div>
  );
}
