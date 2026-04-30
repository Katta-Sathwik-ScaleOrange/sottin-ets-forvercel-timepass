import { useState, useCallback } from 'react';
import { useSurveyStore } from '@/store/surveyStore';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { OsmMiniMap } from '@/components/shared/OsmMiniMap';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';

export function ApartmentStep({ onComplete }) {
  const { apartment, setApartment } = useSurveyStore();

  const [showSuggest, setShowSuggest]     = useState(false);
  const [suggestName, setSuggestName]     = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [gpsLoading, setGpsLoading]       = useState(false);
  const [gpsError, setGpsError]           = useState(null);
  const [gpsPendingId, setGpsPendingId]   = useState(null);
  const [gpsNearby, setGpsNearby]         = useState([]);

  // Parse polygon from API response (it comes as a JSON string from ST_AsGeoJSON)
  const parsePolygon = (apt) => {
    if (!apt) return null;
    if (apt.polygon_geojson && typeof apt.polygon_geojson === 'string') {
      try { return JSON.parse(apt.polygon_geojson); } catch { return null; }
    }
    return apt.polygon_geojson || null;
  };

  // --- GPS Detection ---
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Your browser doesn't support location services.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    setGpsPendingId(null);
    setGpsNearby([]);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const data = await api.get(`/apartments/detect?lat=${lat}&lng=${lng}`);
          if (data.match) {
            // Direct polygon match — auto-select the apartment
            setApartment({ ...data.match, polygon_geojson: parsePolygon(data.match) });
            setGpsError(null);
          } else {
            // No match — show message and nearby suggestions
            setGpsPendingId(data.pendingId || null);
            setGpsNearby(data.nearby || []);
            setGpsError(data.message || "No match found. Please search manually or add your apartment below.");
            setShowSuggest(true);
          }
        } catch (e) {
          setGpsError('Location detection failed. Please search manually.');
          console.error(e);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) setGpsError('Location access denied. Please search manually.');
        else setGpsError('Could not get your location. Please search manually.');
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [setApartment]);

  // --- Suggest missing apartment ---
  const handleSuggest = async () => {
    if (!suggestName.trim()) return;
    setSuggestLoading(true);
    try {
      const result = await api.post('/apartments/suggest', {
        name    : suggestName.trim(),
        area    : 'Tellapur',
        pendingId: gpsPendingId || undefined,
      });
      setApartment(result?.id ? result : { name: suggestName.trim(), area: 'Tellapur', id: null });
      onComplete();
    } catch (e) {
      console.error('Failed to suggest apartment:', e);
      setApartment({ name: suggestName.trim(), area: 'Tellapur', id: null });
      onComplete();
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleSelect = (apt) => {
    setApartment({ ...apt, polygon_geojson: parsePolygon(apt) });
    setGpsError(null);
    setGpsNearby([]);
  };

  const selectedPolygon = apartment ? parsePolygon(apartment) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white">Where do you live?</h2>
        <p className="text-slate-400 text-sm mt-1">Search or detect your apartment</p>
      </div>

      {/* GPS Detect button */}
      {!apartment && (
        <button
          onClick={handleDetectLocation}
          disabled={gpsLoading}
          className="flex items-center gap-2 w-full bg-surface-2 border border-surface-border hover:border-brand-500/60 rounded-2xl px-4 py-3 text-left transition-colors active:scale-95"
        >
          {gpsLoading
            ? <Spinner size="sm" />
            : (
              <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )
          }
          <div>
            <p className="text-white text-sm font-medium">
              {gpsLoading ? 'Detecting location...' : 'Use my current location'}
            </p>
            <p className="text-slate-500 text-xs">Auto-detects your apartment via GPS</p>
          </div>
        </button>
      )}

      {/* GPS error / no-match message */}
      {gpsError && !apartment && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-3">
          <p className="text-amber-400 text-sm">{gpsError}</p>
        </div>
      )}

      {/* Nearby suggestions from GPS (when no polygon match) */}
      {gpsNearby.length > 0 && !apartment && (
        <div className="space-y-2">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Nearby apartments</p>
          {gpsNearby.map((apt) => (
            <button
              key={apt.id}
              onClick={() => handleSelect(apt)}
              className="w-full flex items-center justify-between bg-surface-2 border border-surface-border rounded-xl px-4 py-3 text-left hover:border-brand-500/50 transition-colors"
            >
              <div>
                <p className="text-white text-sm font-medium">{apt.name}</p>
                <p className="text-slate-400 text-xs">{apt.area}</p>
              </div>
              <span className="text-slate-500 text-xs">
                {apt.distance_m ? `${Math.round(apt.distance_m)}m away` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Divider with OR */}
      {!apartment && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-surface-border" />
          <span className="text-slate-500 text-xs">or search</span>
          <div className="flex-1 h-px bg-surface-border" />
        </div>
      )}

      {/* Text search */}
      <LocationSearch
        placeholder="Search apartments... e.g. My Home Bhooja"
        endpoint="/apartments/search"
        onSelect={handleSelect}
        value={apartment}
        onClear={() => { setApartment(null); setGpsError(null); setGpsNearby([]); }}
      />

      {/* OSM Mini-map — shows when apartment selected and has lat/lng */}
      {apartment?.lat && apartment?.lng && (
        <div className="space-y-2">
          <OsmMiniMap
            lat={apartment.lat}
            lng={apartment.lng}
            polygonGeoJson={selectedPolygon}
            height="180px"
            label={apartment.name}
          />
          {selectedPolygon && (
            <p className="text-slate-500 text-xs text-center flex items-center justify-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-brand-500" />
              Building boundary from OpenStreetMap
            </p>
          )}
        </div>
      )}

      {/* "Can't find" suggest fallback */}
      {!apartment && (
        <div className="pt-1">
          {!showSuggest ? (
            <button onClick={() => setShowSuggest(true)} className="text-brand-500 text-sm font-medium">
              Can't find your apartment? Add it →
            </button>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Enter your apartment name"
                value={suggestName}
                onChange={(e) => setSuggestName(e.target.value)}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSuggest}
                disabled={!suggestName.trim()}
                loading={suggestLoading}
              >
                Submit for review
              </Button>
              {gpsPendingId && (
                <p className="text-slate-500 text-xs">
                  Your GPS location has been saved. We'll match it once your apartment is added.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="pt-2">
        <Button size="full" disabled={!apartment} onClick={onComplete}>Next</Button>
      </div>
    </div>
  );
}
