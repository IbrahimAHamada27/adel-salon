import React, { useState, useEffect } from 'react';
import { LocalCustomer, CreateCustomerPayload } from '../../types/customer';
import { NativeBridge } from '../../services/nativeBridge';
import { X, Search, UserPlus, UserCheck, AlertCircle, Phone, Calendar, UserX } from 'lucide-react';

interface CustomerSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomerId?: string | null;
  onSelectCustomer: (customer: LocalCustomer | null) => void;
  cashierId: string;
}

export const CustomerSelectorDrawer: React.FC<CustomerSelectorDrawerProps> = ({
  isOpen,
  onClose,
  selectedCustomerId,
  onSelectCustomer,
  cashierId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New Customer Form State
  const [formData, setFormData] = useState<CreateCustomerPayload>({
    full_name: '',
    phone_number: '',
    birth_date: '',
    internal_note: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleSearch(searchQuery);
    }
  }, [isOpen, searchQuery]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const results = await NativeBridge.searchCustomers(query);
      setCustomers(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePhoneChange = async (phone: string) => {
    setFormData((prev) => ({ ...prev, phone_number: phone }));
    if (phone.trim().length >= 8) {
      const matches = await NativeBridge.searchCustomers(phone.trim());
      const existing = matches.find((c) => c.phone_number === phone.trim());
      if (existing) {
        setDuplicateWarning(`تنبيه: يوجد عميل مسجل بالفعل بهذا الرقم (${existing.full_name})`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.full_name.trim()) {
      setFormError('اسم العميل إلزامي');
      return;
    }

    try {
      const newCust = await NativeBridge.createCustomer(
        formData.full_name,
        formData.phone_number || undefined,
        formData.birth_date || undefined,
        formData.internal_note || undefined,
        cashierId,
      );
      onSelectCustomer(newCust);
      setIsCreating(false);
      setFormData({ full_name: '', phone_number: '', birth_date: '', internal_note: '' });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'فشل حفظ بيانات العميل');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="bg-slate-900 border-r border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <h2 className="text-base font-black text-white">
              {isCreating ? 'إضافة عميل جديد' : 'اختيار العميل للفاتورة'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action switch button */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2">
          {!isCreating ? (
            <>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ عميل جديد</span>
              </button>

              <button
                onClick={() => {
                  onSelectCustomer(null);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <UserX className="w-4 h-4 text-slate-400" />
                <span>عميل نقدي بدون بيانات</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setIsCreating(false);
                setFormError(null);
                setDuplicateWarning(null);
              }}
              className="text-xs text-amber-400 font-bold hover:underline cursor-pointer"
            >
              ← العودة للبحث عن عميل مسجل
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {!isCreating ? (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pr-10 pl-4 py-2.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
                />
              </div>

              {/* Customer List */}
              <div className="space-y-2 mt-3">
                {customers.map((customer) => {
                  const isSelected = customer.local_id === selectedCustomerId;
                  return (
                    <div
                      key={customer.local_id}
                      onClick={() => {
                        onSelectCustomer(customer);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/60 shadow-md'
                          : 'bg-slate-950/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-black text-sm text-white flex items-center gap-2">
                          <span>{customer.full_name}</span>
                          {isSelected && (
                            <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-md">
                              مختار
                            </span>
                          )}
                        </div>
                        {customer.phone_number && (
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-amber-400/80" />
                            <span>{customer.phone_number}</span>
                          </div>
                        )}
                      </div>
                      <button className="text-xs font-black text-amber-400 hover:text-amber-300">
                        {isSelected ? 'تأكيد' : 'اختيار'}
                      </button>
                    </div>
                  );
                })}

                {!isSearching && customers.length === 0 && (
                  <div className="text-center py-10 px-4">
                    <UserX className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-bold text-slate-300">لا يوجد عملاء مطابقين</p>
                    <p className="text-xs text-slate-500 mt-1">
                      يمكنك إضافة عميل جديد أو الاستمرار بدون ربط عميل
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Create Customer Form */
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {duplicateWarning && (
                <div className="p-3 bg-amber-950/40 border border-amber-800 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-300 mb-1.5">
                  اسم العميل <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد الله"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 mb-1.5">
                  رقم الهاتف (اختياري)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="010XXXXXXXX"
                    value={formData.phone_number}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-9 pl-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 mb-1.5">
                  تاريخ الميلاد (اختياري)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-9 pl-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 mb-1.5">
                  ملاحظة داخلية (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات وتفضيلات العميل الخاصة..."
                  value={formData.internal_note}
                  onChange={(e) => setFormData({ ...formData, internal_note: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow transition-all active:scale-95 cursor-pointer"
                >
                  حفظ واختيار العميل
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
