import { motion } from 'framer-motion';
import { useSurveyStore } from '@/store/surveyStore';
import { BottomNav } from '@/components/shared/BottomNav';

const STEP_LABELS = ['Apartment', 'Office', 'Schedule', 'Timing', 'Confirm'];

export function SurveyShell({ children }) {
  const { step, totalSteps, prevStep } = useSurveyStore();
  const progress = Math.min(((step - 1) / (totalSteps - 1)) * 100, 100);
  const stepLabel = STEP_LABELS[step - 1] || '';

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Top bar: back + progress + step label */}
      <div className="sticky top-0 z-30 bg-surface-0/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-surface-border/50">
        <div className="flex items-center gap-3 mb-2">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-surface-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <div className="w-8" />
          )}
          <div className="flex-1 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-semibold">{stepLabel}</p>
              <p className="text-slate-500 text-xs">Step {step} of {totalSteps}</p>
            </div>
            <span className="text-brand-500 text-xs font-semibold tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        {/* Step dots */}
        <div className="flex justify-between mt-2 px-1">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                i + 1 < step ? 'bg-brand-500' :
                i + 1 === step ? 'bg-brand-500 ring-2 ring-brand-500/30' :
                'bg-surface-3'
              }`} />
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-4 pb-24 overflow-y-auto">
        <div className="pt-4">
          {children}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
