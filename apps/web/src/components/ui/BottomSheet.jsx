import { motion, AnimatePresence } from 'framer-motion';

export function BottomSheet({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface-2 border-t border-surface-border rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto">
            <div className="w-10 h-1 bg-surface-border rounded-full mx-auto mb-4" />
            {title && <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
