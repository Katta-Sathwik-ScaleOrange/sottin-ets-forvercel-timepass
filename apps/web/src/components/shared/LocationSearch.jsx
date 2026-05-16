import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';

/**
 * LocationSearch — reusable search dropdown for apartments and offices.
 *
 * Props:
 *   placeholder    {string}
 *   endpoint       {string}  API path e.g. "/apartments/search"
 *   onSelect       {fn}      Called with the selected item object
 *   value          {object|null}  Currently selected item (shows confirmed card)
 *   onClear        {fn}      Called when user clicks "Change"
 *   cacheOnSelect  {boolean} If true + item has place_id but no id → POST to /offices to cache
 *   showBuildingName {boolean} If true, show building_name subtitle in results (for offices)
 */
export function LocationSearch({
  placeholder = 'Search...',
  endpoint,
  onSelect,
  value = null,
  onClear,
  cacheOnSelect = false,
  showBuildingName = false,
}) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
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

    // If this is an offices endpoint (cacheOnSelect=true), increment selection_count
    if (cacheOnSelect) {
      try {
        const cached = await api.post('/offices', {
          id           : item.id || null,
          name         : item.name,
          building_name: item.building_name || null,
          short_name   : item.short_name || item.name,
          area         : item.area || item.vicinity || '',
          lat          : item.lat || item.geometry?.location?.lat,
          lng          : item.lng || item.geometry?.location?.lng,
          place_id     : item.place_id,
          gates        : item.gates || [],
        });
        finalItem = { ...item, ...cached };
      } catch (e) {
        console.warn('Failed to cache/increment office, using raw result:', e);
      }
    }

    onSelect(finalItem);
    setQuery('');
    setOpen(false);
  };

  // ── Selected / confirmed card ──────────────────────────────────────────────
  if (value) {
    return (
      <div className="flex items-center justify-between bg-surface-2 border border-brand-500/50 rounded-2xl px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{value.name}</p>
          {showBuildingName && value.building_name && value.building_name !== value.name && (
            <p className="text-slate-400 text-xs truncate">{value.building_name}</p>
          )}
          <p className="text-slate-400 text-sm truncate">{value.area}</p>
        </div>
        <button onClick={onClear} className="text-slate-400 hover:text-white text-sm ml-3 flex-shrink-0">Change</button>
      </div>
    );
  }

  // ── Search input + dropdown ────────────────────────────────────────────────
  return (
    <div className="relative">
      <div className={clsx(
        'flex items-center gap-3 bg-surface-2 border rounded-2xl px-4 py-3 transition-colors',
        open ? 'border-brand-500/50' : 'border-surface-border'
      )}>
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-base"
          autoComplete="off"
        />
        {loading && <Spinner size="sm" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-surface-2 border border-surface-border rounded-2xl overflow-hidden shadow-2xl">
          {/* Source badge */}
          {resultSource && resultSource !== 'cache' && (
            <div className="px-4 py-1.5 border-b border-surface-border">
              <span className="text-xs text-slate-500 capitalize">
                {resultSource === 'google' ? '🌐 From Google Places' : '🔍 Fuzzy search'}
              </span>
            </div>
          )}
          {results.map((item, i) => (
            <button
              key={item.id || item.place_id || i}
              onClick={() => handleSelect(item)}
              className="w-full px-4 py-3 text-left hover:bg-surface-3 transition-colors border-b border-surface-border last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{item.name}</p>
                  {/* Show building_name as a second line for offices */}
                  {showBuildingName && item.building_name && item.building_name !== item.name && (
                    <p className="text-slate-400 text-xs truncate">{item.building_name}</p>
                  )}
                  <p className="text-slate-400 text-sm truncate">{item.area}</p>
                </div>
                {/* OSM polygon indicator */}
                {item.polygon_geojson && (
                  <span
                    title="Building boundary available"
                    className="flex-shrink-0 mt-1 inline-flex items-center gap-1 text-brand-500 text-xs"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    Map
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-surface-2 border border-surface-border rounded-2xl px-4 py-3 shadow-2xl">
          <p className="text-slate-400 text-sm">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
