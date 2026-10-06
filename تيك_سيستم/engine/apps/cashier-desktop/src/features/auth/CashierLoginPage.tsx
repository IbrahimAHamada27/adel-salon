import React, { useState, useEffect } from 'react';
import { NativeBridge } from '../../services/nativeBridge';
import { SessionUser } from '../../types/auth';
import { Scissors, Lock, User, AlertCircle, Loader2, KeyRound, Server, Settings2, CheckCircle2, X } from 'lucide-react';

interface CashierLoginPageProps {
  onLoginSuccess: (user: SessionUser) => void;
}

export const CashierLoginPage: React.FC<CashierLoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Server Connection Configuration
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setServerUrl(NativeBridge.getApiUrl());
  }, []);

  const handleSaveServerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim()) return;
    NativeBridge.setApiUrl(serverUrl.trim());
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsServerModalOpen(false);
    }, 1000);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!username.trim() || !password) {
      setErrorMessage('يرجى إدخال اسم مستخدم الكاشير وكلمة المرور');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await NativeBridge.login(username.trim(), password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.message || 'تعذر تسجيل الدخول.');
      }
    } catch (err: any) {
      const msg = err.message || err.toString();
      if (msg.includes('Failed to fetch') || msg.includes('تعذر الاتصال بالخادم') || msg.includes('connect')) {
        setErrorMessage('تعذر الاتصال بالخادم الرئيسي (' + NativeBridge.getApiUrl() + '). يرجى التأكد من تشغيل السيرفر أو تعديل عنوان الخادم من زر الإعدادات.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-sans select-none relative">
      {/* Top Bar Server Configuration Button */}
      <div className="absolute top-5 left-5 z-20">
        <button
          type="button"
          onClick={() => setIsServerModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 rounded-xl text-xs text-neutral-400 hover:text-amber-400 transition-all shadow-md cursor-pointer"
          title="تغيير عنوان خادم الـ API"
        >
          <Server className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px] dir-ltr">{NativeBridge.getApiUrl().replace('/api/v1', '')}</span>
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="w-[300px] h-[300px] bg-neutral-800/10 rounded-full blur-2xl -translate-y-20" />
      </div>

      <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 animate-in fade-in duration-300">
        {/* Brand & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-inner">
            <Scissors className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-neutral-100 tracking-tight">تسجيل دخول الكاشير</h1>
          <p className="text-sm text-neutral-400 mt-1">نظام نقطة البيع للمحل - Offline-First POS</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-200 text-sm flex items-start gap-3 animate-in shake duration-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-2">اسم مستخدم الكاشير</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-500">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم..."
                disabled={loading}
                autoFocus
                className="w-full bg-neutral-800/70 border border-neutral-700/60 rounded-2xl py-3.5 pr-11 pl-4 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/70 text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-2">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-neutral-800/70 border border-neutral-700/60 rounded-2xl py-3.5 pr-11 pl-4 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/70 text-sm tracking-wider transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black py-4 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التحقق والدخول...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5" />
                <span>دخول الكاشير</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-neutral-500 leading-relaxed border-t border-neutral-800/80 pt-4 space-y-2">
          <div>يتم إنشاء حساب الكاشير والتحكم في صلاحياته حصراً من لوحة إدارة المالك.</div>
          <div className="pt-2">
            <a
              href="https://www.eng-ibrahim-a-hamada.website"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 px-3.5 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <span>تطوير وهندسة البرمجيات: م. إبراهيم أ. حمادة</span>
              <span className="text-[10px] font-mono opacity-80">↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* Server URL Modal */}
      {isServerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">إعدادات عنوان الخادم (API Server)</h3>
                  <p className="text-[11px] text-neutral-400">تحديد عنوان السيرفر المحلي أو السحابي</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsServerModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveServerUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">عنوان الـ API الكامل</label>
                <input
                  type="text"
                  required
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://localhost:3001/api/v1"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500 transition-colors dir-ltr text-left"
                />
                <p className="text-[10px] text-neutral-500 mt-1.5">
                  الافتراضي المحلي: <span className="font-mono text-neutral-400">http://localhost:3001/api/v1</span>
                </p>
              </div>

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تم حفظ عنوان السيرفر بنجاح!</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  حفظ العنوان
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServerUrl('http://localhost:3001/api/v1');
                    NativeBridge.setApiUrl('http://localhost:3001/api/v1');
                    setIsServerModalOpen(false);
                  }}
                  className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  استعادة الافتراضي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

