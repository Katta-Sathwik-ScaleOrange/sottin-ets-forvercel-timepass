import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppHeader } from '@/components/shared/AppHeader';
import { BottomNav } from '@/components/shared/BottomNav';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';

export default function Profile() {
  const navigate = useNavigate();
  const { user, hasSurvey, hasBooking, clearAuth } = useAuthStore();
  const [survey, setSurvey] = useState(null);
  const [whatsappOpt, setWhatsappOpt] = useState(true);

  useEffect(() => {
    if (hasSurvey) {
      api.get('/survey/me').then(setSurvey).catch(() => {});
    }
  }, [hasSurvey]);

  return (
    <div className="min-h-screen bg-surface-0 pb-20">
      <AppHeader title="Profile" />

      <div className="px-4 space-y-4 pt-2">
        {/* User card */}
        <Card className="flex items-center gap-4">
          <Avatar src={user?.avatarUrl} name={user?.name} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-lg truncate">{user?.name}</p>
            <p className="text-slate-400 text-sm truncate">{user?.email}</p>
          </div>
        </Card>

        {/* Journey status */}
        <Card className="space-y-3">
          <h3 className="text-base font-semibold text-white">Your Journey</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">📋 Survey</span>
              </div>
              <Badge
                label={hasSurvey ? 'Completed' : 'Pending'}
                variant={hasSurvey ? 'success' : 'warning'}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">🎫 Booking</span>
              </div>
              <Badge
                label={hasBooking ? 'Active' : 'Not started'}
                variant={hasBooking ? 'success' : 'default'}
              />
            </div>
          </div>

          {!hasSurvey && (
            <Button size="full" onClick={() => navigate('/survey')}>
              📋 Take the Commute Survey
            </Button>
          )}
          {hasSurvey && !hasBooking && (
            <Button size="full" variant="secondary" onClick={() => navigate('/booking')}>
              🎫 Book Your Seat
            </Button>
          )}
        </Card>

        {/* Survey summary */}
        {survey && (
          <Card className="space-y-3">
            <h3 className="text-base font-semibold text-white">Commute Details</h3>
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <span className="text-slate-500 text-sm w-20 shrink-0">Home</span>
                <span className="text-slate-300 text-sm">{survey.apartment_name || survey.apartment_name_raw || '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 text-sm w-20 shrink-0">Office</span>
                <span className="text-slate-300 text-sm">{survey.office_name || survey.office_name_raw || '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 text-sm w-20 shrink-0">Days</span>
                <span className="text-slate-300 text-sm">{survey.preferred_days?.join(', ') || '—'}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/survey')}
              className="text-brand-500 text-sm font-medium"
            >
              Update preferences →
            </button>
          </Card>
        )}

        {/* Notifications */}
        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-white">Notifications</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm">WhatsApp notifications</p>
              <p className="text-slate-500 text-xs">Trip reminders & updates</p>
            </div>
            <button
              onClick={() => setWhatsappOpt(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${whatsappOpt ? 'bg-brand-500' : 'bg-surface-3'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${whatsappOpt ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </Card>

        {/* About */}
        <Card className="space-y-2">
          <h3 className="text-base font-semibold text-white">About</h3>
          <div className="space-y-1">
            <p className="text-slate-400 text-sm">Tellapur Transit v1.0</p>
            <p className="text-slate-500 text-xs">Fixed-route corporate commute · Tellapur → IT Corridor</p>
            <p className="text-slate-600 text-xs">Mon–Fri service · 22-seater AC bus</p>
          </div>
        </Card>

        <Button
          size="full"
          variant="danger"
          onClick={() => { clearAuth(); window.location.href = '/'; }}
        >
          Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
