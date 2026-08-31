import React from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { LoginPage } from '../../pages/LoginPage';

interface RequireAuthProps {
  role?: 'RIDER' | 'DRIVER';
  children: React.ReactNode;
}

/**
 * Gates a page behind a real session instead of a route redirect, so it works
 * the same way whether the page is reached through apps/web's router or
 * rendered directly by the standalone apps/rider-web / apps/driver-web shells
 * (which don't share apps/web's <App> router at all).
 */
export const RequireAuth: React.FC<RequireAuthProps> = ({ role, children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user || (role && user.role !== role)) {
    return <LoginPage requiredRole={role} />;
  }

  return <>{children}</>;
};
