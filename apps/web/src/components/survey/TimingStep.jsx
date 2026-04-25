import { useSurveyStore } from '@/store/surveyStore';
import { Button } from '@/components/ui/Button';
import { ChipRadio } from '@/components/ui/Chip';

const MORNING_BANDS = [
  { value: 'before_730', label: 'Before 7:30' },
  { value: '730_830', label: '7:30 – 8:30' },
  { value: '830_930', label: '8:30 – 9:30' },
  { value: 'after_930', label: 'After 9:30' },
];

const EVENING_BANDS = [
  { value: 'before_5', label: 'Before 5 PM' },
  { value: '5_6', label: '5 – 6 PM' },
  { value: '6_7', label: '6 – 7 PM' },
  { value: 'after_7', label: 'After 7 PM' },
];

export function TimingStep() {
  const { morningBand, setMorningBand, eveningBand, setEveningBand, nextStep } = useSurveyStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Preferred timings</h2>
          <p className="text-slate-400 text-sm mt-1">When do you need to reach office and leave?</p>
        </div>
        <div className="space-y-3">
          <p className="text-base font-semibold text-white">Morning departure</p>
          <ChipRadio options={MORNING_BANDS} value={morningBand} onChange={setMorningBand} />
        </div>
        <div className="space-y-3">
          <p className="text-base font-semibold text-white">Evening return</p>
          <ChipRadio options={EVENING_BANDS} value={eveningBand} onChange={setEveningBand} />
        </div>
      </div>
      <div className="sticky bottom-0 pt-4 pb-6 bg-surface-0">
        <Button size="full" disabled={!morningBand || !eveningBand} onClick={nextStep}>Review & Submit</Button>
      </div>
    </div>
  );
}
