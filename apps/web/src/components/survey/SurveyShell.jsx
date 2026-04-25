import { motion } from 'framer-motion';
import { useSurveyStore } from '@/store/surveyStore';

export function SurveyShell({ children }) {
  const { step, totalSteps, prevStep } = useSurveyStore();
  // Progress: steps 1–4 are data, step 5 is confirm = 100%
  const progress = Math.min(((step - 1) / (totalSteps - 1)) * 100, 100);

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Top bar: back + progress */}
      <div className="sticky top-0 z-30 bg-surface-0/95 backdrop-blur-sm flex items-center gap-4 px-4 pt-4 pb-2">
        {step > 1 ? (
          <button onClick={prevStep} className="p-2 text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="w-9" /> /* spacer */
        )}
        <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Scrollable content — all sections rendered inline */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
