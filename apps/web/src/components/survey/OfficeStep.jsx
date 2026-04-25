import { useState } from 'react';
import { useSurveyStore } from '@/store/surveyStore';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';

export function OfficeStep() {
  const { office, setOffice, nextStep } = useSurveyStore();
  const [selectedGate, setSelectedGate] = useState(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Where do you work?</h2>
          <p className="text-slate-400 text-sm mt-1">Search for your office building</p>
        </div>
        <LocationSearch
          placeholder="Search offices... e.g. Amazon, Microsoft"
          endpoint="/offices/search"
          onSelect={(off) => { setOffice(off); setSelectedGate(null); }}
          value={office}
          onClear={() => { setOffice(null); setSelectedGate(null); }}
        />
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
      </div>
      <div className="sticky bottom-0 pt-4 pb-6 bg-surface-0">
        <Button size="full" disabled={!office} onClick={nextStep}>Next</Button>
      </div>
    </div>
  );
}
