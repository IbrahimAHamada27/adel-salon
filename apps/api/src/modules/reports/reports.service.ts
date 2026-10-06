import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(private readonly dbService: DatabaseService) {}

  getFinancialReport(filters: { startDate?: string; endDate?: string }) {
    const db = this.dbService.getDb();
    let whereInv = `WHERE status = 'PAID'`;
    let whereExp = `WHERE 1=1`;
    const paramsInv: any[] = [];
    const paramsExp: any[] = [];

    if (filters.startDate) {
      whereInv += ` AND date(created_at) >= date(?)`;
      whereExp += ` AND date(created_at) >= date(?)`;
      paramsInv.push(filters.startDate);
      paramsExp.push(filters.startDate);
    }

    if (filters.endDate) {
      whereInv += ` AND date(created_at) <= date(?)`;
      whereExp += ` AND date(created_at) <= date(?)`;
      paramsInv.push(filters.endDate);
      paramsExp.push(filters.endDate);
    }

    const salesStats = db.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash_revenue,
        COALESCE(SUM(CASE WHEN payment_method = 'CARD' OR payment_method = 'INSTAPAY' OR payment_method = 'WALLET' THEN total_amount ELSE 0 END), 0) as card_revenue
      FROM invoices
      ${whereInv}
    `).get(...paramsInv) as any;

    const expensesStats = db.prepare(`
      SELECT 
        COUNT(*) as total_expenses_count,
        COALESCE(SUM(amount), 0) as total_expenses_amount
      FROM expenses
      ${whereExp}
    `).get(...paramsExp) as any;

    const totalRevenue = salesStats?.total_revenue || 0;
    const totalExpenses = expensesStats?.total_expenses_amount || 0;
    const netIncome = totalRevenue - totalExpenses;

    return {
      revenue: totalRevenue,
      subtotal: salesStats?.total_subtotal || 0,
      discounts: salesStats?.total_discounts || 0,
      cashRevenue: salesStats?.cash_revenue || 0,
      cardRevenue: salesStats?.card_revenue || 0,
      invoicesCount: salesStats?.total_invoices || 0,
      expenses: totalExpenses,
      expensesCount: expensesStats?.total_expenses_count || 0,
      netIncome,
    };
  }

  getBarbersReport(filters: { startDate?: string; endDate?: string }) {
    const db = this.dbService.getDb();
    let whereClause = `WHERE i.status = 'PAID'`;
    const params: any[] = [];

    if (filters.startDate) {
      whereClause += ` AND date(i.created_at) >= date(?)`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ` AND date(i.created_at) <= date(?)`;
      params.push(filters.endDate);
    }

    const query = `
      SELECT 
        e.id as barber_id,
        e.name as barber_name,
        e.role_title,
        e.status as employee_status,
        COUNT(l.id) as services_performed,
        COALESCE(SUM(l.total_price), 0) as total_service_revenue
      FROM employees e
      LEFT JOIN invoice_lines l ON l.barber_employee_id = e.id
      LEFT JOIN invoices i ON l.invoice_id = i.id ${whereClause ? 'AND ' + whereClause.replace('WHERE ', '') : ''}
      GROUP BY e.id
      ORDER BY total_service_revenue DESC
    `;

    return db.prepare(query).all(...params);
  }

  getTopServices(filters: { startDate?: string; endDate?: string }) {
    const db = this.dbService.getDb();
    let whereClause = `WHERE i.status = 'PAID'`;
    const params: any[] = [];

    if (filters.startDate) {
      whereClause += ` AND date(i.created_at) >= date(?)`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ` AND date(i.created_at) <= date(?)`;
      params.push(filters.endDate);
    }

    const query = `
      SELECT 
        l.item_name_snapshot as item_name,
        l.item_type,
        COUNT(l.id) as times_sold,
        SUM(l.quantity) as total_quantity,
        COALESCE(SUM(l.total_price), 0) as total_revenue
      FROM invoice_lines l
      JOIN invoices i ON l.invoice_id = i.id
      ${whereClause}
      GROUP BY l.item_name_snapshot, l.item_type
      ORDER BY total_revenue DESC
      LIMIT 10
    `;

    return db.prepare(query).all(...params);
  }

  getPromotionsReport(filters: { startDate?: string; endDate?: string }) {
    const db = this.dbService.getDb();
    let whereClause = `WHERE i.status = 'PAID' AND l.parent_promotion_id IS NOT NULL`;
    const params: any[] = [];

    if (filters.startDate) {
      whereClause += ` AND date(i.created_at) >= date(?)`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ` AND date(i.created_at) <= date(?)`;
      params.push(filters.endDate);
    }

    const query = `
      SELECT 
        p.id as promotion_id,
        p.name as promotion_name,
        p.fixed_price,
        COUNT(DISTINCT i.id) as sales_count,
        COALESCE(SUM(l.total_price), 0) as total_revenue
      FROM promotions p
      JOIN invoice_lines l ON l.parent_promotion_id = p.id
      JOIN invoices i ON l.invoice_id = i.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY sales_count DESC
    `;

    return db.prepare(query).all(...params);
  }

  getBookingsReport(filters: { startDate?: string; endDate?: string }) {
    const db = this.dbService.getDb();
    let whereClause = `WHERE 1=1`;
    const params: any[] = [];

    if (filters.startDate) {
      whereClause += ` AND date(scheduled_at) >= date(?)`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ` AND date(scheduled_at) <= date(?)`;
      params.push(filters.endDate);
    }

    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN status = 'ARRIVED' THEN 1 ELSE 0 END) as arrived_count,
        SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show_count,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status = 'CONVERTED_TO_INVOICE' THEN 1 ELSE 0 END) as converted_count
      FROM bookings
      ${whereClause}
    `).get(...params) as any;

    const byBarber = db.prepare(`
      SELECT 
        e.id as barber_id,
        e.name as barber_name,
        COUNT(b.id) as bookings_count
      FROM employees e
      LEFT JOIN bookings b ON b.preferred_employee_id = e.id ${whereClause ? 'AND ' + whereClause.replace('WHERE ', '') : ''}
      GROUP BY e.id
      ORDER BY bookings_count DESC
    `).all(...params);

    return {
      summary: summary || {
        total_bookings: 0,
        confirmed_count: 0,
        arrived_count: 0,
        no_show_count: 0,
        cancelled_count: 0,
        converted_count: 0,
      },
      byBarber,
    };
  }

  async exportExcel(
    type: 'sales' | 'expenses' | 'shifts',
    filters?: { startDate?: string; endDate?: string },
  ): Promise<Buffer> {
    const db = this.dbService.getDb();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ADEL SALON POS';
    workbook.created = new Date();

    const titleMap: Record<string, string> = {
      sales: 'تقرير المبيعات والفواتير',
      expenses: 'تقرير المصروفات والنثريات',
      shifts: 'تقرير الورديات ومطابقة الخزينة',
    };

    const sheet = workbook.addWorksheet(titleMap[type] || 'تقرير');
    sheet.views = [{ rightToLeft: true }];

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }, // Emerald green
    };

    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    if (type === 'sales') {
      let where = `WHERE 1=1`;
      const params: any[] = [];
      if (filters?.startDate) {
        where += ` AND date(i.created_at) >= date(?)`;
        params.push(filters.startDate);
      }
      if (filters?.endDate) {
        where += ` AND date(i.created_at) <= date(?)`;
        params.push(filters.endDate);
      }

      const rows = db.prepare(`
        SELECT 
          i.invoice_number,
          i.created_at,
          i.status,
          i.payment_method,
          i.subtotal,
          i.discount_amount,
          i.total_amount,
          COALESCE(c.full_name, 'عميل نقدي') as customer_name,
          COALESCE(u.name, 'الكاشير') as cashier_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.cashier_id = u.id
        ${where}
        ORDER BY i.created_at DESC
      `).all(...params) as any[];

      sheet.columns = [
        { header: 'رقم الفاتورة', key: 'invoice_number', width: 18 },
        { header: 'تاريخ الفاتورة', key: 'created_at', width: 22 },
        { header: 'اسم العميل', key: 'customer_name', width: 22 },
        { header: 'الكاشير', key: 'cashier_name', width: 18 },
        { header: 'طريقة الدفع', key: 'payment_method', width: 16 },
        { header: 'المجموع قبل الخصم (ج.م)', key: 'subtotal', width: 22 },
        { header: 'الخصم (ج.م)', key: 'discount_amount', width: 16 },
        { header: 'الإجمالي النهائي (ج.م)', key: 'total_amount', width: 22 },
        { header: 'حالة الفاتورة', key: 'status', width: 15 },
      ];

      const methodNames: Record<string, string> = {
        CASH: 'كاش',
        CARD: 'فيزا / بطاقة',
        INSTAPAY: 'إنستاباي',
        WALLET: 'محفظة إلكترونية',
        SPLIT: 'دفع مجزأ / مزدوج',
      };

      const statusNames: Record<string, string> = {
        PAID: 'مدفوعة',
        CANCELLED: 'ملغاة',
        DRAFT: 'مسودة',
        SUSPENDED: 'معلقة',
      };

      rows.forEach((r) => {
        sheet.addRow({
          invoice_number: r.invoice_number,
          created_at: r.created_at ? new Date(r.created_at).toLocaleString('ar-EG') : '-',
          customer_name: r.customer_name,
          cashier_name: r.cashier_name,
          payment_method: methodNames[r.payment_method] || r.payment_method,
          subtotal: Number(r.subtotal) || 0,
          discount_amount: Number(r.discount_amount) || 0,
          total_amount: Number(r.total_amount) || 0,
          status: statusNames[r.status] || r.status,
        });
      });
    } else if (type === 'expenses') {
      let where = `WHERE 1=1`;
      const params: any[] = [];
      if (filters?.startDate) {
        where += ` AND date(e.created_at) >= date(?)`;
        params.push(filters.startDate);
      }
      if (filters?.endDate) {
        where += ` AND date(e.created_at) <= date(?)`;
        params.push(filters.endDate);
      }

      const rows = db.prepare(`
        SELECT 
          e.category,
          e.amount,
          e.description,
          e.created_at,
          COALESCE(u.name, 'الكاشير') as cashier_name
        FROM expenses e
        LEFT JOIN users u ON e.cashier_id = u.id
        ${where}
        ORDER BY e.created_at DESC
      `).all(...params) as any[];

      sheet.columns = [
        { header: 'التصنيف', key: 'category', width: 22 },
        { header: 'المبلغ (ج.م)', key: 'amount', width: 18 },
        { header: 'البيان / الوصف', key: 'description', width: 32 },
        { header: 'تاريخ الصرف', key: 'created_at', width: 22 },
        { header: 'المسؤول', key: 'cashier_name', width: 20 },
      ];

      rows.forEach((r) => {
        sheet.addRow({
          category: r.category,
          amount: Number(r.amount) || 0,
          description: r.description || '-',
          created_at: r.created_at ? new Date(r.created_at).toLocaleString('ar-EG') : '-',
          cashier_name: r.cashier_name,
        });
      });
    } else {
      let where = `WHERE 1=1`;
      const params: any[] = [];
      if (filters?.startDate) {
        where += ` AND date(s.opened_at) >= date(?)`;
        params.push(filters.startDate);
      }
      if (filters?.endDate) {
        where += ` AND date(s.opened_at) <= date(?)`;
        params.push(filters.endDate);
      }

      const rows = db.prepare(`
        SELECT 
          s.id,
          s.opened_at,
          s.closed_at,
          s.status,
          s.opening_balance,
          s.expected_cash,
          s.actual_cash,
          s.cash_difference,
          s.notes,
          COALESCE(u.name, 'الكاشير') as cashier_name
        FROM shifts s
        LEFT JOIN users u ON s.cashier_id = u.id
        ${where}
        ORDER BY s.opened_at DESC
      `).all(...params) as any[];

      sheet.columns = [
        { header: 'معرف الوردية', key: 'id', width: 24 },
        { header: 'الكاشير المسؤول', key: 'cashier_name', width: 20 },
        { header: 'تاريخ الفتح', key: 'opened_at', width: 22 },
        { header: 'تاريخ الإغلاق', key: 'closed_at', width: 22 },
        { header: 'الحالة', key: 'status', width: 14 },
        { header: 'عهدة البداية (ج.م)', key: 'opening_balance', width: 18 },
        { header: 'الكاش المتوقع (ج.م)', key: 'expected_cash', width: 18 },
        { header: 'الكاش الفعلي (ج.م)', key: 'actual_cash', width: 18 },
        { header: 'فارق الخزنة (ج.م)', key: 'cash_difference', width: 18 },
        { header: 'ملاحظات الإغلاق', key: 'notes', width: 30 },
      ];

      rows.forEach((r) => {
        sheet.addRow({
          id: r.id,
          cashier_name: r.cashier_name,
          opened_at: r.opened_at ? new Date(r.opened_at).toLocaleString('ar-EG') : '-',
          closed_at: r.closed_at ? new Date(r.closed_at).toLocaleString('ar-EG') : 'مفتوحة حالياً',
          status: r.status === 'OPEN' ? 'مفتوحة' : 'مغلقة',
          opening_balance: Number(r.opening_balance) || 0,
          expected_cash: Number(r.expected_cash) || 0,
          actual_cash: r.actual_cash !== null ? Number(r.actual_cash) : '-',
          cash_difference: Number(r.cash_difference) || 0,
          notes: r.notes || '-',
        });
      });
    }

    // Apply header and row styling
    sheet.getRow(1).height = 28;
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 22;
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = borderStyle;
          cell.font = { name: 'Segoe UI', size: 10 };
          if (rowNumber % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' },
            };
          }
        });
      }
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  exportCsv(type: 'sales' | 'expenses' | 'shifts') {
    // Keep backward compatible for tests if needed
    const db = this.dbService.getDb();
    if (type === 'sales') {
      const rows = db.prepare(`
        SELECT i.invoice_number, i.created_at, i.status, i.payment_method, i.subtotal, i.discount_amount, i.total_amount, c.full_name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        ORDER BY i.created_at DESC
      `).all() as any[];

      const header = 'رقم الفاتورة,التاريخ,الحالة,طريقة الدفع,المجموع قبل الخصم,الخصم,الإجمالي النهائي,اسم العميل\n';
      const body = rows.map((r) => `"${r.invoice_number}","${r.created_at}","${r.status}","${r.payment_method}",${r.subtotal},${r.discount_amount},${r.total_amount},"${r.customer_name || 'عميل نقدي'}"`).join('\n');
      return header + body;
    } else if (type === 'expenses') {
      const rows = db.prepare(`
        SELECT category, amount, description, created_at FROM expenses ORDER BY created_at DESC
      `).all() as any[];

      const header = 'التصنيف,المبلغ,الوصف,التاريخ\n';
      const body = rows.map((r) => `"${r.category}",${r.amount},"${r.description || ''}","${r.created_at}"`).join('\n');
      return header + body;
    } else {
      const rows = db.prepare(`
        SELECT id, opened_at, closed_at, status, opening_balance, expected_cash, actual_cash, cash_difference, notes
        FROM shifts ORDER BY opened_at DESC
      `).all() as any[];

      const header = 'معرف الوردية,تاريخ الفتح,تاريخ الإغلاق,الحالة,عهدة البداية,المتوقع,الفعلي,الفرق,الملاحظات\n';
      const body = rows.map((r) => `"${r.id}","${r.opened_at}","${r.closed_at || ''}","${r.status}",${r.opening_balance},${r.expected_cash},${r.actual_cash || 0},${r.cash_difference},"${r.notes || ''}"`).join('\n');
      return header + body;
    }
  }
}
