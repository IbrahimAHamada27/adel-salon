import React from 'react';
import { ConnectionState } from '../../types/connection';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface ConnectionStatusIndicatorProps {
  status: ConnectionState;
  lastSyncedAt?: string | null;
  onManualRefresh?: () => void;
  isSyncing?: boolean;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  lastSyncedAt,
  onManualRefresh,
  isSyncing,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'ONLINE':
        return {
          icon: <Wifi className="w-3.5 h-3.5 text-emerald-400" />,
          dot: 'bg-emerald-500',
          text: 'متصل بالخادم',
          className: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300',
        };
      case 'UPDATING':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
          dot: 'bg-blue-500 animate-pulse',
          text: 'جاري تحديث الكتالوج...',
          className: 'bg-blue-950/40 border-blue-800/40 text-blue-300',
        };
      case 'OFFLINE_WITH_DATA':
        return {
          icon: <WifiOff className="w-3.5 h-3.5 text-amber-400" />,
          dot: 'bg-amber-500',
          text: 'يعمل محلياً (غير متصل)',
          className: 'bg-amber-950/40 border-amber-800/40 text-amber-300',
        };
      case 'OFFLINE_NO_DATA':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
          dot: 'bg-red-500 animate-ping',
          text: 'غير متصل (لا توجد بيانات)',
          className: 'bg-red-950/40 border-red-800/40 text-red-300',
        };
      case 'ERROR':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
          dot: 'bg-orange-500',
          text: 'تعذر التحديث التلقائي',
          className: 'bg-orange-950/40 border-orange-800/40 text-orange-300',
        };
      default:
        return {
          icon: <Wifi className="w-3.5 h-3.5 text-neutral-400" />,
          dot: 'bg-neutral-500',
          text: 'جاري التحقق...',
          className: 'bg-neutral-900 border-neutral-800 text-neutral-400',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all select-none ${badge.className}`}
        title={lastSyncedAt ? `آخر مزامنة: ${new Date(lastSyncedAt).toLocaleTimeString('ar-SA')}` : undefined}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
        {badge.icon}
        <span>{badge.text}</span>
      </div>

      {onManualRefresh && (
        <button
          onClick={onManualRefresh}
          disabled={isSyncing}
          className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 disabled:opacity-50 transition-colors"
          title="تحديث يدوي للكتالوج"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      )}
    </div>
  );
};
