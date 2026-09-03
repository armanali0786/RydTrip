import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../ui/Button';
import { LoginPage } from '../../pages/LoginPage';

interface RequireAuthProps {
  role?: 'RIDER' | 'DRIVER';
  children: React.ReactNode;
}

function roleLabel(role: 'RIDER' | 'DRIVER'): string {
  return role === 'DRIVER' ? 'Driver' : 'Rider';
}

/**
 * Shown instead of a login/register form when the visitor already has a
 * session, just for the wrong role — logging in as the other role here would
 * silently overwrite the current session (useAuthStore holds exactly one
 * user), which is confusing at best. The only way forward is an explicit
 * logout, not a second login form offering to switch accounts.
 */
const WrongRoleScreen: React.FC<{ currentRole: 'RIDER' | 'DRIVER'; requiredRole: 'RIDER' | 'DRIVER' }> = ({
  currentRole,
  requiredRole,
}) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#e8ebe6] text-[#0e0f0c] flex items-center justify-center font-text p-4">
      <div className="w-full max-w-[440px] rounded-xl bg-white p-8 shadow-card border border-[#0e0f0c] text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8ebe6]">
          <ShieldAlert className="h-7 w-7 text-[#0e0f0c]" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl font-black">Wrong account type</h2>
          <p className="text-sm font-semibold text-[#454745]">
            You're logged in as a {roleLabel(currentRole)}. Log out to access the {roleLabel(requiredRole)} experience —
            switching roles here isn't a second login, it replaces your current session.
          </p>
        </div>
        <Button
          fullWidth
          variant="dark"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Log out
        </Button>
        <button
          type="button"
          onClick={() => navigate(currentRole === 'DRIVER' ? '/driver' : '/rider')}
          className="text-sm font-bold text-[#0e0f0c] hover:underline underline-offset-4 cursor-pointer"
        >
          Go to your {roleLabel(currentRole)} dashboard instead
        </button>
      </div>
    </div>
  );
};

/**
 * Gates a page behind a real session instead of a route redirect, so it works
 * the same way whether the page is reached through apps/web's router or
 * rendered directly by the standalone apps/rider-web / apps/driver-web shells
 * (which don't share apps/web's <App> router at all).
 */
export const RequireAuth: React.FC<RequireAuthProps> = ({ role, children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <LoginPage requiredRole={role} />;
  }

  if (role && user.role !== role) {
    return <WrongRoleScreen currentRole={user.role} requiredRole={role} />;
  }

  return <>{children}</>;
};
