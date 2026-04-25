import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';

export function AppHeader({ title }) {
  const user = useAuthStore(s => s.user);
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-2">
      <h1 className="text-xl font-bold text-white">{title || 'Tellapur Transit'}</h1>
      {user && <Avatar src={user.avatarUrl} name={user.name} size="sm" />}
    </header>
  );
}
