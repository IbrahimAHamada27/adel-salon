import { describe, it, expect, beforeEach } from 'vitest';
import { LocalSalesStore } from '../localSalesStore';
import { LocalCatalogItem } from '../../types/catalog';
import { LocalEmployee } from '../../types/employee';
import { LocalPromotion } from '../../types/promotion';
import { LocalBooking } from '../../types/booking';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

describe('POS Sales Engine & Offline-First Accounting Workflows (Phase 5 & 6)', () => {
  beforeEach(() => {
    // Clear in-memory / local storage mock before each test
    localStorage.clear();
  });

  const mockServiceItem: LocalCatalogItem = {
    id: 'srv_1',
    group_id: 'grp_1',
    type: 'SERVICE',
    name: 'قص شعر كلاسيكي',
    base_price: 100.0,
    sort_order: 1,
  };

  const mockProductItem: LocalCatalogItem = {
    id: 'prod_1',
    group_id: 'grp_1',
    type: 'PRODUCT',
    name: 'شمع شعر مات',
    base_price: 50.0,
    sku: 'WAX-01',
    sort_order: 2,
  };

  const mockBarber: LocalEmployee = {
    id: 'emp_1',
    name: 'كابتن محمود',
    role_title: 'حلاق محترف',
    sort_order: 1,
  };

  it('1. should start with zero demo data on clean setup', async () => {
    const openInvoices = await LocalSalesStore.getOpenInvoices();
    expect(openInvoices).toHaveLength(0);

    const customers = await LocalSalesStore.searchCustomers('');
    expect(customers).toHaveLength(0);

    const activeShift = await LocalSalesStore.getActiveShift('cashier_1');
    expect(activeShift).toBeNull();
  });

  it('2. should create draft invoices with auto-incremented local numbers', async () => {
    const inv1 = await LocalSalesStore.createDraftInvoice('cashier_1');
    const inv2 = await LocalSalesStore.createDraftInvoice('cashier_1');

    expect(inv1.invoice_number_local).toBe(1);
    expect(inv2.invoice_number_local).toBe(2);
    expect(inv1.status).toBe('DRAFT');
    expect(inv2.status).toBe('DRAFT');
    expect(inv1.total).toBe(0);
    expect(inv1.lines).toHaveLength(0);

    const openInvoices = await LocalSalesStore.getOpenInvoices();
    expect(openInvoices).toHaveLength(2);
  });

  it('3. should create local customer and attach/detach to draft invoice', async () => {
    const customer = await LocalSalesStore.createCustomer(
      'أحمد حسني',
      '01012345678',
      '1995-05-15',
      'عميل مميز',
      'cashier_1',
    );
    expect(customer.full_name).toBe('أحمد حسني');
    expect(customer.phone_number).toBe('01012345678');

    const searchResults = await LocalSalesStore.searchCustomers('0101234');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].local_id).toBe(customer.local_id);

    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    const linkedInv = await LocalSalesStore.setInvoiceCustomer(inv.local_id, customer.local_id, 'cashier_1');
    expect(linkedInv.customer_local_id).toBe(customer.local_id);
    expect(linkedInv.customer?.full_name).toBe('أحمد حسني');

    // Detach customer
    const unlinkedInv = await LocalSalesStore.setInvoiceCustomer(inv.local_id, null, 'cashier_1');
    expect(unlinkedInv.customer_local_id).toBeNull();
    expect(unlinkedInv.customer).toBeNull();
  });

  it('4. should add service lines independently and product lines by incrementing quantity', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');

    // Adding service twice -> 2 separate lines
    await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    const afterSecondService = await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    expect(afterSecondService.lines).toHaveLength(2);
    expect(afterSecondService.lines[0].item_type).toBe('SERVICE');
    expect(afterSecondService.lines[1].item_type).toBe('SERVICE');
    expect(afterSecondService.subtotal).toBe(200.0);
    expect(afterSecondService.total).toBe(200.0);

    // Adding product twice -> increments quantity on 1 line
    await LocalSalesStore.addItemToInvoice(inv.local_id, mockProductItem, 'cashier_1');
    const afterSecondProduct = await LocalSalesStore.addItemToInvoice(inv.local_id, mockProductItem, 'cashier_1');
    expect(afterSecondProduct.lines).toHaveLength(3); // 2 services + 1 product

    const productLine = afterSecondProduct.lines.find((l) => l.catalog_item_id === mockProductItem.id);
    expect(productLine).toBeDefined();
    expect(productLine?.quantity).toBe(2);
    expect(productLine?.line_subtotal).toBe(100.0);
    expect(afterSecondProduct.subtotal).toBe(300.0);
    expect(afterSecondProduct.total).toBe(300.0);
  });

  it('5. should assign barber to services only and reject assignment on products', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    await LocalSalesStore.addItemToInvoice(inv.local_id, mockProductItem, 'cashier_1');

    const updatedInv = await LocalSalesStore.getInvoiceById(inv.local_id);
    const serviceLine = updatedInv.lines.find((l) => l.item_type === 'SERVICE')!;
    const productLine = updatedInv.lines.find((l) => l.item_type === 'PRODUCT')!;

    // Assign barber to service -> success
    const afterBarber = await LocalSalesStore.assignBarberToLine(serviceLine.local_id, mockBarber, 'cashier_1');
    const updatedSrv = afterBarber.lines.find((l) => l.local_id === serviceLine.local_id)!;
    expect(updatedSrv.assigned_employee_id).toBe(mockBarber.id);
    expect(updatedSrv.assigned_employee_name_snapshot).toBe('كابتن محمود');

    // Assign barber to product -> error
    await expect(
      LocalSalesStore.assignBarberToLine(productLine.local_id, mockBarber, 'cashier_1'),
    ).rejects.toThrow('لا يمكن تعيين حلاق لمنتج بيع');
  });

  it('6. should correctly compute percentage discount (100 - 10% = 90)', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    const withItem = await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    const lineId = withItem.lines[0].local_id;

    const adjusted = await LocalSalesStore.applyLineAdjustment(
      lineId,
      'PERCENTAGE_DISCOUNT',
      10,
      'خصم ولاء',
      'cashier_1',
    );

    expect(adjusted.lines[0].line_final_total).toBe(90.0);
    expect(adjusted.subtotal).toBe(100.0);
    expect(adjusted.total_discount).toBe(10.0);
    expect(adjusted.total_surcharge).toBe(0.0);
    expect(adjusted.total).toBe(90.0);
  });

  it('7. should correctly compute fixed discount (100 - 20 = 80)', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    const withItem = await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    const lineId = withItem.lines[0].local_id;

    const adjusted = await LocalSalesStore.applyLineAdjustment(
      lineId,
      'FIXED_DISCOUNT',
      20,
      'خصم ترويجي',
      'cashier_1',
    );

    expect(adjusted.lines[0].line_final_total).toBe(80.0);
    expect(adjusted.subtotal).toBe(100.0);
    expect(adjusted.total_discount).toBe(20.0);
    expect(adjusted.total).toBe(80.0);
  });

  it('8. should correctly compute percentage surcharge (100 + 10% = 110)', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    const withItem = await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    const lineId = withItem.lines[0].local_id;

    const adjusted = await LocalSalesStore.applyLineAdjustment(
      lineId,
      'PERCENTAGE_SURCHARGE',
      10,
      'خدمة خاصة',
      'cashier_1',
    );

    expect(adjusted.lines[0].line_final_total).toBe(110.0);
    expect(adjusted.subtotal).toBe(100.0);
    expect(adjusted.total_surcharge).toBe(10.0);
    expect(adjusted.total).toBe(110.0);
  });

  it('9. should correctly compute fixed surcharge (100 + 15 = 115)', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    const withItem = await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    const lineId = withItem.lines[0].local_id;

    const adjusted = await LocalSalesStore.applyLineAdjustment(
      lineId,
      'FIXED_SURCHARGE',
      15,
      'خدمة ليلية',
      'cashier_1',
    );

    expect(adjusted.lines[0].line_final_total).toBe(115.0);
    expect(adjusted.subtotal).toBe(100.0);
    expect(adjusted.total_surcharge).toBe(15.0);
    expect(adjusted.total).toBe(115.0);
  });

  it('10. should correctly apply manual price override (100 -> 85)', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    const withItem = await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    const lineId = withItem.lines[0].local_id;

    const adjusted = await LocalSalesStore.applyLineAdjustment(
      lineId,
      'MANUAL_PRICE_OVERRIDE',
      85,
      'اتفاق مباشر',
      'cashier_1',
    );

    expect(adjusted.lines[0].line_final_total).toBe(85.0);
    expect(adjusted.subtotal).toBe(100.0);
    expect(adjusted.total_discount).toBe(15.0);
    expect(adjusted.total).toBe(85.0);
  });

  it('11. should validate and reject invalid adjustment inputs', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    const withItem = await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    const lineId = withItem.lines[0].local_id;

    // Negative price override
    await expect(
      LocalSalesStore.applyLineAdjustment(lineId, 'MANUAL_PRICE_OVERRIDE', -10, '', 'cashier_1'),
    ).rejects.toThrow('لا يمكن تحديد سعر سالب');

    // Percentage discount > 100%
    await expect(
      LocalSalesStore.applyLineAdjustment(lineId, 'PERCENTAGE_DISCOUNT', 110, '', 'cashier_1'),
    ).rejects.toThrow('نسبة الخصم يجب أن تكون بين 0% و 100%');

    // Negative percentage discount
    await expect(
      LocalSalesStore.applyLineAdjustment(lineId, 'PERCENTAGE_DISCOUNT', -5, '', 'cashier_1'),
    ).rejects.toThrow('نسبة الخصم يجب أن تكون بين 0% و 100%');

    // Fixed discount > line subtotal
    await expect(
      LocalSalesStore.applyLineAdjustment(lineId, 'FIXED_DISCOUNT', 150, '', 'cashier_1'),
    ).rejects.toThrow('قيمة الخصم لا يمكن أن تتجاوز إجمالي السعر');
  });

  it('12. should support suspend, resume, and cancel workflow without deleting records', async () => {
    const inv1 = await LocalSalesStore.createDraftInvoice('cashier_1');
    const inv2 = await LocalSalesStore.createDraftInvoice('cashier_1');

    // Suspend inv1
    await LocalSalesStore.suspendInvoice(inv1.local_id, 'cashier_1');
    const openAfterSuspend = await LocalSalesStore.getOpenInvoices();
    const suspended = openAfterSuspend.find((i) => i.local_id === inv1.local_id);
    expect(suspended?.status).toBe('SUSPENDED');

    // Resume inv1
    const resumed = await LocalSalesStore.resumeInvoice(inv1.local_id, 'cashier_1');
    expect(resumed.status).toBe('DRAFT');

    // Cancel inv2
    await LocalSalesStore.cancelInvoice(inv2.local_id, 'إلغاء بطلب من العميل', 'cashier_1');
    const openAfterCancel = await LocalSalesStore.getOpenInvoices();
    expect(openAfterCancel.find((i) => i.local_id === inv2.local_id)).toBeUndefined();

    // Verify cancelled invoice still exists in database
    const cancelledRecord = await LocalSalesStore.getInvoiceById(inv2.local_id);
    expect(cancelledRecord.status).toBe('CANCELLED');
  });

  it('13. should save internal notes on invoice', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    const updated = await LocalSalesStore.updateInvoiceNote(
      inv.local_id,
      'ملاحظة خاصة: العميل يفضل ماكينة حلاقة معينة',
      'cashier_1',
    );
    expect(updated.internal_note).toBe('ملاحظة خاصة: العميل يفضل ماكينة حلاقة معينة');
  });

  // ==========================================
  // PHASE 6 ACCOUNTING & WORKFLOW TESTS
  // ==========================================

  it('14. should open shift with valid opening cash and block negative opening cash', async () => {
    // Negative opening cash -> rejected
    await expect(
      LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', -50),
    ).rejects.toThrow(/لا يمكن أن يكون سالباً/);

    // Valid opening cash (200.0) -> success
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 200.0);

    expect(shift.status).toBe('OPEN');
    expect(shift.opening_cash_amount).toBe(200.0);
    expect(shift.expected_cash_amount).toBe(200.0);

    const activeShift = await LocalSalesStore.getActiveShift('cashier_1');
    expect(activeShift?.local_id).toBe(shift.local_id);

    // Opening second shift while one is open -> rejected
    await expect(
      LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 100),
    ).rejects.toThrow('توجد وردية مفتوحة بالفعل');
  });

  it('15. should process full cash payment with cash received and change calculation', async () => {
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 100.0);

    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1'); // 100 EGP

    const paidInvoice = await LocalSalesStore.processInvoicePayment(
      inv.local_id,
      shift.local_id,
      [
        {
          payment_method: 'CASH',
          amount: 100.0,
          cash_received_amount: 200.0,
          change_amount: 100.0,
        },
      ],
      'cashier_1',
    );

    expect(paidInvoice.status).toBe('PAID');
    expect(paidInvoice.shift_local_id).toBe(shift.local_id);
    expect(paidInvoice.paid_at).toBeDefined();
    expect(paidInvoice.payments).toHaveLength(1);
    expect(paidInvoice.payments[0].payment_method).toBe('CASH');
    expect(paidInvoice.payments[0].amount).toBe(100.0);
    expect(paidInvoice.payments[0].cash_received_amount).toBe(200.0);
    expect(paidInvoice.payments[0].change_amount).toBe(100.0);

    // Verify it is no longer in open invoices tabs
    const openInvoices = await LocalSalesStore.getOpenInvoices();
    expect(openInvoices.find((i) => i.local_id === inv.local_id)).toBeUndefined();

    // Verify expected cash: opening (100) + cash sales (100) = 200
    const summary = await LocalSalesStore.getShiftSummary(shift.local_id);
    expect(summary.cash_sales).toBe(100.0);
    expect(summary.expected_cash).toBe(200.0);
  });

  it('16. should process split / mixed payment (CASH + INSTAPAY)', async () => {
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 50.0);

    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1'); // 100 EGP
    await LocalSalesStore.addItemToInvoice(inv.local_id, mockProductItem, 'cashier_1'); // 50 EGP (Total 150 EGP)

    const paidInvoice = await LocalSalesStore.processInvoicePayment(
      inv.local_id,
      shift.local_id,
      [
        {
          payment_method: 'CASH',
          amount: 50.0,
          cash_received_amount: 50.0,
          change_amount: 0.0,
        },
        {
          payment_method: 'INSTAPAY',
          amount: 100.0,
          reference_note: 'Tx #109284',
        },
      ],
      'cashier_1',
    );

    expect(paidInvoice.status).toBe('PAID');
    expect(paidInvoice.payments).toHaveLength(2);

    const summary = await LocalSalesStore.getShiftSummary(shift.local_id);
    expect(summary.cash_sales).toBe(50.0);
    expect(summary.non_cash_sales).toBe(100.0);
    expect(summary.total_sales).toBe(150.0);
    // Expected cash in drawer is ONLY opening (50) + cash sales (50) = 100.0 (Instapay does NOT enter cash drawer)
    expect(summary.expected_cash).toBe(100.0);
  });

  it('17. should reject payment when sum of methods does not equal invoice total', async () => {
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 100.0);

    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1'); // 100 EGP

    // Underpayment (80 vs 100)
    await expect(
      LocalSalesStore.processInvoicePayment(
        inv.local_id,
        shift.local_id,
        [{ payment_method: 'CASH', amount: 80.0 }],
        'cashier_1',
      ),
    ).rejects.toThrow(/مجموع المدفوعات/);

    // Overpayment (120 vs 100)
    await expect(
      LocalSalesStore.processInvoicePayment(
        inv.local_id,
        shift.local_id,
        [{ payment_method: 'INSTAPAY', amount: 120.0 }],
        'cashier_1',
      ),
    ).rejects.toThrow(/مجموع المدفوعات/);
  });

  it('18. should strictly enforce PAID invoice immutability', async () => {
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 100.0);

    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    const paidInv = await LocalSalesStore.processInvoicePayment(
      inv.local_id,
      shift.local_id,
      [{ payment_method: 'CASH', amount: 100.0 }],
      'cashier_1',
    );

    const lineId = paidInv.lines[0].local_id;

    // Cannot add item
    await expect(
      LocalSalesStore.addItemToInvoice(paidInv.local_id, mockProductItem, 'cashier_1'),
    ).rejects.toThrow(/لا يمكن/);

    // Cannot remove line
    await expect(
      LocalSalesStore.removeInvoiceLine(lineId, 'cashier_1'),
    ).rejects.toThrow(/لا يمكن/);

    // Cannot update quantity
    await expect(
      LocalSalesStore.updateLineQuantity(lineId, 2, 'cashier_1'),
    ).rejects.toThrow(/لا يمكن/);

    // Cannot adjust price
    await expect(
      LocalSalesStore.applyLineAdjustment(lineId, 'PERCENTAGE_DISCOUNT', 10, '', 'cashier_1'),
    ).rejects.toThrow(/لا يمكن/);

    // Cannot assign barber
    await expect(
      LocalSalesStore.assignBarberToLine(lineId, mockBarber, 'cashier_1'),
    ).rejects.toThrow(/لا يمكن/);

    // Cannot edit note
    await expect(
      LocalSalesStore.updateInvoiceNote(paidInv.local_id, 'ملاحظة بعد الدفع', 'cashier_1'),
    ).rejects.toThrow(/لا يمكن/);
  });

  it('19. should record cashier expenses and reduce expected cash correctly', async () => {
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 300.0);

    // Record expense
    const expense = await LocalSalesStore.recordExpense(
      shift.local_id,
      40.0,
      'مستلزمات ضيافة',
      'شاي وسكر للمحل',
      'cashier_1',
    );

    expect(expense.amount).toBe(40.0);
    expect(expense.category).toBe('مستلزمات ضيافة');

    const expensesList = await LocalSalesStore.getActiveShiftExpenses(shift.local_id);
    expect(expensesList).toHaveLength(1);

    // Expected cash: opening (300) - expense (40) = 260
    const summary = await LocalSalesStore.getShiftSummary(shift.local_id);
    expect(summary.cash_expenses).toBe(40.0);
    expect(summary.expected_cash).toBe(260.0);
  });

  it('20. should correctly calculate expected cash with formula: opening + cash_sales - expenses', async () => {
    // 1. Opening Cash = 500
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 500.0);

    // 2. Invoice 1: 100 EGP (Paid CASH)
    const inv1 = await LocalSalesStore.createDraftInvoice('cashier_1');
    await LocalSalesStore.addItemToInvoice(inv1.local_id, mockServiceItem, 'cashier_1');
    await LocalSalesStore.processInvoicePayment(
      inv1.local_id,
      shift.local_id,
      [{ payment_method: 'CASH', amount: 100.0, cash_received_amount: 200, change_amount: 100 }],
      'cashier_1',
    );

    // 3. Invoice 2: 100 EGP (Paid INSTAPAY)
    const inv2 = await LocalSalesStore.createDraftInvoice('cashier_1');
    await LocalSalesStore.addItemToInvoice(inv2.local_id, mockServiceItem, 'cashier_1');
    await LocalSalesStore.processInvoicePayment(
      inv2.local_id,
      shift.local_id,
      [{ payment_method: 'INSTAPAY', amount: 100.0 }],
      'cashier_1',
    );

    // 4. Expense: 50 EGP
    await LocalSalesStore.recordExpense(
      shift.local_id,
      50.0,
      'منظفات',
      undefined,
      'cashier_1',
    );

    // Formula Check:
    // opening (500) + cash_sales (100) - expenses (50) = 550 EGP expected cash
    const summary = await LocalSalesStore.getShiftSummary(shift.local_id);
    expect(summary.opening_cash).toBe(500.0);
    expect(summary.cash_sales).toBe(100.0);
    expect(summary.non_cash_sales).toBe(100.0);
    expect(summary.cash_expenses).toBe(50.0);
    expect(summary.expected_cash).toBe(550.0);
  });

  it('21. should block shift close when open draft or suspended invoices exist', async () => {
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 100.0);

    // Create an unclosed draft invoice
    await LocalSalesStore.createDraftInvoice('cashier_1');

    await expect(
      LocalSalesStore.closeShift(shift.local_id, 100.0, undefined, 'cashier_1'),
    ).rejects.toThrow(/لا يمكن إغلاق الوردية قبل تسوية كافة الفواتير/);
  });

  it('22. should close shift, compute discrepancy, enforce discrepancy note, and isolate closed shift data', async () => {
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 100.0);

    // Expected cash is 100. Actual cash entered is 80 (Deficit of -20).
    // Without note -> error
    await expect(
      LocalSalesStore.closeShift(shift.local_id, 80.0, undefined, 'cashier_1'),
    ).rejects.toThrow('يجب إدخال سبب فرق الخزنة (عجز/زيادة) لإتمام إغلاق الوردية');

    // With note -> success
    const closedShift = await LocalSalesStore.closeShift(
      shift.local_id,
      80.0,
      'عجز 20 جنيه بسبب فكة غير متوفرة',
      'cashier_1',
    );

    expect(closedShift.status).toBe('CLOSED_PENDING_SYNC');
    expect(closedShift.actual_cash_amount).toBe(80.0);
    expect(closedShift.cash_difference_amount).toBe(-20.0);
    expect(closedShift.closed_at).toBeDefined();

    // After closing: No active shift for cashier
    const activeAfterClose = await LocalSalesStore.getActiveShift('cashier_1');
    expect(activeAfterClose).toBeNull();
  });

  it('23. should log receipt print events with status and failure reasons', async () => {
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 100.0);

    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');
    await LocalSalesStore.addItemToInvoice(inv.local_id, mockServiceItem, 'cashier_1');
    await LocalSalesStore.processInvoicePayment(
      inv.local_id,
      shift.local_id,
      [{ payment_method: 'CASH', amount: 100.0 }],
      'cashier_1',
    );

    // Record success print
    await expect(
      LocalSalesStore.recordReceiptPrint(inv.local_id, 'SUCCESS', undefined, 'cashier_1'),
    ).resolves.not.toThrow();

    // Record failed print
    await expect(
      LocalSalesStore.recordReceiptPrint(inv.local_id, 'FAILED', 'Paper out', 'cashier_1'),
    ).resolves.not.toThrow();
  });

  // --- Phase 9: Promotions & Packages Tests ---
  it('24. should add promotion to invoice with exact proportional price distribution', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');

    const item1: LocalCatalogItem = {
      id: 'item_1',
      group_id: 'grp_1',
      name: 'قص شعر ملكي',
      type: 'SERVICE',
      base_price: 100.0,
      sort_order: 1,
    };
    const item2: LocalCatalogItem = {
      id: 'item_2',
      group_id: 'grp_1',
      name: 'حلاقة ذقن VIP',
      type: 'SERVICE',
      base_price: 50.0,
      sort_order: 2,
    };
    const item3: LocalCatalogItem = {
      id: 'item_3',
      group_id: 'grp_1',
      name: 'سيروم شعر',
      type: 'PRODUCT',
      base_price: 50.0,
      sort_order: 3,
    };

    // Promotion with total regular price = 100 + 50 + 50 = 200 EGP. Package fixed price = 130 EGP.
    const promo: LocalPromotion = {
      id: 'promo_vip',
      name: 'باقة الـ VIP',
      fixed_price: 130.0,
      status: 'ACTIVE',
      sort_order: 1,
      items: [
        { id: 'pi_1', promotion_id: 'promo_vip', catalog_item_id: 'item_1', catalog_item_name_snapshot: 'قص شعر ملكي', catalog_item_type: 'SERVICE', quantity: 1, sort_order: 0 },
        { id: 'pi_2', promotion_id: 'promo_vip', catalog_item_id: 'item_2', catalog_item_name_snapshot: 'حلاقة ذقن VIP', catalog_item_type: 'SERVICE', quantity: 1, sort_order: 1 },
        { id: 'pi_3', promotion_id: 'promo_vip', catalog_item_id: 'item_3', catalog_item_name_snapshot: 'سيروم شعر', catalog_item_type: 'PRODUCT', quantity: 1, sort_order: 2 },
      ],
    };

    const updatedInv = await LocalSalesStore.addPromotionToInvoice(
      inv.local_id,
      promo,
      [item1, item2, item3],
      'cashier_1',
    );

    expect(updatedInv.lines.length).toBe(3);
    // Line 1: 100/200 * 130 = 65.0
    expect(updatedInv.lines[0].line_final_total).toBe(65.0);
    // Line 2: 50/200 * 130 = 32.5
    expect(updatedInv.lines[1].line_final_total).toBe(32.5);
    // Line 3: 130 - (65 + 32.5) = 32.5
    expect(updatedInv.lines[2].line_final_total).toBe(32.5);

    // Sum of distributed prices must equal fixed price exactly
    const lineSum = updatedInv.lines.reduce((s, l) => s + l.line_final_total, 0);
    expect(lineSum).toBe(130.0);
    expect(updatedInv.total).toBe(130.0);
    expect(updatedInv.subtotal).toBe(200.0);
    expect(updatedInv.total_discount).toBe(70.0);
  });

  it('25. should reject adding promotion without items or when expired', async () => {
    const inv = await LocalSalesStore.createDraftInvoice('cashier_1');

    const emptyPromo: LocalPromotion = {
      id: 'p_empty',
      name: 'عرض فارغ',
      fixed_price: 100,
      status: 'ACTIVE',
      sort_order: 1,
      items: [],
    };

    await expect(
      LocalSalesStore.addPromotionToInvoice(inv.local_id, emptyPromo, [], 'cashier_1'),
    ).rejects.toThrow('العرض لا يحتوي على أي عناصر');

    const expiredPromo: LocalPromotion = {
      id: 'p_exp',
      name: 'عرض منتهي',
      fixed_price: 100,
      status: 'ACTIVE',
      sort_order: 1,
      ends_at: '2020-01-01T00:00:00.000Z',
      items: [{ id: 'pi_e1', promotion_id: 'p_exp', catalog_item_id: 'item_1', catalog_item_name_snapshot: 'خدمة', catalog_item_type: 'SERVICE', quantity: 1, sort_order: 0 }],
    };

    await expect(
      LocalSalesStore.addPromotionToInvoice(inv.local_id, expiredPromo, [], 'cashier_1'),
    ).rejects.toThrow('هذا العرض منتهي الصلاحية');
  });

  // --- Phase 9: Bookings Tests ---
  it('26. should create local booking for guest or registered customer', async () => {
    const booking = await LocalSalesStore.createLocalBooking(
      {
        guest_name: 'أحمد سعيد',
        guest_phone: '01012345678',
        scheduled_at: new Date(Date.now() + 3600000).toISOString(),
        internal_note: 'حجز قص شعر واستشوار',
      },
      'cashier_1',
    );

    expect(booking.local_id).toBeDefined();
    expect(booking.guest_name).toBe('أحمد سعيد');
    expect(booking.status).toBe('CONFIRMED');

    const bookings = await LocalSalesStore.getUpcomingLocalBookings();
    expect(bookings.some((b) => b.local_id === booking.local_id)).toBe(true);
  });

  it('27. should convert booking to invoice draft and block converting twice', async () => {
    const shift = await LocalSalesStore.openShift('cashier_1', 'كاشير الفرع', 100.0);

    const booking = await LocalSalesStore.createLocalBooking(
      {
        guest_name: 'محمود عبد الله',
        guest_phone: '01123456789',
        scheduled_at: new Date(Date.now() + 3600000).toISOString(),
        items: [
          { catalog_item_id: mockServiceItem.id, item_name_snapshot: mockServiceItem.name, item_type: 'SERVICE', quantity: 1 },
        ],
      },
      'cashier_1',
    );

    const invoice = await LocalSalesStore.convertBookingToInvoice(
      booking.local_id,
      shift.local_id,
      [mockServiceItem],
      [],
      'cashier_1',
    );

    expect(invoice.local_id).toBeDefined();
    expect(invoice.status).toBe('DRAFT');
    expect(invoice.lines.length).toBe(1);
    expect(invoice.lines[0].item_name_snapshot).toBe(mockServiceItem.name);

    // Verify booking updated status
    const allBookings = await LocalSalesStore.getStoredBookings();
    const updatedB = allBookings.find((b) => b.local_id === booking.local_id);
    expect(updatedB?.status).toBe('CONVERTED_TO_INVOICE');
    expect(updatedB?.converted_invoice_id).toBe(invoice.local_id);

    // Converting again should fail
    await expect(
      LocalSalesStore.convertBookingToInvoice(
        booking.local_id,
        shift.local_id,
        [mockServiceItem],
        [],
        'cashier_1',
      ),
    ).rejects.toThrow('تم تحويل هذا الحجز إلى فاتورة مسبقًا');
  });

  it('28. should allow overlapping bookings for same preferred barber without blocking', async () => {
    const sameTime = new Date(Date.now() + 7200000).toISOString();

    const b1 = await LocalSalesStore.createLocalBooking(
      {
        guest_name: 'عميل 1',
        scheduled_at: sameTime,
        preferred_employee_id: 'emp_barber_1',
      },
      'cashier_1',
    );

    const b2 = await LocalSalesStore.createLocalBooking(
      {
        guest_name: 'عميل 2',
        scheduled_at: sameTime,
        preferred_employee_id: 'emp_barber_1',
      },
      'cashier_1',
    );

    expect(b1.local_id).toBeDefined();
    expect(b2.local_id).toBeDefined();
    expect(b1.preferred_employee_id).toBe('emp_barber_1');
    expect(b2.preferred_employee_id).toBe('emp_barber_1');
  });
});
