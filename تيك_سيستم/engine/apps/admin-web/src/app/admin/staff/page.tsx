'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { staffApi, Employee, CashierAccount } from '@/services/staff.api';

export default function StaffPage() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cashierAccount, setCashierAccount] = useState<CashierAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({ name: '', phone: '', roleTitle: '' });

  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [cashierForm, setCashierForm] = useState({ name: '', username: '', password: '', isActive: true });

  const loadData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);
      const [empsData, cashierData] = await Promise.all([
        staffApi.getEmployees(token, true),
        staffApi.getCashierAccount(token),
      ]);
      setEmployees(empsData);
      setCashierAccount(cashierData.cashier);
      if (cashierData.cashier) {
        setCashierForm({
          name: cashierData.cashier.name,
          username: cashierData.cashier.username,
          password: '',
          isActive: cashierData.cashier.is_active === 1,
        });
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات الموظفين');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !empForm.name.trim()) return;

    try {
      if (editingEmployee) {
        await staffApi.updateEmployee(token, editingEmployee.id, empForm);
        setSuccessMsg('تم تحديث بيانات الموظف بنجاح');
      } else {
        await staffApi.createEmployee(token, empForm);
        setSuccessMsg('تمت إضافة الموظف بنجاح');
      }
      setIsEmployeeModalOpen(false);
      setEditingEmployee(null);
      setEmpForm({ name: '', phone: '', roleTitle: '' });
      loadData();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ الموظف');
    }
  };

  const handleArchiveToggle = async (emp: Employee) => {
    if (!token) return;
    try {
      if (emp.status === 'ARCHIVED') {
        await staffApi.restoreEmployee(token, emp.id);
        setSuccessMsg('تمت استعادة الموظف');
      } else {
        await staffApi.archiveEmployee(token, emp.id);
        setSuccessMsg('تمت أرشفة الموظف');
      }
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReorder = async (id: string, direction: 'UP' | 'DOWN') => {
    if (!token) return;
    try {
      await staffApi.reorderEmployee(token, id, direction);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const res = await staffApi.manageCashierAccount(token, cashierForm);
      setSuccessMsg(res.message);
      setIsCashierModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ إعدادات الكاشير');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✂️</span> الموظفون والحلاقون
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            إدارة سجل الحلاقين، ترتيب ظهورهم في شاشة الكاشير، والتحكم في حساب الكاشير المكتبي.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEmployee(null);
            setEmpForm({ name: '', phone: '', roleTitle: '' });
            setIsEmployeeModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <span>➕</span> إضافة حلاق / موظف
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', color: '#6ee7b7', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Cashier Account Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--accent-cyan-subtle)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              💻
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>حساب تطبيق الكاشير المكتبي</h3>
                {cashierAccount ? (
                  cashierAccount.is_active === 1 ? (
                    <span className="badge badge-emerald">نشط وجاهز للتشغيل</span>
                  ) : (
                    <span className="badge badge-rose">معطل</span>
                  )
                ) : (
                  <span className="badge badge-amber">غير مهيأ بعد</span>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {cashierAccount
                  ? `اسم المستخدم: ${cashierAccount.username} • الاسم: ${cashierAccount.name} • آخر دخول: ${cashierAccount.last_login_at ? new Date(cashierAccount.last_login_at).toLocaleString('ar-EG') : 'لم يسجل دخول بعد'}`
                  : 'أنشئ حساب الكاشير لتسجيل الدخول من جهاز البيع المكتبي.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCashierModalOpen(true)}
            className="btn btn-secondary btn-sm"
          >
            {cashierAccount ? '⚙️ تعديل إعدادات الكاشير' : '➕ إنشاء حساب الكاشير'}
          </button>
        </div>
      </div>

      {/* Barbers / Employees List */}
      <div className="table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>سجل الحلاقين والمساعدين ({employees.length})</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>الترتيب يحدد تسلسل الظهور في شاشة الكاشير</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>جاري تحميل سجل الموظفين...</div>
        ) : employees.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>✂️</div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>لا يوجد حلاقون مسجلون بعد</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>أضف حلاقين لتمكين تعيين الخدمات لهم أثناء البيع وحساب الأداء بدقة.</p>
            <button
              onClick={() => setIsEmployeeModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              ➕ إضافة أول حلاق
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم الحلاق / الموظف</th>
                  <th>المسمى الوظيفي</th>
                  <th>رقم الهاتف</th>
                  <th>الحالة</th>
                  <th style={{ textAlign: 'center' }}>الترتيب</th>
                  <th style={{ textAlign: 'left' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, index) => (
                  <tr key={emp.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{index + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                          {emp.name.charAt(0)}
                        </div>
                        {emp.name}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{emp.role_title || 'حلاق'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-secondary)' }} dir="ltr">{emp.phone || '—'}</td>
                    <td>
                      {emp.status === 'ACTIVE' ? (
                        <span className="badge badge-emerald">نشط</span>
                      ) : (
                        <span className="badge badge-slate">مؤرشف</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          disabled={index === 0}
                          onClick={() => handleReorder(emp.id, 'UP')}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          title="تحريك لأعلى"
                        >
                          ⬆️
                        </button>
                        <button
                          disabled={index === employees.length - 1}
                          onClick={() => handleReorder(emp.id, 'DOWN')}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          title="تحريك لأسفل"
                        >
                          ⬇️
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setEmpForm({ name: emp.name, phone: emp.phone || '', roleTitle: emp.role_title || '' });
                            setIsEmployeeModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleArchiveToggle(emp)}
                          className={`btn btn-sm ${emp.status === 'ARCHIVED' ? 'btn-primary' : 'btn-danger'}`}
                        >
                          {emp.status === 'ARCHIVED' ? 'استعادة' : 'أرشفة'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Add/Edit Modal */}
      {isEmployeeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEmployeeModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              {editingEmployee ? 'تعديل بيانات الحلاق' : 'إضافة حلاق / موظف جديد'}
            </h3>
            <form onSubmit={handleSaveEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>اسم الحلاق / الموظف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد الحلاق"
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>المسمى الوظيفي</label>
                <input
                  type="text"
                  placeholder="مثال: مصفف شعر رئيسي / حلاق ذقن"
                  value={empForm.roleTitle}
                  onChange={(e) => setEmpForm({ ...empForm, roleTitle: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                  dir="ltr"
                  className="form-input"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cashier Account Modal */}
      {isCashierModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCashierModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>إعداد حساب الكاشير المكتبي</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              هذا الحساب يستخدمه موظف الكاشير لتسجيل الدخول إلى تطبيق Desktop POS.
            </p>
            <form onSubmit={handleSaveCashier} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>اسم الكاشير *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كاشير الصالون"
                  value={cashierForm.name}
                  onChange={(e) => setCashierForm({ ...cashierForm, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>اسم المستخدم (Username) *</label>
                <input
                  type="text"
                  required
                  placeholder="cashier"
                  value={cashierForm.username}
                  onChange={(e) => setCashierForm({ ...cashierForm, username: e.target.value })}
                  dir="ltr"
                  className="form-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  كلمة المرور {cashierAccount ? '(اتركها فارغة إذا لم ترغب في التغيير)' : '*'}
                </label>
                <input
                  type="password"
                  placeholder={cashierAccount ? '••••••••' : 'أدخل كلمة مرور قوية'}
                  value={cashierForm.password}
                  onChange={(e) => setCashierForm({ ...cashierForm, password: e.target.value })}
                  dir="ltr"
                  className="form-input"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px' }}>
                <input
                  type="checkbox"
                  id="cashierActive"
                  checked={cashierForm.isActive}
                  onChange={(e) => setCashierForm({ ...cashierForm, isActive: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="cashierActive" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  تفعيل حساب الكاشير والسماح بتسجيل الدخول والمزامنة
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setIsCashierModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                >
                  حفظ الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
