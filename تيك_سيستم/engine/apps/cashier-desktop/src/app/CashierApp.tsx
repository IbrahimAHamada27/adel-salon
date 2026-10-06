import React, { useState, useEffect, useCallback } from 'react';
import { NativeBridge } from '../services/nativeBridge';
import { SessionUser } from '../types/auth';
import { LocalCategory, LocalGroup, LocalCatalogItem } from '../types/catalog';
import { LocalEmployee } from '../types/employee';
import { LocalInvoice, LocalInvoiceLine, AdjustmentType } from '../types/sales';
import { LocalCustomer } from '../types/customer';
import { LocalShift } from '../types/shift';
import { ConnectionState } from '../types/connection';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import { CashierLoginPage } from '../features/auth/CashierLoginPage';
import { CatalogExplorer } from '../features/catalog/CatalogExplorer';
import { OpenInvoicesBar } from '../features/sales/OpenInvoicesBar';
import { InvoiceDetailsPane } from '../features/sales/InvoiceDetailsPane';
import { CustomerSelectorDrawer } from '../features/sales/CustomerSelectorDrawer';
import { PriceAdjustmentDrawer } from '../features/sales/PriceAdjustmentDrawer';
import { BarberSelectorModal } from '../features/sales/BarberSelectorModal';
import { CancelInvoiceModal } from '../features/sales/CancelInvoiceModal';
import { OpenShiftModal } from '../features/shifts/OpenShiftModal';
import { CloseShiftModal } from '../features/shifts/CloseShiftModal';
import { ExpensesDrawer } from '../features/expenses/ExpensesDrawer';
import { ShiftInvoicesDrawer } from '../features/shifts/ShiftInvoicesDrawer';
import { PaymentModal } from '../features/payments/PaymentModal';
import { ReceiptModal } from '../features/receipts/ReceiptModal';
import { LocalPromotion } from '../types/promotion';
import { BookingsDrawer } from '../features/bookings/BookingsDrawer';
import { Loader2 } from 'lucide-react';

