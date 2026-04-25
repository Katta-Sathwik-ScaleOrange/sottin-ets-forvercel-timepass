import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSurveyStore } from '@/store/surveyStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import api from '@/lib/api';

export function SurveyConfirm() {
  const { apartment, office, preferredDays, estimatedDays, morningBand, eveningBand, toPayload, reset } = useSurveyStore();
  const setSurveyDone = useAuthStore(s => s.setSurveyDone);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/survey', toPayload());
      setSurveyDone();
      setSubmitted(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-white">You're in!</h2>
        <p className="text-slate-400">We'll notify you when routes are confirmed for your corridor.</p>
        <Card className="w-full space-y-2">
          <div className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="accent-brand-500" />
            <span className="text-sm text-slate-300">Get updates on WhatsApp</span>
          </div>
        </Card>
        <Button size="full" variant="secondary" onClick={() => { if (navigator.share) navigator.share({ title: 'Tellapur Transit', text: 'Join Tellapur Transit for affordable daily commute!', url: window.location.origin }); }}>
          Share with neighbours 📤
        </Button>
      </motion.div>
    );
  }

  const bandLabels = {
    before_730: 'Before 7:30 AM', '730_830': '7:30 – 8:30 AM', '830_930': '8:30 – 9:30 AM', after_930: 'After 9:30 AM',
    before_5: 'Before 5 PM', '5_6': '5 – 6 PM', '6_7': '6 – 7 PM', after_7: 'After 7 PM',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <h2 className="text-2xl font-bold text-white">Confirm your commute</h2>
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-brand-500" />
            <div><p className="text-white font-medium">{apartment?.name}</p><p className="text-slate-400 text-xs">{apartment?.area}</p></div>
          </div>
          <div className="border-l-2 border-dashed border-surface-border ml-1 h-4" />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <div><p className="text-white font-medium">{office?.name}</p><p className="text-slate-400 text-xs">{office?.area}</p></div>
          </div>
        </Card>
        <Card className="space-y-2">
          <div className="flex justify-between"><span className="text-slate-400 text-sm">Days</span><span className="text-white text-sm">{preferredDays.join(', ')}</span></div>
          <div className="flex justify-between"><span className="text-slate-400 text-sm">Frequency</span><span className="text-white text-sm">{estimatedDays} days/month</span></div>
          <div className="flex justify-between"><span className="text-slate-400 text-sm">Morning</span><span className="text-white text-sm">{bandLabels[morningBand]}</span></div>
          <div className="flex justify-between"><span className="text-slate-400 text-sm">Evening</span><span className="text-white text-sm">{bandLabels[eveningBand]}</span></div>
        </Card>
      </div>
      <div className="sticky bottom-0 pt-4 pb-6 bg-surface-0">
        <Button size="full" loading={loading} onClick={handleSubmit}>Submit Survey</Button>
      </div>
    </div>
  );
}
