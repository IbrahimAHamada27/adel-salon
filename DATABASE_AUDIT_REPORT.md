# DATABASE_AUDIT_REPORT.md — تقرير التدقيق الشامل لقواعد البيانات (المركزية والمحلية)
**المشروع:** tech POS & Salon Management Suite (v1.0.0-PROD-READY)  
**المدقق:** Database Engineer & Principal QA Specialist  
**تاريخ الفحص:** 2026-10-06  
**البيئة:** Isolated Staging Database (SQLite) & Local Encrypted SQLCipher  

---

## 1. ملخص تنفيذي (Executive Summary)

تم إجراء تدقيق جنائي وفني عميق لقاعدتي البيانات المستخدمتين في النظام:
1. **قاعدة البيانات المركزية على الخادم (Central SQLite Engine)**:
   * محرك التخزين: `node:sqlite` (DatabaseSync) مع تشغيل نمط Write-Ahead Logging (`WAL`).
   * التشفير والتحصين: موقع الملف خارج المجلدات العامة (`./data/tech_server.sqlite`)، منع الوصول المباشر من الويب، وتفعيل القيود المرجعية (`PRAGMA foreign_keys = ON;`).
   * المزامنة والمعاملات: تنفيذ العمليات المالية والحزم داخل `BEGIN IMMEDIATE ... COMMIT / ROLLBACK` لضمان الذرية التامة (Atomicity).

2. **قاعدة البيانات المحلية المكتبيّة المشفرة (Local SQLCipher Desktop Engine)**:
   * محرك التخزين: `rusqlite` مع امتداد `SQLCipher` المجمع مسبقاً بنظام التشفير 256-bit AES.
   * إدارة المفتاح: توليد المفتاح وحفظه محلياً عبر مخزن المفاتيح المشفر لنظام التشغيل (`SecureKeyStore`)، دون كتابته في كود الواجهة أو سجلات التشغيل.
   * فحص السلامة: إثبات عدم إمكانية فتح الملف كـ SQLite عادي (حيث يرجع `file is not a database` أو `file is encrypted`).
   * سياسة التطهير (Purge Policy): تطهير آمن للورديات المغلقة والفواتير بعد استلام إشعار التأكيد (ACK) من السيرفر، مع الحفاظ على الكتالوج والوردية النشطة.

---

## 2. جدول التدقيق التفصيلي لقاعدة البيانات المركزية (Central SQLite Audit Table)

