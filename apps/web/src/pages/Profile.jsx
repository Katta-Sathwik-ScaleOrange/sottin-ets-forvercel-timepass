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
import PaymentHistory from '@/components/profile/PaymentHistory';

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-brand-500' : 'bg-surface-3'
      }`}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, hasSurvey, hasBooking, clearAuth } = useAuthStore();
  const [survey, setSurvey] = useState(null);
  const [whatsappOpt, setWhatsappOpt] = useState(true);
  const [phone, setPhone] = useState('');
  const [editPhone, setEditPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    api.get('/users/me')
      .then(data => {
        setWhatsappOpt(data.whatsappOpt ?? true);
        setPhone(data.phone || '');
        setPhoneDraft(data.phone || '');
      })
      .catch(() => {});
    if (hasSurvey) {
      api.get('/survey/me').then(setSurvey).catch(() => {});
    }
  }, [hasSurvey]);

  const savePreferences = async (updates) => {
    setSaving(true);
    try {
      await api.patch('/users/me', updates);
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsappToggle = (val) => {
    setWhatsappOpt(val);
    savePreferences({ whatsapp_opt: val });
  };

  const handlePhoneSave = () => {
    setPhone(phoneDraft);
    setEditPhone(false);
    savePreferences({ phone: phoneDraft });
  };

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
            {phone && <p className="text-slate-500 text-xs mt-0.5">{phone}</p>}
          </div>
        </Card>

        {/* Journey status */}
        <Card className="space-y-3">
          <h3 className="text-base font-semibold text-white">Your Journey</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">📋 Survey</span>
              <Badge
                label={hasSurvey ? 'Completed' : 'Pending'}
                variant={hasSurvey ? 'success' : 'warning'}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">🎫 Booking</span>
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

        {/* Survey / Commute details */}
        {survey && (
          <Card className="space-y-3">
            <h3 className="text-base font-semibold text-white">Commute Details</h3>
            <div className="space-y-2">
              {[
                { label: 'Home', value: survey.apartment_name || survey.apartment_name_raw },
                { label: 'Office', value: survey.office_name || survey.office_name_raw },
                { label: 'Days', value: survey.preferred_days?.join(', ') },
                { label: 'Frequency', value: survey.estimated_days_month ? `${survey.estimated_days_month} days/month` : null },
                { label: 'Morning', value: survey.morning_band?.replace('_', ':').replace('before_', 'Before ').replace('after_', 'After ') },
                { label: 'Evening', value: survey.evening_band?.replace('_', '–').replace('before_', 'Before ').replace('after_', 'After ') },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <span className="text-slate-500 text-sm w-20 shrink-0">{label}</span>
                  <span className="text-slate-300 text-sm">{value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/survey')} className="text-brand-500 text-sm font-medium">
              Update preferences →
            </button>
          </Card>
        )}

        {/* Phone number */}
        <Card className="space-y-3">
          <h3 className="text-base font-semibold text-white">Contact</h3>
          {editPhone ? (
            <div className="space-y-2">
              <input
                type="tel"
                value={phoneDraft}
                onChange={e => setPhoneDraft(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-surface-2 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-500/60"
              />
              <div className="flex gap-2">
                <button
                  onClick={handlePhoneSave}
                  disabled={saving}
                  className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditPhone(false); setPhoneDraft(phone); }}
                  className="flex-1 py-2 bg-surface-3 text-slate-300 text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">{phone || 'No phone number'}</p>
                <p className="text-slate-500 text-xs">Used for WhatsApp notifications</p>
              </div>
              <button
                onClick={() => setEditPhone(true)}
                className="text-brand-500 text-sm font-medium"
              >
                {phone ? 'Edit' : 'Add'}
              </button>
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-white">Notifications</h3>
          {saveMsg && (
            <p className="text-brand-500 text-xs">{saveMsg}</p>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm">WhatsApp notifications</p>
              <p className="text-slate-500 text-xs">Trip reminders & updates</p>
            </div>
            <Toggle checked={whatsappOpt} onChange={handleWhatsappToggle} disabled={saving} />
          </div>
        </Card>

        {/* Payment History */}
        <PaymentHistory />

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
