import React, { useState, useRef, useEffect } from 'react';
import { SessionUser } from '../types/auth';
import { ConnectionState } from '../types/connection';
import { LocalShift } from '../types/shift';
import { ConnectionStatusIndicator } from '../features/connection/ConnectionStatusIndicator';
import {
  Scissors,
  Receipt,
  FileCheck,
  DoorClosed,
  PlusCircle,
  Clock,
  MoreVertical,
  LogOut,
  RefreshCw,
  User,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  user: SessionUser;
  activeShift: LocalShift | null;
  connectionStatus: ConnectionState;
  lastSyncedAt?: string | null;
  onLogout: () => void;
  onRefreshCatalog: () => void;
  isSyncing: boolean;
  onOpenShiftModal: () => void;
  onCloseShiftModal: () => void;
  onOpenExpensesDrawer: () => void;
  onOpenShiftInvoicesDrawer: () => void;
  onOpenBookingsDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeShift,
  connectionStatus,
  lastSyncedAt,
  onLogout,
  onRefreshCatalog,
  isSyncing,
  onOpenShiftModal,
  onCloseShiftModal,
  onOpenExpensesDrawer,
  onOpenShiftInvoicesDrawer,
  onOpenBookingsDrawer,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* 1. Left: Brand, Cashier, and Developer info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black shadow-inner">
            <Scissors className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-black text-white text-sm tracking-tight">tech POS</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-1.5 py-0.2 rounded border border-slate-700">
              كاشير
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Cashier Badge */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">الكاشير:</span>
          <span className="font-bold text-white">{user.name}</span>
        </div>

        {/* Developer Link */}
        <a
          href="https://www.eng-ibrahim-a-hamada.website"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-amber-300 font-medium bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
          title="موقع ومعرض أعمال المطور م. إبراهيم أ. حمادة"
        >
          <span>م. إبراهيم حمادة</span>
          <span className="text-[9px] opacity-70">↗</span>
        </a>
      </div>

      {/* 2. Right: Shift Status, Connection Dot & "المزيد" Menu */}
      <div className="flex items-center gap-2.5">
        {/* Shift Badge or Open Shift Trigger */}
        {activeShift ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>وردية مفتوحة</span>
          </div>
        ) : (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>فتح وردية للبدء</span>
          </button>
        )}

        {/* Connection Status Indicator */}
        <ConnectionStatusIndicator
          status={connectionStatus}
          lastSyncedAt={lastSyncedAt}
          onManualRefresh={onRefreshCatalog}
          isSyncing={isSyncing}
        />

        {/* "المزيد" Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMoreMenuOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isMoreMenuOpen
                ? 'bg-slate-800 text-white border-slate-600'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700'
            }`}
            title="المزيد من خيارات وإدارة الكاشير"
          >
            <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
            <span>المزيد</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMoreMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in-50 zoom-in-95">
              {/* Shift Operations Group */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                إدارة الوردية والعمليات
              </div>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenBookingsDrawer();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white text-right cursor-pointer transition-colors"
              >
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>الحجوزات والمواعيد</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenExpensesDrawer();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white text-right cursor-pointer transition-colors"
              >
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>تسجيل مصروفات الوردية</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenShiftInvoicesDrawer();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white text-right cursor-pointer transition-colors"
              >
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>فواتير ورديتي والمرتجعات</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onRefreshCatalog();
                }}
                disabled={isSyncing}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white text-right cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>مزامنة وتحديث الكتالوج</span>
              </button>

              <div className="my-1 border-t border-slate-800" />

              {/* Shift Closing (High importance/danger) */}
              {activeShift && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onCloseShiftModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-950/40 text-right cursor-pointer transition-colors"
                >
                  <DoorClosed className="w-4 h-4 text-rose-400" />
                  <span>إغلاق ومطابقة الوردية</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-rose-300 text-right cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