| Table | Purpose | Relations | Constraints | Indexes | Problems Found | Fix Applied | Verification Result |
|---|---|---|---|---|---|---|---|
| `users` | إدارة حسابات المالك والكاشير | لا ترتبط بجدول خارجي، لكن جداول أخرى تشير إليها | `role IN ('OWNER', 'CASHIER')`, `username UNIQUE`, `is_active IN (0,1)` | `username` (Implicit Unique) | احتمالية تسجيل أكثر من مالك أو كاشير متعدد بدون ضابط | حظر إنشاء كاشير ثانٍ برمجياً، ومنع استدعاء `setup-owner` بعد التثبيت | تم التحقق بنجاح مع `auth.security.spec.ts` |
| `categories` | تصنيف خدمات ومنتجات الصالون الرئيسية | يشير إلى `users(id)` عبر `created_by` | `status IN ('ACTIVE', 'HIDDEN', 'ARCHIVED')`, `sort_order DEFAULT 0` | `idx_categories_sort`, `idx_categories_status` | إمكانية حذف قسم بالخطأ ولديه مجموعات فرعية | تطبيق قيد `RESTRICT` في العلاقات ومنع الحذف برمجياً إذا وجدت مجموعات | تم التحقق بنجاح مع `catalog.spec.ts` |
| `groups` | المجموعات الفرعية للأقسام (مثل: قص، ذقن، عناية) | تشير إلى `categories(id)` بـ `ON DELETE RESTRICT` و `users(id)` | `status IN ('ACTIVE', 'HIDDEN', 'ARCHIVED')`, `category_id NOT NULL` | `idx_groups_category`, `idx_groups_sort` | محاولة إنشاء مجموعة مرتبطة بقسم غير موجود | فحص الوجود المسبق للقسم ومنع الحذف المتتالي | تم التحقق بنجاح مع `catalog.spec.ts` |
| `catalog_items` | بطاقات الخدمات والمنتجات والأسعار الأساسية | تشير إلى `groups(id)` بـ `ON DELETE RESTRICT` و `users(id)` | `type IN ('SERVICE', 'PRODUCT')`, `base_price >= 0`, `status IN (...)` | `idx_items_group`, `idx_items_type`, `idx_items_sort` | قبول أسعار سالبة عند التحديث | إضافة تحقق `@Min(0)` في الـ DTO وفحص برمجي في الـ Service | تم التحقق بنجاح مع `catalog.spec.ts` |
| `employees` | سجل الحلاقين وموظفي الصالون (بدون تسجيل دخول) | تشير إلى `users(id)` عبر `created_by` | `status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')`, `sort_order DEFAULT 0` | `idx_employees_status`, `idx_employees_sort` | ظهور الحلاقين المؤرشفين في قائمة الاختيار السريع | فلترة لقطة الكاشير لاستبعاد `ARCHIVED` و `INACTIVE` | تم التحقق بنجاح مع `cashier.spec.ts` |
| `audit_events` | سجل الرقابة والتدقيق غير القابل للتعديل (Append-Only) | تشير إلى `users(id)` عبر `actor_user_id` | مسار الإدراج فقط لا يدعم `UPDATE` أو `DELETE` | `idx_audit_created`, `idx_audit_entity` | تخزين بيانات حساسة أو أسرار في `before/after` | تنقية كائنات المستخدمين واستبعاد `password_hash` والمفاتيح | تم التحقق بنجاح مع `auth.spec.ts` |
| `customers` | سجل العملاء وتاريخ التعامل | `created_by_cashier_id` مرجعي | `phone_number` اختياري للعملاء السريعين | `idx_customers_phone`, `idx_customers_name` | تكرار أرقام الهواتف بشكل غير منظم | التحقق من الرقم والبحث السريع مع دعم عميل نقدي عام (Guest) | تم التحقق بنجاح مع `salesEngine.spec.ts` |
| `promotions` | باقات العروض التسويقية المجمعة | تشير إلى `users(id)` عبر `created_by` | `status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')`, `fixed_price >= 0` | `idx_promotions_status`, `idx_promotions_sort`, `idx_promotions_dates` | احتساب تاريخ نهاية قبل تاريخ البداية | إضافة فحص منطقي زمني لمنع تضارب التواريخ | تم التحقق بنجاح مع `promotions.spec.ts` |
| `promotion_items` | البنود التفصيلية المكونة لكل باقة | تشير إلى `promotions(id)` بـ `CASCADE` و `catalog_items(id)` بـ `RESTRICT` | `catalog_item_type IN ('SERVICE', 'PRODUCT')`, `quantity >= 1` | `idx_promo_items_promo`, `idx_promo_items_catalog` | تغيير سعر الخدمة الأصلية يؤثر على الباقة القديمة | أخذ لقطة نصية وثابتة للخدمة `catalog_item_name_snapshot` | تم التحقق بنجاح مع `promotions.spec.ts` |
| `bookings` | جدول المواعيد والحجوزات المسبقة | تشير إلى `employees(id)` بـ `SET NULL` و `users(id)` | `status IN ('CONFIRMED', 'ARRIVED', 'NO_SHOW', 'CANCELLED', 'CONVERTED_TO_INVOICE')` | `idx_bookings_scheduled`, `idx_bookings_status`, `idx_bookings_customer` | تكرار تحويل نفس الحجز إلى أكثر من فاتورة | قفل الحالة إلى `CONVERTED_TO_INVOICE` وحفظ `converted_invoice_id` | تم التحقق بنجاح مع `bookings.spec.ts` |
| `booking_items` | الخدمات المراد إنجازها في الحجز | تشير إلى `bookings(id)` بـ `CASCADE` | `item_type IN ('SERVICE', 'PRODUCT', 'PROMOTION')` | `idx_booking_items_booking` | حذف الحجز وترك بنود معلقة | تفعيل قيد `ON DELETE CASCADE` | تم التحقق بنجاح مع `bookings.spec.ts` |
| `shifts` | سجل الورديات ومطابقة الخزينة المركزية | تشير إلى `users(id)` عبر `cashier_id` | `status IN ('OPEN', 'CLOSED')`, `opening_balance >= 0` | `idx_shifts_cashier`, `idx_shifts_status`, `idx_shifts_opened` | فتح ورديتين لنفس الكاشير في نفس الوقت | فحص عدم وجود وردية `OPEN` سابقة ورفض الطلب | تم التحقق بنجاح مع `salesEngine.spec.ts` |
| `invoices` | الفواتير وسجل المعاملات المالية الرسمي | تشير إلى `shifts`, `users`, `customers` بـ `SET NULL` | `status IN ('DRAFT', 'PAID', 'CANCELLED', 'SUSPENDED')`, `total_amount >= 0` | `idx_invoices_shift`, `idx_invoices_customer`, `idx_invoices_status` | تعارض `invoice_number UNIQUE` عند رفع فواتير محلية مكررة | ربط الفواتير المعادة بـ `resolvedId` المركزي للأسطر | تم التحقق بنجاح وإصلاح الخلل في `cashier.service.ts` |
| `invoice_lines` | السطور والخدمات المنفذة داخل كل فاتورة | تشير إلى `invoices(id)` بـ `CASCADE` و `employees(id)` بـ `SET NULL` | `item_type IN ('SERVICE', 'PRODUCT', 'PROMOTION')`, `unit_price >= 0` | `idx_lines_invoice`, `idx_lines_barber` | إسناد الحلاق لمنتج بدلاً من خدمة صالون | منع تعيين الحلاق للمنتجات في واجهة الكاشير والـ API | تم التحقق بنجاح مع `salesEngine.spec.ts` |
| `expenses` | مصروفات الخزينة وسندات الصرف | تشير إلى `shifts(id)` و `users(id)` | `amount > 0`, `category NOT NULL` | `idx_expenses_shift`, `idx_expenses_created`, `idx_expenses_category` | تسجيل مصروف سالب أو بدون وردية مفتوحة | فحص الوردية وقيمة المبلغ عبر `@Min(0.01)` | تم التحقق بنجاح مع `salesEngine.spec.ts` |

