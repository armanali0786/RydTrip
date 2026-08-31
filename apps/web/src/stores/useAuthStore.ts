import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  role: 'RIDER' | 'DRIVER';
  isAuthenticated: boolean;
  loginAsRider: (name?: string, email?: string) => void;
  loginAsDriver: (name?: string, email?: string) => void;
  logout: () => void;
  setRole: (role: 'RIDER' | 'DRIVER') => void;
}

const DEFAULT_RIDER: User = {
  id: 'rider_arman_01',
  name: 'Arman Ali',
  email: 'arman@ridemesh.com',
  phone: '+91 98765 43210',
  role: 'RIDER',
  rating: 4.92,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

const DEFAULT_DRIVER: User = {
  id: 'driver_rahul_01',
  name: 'Rahul Sharma',
  email: 'rahul.driver@ridemesh.com',
  phone: '+91 91234 56789',
  role: 'DRIVER',
  rating: 4.88,
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
};

export const useAuthStore = create<AuthState>((set) => ({
  user: DEFAULT_RIDER,
  role: 'RIDER',
  isAuthenticated: true,

  loginAsRider: (name = 'Arman Ali', email = 'arman@ridemesh.com') => {
    set({
      user: { ...DEFAULT_RIDER, name, email },
      role: 'RIDER',
      isAuthenticated: true,
    });
  },

  loginAsDriver: (name = 'Rahul Sharma', email = 'rahul.driver@ridemesh.com') => {
    set({
      user: { ...DEFAULT_DRIVER, name, email },
      role: 'DRIVER',
      isAuthenticated: true,
    });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  setRole: (role) => {
    set((state) => ({
      role,
      user: role === 'RIDER' ? DEFAULT_RIDER : DEFAULT_DRIVER,
    }));
  },
}));