export const CashierApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Shift State
  const [activeShift, setActiveShift] = useState<LocalShift | null>(null);

  // Catalog State
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [groups, setGroups] = useState<LocalGroup[]>([]);
  const [items, setItems] = useState<LocalCatalogItem[]>([]);
  const [promotions, setPromotions] = useState<LocalPromotion[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Staff State
  const [employees, setEmployees] = useState<LocalEmployee[]>([]);

  // Invoices & Sales State
  const [openInvoices, setOpenInvoices] = useState<LocalInvoice[]>([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  // Modals & Drawers State
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isExpensesDrawerOpen, setIsExpensesDrawerOpen] = useState(false);
  const [isShiftInvoicesDrawerOpen, setIsShiftInvoicesDrawerOpen] = useState(false);
  const [isBookingsDrawerOpen, setIsBookingsDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [receiptModalInvoice, setReceiptModalInvoice] = useState<LocalInvoice | null>(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [adjustmentTargetLine, setAdjustmentTargetLine] = useState<LocalInvoiceLine | null>(null);
  const [barberTargetLine, setBarberTargetLine] = useState<LocalInvoiceLine | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Connectivity State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('ONLINE');
  const [isSyncing, setIsSyncing] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning'>('info');

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage((curr) => (curr === message ? null : curr));
    }, 3500);
  };

  // Load Active Shift
  const refreshActiveShift = useCallback(async (cashierId?: string) => {
    try {
      const shift = await NativeBridge.getActiveShift(cashierId);
      setActiveShift(shift);
      return shift;
    } catch (err) {
      console.error('Failed to load active shift:', err);
      return null;
    }
  }, []);

  // Load Open Invoices from local database
  const refreshOpenInvoices = useCallback(async (preferredActiveId?: string) => {
    try {
      const invoices = await NativeBridge.getOpenInvoices();
      setOpenInvoices(invoices);

      setActiveInvoiceId((currentId) => {
        const targetId = preferredActiveId || currentId;
        if (targetId && invoices.some((i) => i.local_id === targetId)) {
          return targetId;
        }
        return invoices.length > 0 ? invoices[0].local_id : null;
      });
    } catch (err) {
      console.error('Failed to load open invoices:', err);
    }
  }, []);

  // Load cached encrypted data from local database
  const loadLocalData = useCallback(async () => {
    const catalog = await NativeBridge.getLocalCatalog();
    const staff = await NativeBridge.getLocalEmployees();
    const promoList = await NativeBridge.getPromotions();

    setCategories(catalog.categories || []);
    setGroups(catalog.groups || []);
    setItems(catalog.items || []);
    setPromotions(promoList || []);
    setLastSyncedAt(catalog.last_synced_at || null);
    setEmployees(staff || []);

    await refreshOpenInvoices();
    await refreshActiveShift();

    return {
      hasData: (catalog.categories && catalog.categories.length > 0) || false,
    };
  }, [refreshOpenInvoices, refreshActiveShift]);

  // Sync with remote server API (Bidirectional: Push Outbox Sales & Pull Catalog)
  const handleSyncCatalog = useCallback(
    async (showNotification = false) => {
      setIsSyncing(true);
      setConnectionStatus('UPDATING');

      try {
        // 1. Push local sales, shifts, expenses, and customers to server
        const outboxResult = await NativeBridge.syncOutbox();

        // 2. Pull latest catalog and staff from server
        const result = await NativeBridge.syncCatalog();
        if (result.success) {
          await loadLocalData();
          setConnectionStatus('ONLINE');
          if (showNotification) {
            const outboxMsg = outboxResult.success && outboxResult.invoicesCount !== undefined
              ? `تم رفع ${outboxResult.shiftsCount || 0} ورديات و ${outboxResult.invoicesCount || 0} فواتير وتحديث الكتالوج بنجاح`
              : 'تمت المزامنة وتحديث قائمة الخدمات والأسعار من السيرفر بنجاح';
            showToast(outboxMsg, 'success');
          }
        }
      } catch {
        const local = await loadLocalData();
        if (local.hasData) {
          setConnectionStatus('OFFLINE_WITH_DATA');
        } else {
          setConnectionStatus('OFFLINE_NO_DATA');
        }
        if (showNotification) {
          showToast('تعذر الاتصال بالخادم لمزامنة البيانات. يستمر العمل بالنسخة المحلية.', 'warning');
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [loadLocalData],
  );

  // Periodic connectivity & sync check (every 30s)
  const checkConnectivityAndSync = useCallback(async () => {
    const status = await NativeBridge.checkConnectivity();
    if (status.is_online) {
      await NativeBridge.syncOutbox().catch(() => {});
      handleSyncCatalog(false);
    } else {
      const local = await loadLocalData();
      if (local.hasData) {
        setConnectionStatus('OFFLINE_WITH_DATA');
      } else {
        setConnectionStatus('OFFLINE_NO_DATA');
      }
    }
  }, [handleSyncCatalog, loadLocalData]);

  // Initial Boot Check
  useEffect(() => {
    const initApp = async () => {
      setIsInitializing(true);
      try {
        const session = await NativeBridge.getSession();
        if (session && session.cashier_id) {
          setCurrentUser({
            id: session.cashier_id,
            name: session.cashier_name,
            username: session.cashier_username,
            role: 'CASHIER',
          });
          await loadLocalData();
          const shift = await refreshActiveShift(session.cashier_id);
          if (!shift) {
            setIsOpenShiftModalOpen(true);
          }
          checkConnectivityAndSync();
        }
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setIsInitializing(false);
      }
    };

    initApp();
  }, [checkConnectivityAndSync, loadLocalData, refreshActiveShift]);

  // Periodic background sync (every 15s)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      checkConnectivityAndSync();
    }, 15000);

    return () => clearInterval(interval);
  }, [currentUser, checkConnectivityAndSync]);

  const handleLoginSuccess = async (user: SessionUser) => {
    setCurrentUser(user);
    await loadLocalData();
    const shift = await refreshActiveShift(user.id);
    if (!shift) {
      setIsOpenShiftModalOpen(true);
    }
    await NativeBridge.syncOutbox().catch(() => {});
    handleSyncCatalog(true);
  };

  const handleLogout = async () => {
    await NativeBridge.logout();
    setCurrentUser(null);
    setActiveShift(null);
    showToast('تم تسجيل الخروج بأمان', 'info');
  };

  // --- Sales Operations ---
  const activeInvoice = openInvoices.find((inv) => inv.local_id === activeInvoiceId) || null;

  const handleCreateNewInvoice = async () => {
    if (!currentUser) return;
    try {
      const newInv = await NativeBridge.createDraftInvoice(currentUser.id);
      await refreshOpenInvoices(newInv.local_id);
      showToast(`تم فتح فاتورة جديدة #${newInv.invoice_number_local}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل فتح فاتورة جديدة', 'warning');
    }
  };

  const handleAddItemToActiveInvoice = async (item: LocalCatalogItem) => {
    if (!currentUser) return;

    let invoiceToUseId: string;

    // If no active invoice or current is suspended, create a new one automatically
    if (!activeInvoiceId || activeInvoice?.status === 'SUSPENDED') {
      try {
        const newInv = await NativeBridge.createDraftInvoice(currentUser.id);
        invoiceToUseId = newInv.local_id;
      } catch (err: any) {
        showToast(err.message || 'فشل إنشاء فاتورة', 'warning');
        return;
      }
    } else {
      invoiceToUseId = activeInvoiceId;
    }

    try {
      await NativeBridge.addItemToInvoice(invoiceToUseId, item, currentUser.id);
      await refreshOpenInvoices(invoiceToUseId);
      showToast(`تمت إضافة "${item.name}" إلى السلة`, 'info');
    } catch (err: any) {
      showToast(err.message || 'فشل إضافة العنصر', 'warning');
    }
  };

  const handlePromotionClick = async (promotion: LocalPromotion) => {
    if (!currentUser) return;

    let invoiceToUseId: string;
    if (!activeInvoiceId || activeInvoice?.status === 'SUSPENDED') {
      try {
        const newInv = await NativeBridge.createDraftInvoice(currentUser.id);
        invoiceToUseId = newInv.local_id;
      } catch (err: any) {
        showToast(err.message || 'فشل إنشاء فاتورة', 'warning');
        return;
      }
    } else {
      invoiceToUseId = activeInvoiceId;
    }

    try {
      await NativeBridge.addPromotionToInvoice(invoiceToUseId, promotion, items, currentUser.id);
      await refreshOpenInvoices(invoiceToUseId);
      showToast(`تمت إضافة باقة "${promotion.name}" إلى الفاتورة`, 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل إضافة العرض', 'warning');
    }
  };

  const handleUpdateLineQuantity = async (lineId: string, quantity: number) => {
    if (!currentUser || !activeInvoiceId) return;
    try {
      await NativeBridge.updateLineQuantity(lineId, quantity, currentUser.id);
      await refreshOpenInvoices(activeInvoiceId);
    } catch (err: any) {
      showToast(err.message || 'فشل تعديل الكمية', 'warning');
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    if (!currentUser || !activeInvoiceId) return;
    try {
      await NativeBridge.removeInvoiceLine(lineId, currentUser.id);
      await refreshOpenInvoices(activeInvoiceId);
      showToast('تم حذف السطر من الفاتورة', 'info');
    } catch (err: any) {
      showToast(err.message || 'فشل حذف السطر', 'warning');
    }
  };

  const handleSetCustomer = async (customer: LocalCustomer | null) => {
    if (!currentUser || !activeInvoiceId) return;
    try {
      await NativeBridge.setInvoiceCustomer(
        activeInvoiceId,
        customer ? customer.local_id : null,
        currentUser.id,
      );
      await refreshOpenInvoices(activeInvoiceId);
      showToast(
        customer ? `تم ربط العميل "${customer.full_name}" بالفاتورة` : 'تم تحويل الفاتورة لعميل بدون بيانات',
        'info',
      );
    } catch (err: any) {
      showToast(err.message || 'فشل ربط العميل', 'warning');
    }
  };

  const handleApplyAdjustment = async (
    lineId: string,
    type: AdjustmentType,
    inputValue: number,
    reason?: string,
  ) => {
    if (!currentUser || !activeInvoiceId) return;
    try {
      await NativeBridge.applyLineAdjustment(lineId, type, inputValue, reason, currentUser.id);
      await refreshOpenInvoices(activeInvoiceId);
      showToast('تم تطبيق تعديل السعر بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تطبيق تعديل السعر', 'warning');
    }
  };

  const handleAssignBarber = async (lineId: string, employee: LocalEmployee | null) => {
    if (!currentUser || !activeInvoiceId) return;
    try {
      await NativeBridge.assignBarberToLine(lineId, employee, currentUser.id);
      await refreshOpenInvoices(activeInvoiceId);
      showToast(
        employee ? `تم تعيين الحلاق "${employee.name}"` : 'تم إلغاء تعيين الحلاق للخدمة',
        'info',
      );
    } catch (err: any) {
      showToast(err.message || 'فشل تعيين الحلاق', 'warning');
    }
  };

  const handleUpdateInvoiceNote = async (note: string) => {
    if (!currentUser || !activeInvoiceId) return;
    try {
      await NativeBridge.updateInvoiceNote(activeInvoiceId, note || null, currentUser.id);
      await refreshOpenInvoices(activeInvoiceId);
      showToast('تم حفظ ملاحظة الفاتورة', 'info');
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ الملاحظة', 'warning');
    }
  };

  const handleSuspendInvoice = async () => {
    if (!currentUser || !activeInvoiceId) return;
    try {
      await NativeBridge.suspendInvoice(activeInvoiceId, currentUser.id);
      await refreshOpenInvoices();
      showToast('تم تعليق الفاتورة بنجاح', 'info');
    } catch (err: any) {
      showToast(err.message || 'فشل تعليق الفاتورة', 'warning');
    }
  };

  const handleConfirmCancelInvoice = async (reason?: string) => {
    if (!currentUser || !activeInvoiceId) return;
    try {
      await NativeBridge.cancelInvoice(activeInvoiceId, reason, currentUser.id);
      await refreshOpenInvoices();
      showToast('تم إلغاء الفاتورة وتوثيق الحدث في سجل التدقيق', 'info');
    } catch (err: any) {
      showToast(err.message || 'فشل إلغاء الفاتورة', 'warning');
    }
  };

  // --- Shift Handlers ---
  const handleShiftOpened = async (newShift: LocalShift) => {
    setActiveShift(newShift);
    setIsOpenShiftModalOpen(false);
    showToast(`تم فتح الوردية بنجاح بكاش بداية ${newShift.opening_cash_amount.toFixed(2)} ج.م`, 'success');
    NativeBridge.syncOutbox().catch((e) => console.warn('Outbox sync on shift open:', e));
  };

  const handleShiftClosed = async () => {
    setActiveShift(null);
    setIsCloseShiftModalOpen(false);
    showToast('تم إغلاق الوردية ومطابقة الخزينة بنجاح', 'success');
    // Immediately upload closed shift data and invoices to server
    try {
      const res = await NativeBridge.syncOutbox();
      if (res.success) {
        showToast('تم ترحيل بيانات الوردية المقفولة إلى السيرفر بنجاح', 'success');
      }
    } catch (e) {
      console.warn('Outbox sync on shift close:', e);
    }
  };

  // --- Payment & Receipt Handlers ---
  const handlePaymentSuccess = async (paidInvoice: LocalInvoice) => {
    await refreshOpenInvoices();
    setReceiptModalInvoice(paidInvoice);
    NativeBridge.syncOutbox().catch((e) => console.warn('Outbox sync on payment:', e));
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-xs font-bold">جاري تحميل نظام الكاشير المحلي المشفر...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <CashierLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-screen flex flex-row bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Catalog & Operations Column (Takes 60-65% width) */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden border-l border-slate-800">
        {/* Top Header Bar */}
        <Header
          user={currentUser}
          activeShift={activeShift}
          connectionStatus={connectionStatus}
          lastSyncedAt={lastSyncedAt}
          onLogout={handleLogout}
          onRefreshCatalog={() => handleSyncCatalog(true)}
          isSyncing={isSyncing}
          onOpenShiftModal={() => setIsOpenShiftModalOpen(true)}
          onCloseShiftModal={() => setIsCloseShiftModalOpen(true)}
          onOpenExpensesDrawer={() => setIsExpensesDrawerOpen(true)}
          onOpenShiftInvoicesDrawer={() => setIsShiftInvoicesDrawerOpen(true)}
          onOpenBookingsDrawer={() => setIsBookingsDrawerOpen(true)}
        />

        {/* Catalog Explorer Area */}
        <div className="flex-1 h-full overflow-hidden">
          <CatalogExplorer
            categories={categories}
            groups={groups}
            items={items}
            promotions={promotions}
            onItemClick={handleAddItemToActiveInvoice}
            onPromotionClick={handlePromotionClick}
          />
        </div>

        {/* Open Invoices Tabs Bar (Fixed at bottom) */}
        <OpenInvoicesBar
          invoices={openInvoices}
          activeInvoiceId={activeInvoiceId}
          onSelectInvoice={(id) => setActiveInvoiceId(id)}
          onNewInvoice={handleCreateNewInvoice}
          onCloseInvoice={async (id, e) => {
            e.stopPropagation();
            const inv = openInvoices.find((i) => i.local_id === id);
            if (inv && inv.lines.length === 0) {
              try {
                await NativeBridge.cancelInvoice(id, 'إغلاق تبويب فارغ', currentUser.id);
                await refreshOpenInvoices();
                showToast('تم إغلاق الفاتورة الفارغة', 'info');
              } catch {
                await refreshOpenInvoices();
              }
            } else {
              setActiveInvoiceId(id);
              setIsCancelModalOpen(true);
            }
          }}
        />
      </div>

      {/* 2. Active Invoice Cart Pane (Fixed 35-40% width: 380px to 450px) */}
      <div className="w-[380px] lg:w-[420px] xl:w-[460px] h-full flex flex-col shrink-0 shadow-2xl z-10">
        <InvoiceDetailsPane
          invoice={activeInvoice}
          isOpenShift={!!activeShift}
          onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
          onOpenAdjustmentDrawer={(line) => setAdjustmentTargetLine(line)}
          onOpenBarberModal={(line) => setBarberTargetLine(line)}
          onUpdateQuantity={handleUpdateLineQuantity}
          onRemoveLine={handleRemoveLine}
          onUpdateNote={handleUpdateInvoiceNote}
          onSuspendInvoice={handleSuspendInvoice}
          onCancelInvoice={() => setIsCancelModalOpen(true)}
          onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
          onOpenShiftModal={() => setIsOpenShiftModalOpen(true)}
        />
      </div>

      {/* 3. Modals & Drawers */}
      <CustomerSelectorDrawer
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        selectedCustomerId={activeInvoice?.customer_local_id}
        onSelectCustomer={handleSetCustomer}
        cashierId={currentUser.id}
      />

      <PriceAdjustmentDrawer
        isOpen={!!adjustmentTargetLine}
        onClose={() => setAdjustmentTargetLine(null)}
        line={adjustmentTargetLine}
        onApplyAdjustment={handleApplyAdjustment}
      />

      <BarberSelectorModal
        isOpen={!!barberTargetLine}
        onClose={() => setBarberTargetLine(null)}
        line={barberTargetLine}
        employees={employees}
        onSelectBarber={handleAssignBarber}
      />

      <CancelInvoiceModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        invoiceNumber={activeInvoice?.invoice_number_local || 0}
        onConfirmCancel={handleConfirmCancelInvoice}
      />

      {/* Phase 6 Shift Modals */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        cashierUserId={currentUser.id}
        cashierDisplayName={currentUser.name}
        onShiftOpened={handleShiftOpened}
        onClose={() => setIsOpenShiftModalOpen(false)}
      />

      {activeShift && (
        <CloseShiftModal
          isOpen={isCloseShiftModalOpen}
          onClose={() => setIsCloseShiftModalOpen(false)}
          activeShift={activeShift}
          openInvoices={openInvoices}
          cashierUserId={currentUser.id}
          onShiftClosed={handleShiftClosed}
        />
      )}

      {/* Phase 6 Expenses Drawer */}
      <ExpensesDrawer
        isOpen={isExpensesDrawerOpen}
        onClose={() => setIsExpensesDrawerOpen(false)}
        activeShiftLocalId={activeShift?.local_id || null}
        cashierId={currentUser.id}
        onExpenseAdded={() => {
          refreshActiveShift(currentUser.id);
        }}
        showToast={showToast}
      />

      {/* Phase 6 Shift Paid Invoices Drawer */}
      <ShiftInvoicesDrawer
        isOpen={isShiftInvoicesDrawerOpen}
        onClose={() => setIsShiftInvoicesDrawerOpen(false)}
        activeShiftLocalId={activeShift?.local_id || null}
        cashierUserId={currentUser.id}
        onSelectInvoiceForReprint={(inv) => setReceiptModalInvoice(inv)}
        showToast={showToast}
      />

      {/* Phase 9 Bookings Drawer */}
      <BookingsDrawer
        isOpen={isBookingsDrawerOpen}
        onClose={() => setIsBookingsDrawerOpen(false)}
        activeShiftLocalId={activeShift?.local_id || null}
        cashierId={currentUser.id}
        catalogItems={items}
        promotions={promotions}
        employees={employees}
        onBookingConverted={(invId) => {
          refreshOpenInvoices(invId);
        }}
        showToast={showToast}
      />

      {/* Phase 6 Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={activeInvoice}
        activeShiftLocalId={activeShift?.local_id || null}
        cashierId={currentUser.id}
        employees={employees}
        onPaymentSuccess={handlePaymentSuccess}
        showToast={showToast}
      />

      {/* Phase 6 Receipt Preview Modal */}
      <ReceiptModal
        isOpen={!!receiptModalInvoice}
        onClose={() => setReceiptModalInvoice(null)}
        invoice={receiptModalInvoice}
        cashierId={currentUser.id}
        showToast={showToast}
      />

      {/* 4. Global Floating Toast */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};
