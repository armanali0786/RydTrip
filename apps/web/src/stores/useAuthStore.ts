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
  role: Role;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setRole: (role: Role) => void;
  login: (role: Role, identifier: string, password: string) => Promise<void>;
  register: (role: Role, input: RegisterInput) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const DEFAULT_RIDER: User = {
  id: 'rider_arman_01',
  name: 'Arman Ali',
  email: 'arman@rydtrip.com',
  phone: '+91 98765 43210',
  role: 'RIDER',
  rating: 4.95,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

const DEFAULT_DRIVER: User = {
  id: 'driver_rahul_01',
  name: 'Rahul Sharma',
  email: 'rahul.driver@rydtrip.com',
  phone: '+91 91234 56789',
  role: 'DRIVER',
  rating: 4.88,
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: DEFAULT_RIDER,
      role: 'RIDER',
      accessToken: 'mock_jwt_token',
      isAuthenticated: true,
      isLoading: false,
      error: null,

      setRole: (role) => {
        set({
          role,
          user: role === 'RIDER' ? DEFAULT_RIDER : DEFAULT_DRIVER,
        });
      },

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
              rating: role === 'RIDER' ? 4.95 : 4.88,
              avatar: role === 'RIDER' ? DEFAULT_RIDER.avatar : DEFAULT_DRIVER.avatar,
            },
            role,
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
      name: 'rydtrip-auth-v2',
      partialize: (state) => ({ user: state.user, role: state.role, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
