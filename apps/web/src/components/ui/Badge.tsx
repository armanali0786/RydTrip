import React from 'react';
import { ConnectionState } from '../../websocket/client';

export const ConnectionBadge: React.FC<{ state: ConnectionState }> = ({ state }) => {
  const config = {
    CONNECTED: { color: 'bg-emerald-500', text: 'Live Dispatch', ping: true },
    CONNECTING: { color: 'bg-amber-500', text: 'Connecting...', ping: false },
    RECONNECTING: { color: 'bg-amber-500', text: 'Reconnecting...', ping: false },
    DISCONNECTED: { color: 'bg-rose-500', text: 'Offline', ping: false },
    LOCAL: { color: 'bg-slate-400', text: 'Local Demo Mode', ping: false },
  };

  const current = config[state] || config.DISCONNECTED;

  return (
    <div className="inline-flex items-center gap-2 rounded-pill bg-canvas-soft px-3 py-1 text-caption font-medium text-ink border border-canvas-softer">
      <span className="relative flex h-2 w-2">
        {current.ping && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${current.color} opacity-75`}></span>
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${current.color}`}></span>
      </span>
      <span>{current.text}</span>
    </div>
  );
};
