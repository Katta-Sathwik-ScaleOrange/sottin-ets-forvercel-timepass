import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppHeader } from '@/components/shared/AppHeader';
import { BottomNav } from '@/components/shared/BottomNav';
import { TripCard } from '@/components/home/TripCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function Home() {
  const navigate = useNavigate();
  const { hasSurvey, hasBooking } = useAuthStore();

  return (
    <div className="min-h-screen bg-surface-0 pb-20">
      <AppHeader />
      <div className="px-4 space-y-4 pt-2">
        {hasBooking ? (
          <TripCard tripState="idle" nextTrip={null} savingsThisMonth={0} />
        ) : (
          <Card glass className="space-y-3">
            <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🚌</span>
            </div>
            <h2 className="text-xl font-bold text-white">Welcome to Tellapur Transit</h2>
            <p className="text-slate-400 text-sm">
              {hasSurvey ? 'Routes are being planned based on your survey response. You\'ll be able to book once routes go live!' : 'Start by telling us about your daily commute.'}
            </p>
          </Card>
        )}

        {!hasSurvey && (
          <Button size="full" onClick={() => navigate('/survey')}>
            📋 Take the Commute Survey
          </Button>
        )}

        {hasSurvey && (
          <Button size="full" variant="secondary" onClick={() => navigate('/booking')}>
            🎫 Book Your Seat
          </Button>
        )}

        <Card className="space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wider">How it works</p>
          <div className="space-y-2">
            {[
              { step: '1', text: 'Tell us your apartment & office' },
              { step: '2', text: 'We plan routes based on demand' },
              { step: '3', text: 'Book your specific travel dates' },
              { step: '4', text: 'Ride daily with a guaranteed seat' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 text-xs font-bold flex items-center justify-center">{step}</div>
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
