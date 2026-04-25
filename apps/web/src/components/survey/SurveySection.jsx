import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Accordion section wrapper for the single-page survey.
 * - `isActive`: this section's form is currently being filled
 * - `isCompleted`: user already filled this section (show summary)
 * - `summaryContent`: React node shown when collapsed/completed
 * - `onEdit`: called when user taps "Edit" on a completed section
 * - `stepNumber`: 1-based step number for the label
 * - `title`: section heading
 */
export function SurveySection({
  isActive,
  isCompleted,
  summaryContent,
  onEdit,
  stepNumber,
  title,
  children,
}) {
  const sectionRef = useRef(null);

  // Auto-scroll this section into view when it becomes active
  useEffect(() => {
    if (isActive && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isActive]);

  // Not yet reached — don't render anything
  if (!isActive && !isCompleted) return null;

  return (
    <motion.div
      ref={sectionRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mb-4"
    >
      {/* Completed — collapsed summary */}
      {isCompleted && !isActive && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-between bg-surface-2 border border-surface-border rounded-2xl px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500/20 flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Step {stepNumber}</p>
              {summaryContent}
            </div>
          </div>
          <button onClick={onEdit} className="text-brand-500 text-sm font-medium flex-shrink-0 ml-3">
            Edit
          </button>
        </motion.div>
      )}

      {/* Active — full form */}
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key={`active-${stepNumber}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
