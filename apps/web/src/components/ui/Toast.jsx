import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const variants = {
  success: 'bg-green-500/10 border-green-500/30 text-green-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

export function Toast({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
      className={clsx('fixed bottom-20 left-4 right-4 z-50 px-4 py-3 rounded-2xl border text-sm font-medium text-center', variants[type])}
    >
      {message}
    </motion.div>
  );
}

// Toast manager hook
let toastFn = null;
export function useToast() {
  const [toast, setToast] = useState(null);
  toastFn = (msg, type) => setToast({ message: msg, type, key: Date.now() });
  return { toast, clearToast: () => setToast(null) };
}
export const showToast = (msg, type = 'info') => toastFn?.(msg, type);
