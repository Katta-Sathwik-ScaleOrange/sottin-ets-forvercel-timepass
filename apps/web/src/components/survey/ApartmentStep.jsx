import { useState } from 'react';
import { useSurveyStore } from '@/store/surveyStore';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ApartmentStep() {
  const { apartment, setApartment, nextStep } = useSurveyStore();
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestName, setSuggestName] = useState('');

  const handleSuggest = () => {
    if (suggestName.trim()) {
      setApartment({ name: suggestName.trim(), area: 'Tellapur', id: null });
      nextStep();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Where do you live?</h2>
          <p className="text-slate-400 text-sm mt-1">Search for your apartment complex</p>
        </div>
        <LocationSearch
          placeholder="Search apartments... e.g. My Home Bhooja"
          endpoint="/apartments/search"
          onSelect={(apt) => setApartment(apt)}
          value={apartment}
          onClear={() => setApartment(null)}
        />
        {!apartment && (
          <div className="pt-4">
            {!showSuggest ? (
              <button onClick={() => setShowSuggest(true)} className="text-brand-500 text-sm font-medium">
                Can't find your apartment? Add it →
              </button>
            ) : (
              <div className="space-y-3">
                <Input placeholder="Enter your apartment name" value={suggestName} onChange={(e) => setSuggestName(e.target.value)} />
                <Button variant="secondary" size="sm" onClick={handleSuggest} disabled={!suggestName.trim()}>
                  Submit for review
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="sticky bottom-0 pt-4 pb-6 bg-surface-0">
        <Button size="full" disabled={!apartment} onClick={nextStep}>Next</Button>
      </div>
    </div>
  );
}
