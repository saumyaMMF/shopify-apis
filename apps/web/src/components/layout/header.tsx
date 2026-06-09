'use client';

import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { Bell, LogOut } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  async function logout() {
    try { await axios.post('/api/backend/auth/logout', null, { withCredentials: true }); } catch {}
    clear();
    router.replace('/login');
  }

  return (
    <header className="h-14 bg-card border-b flex items-center justify-between px-6">
      <div className="text-sm text-muted-foreground">Welcome back, {user?.firstName}</div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-md hover:bg-muted" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <div className="text-right">
            <div className="font-medium">{user?.firstName} {user?.lastName}</div>
            <div className="text-xs text-muted-foreground">{user?.role}</div>
          </div>
          <button onClick={logout} className="p-2 rounded-md hover:bg-muted" aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
