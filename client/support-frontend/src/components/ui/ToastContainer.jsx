import { useState, useEffect, useCallback } from 'react';
import { toastEmitter } from '../../utils/toastEmitter';

// Role → accent colour mapping
const ROLE_COLORS = {
  Agent:         { bg: 'bg-blue-600',   icon: 'support_agent' },
  Admin:         { bg: 'bg-purple-600', icon: 'admin_panel_settings' },
  Company_Owner: { bg: 'bg-indigo-600', icon: 'business' },
  Customer:      { bg: 'bg-teal-600',   icon: 'person' },
};

const TYPE_STYLES = {
  info:    { bar: 'bg-blue-500',   iconName: 'info' },
  success: { bar: 'bg-emerald-500',iconName: 'check_circle' },
  warning: { bar: 'bg-amber-500',  iconName: 'warning' },
  error:   { bar: 'bg-red-500',    iconName: 'error' },
};

const AUTO_DISMISS_MS = 5000;

function Toast({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    const exitTimer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [dismiss]);

  const roleStyle = ROLE_COLORS[toast.senderRole] || { bg: 'bg-slate-600', icon: 'notifications' };
  const typeStyle = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  return (
    <div
      className={`
        relative w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700
        overflow-hidden flex flex-col
        transition-all duration-300 ease-out
        ${visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
    >
      {/* Coloured top bar */}
      <div className={`h-1 w-full ${typeStyle.bar}`} />

      <div className="flex items-start gap-3 p-3">
        {/* Role icon badge */}
        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white ${roleStyle.bg}`}>
          <span className="material-symbols-outlined text-[18px]">{roleStyle.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
              {toast.title}
            </p>
          )}
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-snug line-clamp-2 mt-0.5">
            {toast.message}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-slate-100 dark:bg-slate-700 mx-3 mb-2 rounded-full overflow-hidden">
        <div
          className={`h-full ${typeStyle.bar} rounded-full`}
          style={{ animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards` }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      setToasts(prev => [...prev, e.detail]);
    };
    toastEmitter.addEventListener('toast', handler);
    return () => toastEmitter.removeEventListener('toast', handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}
