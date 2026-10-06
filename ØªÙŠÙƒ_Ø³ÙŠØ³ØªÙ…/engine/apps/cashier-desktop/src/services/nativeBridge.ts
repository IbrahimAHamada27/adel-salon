import { AuthResponse, LocalSession } from '../types/auth';
import { LocalCatalogData, LocalCatalogItem, SyncResult } from '../types/catalog';
import { LocalEmployee } from '../types/employee';
import { LocalCustomer } from '../types/customer';
import { LocalInvoice, LocalPaymentInput, AdjustmentType } from '../types/sales';
import { LocalShift, ShiftSummary } from '../types/shift';
import { LocalExpense } from '../types/expense';
import { ConnectivityStatus } from '../types/connection';
import { LocalPromotion } from '../types/promotion';
import { LocalBooking, CreateLocalBookingPayload, BookingStatus } from '../types/booking';
import { encryptAndSave, decryptAndGet, clearEncrypted } from './encryption';

const DEFAULT_API_URL = 'http://localhost:3001/api/v1';

// Check if running inside Tauri native desktop context
const isTauri = () => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

export class NativeBridge {
  static getApiUrl(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tech_api_url') || DEFAULT_API_URL;
    }
    return DEFAULT_API_URL;
  }

  static setApiUrl(url: string) {
    localStorage.setItem('tech_api_url', url);
  }

  // --- 1. Cashier Login ---
  static async login(username: string, password: string): Promise<AuthResponse> {
    const apiUrl = this.getApiUrl();

    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<AuthResponse>('login_cashier', {
          payload: { username, password, apiUrl },
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }

    // Direct Web/API Fallback with encrypted local session storage
    const response = await fetch(`${apiUrl}/cashier/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'فشل تسجيل الدخول');
    }

    const session: LocalSession = {
      cashier_id: data.user.id,
      cashier_name: data.user.name,
      cashier_username: data.user.username,
      token: data.token,
      last_active: new Date().toISOString(),
    };

    await encryptAndSave('session', session);

    return {
      success: true,
      user: data.user,
      token: data.token,
    };
  }

  // --- 2. Session Management ---
  static async getSession(): Promise<LocalSession | null> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalSession | null>('get_local_session');
      } catch (e) {
        console.error('Tauri get_local_session error:', e);
      }
    }

    return await decryptAndGet<LocalSession>('session');
  }

  static async logout(): Promise<boolean> {
    const session = await this.getSession();
    const apiUrl = this.getApiUrl();

    if (session?.token) {
      try {
        await fetch(`${apiUrl}/cashier/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });
      } catch {}
    }

    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<boolean>('logout_cashier');
      } catch {}
    }

    clearEncrypted('session');
    return true;
  }

  // --- 3. Connectivity Check ---
  static async checkConnectivity(): Promise<ConnectivityStatus> {
    const apiUrl = this.getApiUrl();

    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<ConnectivityStatus>('check_connectivity', { apiUrl });
      } catch {}
    }

    const start = Date.now();
    try {
      const res = await fetch(`${apiUrl}/cashier/health`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (res.ok) {
        const latency = Date.now() - start;
        const json = await res.json();
        return {
          is_online: true,
          server_reachable: true,
          server_time: json.timestamp,
          latency_ms: latency,
          message: 'متصل بالخادم',
        };
      }
    } catch {}

    return {
      is_online: false,
      server_reachable: false,
      message: 'العمل بالوضع غير المتصل (الإنترنت غير متاح)',
    };
  }

  // --- 4. Outbox Synchronization (Cashier -> Server) ---
  static async syncOutbox(): Promise<{ success: boolean; message: string; shiftsCount?: number; invoicesCount?: number }> {
    const session = await this.getSession();
    if (!session?.token) {
      return { success: false, message: 'جلسة الكاشير غير متوفرة للمزامنة' };
    }

    const apiUrl = this.getApiUrl();
    const { LocalSalesStore } = await import('./localSalesStore');
    const payload = await LocalSalesStore.getOutboxPayload();

    const hasData =
      (payload.shifts && payload.shifts.length > 0) ||
      (payload.invoices && payload.invoices.length > 0) ||
      (payload.expenses && payload.expenses.length > 0) ||
      (payload.customers && payload.customers.length > 0);

    if (!hasData) {
      return { success: true, message: 'لا توجد بيانات جديدة معلقة للمزامنة' };
    }

    try {
      const res = await fetch(`${apiUrl}/cashier/sync/outbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'فشل مزامنة البيانات مع الخادم');
      }

      const result = await res.json();
      await LocalSalesStore.markOutboxSynced();

      return {
        success: true,
        message: `تمت مزامنة البيانات مع السيرفر بنجاح (${result.shiftsCount || 0} ورديات، ${result.invoicesCount || 0} فواتير)`,
        shiftsCount: result.shiftsCount,
        invoicesCount: result.invoicesCount,
      };
    } catch (err: any) {
      console.error('syncOutbox error:', err);
      return {
        success: false,
        message: err.message || 'تعذر الاتصال بالسيرفر للمزامنة',
      };
    }
  }

  // --- 5. Catalog Synchronization (Server -> Cashier) ---
  static async syncCatalog(): Promise<SyncResult> {
    const session = await this.getSession();
    if (!session?.token) {
      throw new Error('جلسة الكاشير غير متوفرة');
    }

    const apiUrl = this.getApiUrl();

    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<SyncResult>('sync_catalog_from_server', {
          apiUrl,
          token: session.token,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }

    // Direct Web sync with encrypted caching
    const [catRes, empRes, promRes, bookRes] = await Promise.all([
      fetch(`${apiUrl}/cashier/catalog/snapshot`, {
        headers: { Authorization: `Bearer ${session.token}` },
      }),
      fetch(`${apiUrl}/cashier/employees/snapshot`, {
        headers: { Authorization: `Bearer ${session.token}` },
      }),
      fetch(`${apiUrl}/cashier/promotions/snapshot`, {
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => null),
      fetch(`${apiUrl}/cashier/bookings/upcoming`, {
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => null),
    ]);

    if (!catRes.ok) {
      const err = await catRes.json();
      throw new Error(err.message || 'فشل تنزيل الكتالوج من الخادم');
    }

    const catData = await catRes.json();
    let empData = { count: 0, employees: [] };
    if (empRes.ok) {
      empData = await empRes.json();
    }

    const catalogData: LocalCatalogData = {
      categories: catData.categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        color_code: c.colorCode,
        icon: c.icon,
        sort_order: c.sortOrder,
      })),
      groups: catData.groups.map((g: any) => ({
        id: g.id,
        category_id: g.categoryId,
        name: g.name,
        sort_order: g.sortOrder,
      })),
      items: catData.items.map((i: any) => ({
        id: i.id,
        group_id: i.groupId,
        type: i.type,
        name: i.name,
        base_price: i.basePrice,
        sku: i.sku,
        sort_order: i.sortOrder,
        internal_note: i.internalNote,
      })),
      last_synced_at: catData.generatedAt,
      version: catData.version,
    };

    const employees: LocalEmployee[] = empData.employees.map((e: any) => ({
      id: e.id,
      name: e.name,
      role_title: e.roleTitle,
      sort_order: e.sortOrder,
    }));

    await encryptAndSave('catalog', catalogData);
    await encryptAndSave('employees', employees);

    if (promRes && promRes.ok) {
      const promData = await promRes.json();
      if (promData.promotions) {
        const { LocalSalesStore } = await import('./localSalesStore');
        const promotions: LocalPromotion[] = promData.promotions.map((p: any) => ({
          local_id: p.id,
          server_sync_id: p.id,
          name: p.name,
          description: p.description,
          fixed_price: p.fixedPrice,
          status: p.status,
          starts_at: p.startsAt,
          ends_at: p.endsAt,
          sort_order: p.sortOrder,
          items: p.items.map((pi: any) => ({
            local_id: pi.id,
            catalog_item_id: pi.catalogItemId,
            catalog_item_name_snapshot: pi.catalogItemNameSnapshot,
            catalog_item_type: pi.catalogItemType,
            quantity: pi.quantity,
            sort_order: pi.sortOrder,
          })),
        }));
        await LocalSalesStore.saveStoredPromotions(promotions);
      }
    }

    if (bookRes && bookRes.ok) {
      const bookData = await bookRes.json();
      if (bookData.bookings) {
        const { LocalSalesStore } = await import('./localSalesStore');
        const serverBookings: LocalBooking[] = bookData.bookings.map((b: any) => ({
          local_id: b.id,
          customer_local_id: b.customerId,
          guest_name: b.guestName,
          guest_phone: b.guestPhone,
          display_client_name: b.guestName || b.customerName || 'عميل',
          display_client_phone: b.guestPhone,
          scheduled_at: b.scheduledAt,
          status: b.status,
          preferred_employee_id: b.preferredEmployeeId,
          internal_note: b.internalNote,
          converted_invoice_id: b.convertedInvoiceId,
          items: b.items?.map((bi: any) => ({
            id: bi.id,
            booking_id: b.id,
            catalog_item_id: bi.catalogItemId,
            item_name_snapshot: bi.itemNameSnapshot,
            item_type: bi.itemType,
            quantity: bi.quantity,
            sort_order: bi.sortOrder,
          })) || [],
          created_at: b.createdAt,
          updated_at: b.updatedAt,
        }));
        // Merge with local unsynced bookings
        const existing = await LocalSalesStore.getStoredBookings();
        const mergedMap = new Map<string, LocalBooking>();
        serverBookings.forEach((b) => mergedMap.set(b.local_id, b));
        existing.forEach((b) => {
          if (!mergedMap.has(b.local_id)) {
            mergedMap.set(b.local_id, b);
          }
        });
        await LocalSalesStore.saveStoredBookings(Array.from(mergedMap.values()));
      }
    }

    return {
      success: true,
      categories_count: catalogData.categories.length,
      groups_count: catalogData.groups.length,
      items_count: catalogData.items.length,
      employees_count: employees.length,
      synced_at: catData.generatedAt,
      message: 'تم تحديث الكتالوج والعروض بنجاح',
    };
  }

  // --- 5. Local Catalog Retrieval (Offline First) ---
  static async getLocalCatalog(): Promise<LocalCatalogData> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalCatalogData>('get_local_catalog');
      } catch {}
    }

    const cached = await decryptAndGet<LocalCatalogData>('catalog');
    return (
      cached || {
        categories: [],
        groups: [],
        items: [],
        last_synced_at: null,
        version: null,
      }
    );
  }

  // --- 6. Local Employees Retrieval ---
  static async getLocalEmployees(): Promise<LocalEmployee[]> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalEmployee[]>('get_local_employees');
      } catch {}
    }

    const cached = await decryptAndGet<LocalEmployee[]>('employees');
    return cached || [];
  }

  // --- 7. Sales & Draft Invoices (Phase 5) ---
  static async getOpenInvoices(): Promise<LocalInvoice[]> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice[]>('get_open_invoices');
      } catch (err) {
        console.error('get_open_invoices error:', err);
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.getOpenInvoices();
  }

  static async createDraftInvoice(cashierId: string): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('create_draft_invoice', { cashierId });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.createDraftInvoice(cashierId);
  }

  static async setInvoiceCustomer(
    invoiceId: string,
    customerId: string | null,
    cashierId: string,
  ): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('set_invoice_customer', {
          invoiceId,
          customerId,
          cashierId,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.setInvoiceCustomer(invoiceId, customerId, cashierId);
  }

  static async addItemToInvoice(
    invoiceId: string,
    catalogItem: LocalCatalogItem,
    cashierId: string,
  ): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('add_item_to_invoice', {
          invoiceId,
          catalogItemId: catalogItem.id,
          cashierId,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.addItemToInvoice(invoiceId, catalogItem, cashierId);
  }

  static async updateLineQuantity(
    lineId: string,
    newQuantity: number,
    cashierId: string,
  ): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('update_line_quantity', {
          lineId,
          newQuantity,
          cashierId,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.updateLineQuantity(lineId, newQuantity, cashierId);
  }

  static async removeInvoiceLine(lineId: string, cashierId: string): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('remove_invoice_line', {
          lineId,
          cashierId,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.removeInvoiceLine(lineId, cashierId);
  }

  static async assignBarberToLine(
    lineId: string,
    employee: LocalEmployee | null,
    cashierId: string,
  ): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('assign_barber_to_line', {
          lineId,
          employeeId: employee ? employee.id : null,
          cashierId,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.assignBarberToLine(lineId, employee, cashierId);
  }

  static async applyLineAdjustment(
    lineId: string,
    adjustmentType: any,
    inputValue: number,
    reason?: string,
    cashierId: string = 'cashier-1',
  ): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('apply_line_adjustment', {
          lineId,
          adjustmentType,
          inputValue,
          reason,
          cashierId,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.applyLineAdjustment(
      lineId,
      adjustmentType,
      inputValue,
      reason,
      cashierId,
    );
  }

  static async updateInvoiceNote(
    invoiceId: string,
    note: string | null,
    cashierId: string,
  ): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('update_invoice_note', {
          invoiceId,
          note,
          cashierId,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.updateInvoiceNote(invoiceId, note, cashierId);
  }

  static async suspendInvoice(invoiceId: string, cashierId: string): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<void>('suspend_invoice', { invoiceId, cashierId });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    await LocalSalesStore.suspendInvoice(invoiceId, cashierId);
  }

  static async resumeInvoice(invoiceId: string, cashierId: string): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('resume_invoice', { invoiceId, cashierId });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.resumeInvoice(invoiceId, cashierId);
  }

  static async cancelInvoice(
    invoiceId: string,
    reason?: string,
    cashierId: string = 'cashier-1',
  ): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<void>('cancel_invoice', { invoiceId, reason, cashierId });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    await LocalSalesStore.cancelInvoice(invoiceId, reason, cashierId);
  }

  static async refundInvoice(
    invoiceId: string,
    reason?: string,
    cashierId: string = 'cashier-1',
  ): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('refund_invoice', { invoiceId, reason, cashierId });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.refundInvoice(invoiceId, reason, cashierId);
  }

  // --- 8. Customer Management (Phase 5) ---
  static async createCustomer(
    fullName: string,
    phoneNumber?: string,
    birthDate?: string,
    internalNote?: string,
    cashierId: string = 'cashier-1',
  ): Promise<LocalCustomer> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalCustomer>('create_customer', {
          fullName,
          phoneNumber,
          birthDate,
          internalNote,
          cashierId,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.createCustomer(
      fullName,
      phoneNumber,
      birthDate,
      internalNote,
      cashierId,
    );
  }

  static async searchCustomers(query: string): Promise<LocalCustomer[]> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalCustomer[]>('search_customers', { query });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.searchCustomers(query);
  }

  // --- 9. Shift Management (Phase 6) ---

  static async openShift(
    cashierUserId: string,
    cashierDisplayName: string,
    openingCash: number,
  ): Promise<LocalShift> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalShift>('open_shift', {
          cashierUserId,
          cashierDisplayName,
          openingCash,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.openShift(cashierUserId, cashierDisplayName, openingCash);
  }

  static async getActiveShift(cashierUserId?: string): Promise<LocalShift | null> {
    const cid = cashierUserId || 'cashier-1';
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalShift | null>('get_active_shift', { cashierUserId: cid });
      } catch (err: any) {
        console.error('get_active_shift error:', err);
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.getActiveShift(cid);
  }

  static async getShiftSummary(shiftId: string): Promise<ShiftSummary> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<ShiftSummary>('get_shift_summary', { shiftId });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.getShiftSummary(shiftId);
  }

  static async closeShift(
    shiftId: string,
    actualCash: number,
    closingNote?: string,
    cashierUserId: string = 'cashier-1',
  ): Promise<LocalShift> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalShift>('close_shift', {
          shiftId,
          actualCash,
          closingNote,
          cashierUserId,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.closeShift(shiftId, actualCash, closingNote, cashierUserId);
  }

  // --- 10. Payments & Checkout (Phase 6) ---
  static async processInvoicePayment(
    invoiceId: string,
    shiftId: string,
    payments: LocalPaymentInput[],
    cashierUserId: string = 'cashier-1',
    tipDetails?: {
      tip_amount?: number;
      tip_recipient_employee_id?: string;
      tip_recipient_employee_name_snapshot?: string;
    },
  ): Promise<LocalInvoice> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice>('process_invoice_payment', {
          invoiceId,
          shiftId,
          payments,
          cashierUserId,
          tipDetails,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.processInvoicePayment(
      invoiceId,
      shiftId,
      payments,
      cashierUserId,
      tipDetails,
    );
  }

  static async getActiveShiftPaidInvoices(shiftId: string): Promise<LocalInvoice[]> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalInvoice[]>('get_active_shift_paid_invoices', { shiftId });
      } catch (err: any) {
        console.error('get_active_shift_paid_invoices error:', err);
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.getActiveShiftPaidInvoices(shiftId);
  }

  // --- 11. Expenses (Phase 6) ---
  static async recordExpense(
    shiftId: string,
    amount: number,
    category: string,
    note?: string,
    cashierUserId: string = 'cashier-1',
  ): Promise<LocalExpense> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalExpense>('record_shift_expense', {
          shiftId,
          amount,
          category,
          note,
          cashierUserId,
        });
      } catch (err: any) {
        throw new Error(err.toString());
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.recordExpense(shiftId, amount, category, note, cashierUserId);
  }

  static async getActiveShiftExpenses(shiftId: string): Promise<LocalExpense[]> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LocalExpense[]>('get_active_shift_expenses', { shiftId });
      } catch (err: any) {
        console.error('get_active_shift_expenses error:', err);
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.getActiveShiftExpenses(shiftId);
  }

  // --- 12. Receipt Print Tracking (Phase 6) ---
  static async recordReceiptPrint(
    invoiceId: string,
    status: 'SUCCESS' | 'FAILED',
    failureReason?: string,
    cashierUserId: string = 'cashier-1',
  ): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke<void>('record_receipt_print', {
          invoiceId,
          status,
          failureReason,
          cashierUserId,
        });
        return;
      } catch (err: any) {
        console.error('record_receipt_print error:', err);
      }
    }
    const { LocalSalesStore } = await import('./localSalesStore');
    await LocalSalesStore.recordReceiptPrint(invoiceId, status, failureReason, cashierUserId);
  }

  // --- 13. Promotions (Phase 9) ---
  static async getPromotions(): Promise<LocalPromotion[]> {
    const { LocalSalesStore } = await import('./localSalesStore');
    const list = await LocalSalesStore.getStoredPromotions();
    const now = new Date();
    // Only return ACTIVE promotions within valid dates
    return list.filter((p) => {
      if (p.status !== 'ACTIVE') return false;
      if (p.starts_at && new Date(p.starts_at) > now) return false;
      if (p.ends_at && new Date(p.ends_at) < now) return false;
      return true;
    });
  }

  static async addPromotionToInvoice(
    invoiceId: string,
    promotion: LocalPromotion,
    catalogItems: LocalCatalogItem[],
    cashierId: string = 'cashier-1',
  ): Promise<LocalInvoice> {
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.addPromotionToInvoice(invoiceId, promotion, catalogItems, cashierId);
  }

  // --- 14. Bookings (Phase 9) ---
  static async getUpcomingBookings(): Promise<LocalBooking[]> {
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.getUpcomingLocalBookings();
  }

  static async createBooking(
    payload: CreateLocalBookingPayload,
    cashierId: string = 'cashier-1',
  ): Promise<LocalBooking> {
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.createLocalBooking(payload, cashierId);
  }

  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
  ): Promise<LocalBooking> {
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.updateLocalBookingStatus(bookingId, status);
  }

  static async convertBookingToInvoice(
    bookingId: string,
    activeShiftId: string,
    catalogItems: LocalCatalogItem[],
    activePromotions: LocalPromotion[] = [],
    cashierId: string = 'cashier-1',
  ): Promise<LocalInvoice> {
    const { LocalSalesStore } = await import('./localSalesStore');
    return await LocalSalesStore.convertBookingToInvoice(
      bookingId,
      activeShiftId,
      catalogItems,
      activePromotions,
      cashierId,
    );
  }
}


