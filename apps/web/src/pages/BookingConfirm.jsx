import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function BookingConfirm() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-4 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 max-w-sm w-full">
        <div className="text-6xl">✅</div>
        <h1 className="text-2xl font-bold text-white">Booking Confirmed!</h1>
        <p className="text-slate-400">Your seats are reserved. See you on the bus!</p>
        <Card className="space-y-3">
          <Button size="full" variant="secondary" onClick={() => {}}>📅 Add to Google Calendar</Button>
          <Button size="full" variant="secondary" onClick={() => { if (navigator.share) navigator.share({ title: 'Tellapur Transit', text: 'I just booked my commute on Tellapur Transit!', url: window.location.origin }); }}>
            📤 Share with friends
          </Button>
        </Card>
        <Button size="full" onClick={() => navigate('/home')}>Go to Home</Button>
      </motion.div>
    </div>
  );
}
