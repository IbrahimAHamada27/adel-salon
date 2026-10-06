'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { settingsApi, SystemSettings } from '@/services/settings.api';

export default function SettingsPage() {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Form
  const [name, setName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await settingsApi.getSettings(token);
      setSettings(data);
      if (data.owner?.name) {
        setName(data.owner.name);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setProfileSaving(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      await settingsApi.updateProfile(token, { name: name.trim() });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'فشل تحديث الاسم');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword.length < 6) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين');
      return;
    }

    setPasswordSaving(true);
    setPasswordSuccess(false);
    setPasswordError(null);
    try {
      await settingsApi.changePassword(token, { currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚙️</span> إعدادات النظام والحساب
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          إدارة حساب المالك، أمان الدخول، ونظرة عامة على حالة الخادم وقاعدة البيانات.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '50px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
          جاري تحميل بيانات الإعدادات...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* 1. Profile Info */}
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <span>👤</span> الملف الشخصي للمالك (Owner)
            </h2>

            {profileSuccess && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', color: '#6ee7b7', fontSize: '0.8rem', marginBottom: '14px' }}>
                تم حفظ التغييرات بنجاح!
              </div>
            )}

            {profileError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '14px' }}>
                {profileError}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>اسم المالك</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>اسم المستخدم (Username)</label>
                <input
                  type="text"
                  disabled
                  value={settings?.owner?.username || user?.username || ''}
                  className="form-input"
                  style={{ opacity: 0.6, cursor: 'not-allowed', fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>اسم المستخدم ثابت لا يمكن تغييره.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="btn btn-primary btn-sm"
                >
                  {profileSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>

          {/* 2. Security / Change Password */}
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <span>🔒</span> تغيير كلمة المرور
            </h2>

            {passwordSuccess && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', color: '#6ee7b7', fontSize: '0.8rem', marginBottom: '14px' }}>
                تم تغيير كلمة المرور بنجاح!
              </div>
            )}

            {passwordError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '14px' }}>
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>كلمة المرور الحالية</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="btn btn-secondary btn-sm"
                >
                  {passwordSaving ? 'جاري التغيير...' : 'تحديث كلمة المرور'}
                </button>
              </div>
            </form>
          </div>

          {/* 3. Cashier Account Status */}
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <span>💻</span> حساب نقطة البيع (الكاشير)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>اسم حساب الكاشير:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{settings?.cashierAccount?.name || 'غير منشأ'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>اسم المستخدم (Username):</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{settings?.cashierAccount?.username || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>الحالة:</span>
                <span className="badge badge-emerald">
                  {settings?.cashierAccount?.is_active ? '🟢 نشط ومفعل' : 'موقف'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>آخر تسجيل دخول:</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {settings?.cashierAccount?.last_login_at
                    ? new Date(settings.cashierAccount.last_login_at).toLocaleString('ar-EG')
                    : 'لم يسجل دخول بعد'}
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '14px' }}>
              * لتغيير كلمة مرور الكاشير أو بياناته، توجه إلى صفحة &quot;الموظفون والحلاقون&quot;.
            </p>
          </div>

          {/* 4. System Diagnostics & Info */}
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <span>🗄️</span> حالة الخادم ومحرك البيانات
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>محرك قاعدة البيانات:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  {settings?.databaseEngine || 'Central SQLite'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>إصدار النظام (Core API):</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>v{settings?.version || '1.0.0'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>معمارية المزامنة:</span>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  {settings?.offlineSyncStatus || 'Offline-First Outbox Sync'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>إجمالي سجلات الكتالوج:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {(settings?.systemCounts?.services || 0) + (settings?.systemCounts?.products || 0)} عنصر
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
