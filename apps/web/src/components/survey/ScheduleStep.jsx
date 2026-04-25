import { useSurveyStore } from '@/store/surveyStore';
import { Button } from '@/components/ui/Button';
import { ChipGroup, ChipRadio } from '@/components/ui/Chip';

const DAY_OPTIONS = [
  { value: 'Mon', label: 'Mon' },
  { value: 'Tue', label: 'Tue' },
  { value: 'Wed', label: 'Wed' },
  { value: 'Thu', label: 'Thu' },
  { value: 'Fri', label: 'Fri' },
];

const DAYS_PER_MONTH = [
  { value: 4, label: '4 days' },
  { value: 8, label: '8 days' },
  { value: 12, label: '12 days' },
  { value: 16, label: '16 days' },
  { value: 20, label: '20+ days' },
];

export function ScheduleStep() {
  const { preferredDays, setPreferredDays, estimatedDays, setEstimatedDays, nextStep } = useSurveyStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Your schedule</h2>
          <p className="text-slate-400 text-sm mt-1">Which days do you typically go to office?</p>
        </div>
        <div className="space-y-3">
          <p className="text-base font-semibold text-white">Preferred days</p>
          <ChipGroup options={DAY_OPTIONS} selected={preferredDays} onChange={setPreferredDays} />
        </div>
        <div className="space-y-3">
          <p className="text-base font-semibold text-white">Estimated days per month</p>
          <ChipRadio options={DAYS_PER_MONTH} value={estimatedDays} onChange={setEstimatedDays} />
        </div>
      </div>
      <div className="sticky bottom-0 pt-4 pb-6 bg-surface-0">
        <Button size="full" disabled={preferredDays.length === 0 || !estimatedDays} onClick={nextStep}>Next</Button>
      </div>
    </div>
  );
}
