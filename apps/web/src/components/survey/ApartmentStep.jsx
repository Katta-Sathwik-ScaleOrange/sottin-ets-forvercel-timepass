import { useState } from 'react';
import { useSurveyStore } from '@/store/surveyStore';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';

export function ApartmentStep({ onComplete }) {
  const { apartment, setApartment } = useSurveyStore();
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestName, setSuggestName] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);

  const handleSuggest = async () => {
    if (!suggestName.trim()) return;
    setSuggestLoading(true);
    try {
      // Call the suggest API to persist the apartment
      const result = await api.post('/apartments/suggest', {
        name: suggestName.trim(),
        area: 'Tellapur',
      });
      // Use the returned record (with id) if available
      setApartment(result?.id ? result : { name: suggestName.trim(), area: 'Tellapur', id: null });
      onComplete();
    } catch (e) {
      console.error('Failed to suggest apartment:', e);
      // Fallback: still let user proceed with raw name
      setApartment({ name: suggestName.trim(), area: 'Tellapur', id: null });
      onComplete();
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleSelect = (apt) => {
    setApartment(apt);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Where do you live?</h2>
        <p className="text-slate-400 text-sm mt-1">Search for your apartment complex</p>
      </div>
      <LocationSearch
        placeholder="Search apartments... e.g. My Home Bhooja"
        endpoint="/apartments/search"
        onSelect={handleSelect}
        value={apartment}
        onClear={() => setApartment(null)}
      />
      {!apartment && (
        <div className="pt-2">
          {!showSuggest ? (
            <button onClick={() => setShowSuggest(true)} className="text-brand-500 text-sm font-medium">
              Can't find your apartment? Add it →
            </button>
          ) : (
            <div className="space-y-3">
              <Input placeholder="Enter your apartment name" value={suggestName} onChange={(e) => setSuggestName(e.target.value)} />
              <Button variant="secondary" size="sm" onClick={handleSuggest} disabled={!suggestName.trim()} loading={suggestLoading}>
                Submit for review
              </Button>
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
