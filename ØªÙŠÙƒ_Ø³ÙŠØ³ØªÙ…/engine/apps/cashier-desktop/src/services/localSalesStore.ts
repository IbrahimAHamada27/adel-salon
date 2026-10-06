import { LocalCustomer } from '../types/customer';
import {
  LocalInvoice,
  LocalInvoiceLine,
  LocalLineAdjustment,
  LocalPayment,
  LocalPaymentInput,
  AdjustmentType,
} from '../types/sales';
import { LocalShift, ShiftSummary } from '../types/shift';
import { LocalExpense } from '../types/expense';
import { LocalCatalogItem } from '../types/catalog';
import { LocalEmployee } from '../types/employee';
import { LocalPromotion } from '../types/promotion';
import { LocalBooking, CreateLocalBookingPayload, BookingStatus } from '../types/booking';
import { encryptAndSave, decryptAndGet } from './encryption';

const INVOICES_STORAGE_KEY = 'tech_pos_invoices';
const CUSTOMERS_STORAGE_KEY = 'tech_pos_customers';
const SHIFTS_STORAGE_KEY = 'tech_pos_shifts';
const EXPENSES_STORAGE_KEY = 'tech_pos_expenses';
const PRINTS_STORAGE_KEY = 'tech_pos_prints';
const PROMOTIONS_STORAGE_KEY = 'tech_pos_promotions';
const BOOKINGS_STORAGE_KEY = 'tech_pos_bookings';

export class LocalSalesStore {
  // --- Storage Helpers ---
  private static async getStoredCustomers(): Promise<LocalCustomer[]> {
    const list = await decryptAndGet<LocalCustomer[]>(CUSTOMERS_STORAGE_KEY);
    return list || [];
  }

  private static async saveStoredCustomers(customers: LocalCustomer[]): Promise<void> {
    await encryptAndSave(CUSTOMERS_STORAGE_KEY, customers);
  }

  private static async getStoredInvoices(): Promise<LocalInvoice[]> {
    const list = await decryptAndGet<LocalInvoice[]>(INVOICES_STORAGE_KEY);
    return list || [];
  }

  private static async saveStoredInvoices(invoices: LocalInvoice[]): Promise<void> {
    await encryptAndSave(INVOICES_STORAGE_KEY, invoices);
  }

  private static async getStoredShifts(): Promise<LocalShift[]> {
    const list = await decryptAndGet<LocalShift[]>(SHIFTS_STORAGE_KEY);
    return list || [];
  }

  private static async saveStoredShifts(shifts: LocalShift[]): Promise<void> {
    await encryptAndSave(SHIFTS_STORAGE_KEY, shifts);
  }

  private static async getStoredExpenses(): Promise<LocalExpense[]> {
    const list = await decryptAndGet<LocalExpense[]>(EXPENSES_STORAGE_KEY);
    return list || [];
  }

  private static async saveStoredExpenses(expenses: LocalExpense[]): Promise<void> {
    await encryptAndSave(EXPENSES_STORAGE_KEY, expenses);
  }

  // --- Customers ---
  static async createCustomer(
    fullName: string,
    phoneNumber?: string,
    birthDate?: string,
    internalNote?: string,
    cashierId: string = 'cashier-1',
  ): Promise<LocalCustomer> {
    const trimmed = fullName.trim();
    if (!trimmed) {
      throw new Error('اسم العميل مطلوب ولا يمكن تركه فارغاً');
    }

    const customers = await this.getStoredCustomers();
    const now = new Date().toISOString();
    const newCustomer: LocalCustomer = {
      local_id: 'cust_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      full_name: trimmed,
      phone_number: phoneNumber?.trim() || null,
      birth_date: birthDate?.trim() || null,
      internal_note: internalNote?.trim() || null,
      created_at: now,
      updated_at: now,
      created_by_cashier_id: cashierId,
    };

    customers.unshift(newCustomer);
    await this.saveStoredCustomers(customers);
    return newCustomer;
  }

  static async searchCustomers(query: string): Promise<LocalCustomer[]> {
    const customers = await this.getStoredCustomers();
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);

