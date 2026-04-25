import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';

/**
 * @param {boolean} cacheOnSelect — if true and the result came from Google Places
 *   (has place_id but no local id), POST to /api/offices to cache it in the DB.
 */
export function LocationSearch({ placeholder = 'Search...', endpoint, onSelect, renderResult, value = null, onClear, cacheOnSelect = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [resultSource, setResultSource] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`${endpoint}?q=${encodeURIComponent(query)}`);
        const items = data.results || data;
        setResults(Array.isArray(items) ? items : []);
        setResultSource(data.source || null);
        setOpen(true);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }, 300);
  }, [query, endpoint]);

  const handleSelect = async (item) => {
    let finalItem = item;

    // If this is a Google Places result being selected on an offices endpoint, cache it
    if (cacheOnSelect && item.place_id && !item.id) {
      try {
        const cached = await api.post('/offices', {
          name: item.name,
          short_name: item.short_name || item.name,
          area: item.area || item.vicinity || '',
          lat: item.lat || item.geometry?.location?.lat,
          lng: item.lng || item.geometry?.location?.lng,
          place_id: item.place_id,
          gates: item.gates || [],
        });
        // Use the cached record with its DB id
        finalItem = { ...item, ...cached };
      } catch (e) {
        console.warn('Failed to cache office, using raw result:', e);
      }
    }

    onSelect(finalItem);
    setQuery('');
    setOpen(false);
  };

  if (value) {
    return (
      <div className="flex items-center justify-between bg-surface-2 border border-brand-500/50 rounded-2xl px-4 py-3">
        <div>
          <p className="text-white font-medium">{value.name}</p>
          <p className="text-slate-400 text-sm">{value.area}</p>
        </div>
        <button onClick={onClear} className="text-slate-400 hover:text-white text-sm">Change</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={clsx('flex items-center gap-3 bg-surface-2 border rounded-2xl px-4 py-3 transition-colors', open ? 'border-brand-500/50' : 'border-surface-border')}>
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-base" autoComplete="off" />
        {loading && <Spinner size="sm" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-surface-2 border border-surface-border rounded-2xl overflow-hidden shadow-2xl">
          {results.map((item, i) => (
            <button key={item.id || item.place_id || i} onClick={() => handleSelect(item)}
              className="w-full px-4 py-3 text-left hover:bg-surface-3 transition-colors border-b border-surface-border last:border-0">
              {renderResult ? renderResult(item) : (
                <div>
                  <p className="text-white font-medium">{item.name}</p>
                  <p className="text-slate-400 text-sm">{item.area}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
