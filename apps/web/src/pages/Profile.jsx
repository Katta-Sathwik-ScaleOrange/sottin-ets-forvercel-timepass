import { useAuthStore } from '@/store/authStore';
import { AppHeader } from '@/components/shared/AppHeader';
import { BottomNav } from '@/components/shared/BottomNav';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

export default function Profile() {
  const { user, clearAuth } = useAuthStore();

  return (
    <div className="min-h-screen bg-surface-0 pb-20">
      <AppHeader title="Profile" />
      <div className="px-4 space-y-4 pt-2">
        <Card className="flex items-center gap-4">
          <Avatar src={user?.avatarUrl} name={user?.name} size="lg" />
          <div>
            <p className="text-white font-semibold text-lg">{user?.name}</p>
            <p className="text-slate-400 text-sm">{user?.email}</p>
          </div>
        </Card>
        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-white">Preferences</h3>
          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-sm">WhatsApp notifications</span>
            <input type="checkbox" defaultChecked className="accent-brand-500 w-5 h-5" />
          </div>
        </Card>
        <Card className="space-y-3">
          <h3 className="text-base font-semibold text-white">About</h3>
          <p className="text-slate-400 text-sm">Tellapur Transit v1.0</p>
          <p className="text-slate-500 text-xs">Fixed-route corporate commute service</p>
        </Card>
        <Button size="full" variant="danger" onClick={() => { clearAuth(); window.location.href = '/'; }}>Sign Out</Button>
      </div>
      <BottomNav />
    </div>
  );
}
