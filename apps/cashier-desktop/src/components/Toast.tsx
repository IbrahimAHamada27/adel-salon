import React from 'react';
import { Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'info' | 'success' | 'warning';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const bgColors = {
    info: 'bg-neutral-900/95 border-amber-500/50 text-amber-200',
    success: 'bg-neutral-900/95 border-emerald-500/50 text-emerald-200',
    warning: 'bg-neutral-900/95 border-red-500/50 text-red-200',
  };

  const icons = {
    info: <Info className="w-5 h-5 text-amber-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl backdrop-blur-md text-sm font-medium ${bgColors[type]}`}
      >
        {icons[type]}
        <span>{message}</span>
        <button
          onClick={onClose}
          className="mr-3 text-neutral-400 hover:text-white transition-colors text-xs font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
