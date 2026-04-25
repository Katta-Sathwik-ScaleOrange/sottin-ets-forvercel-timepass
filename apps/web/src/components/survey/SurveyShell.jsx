import { motion, AnimatePresence } from 'framer-motion';
import { useSurveyStore } from '@/store/surveyStore';

export function SurveyShell({ children }) {
  const { step, totalSteps, prevStep } = useSurveyStore();
  const progress = ((step - 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      <div className="flex items-center gap-4 px-4 pt-4 pb-2">
        {step > 1 && (
          <button onClick={prevStep} className="p-2 text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
          <motion.div className="h-full bg-brand-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <span className="text-slate-400 text-xs tabular-nums">{step}/{totalSteps}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}
          transition={{ duration: 0.2 }} className="flex-1 px-4 py-6">
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