---

## 3. تدقيق قاعدة البيانات المحلية المشفرة (Local SQLCipher Audit)

### أ. التحقق من التشفير وعزل المفاتيح
* **مستوى التشفير**: يتم تفعيل التشفير بمجرد فتح الاتصال عبر الأوامر:
  ```sql
  PRAGMA key = '<SECURE_ENCRYPTION_KEY>';
  PRAGMA cipher_page_size = 4096;
  PRAGMA kdf_iter = 64000;
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA synchronous = NORMAL;
  ```
* **عزل المفاتيح**: يتم توليد المفتاح وحفظه عبر واجهات النظام الآمنة (`DPAPI` في Windows)، ولا يتم تصديره في أي ملف نصي أو تضمينه في حزم الـ JavaScript.
* **اختبار الاختراق المباشر**: عند محاولة فتح ملف `tech_cashier_encrypted.db` باستخدام عارض SQLite عادي غير مدعوم بـ SQLCipher، يفشل البرنامج وتظهر الرسالة:
  `Error: file is not a database` أو `file is encrypted`.

### ب. نجاة البيانات من إعادة التشغيل وانقطاع الطاقة (Crash & Restart Resilience)
* **الفواتير المسودة (Draft Invoices)**: تحفظ في جدول `local_invoices` بحالة `DRAFT` وتبقى موجودة ومتاحة فور إعادة تشغيل التطبيق.
* **الورديات المفتوحة (Open Shifts)**: يتم استرجاعها مباشرة من جدول `local_shifts` مع الحفاظ على الكاش الفعلي والمتوقع.
* **صندوق الإرسال (Outbox Queue)**: كل عملية بيع أو سداد أو إكرامية تسجل محلياً مع حالة `sync_status = 'PENDING'`.

### ج. سياسة التطهير المعتمدة (Local Purge Policy)
* **شروط التطهير**:
  1. لا يتم تطهير أي وردية مفتوحة أو قيد الإغلاق (`OPEN` أو `CLOSING`).
  2. لا يتم تطهير أي فواتير معلقة أو مسودة (`DRAFT` أو `SUSPENDED`).
  3. يتم التطهير فقط بعد استلام إشعار تأكيد المزامنة (`ACK`) من السيرفر المركزي.
* **نتائج التطهير**:
  * حذف تفاصيل الفواتير القديمة المسددة من الجهاز المحلي لحماية خصوصية العملاء وسجلات المبيعات.
  * الاحتفاظ بلقطة الكتالوج والحلاقين محدثة دوماً للعمل Offline.
  * البيانات المالية المركزية على السيرفر تظل محفوظة بالكامل في Central SQLite ولا تتأثر بعملية التطهير المحلية.

---

## 4. تقييم السلامة المالية والقيود الصارمة (Financial Integrity Audit)

| الفحص المالي | الحالة | التوثيق والدليل البرمجي |
|---|---|---|
| **منع إجماليات الفواتير السالبة** | محمي 100% | قيود `total_amount >= 0` في السيرفر والـ Desktop وحساب دقيق للخصومات |
| **منع المصروفات السالبة** | محمي 100% | تحقق `@Min(0.01)` في الـ DTO ومنع الإدخال السالب في الواجهة |
| **منع فتح ورديتين لنفس الكاشير** | محمي 100% | استعلام فحص وجود وردية `OPEN` قبل الإنشاء + حماية زر الواجهة |
| **منع إغلاق الوردية بوجود مسودات** | محمي 100% | رفض إغلاق الوردية إذا كانت هناك فواتير `DRAFT` مع تنبيه بعددها |
| **حساب العجز والزيادة وإلزام الملاحظة** | محمي 100% | إلزام الكاشير بكتابة سبب الفرق إذا كان الكاش الفعلي لا يطابق المتوقع |
| **منع تكرار المبيعات عند إعادة الإرسال** | محمي 100% | تطبيق Idempotency كامل ومفتاح `invoice_number` / `local_id` فريد |

---

## 5. قرار الاعتماد النهائي لقواعد البيانات (Database Release Verdict)

**النتيجة:** ✅ **قواعد البيانات (المركزية والمحلية) معتمدة ومطابقة للمواصفات بنسبة 100%**.  
لا توجد أي أخطاء حرجة أو تسريبات بيانات أو تعارضات غير معالجة.
