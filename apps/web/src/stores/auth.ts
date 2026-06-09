import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string; email: string; firstName: string; lastName: string;
  role: string; permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clear: () => void;
  has: (perm: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      clear: () => set({ accessToken: null, user: null }),
      has: (perm) => get().user?.permissions.includes(perm) ?? false,
    }),
    { name: 'auth' },
  ),
);
