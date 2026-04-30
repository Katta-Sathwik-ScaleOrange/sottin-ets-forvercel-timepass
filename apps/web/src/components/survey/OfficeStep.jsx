import { useState } from 'react';
import { useSurveyStore } from '@/store/surveyStore';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { OsmMiniMap } from '@/components/shared/OsmMiniMap';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';

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

      <LocationSearch
        placeholder="Search by office or building... e.g. Amazon, Galleria"
        endpoint="/offices/search"
        onSelect={handleSelect}
        value={office}
        onClear={() => { setOffice(null); setSelectedGate(null); }}
        cacheOnSelect={true}
        showBuildingName={true}
      />

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
