import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiFetch } from '../api/client';
import { User } from '../types';

export type Role = 'RIDER' | 'DRIVER';

interface BackendProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleType?: string;
}

interface AuthResponse {
  accessToken: string;
  rider?: BackendProfile;
  driver?: BackendProfile;
}

export interface RegisterInput {
  name: string;
  phone: string;
  email: string;
  password: string;
  vehicleType?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (role: Role, identifier: string, password: string) => Promise<void>;
  register: (role: Role, input: RegisterInput) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// No photo/rating in any backend response yet — these are placeholder
// display-only fallbacks for a real logged-in user, not fake identities.
const DEFAULT_RIDER_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
const DEFAULT_DRIVER_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (role, identifier, password) => {
        set({ isLoading: true, error: null });
        try {
          const endpoint = role === 'RIDER' ? '/riders/login' : '/drivers/login';
          const res = await apiFetch<AuthResponse>(endpoint, {
            method: 'POST',
            body: JSON.stringify({ identifier, password }),
          });
          const profile = role === 'RIDER' ? res.rider : res.driver;
          if (!profile) {
            throw new Error('Login succeeded but the response was missing a profile');
          }
          set({
            user: {
              id: profile.id,
              name: profile.name,
              phone: profile.phone,
              email: profile.email,
              role,
              vehicleType: profile.vehicleType,
              // No rating from any backend yet (see DriverInfo's own note on
              // this) — a display-only placeholder avatar, not a fabricated stat.
              avatar: role === 'RIDER' ? DEFAULT_RIDER_AVATAR : DEFAULT_DRIVER_AVATAR,
            },
            accessToken: res.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (e) {
          set({ isLoading: false, error: e instanceof Error ? e.message : 'Login failed' });
          throw e;
        }
      },

      register: async (role, input) => {
        set({ isLoading: true, error: null });
        try {
          const endpoint = role === 'RIDER' ? '/riders' : '/drivers';
          await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(input) });
          await get().login(role, input.email, input.password);
        } catch (e) {
          set({ isLoading: false, error: e instanceof Error ? e.message : 'Registration failed' });
          throw e;
        }
      },

      logout: () => set({ user: null, accessToken: null, isAuthenticated: false, error: null }),

      clearError: () => set({ error: null }),
    }),
    {
      // Bumped again: the fake-auto-login regression this fixes (DEFAULT_RIDER,
      // isAuthenticated: true by default) crept back in a second time and
      // persisted itself under v2 — bump invalidates any browser's stale copy.
      name: 'rydtrip-auth-v3',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
