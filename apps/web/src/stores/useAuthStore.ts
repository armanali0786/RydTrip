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
  vehicleType?: string; // present on the driver profile only
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
  vehicleType?: string; // required by the backend when role === 'DRIVER'
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // `identifier` is either an email or a phone number — the backend accepts both.
  login: (role: Role, identifier: string, password: string) => Promise<void>;
  register: (role: Role, input: RegisterInput) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

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
              ...(role === 'DRIVER' ? { vehicleType: profile.vehicleType } : {}),
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
          // Registration doesn't itself return a token — log in right after,
          // by email since that's always present (phone-only login still works too).
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
      // Renamed from 'rydtrip-auth' so any browser that persisted the fake
      // mock_jwt_token/DEFAULT_RIDER session from an earlier build doesn't
      // resurrect it on load — this key has never held that shape.
      name: 'rydtrip-auth-v2',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
