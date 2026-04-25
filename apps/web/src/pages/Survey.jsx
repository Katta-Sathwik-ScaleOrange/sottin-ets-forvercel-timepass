import { useSurveyStore } from '@/store/surveyStore';
import { SurveyShell } from '@/components/survey/SurveyShell';
import { ApartmentStep } from '@/components/survey/ApartmentStep';
import { OfficeStep } from '@/components/survey/OfficeStep';
import { ScheduleStep } from '@/components/survey/ScheduleStep';
import { TimingStep } from '@/components/survey/TimingStep';
import { SurveyConfirm } from '@/components/survey/SurveyConfirm';

const steps = { 1: ApartmentStep, 2: OfficeStep, 3: ScheduleStep, 4: TimingStep, 5: SurveyConfirm };

export default function Survey() {
  const step = useSurveyStore(s => s.step);
  const StepComponent = steps[step] || ApartmentStep;

  return (
    <SurveyShell>
      <StepComponent />
    </SurveyShell>
  );
}
