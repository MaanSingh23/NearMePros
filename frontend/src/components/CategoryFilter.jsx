import React, { useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  BoltIcon,
  FaceSmileIcon,
  HomeModernIcon,
  PaintBrushIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SunIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const categories = [
  { id: 'all', name: 'All Services', icon: AdjustmentsHorizontalIcon, color: 'text-stone-600 dark:text-stone-300', bg: 'bg-stone-100 dark:bg-stone-800' },
  { id: 'Salon for Women', name: 'Salon for Women', icon: SparklesIcon, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  { id: 'Salon for Men', name: 'Salon for Men', icon: FaceSmileIcon, color: 'text-stone-600', bg: 'bg-stone-100 dark:bg-stone-800/60' },
  { id: 'Haircut & Styling', name: 'Haircut & Styling', icon: ScissorsIcon, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'Facial & Skincare', name: 'Facial & Skincare', icon: SunIcon, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'Spa & Massage', name: 'Spa & Massage', icon: SparklesIcon, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
  { id: 'Dance Classes', name: 'Dance Classes', icon: SparklesIcon, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20' },
  { id: 'Beauty Services', name: 'Beauty Services', icon: SparklesIcon, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  { id: 'Tailoring & Boutique', name: 'Tailoring & Boutique', icon: ScissorsIcon, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20' },
  { id: 'Cleaning Services', name: 'Cleaning', icon: ShieldCheckIcon, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
  { id: 'Plumbing', name: 'Plumbing', icon: WrenchScrewdriverIcon, color: 'text-stone-600', bg: 'bg-stone-100 dark:bg-stone-800/60' },
  { id: 'Electrical', name: 'Electrical', icon: BoltIcon, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'Carpentry', name: 'Carpentry', icon: HomeModernIcon, color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'AC & Appliance Repair', name: 'AC & Appliance', icon: WrenchScrewdriverIcon, color: 'text-stone-600', bg: 'bg-stone-100 dark:bg-stone-800/60' },
  { id: 'Painting', name: 'Painting', icon: PaintBrushIcon, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  { id: 'Pest Control', name: 'Pest Control', icon: ShieldCheckIcon, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
  { id: 'Moving', name: 'Moving', icon: TruckIcon, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'Other', name: 'Other', icon: AdjustmentsHorizontalIcon, color: 'text-stone-500', bg: 'bg-stone-100 dark:bg-stone-800/60' }
];

function CategoryFilter({ selected, onChange }) {
  const [search, setSearch] = useState('');

  const filtered = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-black uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
          Category
        </label>
        {selected !== 'all' && (
          <button
            onClick={() => onChange('all')}
            className="text-xs font-bold text-primary-600 hover:text-primary-500 dark:text-primary-400 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Search within categories */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-xs font-bold text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:border-primary-500/50"
        />
      </div>

      {/* Category list - scrollable */}
      <div className="max-h-[420px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
        {filtered.map((category) => {
          const Icon = category.icon;
          const isSelected = selected === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                isSelected
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25 dark:bg-primary-500 dark:shadow-primary-500/20'
                  : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800/60'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : `${category.bg} ${category.color}`
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">
                {category.name}
              </span>
              {isSelected && (
                <CheckIcon className="h-4 w-4 shrink-0 text-white/80" />
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-xs font-bold text-stone-400 dark:text-stone-500">
            No categories match "{search}"
          </p>
        )}
      </div>
    </div>
  );
}

export default CategoryFilter;
