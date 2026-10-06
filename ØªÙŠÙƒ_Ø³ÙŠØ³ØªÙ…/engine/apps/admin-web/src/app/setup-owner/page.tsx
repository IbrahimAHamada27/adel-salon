'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SetupOwnerPage() {
  const router = useRouter();
  const { user, isSetupRequired, isLoading, setupOwner } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/admin/catalog');
      } else if (!isSetupRequired) {
        router.replace('/login');
      }
    }
  }, [user, isSetupRequired, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('يرجى إدخال اسم صاحب المحل');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (!password || password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 خانات على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setError('تأكيد كلمة المرور غير متطابق');
      return;
    }

    try {
      setIsSubmitting(true);
      await setupOwner({
        name: name.trim(),
        username: username.trim(),
        email: email.trim() || undefined,
        password,
      });
      router.replace('/admin/catalog');
    } catch (err: any) {
      setError(err.message || 'فشل إعداد حساب المالك، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          padding: '36px 30px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--accent-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.6rem',
              fontWeight: 800,
              marginBottom: '14px',
            }}
          >
            T
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            إعداد صاحب المحل لأول مرة
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            أهلاً بك في نظام tech. أنشئ حساب المالك الرئيسي للبدء في إدارة الكتالوج.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--status-danger-subtle)',
              border: '1px solid var(--status-danger)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-danger)',
              fontSize: '0.88rem',
              fontWeight: 600,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <Input
            label="اسم صاحب المحل"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: أحمد محمود"
            required
            autoFocus
          />

          <Input
            label="اسم المستخدم للدخول"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="مثال: admin أو ahmed"
            required
          />

          <Input
            label="البريد الإلكتروني (اختياري)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@example.com"
          />

          <Input
            label="كلمة المرور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6 خانات على الأقل"
            required
          />

          <Input
            label="تأكيد كلمة المرور"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="أعد كتابة كلمة المرور"
            required
          />

          <Button
            variant="primary"
            size="lg"
            type="submit"
            isLoading={isSubmitting}
            style={{ marginTop: '12px', width: '100%' }}
          >
            إنشاء الحساب وبدء الاستخدام ←
          </Button>
        </form>
      </div>
    </div>
  );
}