    return customers
      .filter((c) => {
        const nameMatch = c.full_name.toLowerCase().includes(q);
        const phoneMatch = c.phone_number ? c.phone_number.includes(q) : false;
        return nameMatch || phoneMatch;
      })
      .slice(0, 50);
  }

  // --- Shifts Management (Phase 6) ---
  static async openShift(
    cashierUserId: string,
    cashierDisplayName: string,
    openingCash: number,
  ): Promise<LocalShift> {
    if (openingCash < 0) {
      throw new Error('كاش البداية لا يمكن أن يكون سالباً');
    }

    const shifts = await this.getStoredShifts();
    const existing = shifts.find(
      (s) => s.cashier_user_id === cashierUserId && (s.status === 'OPEN' || s.status === 'CLOSING'),
    );

    if (existing) {
      throw new Error(`توجد وردية مفتوحة بالفعل لهذا الكاشير (معرف الوردية: ${existing.local_id})`);
    }

    const now = new Date().toISOString();
    const newShift: LocalShift = {
      local_id: 'shift_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      cashier_user_id: cashierUserId,
      cashier_display_name_snapshot: cashierDisplayName,
      status: 'OPEN',
      opened_at: now,
      closed_at: null,
      opening_cash_amount: Math.round(openingCash * 100) / 100,
      expected_cash_amount: Math.round(openingCash * 100) / 100,
      actual_cash_amount: null,
      cash_difference_amount: null,
      closing_note: null,
      created_at: now,
      updated_at: now,
    };

    shifts.push(newShift);
    await this.saveStoredShifts(shifts);
    return newShift;
  }

  static async getActiveShift(cashierUserId?: string): Promise<LocalShift | null> {
    const shifts = await this.getStoredShifts();
    const active =
      shifts.find(
        (s) =>
          (!cashierUserId || s.cashier_user_id === cashierUserId) &&
          (s.status === 'OPEN' || s.status === 'CLOSING'),
      ) ||
      shifts.find((s) => s.status === 'OPEN' || s.status === 'CLOSING');

    if (!active) return null;

    // Dynamically update expected cash
    const summary = await this.getShiftSummary(active.local_id);
    active.expected_cash_amount = summary.expected_cash;
    return active;
  }

  static async getShiftSummary(shiftId: string): Promise<ShiftSummary> {
    const shifts = await this.getStoredShifts();
    const shift = shifts.find((s) => s.local_id === shiftId);
    if (!shift) throw new Error('الوردية غير موجودة');

    const invoices = await this.getStoredInvoices();
    const paidInvoicesInShift = invoices.filter(
      (i) => i.shift_local_id === shiftId && i.status === 'PAID',
    );

    let cashSales = 0;
    let nonCashSales = 0;
    let totalTips = 0;

    // Aggregate performance by barber
    const barberMap = new Map<
      string,
      {
        employee_id: string;
        employee_name: string;
        services_count: number;
        total_sales: number;
        total_tips: number;
      }
    >();

    for (const inv of paidInvoicesInShift) {
      for (const p of inv.payments || []) {
        if (p.payment_method === 'CASH') {
          cashSales += p.amount;
        } else {
          nonCashSales += p.amount;
        }
      }

      const invTip = Number(inv.tip_amount) || 0;
      if (invTip > 0) {
        totalTips += invTip;
      }

      // Collect barber services and sales from lines
      for (const line of inv.lines) {
        if (line.assigned_employee_id) {
          const empId = line.assigned_employee_id;
          const empName = line.assigned_employee_name_snapshot || 'حلاق';
          const existing = barberMap.get(empId) || {
            employee_id: empId,
            employee_name: empName,
            services_count: 0,
            total_sales: 0,
            total_tips: 0,
          };
          existing.services_count += line.quantity;
          existing.total_sales += line.line_final_total;
          barberMap.set(empId, existing);
        }
      }

      // Attribute tips to barber
      if (invTip > 0) {
        let recipientId = inv.tip_recipient_employee_id;
        let recipientName = inv.tip_recipient_employee_name_snapshot;

        // If no explicit recipient but there is an assigned barber on line
        if (!recipientId) {
          const firstAssigned = inv.lines.find((l) => l.assigned_employee_id);
          if (firstAssigned) {
            recipientId = firstAssigned.assigned_employee_id || undefined;
            recipientName = firstAssigned.assigned_employee_name_snapshot || undefined;
          }
        }

        if (recipientId) {
          const existing = barberMap.get(recipientId) || {
            employee_id: recipientId,
            employee_name: recipientName || 'حلاق',
            services_count: 0,
            total_sales: 0,
            total_tips: 0,
          };
          existing.total_tips += invTip;
          barberMap.set(recipientId, existing);
        }
      }
    }

    const expenses = await this.getStoredExpenses();
    const shiftExpenses = expenses.filter(
      (e) => e.shift_local_id === shiftId && e.status === 'RECORDED',
    );

    const totalCashExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedCash = Math.max(
      0,
      Math.round((shift.opening_cash_amount + cashSales - totalCashExpenses) * 100) / 100,
    );

    const barbersPerformance = Array.from(barberMap.values()).map((b) => ({
      ...b,
      total_sales: Math.round(b.total_sales * 100) / 100,
      total_tips: Math.round(b.total_tips * 100) / 100,
    }));

    return {
      shift_id: shiftId,
      opening_cash: Math.round(shift.opening_cash_amount * 100) / 100,
      cash_sales: Math.round(cashSales * 100) / 100,
      non_cash_sales: Math.round(nonCashSales * 100) / 100,
      total_sales: Math.round((cashSales + nonCashSales) * 100) / 100,
      cash_expenses: Math.round(totalCashExpenses * 100) / 100,
      expected_cash: expectedCash,
      paid_invoices_count: paidInvoicesInShift.length,
      total_tips: Math.round(totalTips * 100) / 100,
      barbers_performance: barbersPerformance,
    };
  }

  static async closeShift(
    shiftId: string,
    actualCash: number,
    closingNote?: string,
    _cashierUserId: string = 'cashier-1',
  ): Promise<LocalShift> {
    if (actualCash < 0) {
      throw new Error('الكاش الفعلي لا يمكن أن يكون سالباً');
    }

    const invoices = await this.getStoredInvoices();
    const openDrafts = invoices.filter((i) => i.status === 'DRAFT' || i.status === 'SUSPENDED');
    if (openDrafts.length > 0) {
      throw new Error(
        `لا يمكن إغلاق الوردية قبل تسوية كافة الفواتير المفتوحة (يوجد ${openDrafts.length} فواتير مفتوحة/معلقة، يرجى إتمام الدفع أو إلغاؤها)`,
      );
    }

    const shifts = await this.getStoredShifts();
    const shift = shifts.find((s) => s.local_id === shiftId);
    if (!shift) throw new Error('الوردية غير موجودة');

    if (shift.status !== 'OPEN' && shift.status !== 'CLOSING') {
      throw new Error('الوردية مغلقة بالفعل');
    }

    const summary = await this.getShiftSummary(shiftId);
    const expectedCash = summary.expected_cash;
    const roundedActual = Math.round(actualCash * 100) / 100;
    const diff = Math.round((roundedActual - expectedCash) * 100) / 100;

    if (Math.abs(diff) > 0.001) {
      const note = closingNote?.trim() || '';
      if (!note) {
        throw new Error('يجب إدخال سبب فرق الخزنة (عجز/زيادة) لإتمام إغلاق الوردية');
      }
    }

    const now = new Date().toISOString();
    shift.status = 'CLOSED_PENDING_SYNC';
    shift.closed_at = now;
    shift.expected_cash_amount = expectedCash;
    shift.actual_cash_amount = roundedActual;
    shift.cash_difference_amount = diff;
    shift.closing_note = closingNote?.trim() || null;
    shift.updated_at = now;

    await this.saveStoredShifts(shifts);
    return shift;
  }

  // --- Expenses (Phase 6) ---
  static async recordExpense(
    shiftId: string,
    amount: number,
    category: string,
    note?: string,
    cashierUserId: string = 'cashier-1',
  ): Promise<LocalExpense> {
    if (amount <= 0) {
      throw new Error('مبلغ المصروف يجب أن يكون أكبر من الصفر');
    }
    const cat = category.trim();
    if (!cat) {
      throw new Error('تصنيف المصروف إلزامي');
    }

    const shifts = await this.getStoredShifts();
    const shift = shifts.find((s) => s.local_id === shiftId);
    if (!shift || shift.status !== 'OPEN') {
      throw new Error('لا يمكن تسجيل مصروفات بعد إغلاق الوردية');
    }

    const expenses = await this.getStoredExpenses();
    const now = new Date().toISOString();
    const newExpense: LocalExpense = {
      local_id: 'exp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      shift_local_id: shiftId,
      amount: Math.round(amount * 100) / 100,
      category: cat,
      internal_note: note?.trim() || null,
      attachment_local_path: null,
      payment_source: 'CASH_DRAWER',
      status: 'RECORDED',
      created_at: now,
      created_by_cashier_id: cashierUserId,
    };

    expenses.unshift(newExpense);
    await this.saveStoredExpenses(expenses);
    return newExpense;
  }

  static async getActiveShiftExpenses(shiftId: string): Promise<LocalExpense[]> {
    const expenses = await this.getStoredExpenses();
    return expenses.filter((e) => e.shift_local_id === shiftId && e.status === 'RECORDED');
  }

  // --- Invoices ---
  static async createDraftInvoice(cashierId: string): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    const maxNum = invoices.reduce((max, inv) => Math.max(max, inv.invoice_number_local || 0), 0);
    const nextNumber = maxNum + 1;
    const now = new Date().toISOString();

    const newInvoice: LocalInvoice = {
      local_id: 'inv_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      invoice_number_local: nextNumber,
      status: 'DRAFT',
      customer_local_id: null,
      customer: null,
      cashier_user_id: cashierId,
      shift_local_id: null,
      subtotal: 0,
      total_discount: 0,
      total_surcharge: 0,
      total: 0,
      internal_note: null,
      paid_at: null,
      created_at: now,
      updated_at: now,
      lines: [],
      payments: [],
    };

    invoices.push(newInvoice);
    await this.saveStoredInvoices(invoices);
    return newInvoice;
  }

  static async getOpenInvoices(): Promise<LocalInvoice[]> {
    const invoices = await this.getStoredInvoices();
    return invoices.filter((inv) => inv.status === 'DRAFT' || inv.status === 'SUSPENDED');
  }

  static async getActiveShiftPaidInvoices(shiftId: string): Promise<LocalInvoice[]> {
    const invoices = await this.getStoredInvoices();
    return invoices
      .filter((inv) => inv.shift_local_id === shiftId && (inv.status === 'PAID' || inv.status === 'REFUNDED'))
      .sort((a, b) => (b.paid_at || b.created_at || '').localeCompare(a.paid_at || a.created_at || ''));
  }

  static async getInvoiceById(invoiceId: string): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    const found = invoices.find((inv) => inv.local_id === invoiceId);
    if (!found) {
      throw new Error('الفاتورة غير موجودة');
    }
    return found;
  }

  static async setInvoiceCustomer(
    invoiceId: string,
    customerId: string | null,
    _cashierId: string,
  ): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    const inv = invoices.find((i) => i.local_id === invoiceId);
    if (!inv) throw new Error('الفاتورة غير موجودة');

    if (inv.status === 'PAID') {
      throw new Error('لا يمكن تعديل عميل فاتورة بعد إتمام الدفع');
    }

    if (customerId) {
      const customers = await this.getStoredCustomers();
      const customer = customers.find((c) => c.local_id === customerId);
      inv.customer_local_id = customerId;
      inv.customer = customer || null;
    } else {
      inv.customer_local_id = null;
      inv.customer = null;
    }

    inv.updated_at = new Date().toISOString();
    await this.saveStoredInvoices(invoices);
    return inv;
  }

  static async addItemToInvoice(
    invoiceId: string,
    catalogItem: LocalCatalogItem,
    _cashierId: string,
  ): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    const inv = invoices.find((i) => i.local_id === invoiceId);
    if (!inv) throw new Error('الفاتورة غير موجودة');

    if (inv.status === 'PAID') {
      throw new Error('لا يمكن إضافة عناصر لفاتورة مدفوعة بالفعل');
    }

    const now = new Date().toISOString();

    if (catalogItem.type === 'PRODUCT') {
      const existingLine = inv.lines.find(
        (l) => l.catalog_item_id === catalogItem.id && !l.active_adjustment,
      );

      if (existingLine) {
        existingLine.quantity += 1;
        existingLine.line_subtotal =
          Math.round(existingLine.original_unit_price_snapshot * existingLine.quantity * 100) / 100;
        existingLine.line_final_total = existingLine.line_subtotal;
        existingLine.updated_at = now;
      } else {
        const newLine: LocalInvoiceLine = {
          local_id: 'line_' + Math.random().toString(36).substring(2, 9),
          invoice_local_id: invoiceId,
          catalog_item_id: catalogItem.id,
          item_type: 'PRODUCT',
          item_name_snapshot: catalogItem.name,
          original_unit_price_snapshot: catalogItem.base_price,
          quantity: 1,
          line_subtotal: catalogItem.base_price,
          line_final_total: catalogItem.base_price,
          created_at: now,
          updated_at: now,
        };
        inv.lines.push(newLine);
      }
    } else {
      // SERVICE ALWAYS creates a separate line
      const newLine: LocalInvoiceLine = {
        local_id: 'line_' + Math.random().toString(36).substring(2, 9),
        invoice_local_id: invoiceId,
        catalog_item_id: catalogItem.id,
        item_type: 'SERVICE',
        item_name_snapshot: catalogItem.name,
        original_unit_price_snapshot: catalogItem.base_price,
        quantity: 1,
        line_subtotal: catalogItem.base_price,
        line_final_total: catalogItem.base_price,
        created_at: now,
        updated_at: now,
      };
      inv.lines.push(newLine);
    }

    this.recalculateInvoiceTotals(inv);
    inv.updated_at = now;
    await this.saveStoredInvoices(invoices);
    return inv;
  }

  static async updateLineQuantity(
    lineId: string,
    newQuantity: number,
    _cashierId: string,
  ): Promise<LocalInvoice> {
    if (newQuantity <= 0) {
      throw new Error('الكمية يجب أن تكون 1 أو أكثر');
    }

    const invoices = await this.getStoredInvoices();
    let parentInv: LocalInvoice | undefined;
    let targetLine: LocalInvoiceLine | undefined;

    for (const inv of invoices) {
      const found = inv.lines.find((l) => l.local_id === lineId);
      if (found) {
        parentInv = inv;
        targetLine = found;
        break;
      }
    }

    if (!parentInv || !targetLine) throw new Error('سطر الفاتورة غير موجود');

    if (parentInv.status === 'PAID') {
      throw new Error('لا يمكن تعديل كميات فاتورة مدفوعة');
    }

    targetLine.quantity = newQuantity;
    targetLine.line_subtotal =
      Math.round(targetLine.original_unit_price_snapshot * newQuantity * 100) / 100;

    if (targetLine.active_adjustment) {
      targetLine.line_final_total = this.calculateAdjustedLineTotal(
        targetLine.line_subtotal,
        targetLine.original_unit_price_snapshot,
        newQuantity,
        targetLine.active_adjustment.adjustment_type,
        targetLine.active_adjustment.input_value,
      );
    } else {
      targetLine.line_final_total = targetLine.line_subtotal;
    }

    targetLine.updated_at = new Date().toISOString();
    this.recalculateInvoiceTotals(parentInv);
    parentInv.updated_at = new Date().toISOString();
    await this.saveStoredInvoices(invoices);
    return parentInv;
  }

  static async removeInvoiceLine(lineId: string, _cashierId: string): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    let parentInv: LocalInvoice | undefined;

    for (const inv of invoices) {
      const idx = inv.lines.findIndex((l) => l.local_id === lineId);
      if (idx !== -1) {
        if (inv.status === 'PAID') {
          throw new Error('لا يمكن حذف سطر من فاتورة مدفوعة');
        }
        inv.lines.splice(idx, 1);
        parentInv = inv;
        break;
      }
    }

    if (!parentInv) throw new Error('سطر الفاتورة غير موجود');

    this.recalculateInvoiceTotals(parentInv);
    parentInv.updated_at = new Date().toISOString();
    await this.saveStoredInvoices(invoices);
    return parentInv;
  }

  static async assignBarberToLine(
    lineId: string,
    employee: LocalEmployee | null,
    _cashierId: string,
  ): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    let parentInv: LocalInvoice | undefined;
    let targetLine: LocalInvoiceLine | undefined;

    for (const inv of invoices) {
      const found = inv.lines.find((l) => l.local_id === lineId);
      if (found) {
        parentInv = inv;
        targetLine = found;
        break;
      }
    }

    if (!parentInv || !targetLine) throw new Error('سطر الفاتورة غير موجود');

    if (parentInv.status === 'PAID') {
      throw new Error('لا يمكن تغيير حلاق الخدمة بعد إتمام الدفع');
    }

    if (targetLine.item_type !== 'SERVICE') {
      throw new Error('لا يمكن تعيين حلاق لمنتج بيع، الحلاق يُعين للخدمات فقط');
    }

    targetLine.assigned_employee_id = employee ? employee.id : null;
    targetLine.assigned_employee_name_snapshot = employee ? employee.name : null;
    targetLine.updated_at = new Date().toISOString();

    parentInv.updated_at = new Date().toISOString();
    await this.saveStoredInvoices(invoices);
    return parentInv;
  }

  static async applyLineAdjustment(
    lineId: string,
    adjustmentType: AdjustmentType,
    inputValue: number,
    reason?: string,
    cashierId: string = 'cashier-1',
  ): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    let parentInv: LocalInvoice | undefined;
    let targetLine: LocalInvoiceLine | undefined;

    for (const inv of invoices) {
      const found = inv.lines.find((l) => l.local_id === lineId);
      if (found) {
        parentInv = inv;
        targetLine = found;
        break;
      }
    }

    if (!parentInv || !targetLine) throw new Error('سطر الفاتورة غير موجود');

    if (parentInv.status === 'PAID') {
      throw new Error('لا يمكن تعديل أسعار أو خصومات فاتورة مدفوعة');
    }

    const finalTotal = this.calculateAdjustedLineTotal(
      targetLine.line_subtotal,
      targetLine.original_unit_price_snapshot,
      targetLine.quantity,
      adjustmentType,
      inputValue,
    );

    const now = new Date().toISOString();
    const adjustment: LocalLineAdjustment = {
      local_id: 'adj_' + Math.random().toString(36).substring(2, 9),
      invoice_line_local_id: lineId,
      adjustment_type: adjustmentType,
      original_price_before: targetLine.line_subtotal,
      resulting_price_after: finalTotal,
      input_value: inputValue,
      reason: reason || null,
      performed_by_cashier_id: cashierId,
      created_at: now,
    };

    targetLine.active_adjustment = adjustment;
    targetLine.line_final_total = finalTotal;
    targetLine.updated_at = now;

    this.recalculateInvoiceTotals(parentInv);
    parentInv.updated_at = now;
    await this.saveStoredInvoices(invoices);
    return parentInv;
  }

  static calculateAdjustedLineTotal(
    lineSubtotal: number,
    _originalUnitPrice: number,
    quantity: number,
    adjType: AdjustmentType,
    inputValue: number,
  ): number {
    switch (adjType) {
      case 'MANUAL_PRICE_OVERRIDE': {
        if (inputValue < 0) throw new Error('لا يمكن تحديد سعر سالب');
        return Math.round(inputValue * quantity * 100) / 100;
      }
      case 'FIXED_DISCOUNT': {
        if (inputValue < 0) throw new Error('قيمة الخصم لا يمكن أن تكون سالبة');
        if (inputValue > lineSubtotal) throw new Error('قيمة الخصم لا يمكن أن تتجاوز إجمالي السعر');
        return Math.max(0, Math.round((lineSubtotal - inputValue) * 100) / 100);
      }
      case 'PERCENTAGE_DISCOUNT': {
        if (inputValue < 0 || inputValue > 100) throw new Error('نسبة الخصم يجب أن تكون بين 0% و 100%');
        const discountAmount = (lineSubtotal * inputValue) / 100;
        return Math.max(0, Math.round((lineSubtotal - discountAmount) * 100) / 100);
      }
      case 'FIXED_SURCHARGE': {
        if (inputValue < 0) throw new Error('قيمة الزيادة لا يمكن أن تكون سالبة');
        return Math.round((lineSubtotal + inputValue) * 100) / 100;
      }
      case 'PERCENTAGE_SURCHARGE': {
        if (inputValue < 0) throw new Error('نسبة الزيادة لا يمكن أن تكون سالبة');
        const surchargeAmount = (lineSubtotal * inputValue) / 100;
        return Math.round((lineSubtotal + surchargeAmount) * 100) / 100;
      }
      default:
        throw new Error('نوع التعديل غير صالح');
    }
  }

  // --- Payments Processing Engine (Phase 6) ---
  static async processInvoicePayment(
    invoiceId: string,
    shiftId: string,
    paymentInputs: LocalPaymentInput[],
    cashierUserId: string = 'cashier-1',
    tipDetails?: {
      tip_amount?: number;
      tip_recipient_employee_id?: string;
      tip_recipient_employee_name_snapshot?: string;
    },
  ): Promise<LocalInvoice> {
    if (paymentInputs.length === 0) {
      throw new Error('يجب إضافة طريقة دفع واحدة على الأقل');
    }

    const shifts = await this.getStoredShifts();
    const shift = shifts.find((s) => s.local_id === shiftId);
    if (!shift || shift.status !== 'OPEN') {
      throw new Error('لا يمكن إتمام الدفع بدون وجود وردية مفتوحة');
    }

    const invoices = await this.getStoredInvoices();
    const inv = invoices.find((i) => i.local_id === invoiceId);
    if (!inv) throw new Error('الفاتورة غير موجودة');

    if (inv.status === 'PAID') {
      throw new Error('الفاتورة مدفوعة بالفعل');
    }
    if (inv.status === 'CANCELLED') {
      throw new Error('لا يمكن سداد فاتورة ملغاة');
    }
    if (inv.lines.length === 0) {
      throw new Error('لا يمكن إتمام الدفع لفاتورة فارغة');
    }

    let totalPaid = 0;
    for (const p of paymentInputs) {
      if (p.amount <= 0) {
        throw new Error('مبلغ الدفع يجب أن يكون أكبر من الصفر');
      }
      totalPaid += p.amount;
    }

    const roundedTotal = Math.round(inv.total * 100) / 100;
    const roundedPaid = Math.round(totalPaid * 100) / 100;

    if (Math.abs(roundedPaid - roundedTotal) > 0.01) {
      throw new Error(
        `مجموع المدفوعات (${roundedPaid.toFixed(2)} ج.م) يجب أن يتطابق تماماً مع إجمالي الفاتورة (${roundedTotal.toFixed(2)} ج.م)`,
      );
    }

    const now = new Date().toISOString();
    const paymentRecords: LocalPayment[] = paymentInputs.map((p) => {
      const change =
        p.payment_method === 'CASH' && p.cash_received_amount
          ? Math.max(0, Math.round((p.cash_received_amount - p.amount) * 100) / 100)
          : null;

      return {
        local_id: 'pay_' + Math.random().toString(36).substring(2, 9),
        invoice_local_id: invoiceId,
        payment_method: p.payment_method,
        amount: Math.round(p.amount * 100) / 100,
        cash_received_amount: p.cash_received_amount || null,
        change_amount: change,
        reference_note: p.reference_note || null,
        created_at: now,
        created_by_cashier_id: cashierUserId,
      };
    });

    inv.status = 'PAID';
    inv.shift_local_id = shiftId;
    inv.paid_at = now;
    inv.updated_at = now;
    inv.payments = paymentRecords;

    if (tipDetails && tipDetails.tip_amount && tipDetails.tip_amount > 0) {
      inv.tip_amount = Math.round(tipDetails.tip_amount * 100) / 100;
      inv.tip_recipient_employee_id = tipDetails.tip_recipient_employee_id || null;
      inv.tip_recipient_employee_name_snapshot = tipDetails.tip_recipient_employee_name_snapshot || null;
    }

    await this.saveStoredInvoices(invoices);
    return inv;
  }

  static async recordReceiptPrint(
    _invoiceId: string,
    _status: string,
    _failureReason?: string,
    _cashierUserId: string = 'cashier-1',
  ): Promise<void> {
    const prints = (await decryptAndGet<any[]>(PRINTS_STORAGE_KEY)) || [];
    prints.push({
      local_id: 'prt_' + Math.random().toString(36).substring(2, 9),
      invoice_local_id: _invoiceId,
      printed_at: new Date().toISOString(),
      printed_by_cashier_id: _cashierUserId,
      print_status: _status,
      failure_reason: _failureReason || null,
    });
    await encryptAndSave(PRINTS_STORAGE_KEY, prints);
  }

  static async updateInvoiceNote(
    invoiceId: string,
    note: string | null,
    _cashierId: string,
  ): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    const inv = invoices.find((i) => i.local_id === invoiceId);
    if (!inv) throw new Error('الفاتورة غير موجودة');

    if (inv.status === 'PAID') {
      throw new Error('لا يمكن تعديل ملاحظات فاتورة بعد الدفع');
    }

    inv.internal_note = note;
    inv.updated_at = new Date().toISOString();
    await this.saveStoredInvoices(invoices);
    return inv;
  }

  static async suspendInvoice(invoiceId: string, _cashierId: string): Promise<void> {
    const invoices = await this.getStoredInvoices();
    const inv = invoices.find((i) => i.local_id === invoiceId);
    if (!inv) throw new Error('الفاتورة غير موجودة');

    if (inv.status === 'PAID') {
      throw new Error('لا يمكن تعليق فاتورة مدفوعة');
    }

    inv.status = 'SUSPENDED';
    inv.updated_at = new Date().toISOString();
    await this.saveStoredInvoices(invoices);
  }

  static async resumeInvoice(invoiceId: string, _cashierId: string): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    const inv = invoices.find((i) => i.local_id === invoiceId);
    if (!inv) throw new Error('الفاتورة غير موجودة');

    inv.status = 'DRAFT';
    inv.updated_at = new Date().toISOString();
    await this.saveStoredInvoices(invoices);
    return inv;
  }

  static async cancelInvoice(
    invoiceId: string,
    _reason?: string,
    _cashierId: string = 'cashier-1',
  ): Promise<void> {
    const invoices = await this.getStoredInvoices();
    const inv = invoices.find((i) => i.local_id === invoiceId);
    if (!inv) throw new Error('الفاتورة غير موجودة');

    if (inv.status === 'PAID') {
      throw new Error('لا يمكن إلغاء فاتورة مدفوعة من واجهة الكاشير، يمكنك استخدام خيار المرتجع');
    }

    inv.status = 'CANCELLED';
    inv.updated_at = new Date().toISOString();
    await this.saveStoredInvoices(invoices);
  }

  static async refundInvoice(
    invoiceId: string,
    reason: string = 'طلب العميل واسترداد المبلغ',
    cashierId: string = 'cashier-1',
  ): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    const inv = invoices.find((i) => i.local_id === invoiceId);
    if (!inv) throw new Error('الفاتورة غير موجودة');

    if (inv.status !== 'PAID') {
      throw new Error('لا يمكن عمل مرتجع إلا لفاتورة مسددة ومدفوعة');
    }

    const now = new Date().toISOString();
    inv.status = 'REFUNDED';
    inv.refunded_at = now;
    inv.refund_reason = reason.trim() || 'مرتجع واسترداد المبلغ';
    inv.refunded_by_cashier_id = cashierId;
    inv.updated_at = now;

    await this.saveStoredInvoices(invoices);
    return inv;
  }

  static async getStoredPromotions(): Promise<LocalPromotion[]> {
    const list = await decryptAndGet<LocalPromotion[]>(PROMOTIONS_STORAGE_KEY);
    return list || [];
  }

  static async saveStoredPromotions(promotions: LocalPromotion[]): Promise<void> {
    await encryptAndSave(PROMOTIONS_STORAGE_KEY, promotions);
  }

  static async getStoredBookings(): Promise<LocalBooking[]> {
    const list = await decryptAndGet<LocalBooking[]>(BOOKINGS_STORAGE_KEY);
    return list || [];
  }

  static async saveStoredBookings(bookings: LocalBooking[]): Promise<void> {
    await encryptAndSave(BOOKINGS_STORAGE_KEY, bookings);
  }

  static async addPromotionToInvoice(
    invoiceId: string,
    promotion: LocalPromotion,
    catalogItems: LocalCatalogItem[],
    _cashierId: string = 'cashier-1',
  ): Promise<LocalInvoice> {
    const invoices = await this.getStoredInvoices();
    const inv = invoices.find((i) => i.local_id === invoiceId);
    if (!inv) throw new Error('الفاتورة غير موجودة');
    if (inv.status !== 'DRAFT') throw new Error('لا يمكن إضافة عروض إلا لفاتورة مسودة');

    if (!promotion.items || promotion.items.length === 0) {
      throw new Error('العرض لا يحتوي على أي عناصر');
    }

    // Check validity dates
    const now = new Date();
    if (promotion.starts_at && new Date(promotion.starts_at) > now) {
      throw new Error('هذا العرض لم يبدأ بعد');
    }
    if (promotion.ends_at && new Date(promotion.ends_at) < now) {
      throw new Error('هذا العرض منتهي الصلاحية');
    }

    // Calculate regular total price of all items
    let regularTotal = 0;
    const resolvedItems = promotion.items.map((pi) => {
      const cat = catalogItems.find((c) => c.id === pi.catalog_item_id);
      const unitPrice = cat ? cat.base_price : (pi.catalog_item_base_price || 0);
      const subtotal = unitPrice * (pi.quantity || 1);
      regularTotal += subtotal;
      return {
        ...pi,
        unitPrice,
        subtotal,
        name: cat ? cat.name : pi.catalog_item_name_snapshot,
        type: cat ? cat.type : pi.catalog_item_type,
        catalogItemId: cat ? cat.id : pi.catalog_item_id,
      };
    });

    const promotionGroupId = crypto.randomUUID();
    let distributedSum = 0;
    const nowIso = new Date().toISOString();

    const newLines: LocalInvoiceLine[] = resolvedItems.map((item, index) => {
      let lineFinalTotal = 0;
      const isLast = index === resolvedItems.length - 1;

      if (regularTotal > 0) {
        if (!isLast) {
          const proportion = item.subtotal / regularTotal;
          lineFinalTotal = Math.round(promotion.fixed_price * proportion * 100) / 100;
          distributedSum += lineFinalTotal;
        } else {
          // Last item absorbs any rounding remainder
          lineFinalTotal = Math.round((promotion.fixed_price - distributedSum) * 100) / 100;
        }
      } else {
        // Equal split fallback if all base prices are 0
        if (!isLast) {
          lineFinalTotal = Math.round((promotion.fixed_price / resolvedItems.length) * 100) / 100;
          distributedSum += lineFinalTotal;
        } else {
          lineFinalTotal = Math.round((promotion.fixed_price - distributedSum) * 100) / 100;
        }
      }

      return {
        local_id: crypto.randomUUID(),
        invoice_local_id: inv.local_id,
        catalog_item_id: item.catalogItemId,
        item_name_snapshot: item.name,
        item_type: item.type as 'SERVICE' | 'PRODUCT',
        quantity: item.quantity,
        original_unit_price_snapshot: item.unitPrice,
        line_subtotal: item.subtotal,
        line_final_total: lineFinalTotal,
        parent_promotion_local_id: promotionGroupId,
        promotion_name_snapshot: promotion.name,
        assigned_employee_id: undefined,
        assigned_employee_name_snapshot: undefined,
        active_adjustment: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
    });

    inv.lines.push(...newLines);
    inv.updated_at = nowIso;
    this.recalculateInvoiceTotals(inv);
    await this.saveStoredInvoices(invoices);
    return inv;
  }

  // --- Bookings Methods ---
  static async createLocalBooking(
    payload: CreateLocalBookingPayload,
    _cashierId: string = 'cashier-1',
  ): Promise<LocalBooking> {
    if (!payload.scheduled_at) {
      throw new Error('تاريخ وموعد الحجز إجباري');
    }

    const bookings = await this.getStoredBookings();
    const displayName = payload.guest_name?.trim() || 'عميل مسجل';
    const nowIso = new Date().toISOString();

    const bookingLocalId = crypto.randomUUID();
    const newBooking: LocalBooking = {
      local_id: bookingLocalId,
      customer_local_id: payload.customer_local_id || null,
      guest_name: payload.guest_name || null,
      guest_phone: payload.guest_phone || null,
      display_client_name: displayName,
      display_client_phone: payload.guest_phone || null,
      scheduled_at: payload.scheduled_at,
      status: 'CONFIRMED',
      preferred_employee_id: payload.preferred_employee_id || null,
      internal_note: payload.internal_note || null,
      items: payload.items?.map((item, idx) => ({
        id: crypto.randomUUID(),
        booking_id: bookingLocalId,
        catalog_item_id: item.catalog_item_id || null,
        promotion_id: item.promotion_id || null,
        item_name_snapshot: item.item_name_snapshot,
        item_type: item.item_type,
        quantity: item.quantity || 1,
        sort_order: idx,
      })) || [],
      created_at: nowIso,
      updated_at: nowIso,
    };

    bookings.unshift(newBooking);
    await this.saveStoredBookings(bookings);
    return newBooking;
  }

  static async updateLocalBookingStatus(
    bookingId: string,
    status: BookingStatus,
  ): Promise<LocalBooking> {
    const bookings = await this.getStoredBookings();
    const booking = bookings.find((b) => b.local_id === bookingId);
    if (!booking) throw new Error('الحجز غير موجود');

    booking.status = status;
    booking.updated_at = new Date().toISOString();
    await this.saveStoredBookings(bookings);
    return booking;
  }

  static async getUpcomingLocalBookings(): Promise<LocalBooking[]> {
    const bookings = await this.getStoredBookings();
    return bookings.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }

  static async convertBookingToInvoice(
    bookingId: string,
    activeShiftId: string,
    catalogItems: LocalCatalogItem[],
    activePromotions: LocalPromotion[] = [],
    cashierId: string = 'cashier-1',
  ): Promise<LocalInvoice> {
    const bookings = await this.getStoredBookings();
    const booking = bookings.find((b) => b.local_id === bookingId);
    if (!booking) throw new Error('الحجز غير موجود');

    if (booking.status === 'CONVERTED_TO_INVOICE' || booking.converted_invoice_id) {
      throw new Error('تم تحويل هذا الحجز إلى فاتورة مسبقًا');
    }

    // Create Draft Invoice
    const invoice = await this.createDraftInvoice(cashierId);
    if (booking.customer_local_id) {
      await this.setInvoiceCustomer(invoice.local_id, booking.customer_local_id, cashierId);
    } else if (booking.guest_name) {
      await this.updateInvoiceNote(
        invoice.local_id,
        `حجز ضيف: ${booking.guest_name}${booking.guest_phone ? ` (${booking.guest_phone})` : ''}`,
        cashierId,
      );
    }

    // If booking has items, add them
    if (booking.items && booking.items.length > 0) {
      for (const item of booking.items) {
        // Check if item is a promotion
        const prom = activePromotions.find((p) => p.id === item.catalog_item_id || p.id === item.promotion_id);
        if (prom) {
          await this.addPromotionToInvoice(invoice.local_id, prom, catalogItems, cashierId);
        } else if (item.catalog_item_id) {
          const cat = catalogItems.find((c) => c.id === item.catalog_item_id);
          if (cat) {
            await this.addItemToInvoice(invoice.local_id, cat, cashierId);
          }
        }
      }
    }

    // Fetch the updated invoice
    const invoices = await this.getStoredInvoices();
    const updatedInvoice = invoices.find((i) => i.local_id === invoice.local_id) || invoice;

    // Update booking status
    booking.status = 'CONVERTED_TO_INVOICE';
    booking.converted_invoice_id = updatedInvoice.local_id;
    booking.updated_at = new Date().toISOString();
    await this.saveStoredBookings(bookings);

    return updatedInvoice;
  }

  // --- Outbox Synchronization Helpers ---
  static async getOutboxPayload(): Promise<any> {
    const customers = await this.getStoredCustomers();
    const shifts = await this.getStoredShifts();
    const invoices = await this.getStoredInvoices();
    const expenses = await this.getStoredExpenses();

    return {
      customers: customers.map((c) => ({
        id: c.local_id,
        fullName: c.full_name,
        phoneNumber: c.phone_number,
        birthDate: c.birth_date,
        internalNote: c.internal_note,
        createdAt: c.created_at,
      })),
      shifts: shifts.map((s) => ({
        id: s.local_id,
        cashierId: s.cashier_user_id,
        status: s.status === 'OPEN' || s.status === 'CLOSING' ? 'OPEN' : 'CLOSED',
        openedAt: s.opened_at,
        closedAt: s.closed_at,
        openingBalance: s.opening_cash_amount,
        expectedCash: s.expected_cash_amount,
        actualCash: s.actual_cash_amount,
        cashDifference: s.cash_difference_amount || 0,
        notes: s.closing_note,
        createdAt: s.created_at,
      })),
      invoices: invoices
        .filter((inv) => inv.status === 'PAID' || inv.status === 'CANCELLED')
        .map((inv) => ({
          id: inv.local_id,
          shiftId: inv.shift_local_id,
          cashierId: inv.cashier_user_id,
          customerId: inv.customer_local_id,
          customerNameSnapshot: inv.customer?.full_name || null,
          customerPhoneSnapshot: inv.customer?.phone_number || null,
          invoiceNumber: String(inv.invoice_number_local || inv.local_id),
          subtotal: inv.subtotal,
          discountAmount: inv.total_discount,
          totalAmount: inv.total,
          status: inv.status,
          notes: inv.internal_note,
          createdAt: inv.created_at,
          paidAt: inv.paid_at,
          lines: (inv.lines || []).map((l, idx) => ({
            id: l.local_id,
            catalogItemId: l.catalog_item_id,
            itemNameSnapshot: l.item_name_snapshot,
            itemType: l.item_type || 'SERVICE',
            unitPrice: l.original_unit_price_snapshot || l.line_subtotal,
            quantity: l.quantity || 1,
            totalPrice: l.line_final_total,
            barberEmployeeId: l.assigned_employee_id,
            sortOrder: idx,
          })),
          payments: (inv.payments || []).map((p) => ({
            paymentMethod: p.payment_method,
            amount: p.amount,
            cashReceivedAmount: p.cash_received_amount,
            changeAmount: p.change_amount,
            referenceNote: p.reference_note,
          })),
        })),
      expenses: expenses.map((e) => ({
        id: e.local_id,
        shiftId: e.shift_local_id,
        cashierId: e.created_by_cashier_id,
        category: e.category,
        amount: e.amount,
        description: e.internal_note,
        createdAt: e.created_at,
      })),
    };
  }

  static async markOutboxSynced(): Promise<void> {
    // Optionally purge closed shifts and paid invoices that have been uploaded to server
    // Keeping local storage clean and adhering to local-first privacy requirements
    const shifts = await this.getStoredShifts();
    const invoices = await this.getStoredInvoices();
    const expenses = await this.getStoredExpenses();

    // Mark closed shifts status or retain active shift
    const activeShift = shifts.find((s) => s.status === 'OPEN' || s.status === 'CLOSING');
    const retainedShifts = activeShift ? [activeShift] : [];

    // Only keep open/draft/suspended invoices locally if a shift is active, or keep last 20 paid for reprint
    const activeInvoices = invoices.filter(
      (inv) => inv.status === 'DRAFT' || inv.status === 'SUSPENDED' || (activeShift && inv.shift_local_id === activeShift.local_id),
    );

    const activeExpenses = activeShift
      ? expenses.filter((e) => e.shift_local_id === activeShift.local_id)
      : [];

    await this.saveStoredShifts(retainedShifts);
    await this.saveStoredInvoices(activeInvoices);
    await this.saveStoredExpenses(activeExpenses);
  }

  private static recalculateInvoiceTotals(invoice: LocalInvoice): void {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalSurcharge = 0;
    let finalTotal = 0;

    for (const line of invoice.lines) {
      subtotal += line.line_subtotal;
      finalTotal += line.line_final_total;

      if (line.line_final_total < line.line_subtotal) {
        totalDiscount += line.line_subtotal - line.line_final_total;
      } else if (line.line_final_total > line.line_subtotal) {
        totalSurcharge += line.line_final_total - line.line_subtotal;
      }
    }

    invoice.subtotal = Math.round(subtotal * 100) / 100;
    invoice.total_discount = Math.round(totalDiscount * 100) / 100;
    invoice.total_surcharge = Math.round(totalSurcharge * 100) / 100;
    invoice.total = Math.round(finalTotal * 100) / 100;
  }
}
