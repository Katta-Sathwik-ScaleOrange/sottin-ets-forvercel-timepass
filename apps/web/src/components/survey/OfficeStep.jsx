import { useState, useCallback } from 'react';
import { useSurveyStore } from '@/store/surveyStore';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { OsmMiniMap } from '@/components/shared/OsmMiniMap';
import { OsmPickerMap } from '@/components/shared/OsmPickerMap';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';

// Parse polygon from API response (ST_AsGeoJSON returns a JSON string)
function parsePolygon(item) {
  if (!item) return null;
  if (item.polygon_geojson && typeof item.polygon_geojson === 'string') {
    try { return JSON.parse(item.polygon_geojson); } catch { return null; }
  }
  return item.polygon_geojson || null;
}

export function OfficeStep({ onComplete }) {
  const { office, setOffice } = useSurveyStore();
  const [selectedGate, setSelectedGate] = useState(null);

  // Map picker state
  const [showMap, setShowMap]         = useState(false);
  const [mapOffices, setMapOffices]   = useState([]);
  const [mapLoading, setMapLoading]   = useState(false);

  // Pre-load offices when map is opened (Gachibowli / Financial District area)
  const openMap = useCallback(async () => {
    setShowMap(true);
    if (mapOffices.length > 0) return;
    setMapLoading(true);
    try {
      const data = await api.get('/offices/search?q=a'); // broad search to get all offices
      const items = data.results || data || [];
      setMapOffices(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error('Failed to load map offices:', e);
    } finally {
      setMapLoading(false);
    }
  }, [mapOffices.length]);

  const handleMapSelect = (off) => {
    setOffice({ ...off, polygon_geojson: parsePolygon(off) });
    setSelectedGate(null);
    setShowMap(false);
  };

  const handleSelect = (off) => {
    setOffice({ ...off, polygon_geojson: parsePolygon(off) });
    setSelectedGate(null);
  };

  const selectedPolygon = office ? parsePolygon(office) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white">Where do you work?</h2>
        <p className="text-slate-400 text-sm mt-1">
          Search by office name <span className="text-slate-500">or</span> building name
        </p>
      </div>

      <div className="relative">
        <LocationSearch
          placeholder="Search by office or building... e.g. Amazon, Galleria"
          endpoint="/offices/search"
          onSelect={handleSelect}
          value={office}
          onClear={() => { setOffice(null); setSelectedGate(null); }}
          cacheOnSelect={true}
          showBuildingName={true}
        />
        {/* Map picker button — shown only when no office selected */}
        {!office && (
          <button
            onClick={openMap}
            disabled={mapLoading}
            title="Pick office on map"
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-brand-500 hover:text-brand-300 transition-colors"
          >
            {mapLoading
              ? <Spinner size="sm" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
            }
            <span className="text-xs font-medium">Map</span>
          </button>
        )}
      </div>

      {/* Interactive Map Picker for offices */}
      {showMap && !office && (
        <OsmPickerMap
          mode="office"
          locations={mapOffices}
          defaultCenter={[17.4431, 78.3512]}
          defaultZoom={14}
          onSelect={handleMapSelect}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* Gate selector chips — appears after office is picked */}
      {office?.gates && office.gates.length > 0 && (
        <div className="space-y-2">
          <p className="text-slate-400 text-sm font-medium">Which gate do you enter from?</p>
          <div className="flex flex-wrap gap-2">
            {office.gates.map((gate, i) => (
              <Chip key={i} label={gate.label} selected={selectedGate === i} onClick={() => setSelectedGate(i)} />
            ))}
          </div>
        </div>
      )}

      {/* OSM Mini-map — shows when office selected and has lat/lng */}
      {office?.lat && office?.lng && (
        <div className="space-y-2">
          <OsmMiniMap
            lat={office.lat}
            lng={office.lng}
            polygonGeoJson={selectedPolygon}
            height="180px"
            label={office.name}
          />
          <div className="flex items-center justify-between">
            {office.building_name && (
              <p className="text-slate-400 text-xs">
                <span className="text-slate-500">Building: </span>
                {office.building_name}
              </p>
            )}
            {selectedPolygon && (
              <p className="text-slate-500 text-xs flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-brand-500" />
                Building boundary from OpenStreetMap
              </p>
            )}
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button size="full" disabled={!office} onClick={onComplete}>Next</Button>
      </div>
    </div>
  );
}
