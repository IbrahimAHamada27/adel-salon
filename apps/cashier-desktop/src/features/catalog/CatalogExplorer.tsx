import React, { useState, useEffect, useMemo } from 'react';
import { LocalCategory, LocalGroup, LocalCatalogItem } from '../../types/catalog';
import { LocalPromotion } from '../../types/promotion';
import { Sparkles, Scissors, Folder, AlertCircle, Gift, ShoppingBag, Search, X, ChevronLeft } from 'lucide-react';

interface CatalogExplorerProps {
  categories: LocalCategory[];
  groups: LocalGroup[];
  items: LocalCatalogItem[];
  promotions?: LocalPromotion[];
  onItemClick: (item: LocalCatalogItem) => void;
  onPromotionClick?: (promotion: LocalPromotion) => void;
}

export const CatalogExplorer: React.FC<CatalogExplorerProps> = ({
  categories,
  groups,
  items,
  promotions = [],
  onItemClick,
  onPromotionClick,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Automatically select first category if available
  useEffect(() => {
    if (categories.length > 0) {
      if (!selectedCategoryId || (selectedCategoryId !== '__PROMOTIONS__' && !categories.find((c) => c.id === selectedCategoryId))) {
        setSelectedCategoryId(categories[0].id);
      }
    } else if (promotions.length > 0) {
      setSelectedCategoryId('__PROMOTIONS__');
    } else {
      setSelectedCategoryId(null);
    }
  }, [categories, promotions, selectedCategoryId]);

  // Filter groups for selected category
  const activeGroups = useMemo(() => {
    return selectedCategoryId && selectedCategoryId !== '__PROMOTIONS__'
      ? groups.filter((g) => g.category_id === selectedCategoryId)
      : [];
  }, [groups, selectedCategoryId]);

  // Automatically select first group if available
  useEffect(() => {
    if (activeGroups.length > 0) {
      if (!selectedGroupId || !activeGroups.find((g) => g.id === selectedGroupId)) {
        setSelectedGroupId(activeGroups[0].id);
      }
    } else {
      setSelectedGroupId(null);
    }
  }, [activeGroups, selectedGroupId]);

  // Filter items for selected group or global search
  const activeItems = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return items.filter((i) => i.name.toLowerCase().includes(q));
    }
    return selectedGroupId ? items.filter((i) => i.group_id === selectedGroupId) : [];
  }, [items, selectedGroupId, searchQuery]);

  // Filter promotions
  const activePromotions = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return promotions.filter((p) => p.name.toLowerCase().includes(q));
    }
    return promotions;
  }, [promotions, searchQuery]);

  // Global Empty State
  if (categories.length === 0 && promotions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none bg-slate-950">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-white mb-1">لا توجد خدمات أو عروض متاحة حالياً</h2>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          يرجى إضافة الأقسام والخدمات من لوحة الإدارة ثم تحديث الكتالوج من قائمة المزيد.
        </p>
      </div>
    );
  }

  const isSearching = !!searchQuery.trim();
  const isPromotionsSelected = !isSearching && selectedCategoryId === '__PROMOTIONS__';
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="h-full flex flex-col overflow-hidden select-none bg-slate-950">
      {/* 1. Top Section: Search, Category Tabs & Group Chips */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-2.5 flex flex-col gap-2 shrink-0">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن خدمة أو منتج أو عرض..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-9 pl-9 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Tabs (Row 1) */}
        {!isSearching && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {/* Promotions Tab */}
            {promotions.length > 0 && (
              <button
                onClick={() => setSelectedCategoryId('__PROMOTIONS__')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
                  isPromotionsSelected
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'bg-purple-950/40 border border-purple-800/40 text-purple-300 hover:bg-purple-900/40 hover:text-white'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>العروض</span>
                <span className="text-[10px] bg-purple-900/80 px-1.5 py-0.2 rounded-full font-mono">
                  {promotions.length}
                </span>
              </button>
            )}

            {categories.map((cat) => {
              const isSelected = !isPromotionsSelected && cat.id === selectedCategoryId;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Groups Chips (Row 2 - Compact chips directly beneath categories) */}
        {!isSearching && !isPromotionsSelected && selectedCategory && activeGroups.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5 border-t border-slate-800/60">
            {activeGroups.map((grp) => {
              const isSelected = grp.id === selectedGroupId;
              return (
                <button
                  key={grp.id}
                  onClick={() => setSelectedGroupId(grp.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {grp.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Breadcrumb Navigation Trail */}
      {!isSearching && !isPromotionsSelected && selectedCategory && (
        <div className="px-4 py-1.5 bg-slate-950 border-b border-slate-800/60 flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
          <span className="font-semibold text-slate-300">{selectedCategory.name}</span>
          {selectedGroup && (
            <>
              <ChevronLeft className="w-3 h-3 text-slate-500" />
              <span className="text-amber-400 font-bold">{selectedGroup.name}</span>
            </>
          )}
          <span className="text-slate-400 font-mono mr-auto">({activeItems.length} عنصر)</span>
        </div>
      )}

      {/* 3. Items Display Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin">
        {/* Search Results Mode */}
        {isSearching ? (
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>نتائج البحث عن "{searchQuery}": ({activeItems.length + activePromotions.length} نتيجة)</span>
            </div>

            {activeItems.length === 0 && activePromotions.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                <h4 className="text-xs font-bold text-slate-300">لم يتم العثور على أي نتائج</h4>
                <p className="text-[11px] text-slate-500 mt-1">تأكد من كتابة الكلمة بشكل صحيح أو امسح البحث.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Promotions in Search */}
                {activePromotions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-purple-400 mb-2 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5" />
                      <span>العروض والباقات المطابقة</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {activePromotions.map((promo) => renderPromotionCard(promo, onPromotionClick))}
                    </div>
                  </div>
                )}

                {/* Items in Search */}
                {activeItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-amber-400" />
                      <span>الخدمات والمنتجات المطابقة</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {activeItems.map((item) => renderItemCard(item, onItemClick))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isPromotionsSelected ? (
          /* Promotions Tab Active */
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {promotions.map((promo) => renderPromotionCard(promo, onPromotionClick))}
            </div>
          </div>
        ) : activeGroups.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6">
            <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
            <h3 className="text-xs font-bold text-slate-300">لا توجد مجموعات داخل هذا القسم</h3>
            <p className="text-[11px] text-slate-500 mt-1">يرجى إضافة مجموعات من لوحة الإدارة.</p>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6">
            <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
            <h3 className="text-xs font-bold text-slate-300">لا توجد خدمات أو منتجات داخل هذه المجموعة</h3>
            <p className="text-[11px] text-slate-500 mt-1">يرجى إضافة خدمات أو منتجات من لوحة الإدارة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {activeItems.map((item) => renderItemCard(item, onItemClick))}
          </div>
        )}
      </div>
    </div>
  );
};

// Clean, Centered, Fully Clickable Item Card
function renderItemCard(item: LocalCatalogItem, onItemClick: (item: LocalCatalogItem) => void) {
  const isService = item.type === 'SERVICE';
  return (
    <button
      key={item.id}
      onClick={() => onItemClick(item)}
      className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-3 text-center transition-all hover:shadow-lg active:scale-98 flex flex-col justify-between min-h-[110px] cursor-pointer"
    >
      {/* Top Type Tag */}
      <div className="flex items-center justify-between w-full">
        <span
          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
            isService
              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
              : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
          }`}
        >
          {isService ? 'خدمة' : 'منتج'}
        </span>
      </div>

      {/* Centered Item Name */}
      <div className="font-bold text-xs text-white group-hover:text-amber-300 line-clamp-2 transition-colors my-1 leading-snug px-1">
        {item.name}
      </div>

      {/* Bottom Centered Price */}
      <div className="w-full pt-1.5 border-t border-slate-800/80 flex items-center justify-center gap-1 font-mono">
        <span className="font-bold text-sm text-amber-400">{item.base_price.toFixed(2)}</span>
        <span className="text-[10px] text-slate-400 font-sans font-medium">ج.م</span>
      </div>
    </button>
  );
}

// Clean Promotion Card
function renderPromotionCard(promo: LocalPromotion, onPromotionClick?: (p: LocalPromotion) => void) {
  return (
    <button
      key={promo.id}
      onClick={() => onPromotionClick && onPromotionClick(promo)}
      className="group relative bg-slate-900 hover:bg-slate-850 border border-purple-500/30 hover:border-purple-400 rounded-2xl p-3.5 text-right transition-all hover:shadow-lg active:scale-98 flex flex-col justify-between min-h-[120px] cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
            <Gift className="w-2.5 h-2.5" />
            <span>باقة</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400 font-medium">
            {promo.items?.length || 0} بنود
          </span>
        </div>
        <div className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors leading-snug">
          {promo.name}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800 mt-2">
        <span className="text-[11px] text-slate-400 font-medium">السعر:</span>
        <span className="font-mono font-bold text-purple-400 text-sm">
          {promo.fixed_price.toFixed(2)} <span className="text-[10px] text-slate-400 font-sans font-normal">ج.م</span>
        </span>
      </div>
    </button>
  );
}
