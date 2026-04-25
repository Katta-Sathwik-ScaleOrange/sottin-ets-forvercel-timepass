import { useSurveyStore } from '@/store/surveyStore';
import { SurveyShell } from '@/components/survey/SurveyShell';
import { SurveySection } from '@/components/survey/SurveySection';
import { ApartmentStep } from '@/components/survey/ApartmentStep';
import { OfficeStep } from '@/components/survey/OfficeStep';
import { ScheduleStep } from '@/components/survey/ScheduleStep';
import { TimingStep } from '@/components/survey/TimingStep';
import { SurveyConfirm } from '@/components/survey/SurveyConfirm';

const BAND_LABELS = {
  before_730: 'Before 7:30 AM', '730_830': '7:30 – 8:30 AM', '830_930': '8:30 – 9:30 AM', after_930: 'After 9:30 AM',
  before_5: 'Before 5 PM', '5_6': '5 – 6 PM', '6_7': '6 – 7 PM', after_7: 'After 7 PM',
};

export default function Survey() {
  const { step, nextStep, goToStep, apartment, office, preferredDays, estimatedDays, morningBand, eveningBand } = useSurveyStore();

  return (
    <SurveyShell>
      {/* Step 1 — Apartment */}
      <SurveySection
        stepNumber={1}
        title="Apartment"
        isActive={step === 1}
        isCompleted={step > 1}
        onEdit={() => goToStep(1)}
        summaryContent={
          <p className="text-white text-sm font-medium truncate">{apartment?.name} <span className="text-slate-500">· {apartment?.area}</span></p>
        }
      >
        <ApartmentStep onComplete={nextStep} />
      </SurveySection>

      {/* Step 2 — Office */}
      <SurveySection
        stepNumber={2}
        title="Office"
        isActive={step === 2}
        isCompleted={step > 2}
        onEdit={() => goToStep(2)}
        summaryContent={
          <p className="text-white text-sm font-medium truncate">{office?.name} <span className="text-slate-500">· {office?.area}</span></p>
        }
      >
        <OfficeStep onComplete={nextStep} />
      </SurveySection>

      {/* Step 3 — Schedule */}
      <SurveySection
        stepNumber={3}
        title="Schedule"
        isActive={step === 3}
        isCompleted={step > 3}
        onEdit={() => goToStep(3)}
        summaryContent={
          <p className="text-white text-sm font-medium truncate">
            {preferredDays.join(', ')} <span className="text-slate-500">· {estimatedDays} days/mo</span>
          </p>
        }
      >
        <ScheduleStep onComplete={nextStep} />
      </SurveySection>

      {/* Step 4 — Timing */}
      <SurveySection
        stepNumber={4}
        title="Timing"
        isActive={step === 4}
        isCompleted={step > 4}
        onEdit={() => goToStep(4)}
        summaryContent={
          <p className="text-white text-sm font-medium truncate">
            {BAND_LABELS[morningBand]} <span className="text-slate-500">→</span> {BAND_LABELS[eveningBand]}
          </p>
        }
      >
        <TimingStep onComplete={nextStep} />
      </SurveySection>

      {/* Step 5 — Confirm & Submit */}
      <SurveySection
        stepNumber={5}
        title="Confirm"
        isActive={step === 5}
        isCompleted={false}
        summaryContent={null}
      >
        <SurveyConfirm />
      </SurveySection>
    </SurveyShell>
  );
}
