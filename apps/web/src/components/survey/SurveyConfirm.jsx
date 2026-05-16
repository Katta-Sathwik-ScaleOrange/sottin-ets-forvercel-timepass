import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSurveyStore } from '@/store/surveyStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import api from '@/lib/api';

const BAND_LABELS = {
  before_730: 'Before 7:30 AM', '730_830': '7:30 – 8:30 AM', '830_930': '8:30 – 9:30 AM', after_930: 'After 9:30 AM',
  before_5: 'Before 5 PM', '5_6': '5 – 6 PM', '6_7': '6 – 7 PM', after_7: 'After 7 PM',
};

export function SurveyConfirm() {
  const navigate = useNavigate();
  const { apartment, office, preferredDays, estimatedDays, morningBand, eveningBand, toPayload } = useSurveyStore();
  const { setSurveyDone, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappOpt, setWhatsappOpt] = useState(true);

  useEffect(() => {
    if (user) {
      setWhatsappOpt(user.whatsappOpt ?? true);
    }
  }, [user]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/survey', toPayload());
      setSurveyDone();
      setSubmitted(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleWhatsappToggle = async (checked) => {
    setWhatsappOpt(checked);
    try {
      await api.patch('/users/me', { whatsapp_opt: checked });
    } catch (e) { console.error('Failed to update WhatsApp preference', e); }
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-white">You're in!</h2>
        <p className="text-slate-400">We'll notify you when routes are confirmed for your corridor.</p>
        
        <Card className="w-full space-y-3">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={whatsappOpt} 
              onChange={(e) => handleWhatsappToggle(e.target.checked)}
              className="w-5 h-5 rounded accent-brand-500 bg-surface-3 border-surface-border cursor-pointer" 
            />
            <div className="text-left">
              <p className="text-sm text-white font-medium">Get updates on WhatsApp</p>
              <p className="text-xs text-slate-500">Route launches & seat availability</p>
            </div>
          </div>
          
          {!user?.phone && whatsappOpt && (
            <div className="pt-2 border-t border-surface-border text-left">
              <p className="text-xs text-amber-400 mb-2">⚠️ Add your phone number to receive notifications.</p>
              <Button size="sm" variant="secondary" onClick={() => navigate('/profile')}>
                Add Phone Number
              </Button>
            </div>
          )}
        </Card>

        <div className="w-full space-y-3">
          <Button size="full" variant="secondary" onClick={() => { if (navigator.share) navigator.share({ title: 'Tellapur Transit', text: 'Join Tellapur Transit for affordable daily commute!', url: window.location.origin }); }}>
            Share with neighbours 📤
          </Button>
          <Button size="full" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
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
        <div className="flex justify-between"><span className="text-slate-400 text-sm">Morning</span><span className="text-white text-sm">{BAND_LABELS[morningBand]}</span></div>
        <div className="flex justify-between"><span className="text-slate-400 text-sm">Evening</span><span className="text-white text-sm">{BAND_LABELS[eveningBand]}</span></div>
      </Card>
      <div className="pt-2">
        <Button size="full" loading={loading} onClick={handleSubmit}>Submit Survey</Button>
      </div>
    </div>
  );
}
