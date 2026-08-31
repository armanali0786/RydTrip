import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToastStore, ToastType } from '../../stores/useToastStore';

const STYLES: Record<ToastType, string> = {
  success: 'bg-primary-pale border-primary-neutral text-ink',
  error: 'bg-red-50 border-red-100 text-ink',
  info: 'bg-canvas border-ink/10 text-ink',
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-positive-deep shrink-0" />,
  error: <XCircle className="h-5 w-5 text-red-600 shrink-0" />,
  info: <Info className="h-5 w-5 text-body shrink-0" />,
};

/** Mounted once at the app root — see App.tsx. Any component can push a toast via useToastStore(). */
export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          style={{ animation: 'toast-slide-in 0.2s ease-out' }}
          className={`flex items-start gap-3 rounded-xl border p-4 shadow-card ${STYLES[toast.type]}`}
        >
          {ICONS[toast.type]}
          <p className="flex-1 text-sm font-semibold">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="text-body hover:text-ink shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
