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

export function TimingStep({ onComplete }) {
  const { morningBand, setMorningBand, eveningBand, setEveningBand } = useSurveyStore();

  return (
    <div className="space-y-8">
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
      <div className="pt-2">
        <Button size="full" disabled={!morningBand || !eveningBand} onClick={onComplete}>Review & Submit</Button>
      </div>
    </div>
  );
}
