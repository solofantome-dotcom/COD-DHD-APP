import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Filter,
  Search,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DatePresetKey, DateRange } from '../utils/datePresets';
import { ALGERIA_WILAYAS, STATUS_CONFIG } from '../constants/wilayas';

interface FilterBarProps {
  dateRange: DateRange;
  onSelectDatePreset: (preset: DatePresetKey) => void;
  onCustomDateChange: (start: string, end: string) => void;
  selectedWilaya: string; // 'all' or wilaya id e.g. '16'
  onSelectWilaya: (wilayaId: string) => void;
  selectedStatus: string; // 'all' or status enum
  onSelectStatus: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalFilteredOrders: number;
  totalOrders: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  dateRange,
  onSelectDatePreset,
  onCustomDateChange,
  selectedWilaya,
  onSelectWilaya,
  selectedStatus,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  totalFilteredOrders,
  totalOrders,
}) => {
  const [showCustomDates, setShowCustomDates] = useState(dateRange.preset === 'CUSTOM');
  const [customStart, setCustomStart] = useState(dateRange.startDate);
  const [customEnd, setCustomEnd] = useState(dateRange.endDate);

  const presets: { id: DatePresetKey; label: string }[] = [
    { id: 'TODAY', label: "Aujourd'hui" },
    { id: 'YESTERDAY', label: 'Hier' },
    { id: 'LAST_WEEK', label: 'Semaine Passée' },
    { id: 'THIS_MONTH', label: 'Ce Mois' },
    { id: 'CUSTOM', label: 'Personnalisé' },
  ];

  const handlePresetClick = (p: DatePresetKey) => {
    if (p === 'CUSTOM') {
      setShowCustomDates(true);
      onSelectDatePreset('CUSTOM');
    } else {
      setShowCustomDates(false);
      onSelectDatePreset(p);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      onCustomDateChange(customStart, customEnd);
    }
  };

  const hasActiveFilters =
    dateRange.preset !== 'THIS_MONTH' ||
    selectedWilaya !== 'all' ||
    selectedStatus !== 'all' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    onSelectDatePreset('THIS_MONTH');
    setShowCustomDates(false);
    onSelectWilaya('all');
    onSelectStatus('all');
    onSearchChange('');
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-4">
      {/* Top row: Date Presets & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Date presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5" /> Période:
          </span>
          {presets.map((preset) => {
            const isActive = dateRange.preset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/60'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Rechercher code suivi, client, tél, article..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker (shown when CUSTOM is selected) */}
      {showCustomDates && (
        <form
          onSubmit={handleApplyCustom}
          className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs"
        >
          <span className="text-zinc-500 font-medium">Dates personnalisées :</span>
          <div className="flex items-center gap-1.5">
            <label className="text-zinc-400">Du</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-800 dark:text-zinc-200 text-xs focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-zinc-400">Au</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-800 dark:text-zinc-200 text-xs focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-medium transition-colors"
          >
            Filtrer
          </button>
        </form>
      )}

      {/* Second row: Wilaya Filter, Status Filter & Active Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Wilaya Filter Dropdown */}
          <div className="relative flex items-center">
            <MapPin className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
            <select
              value={selectedWilaya}
              onChange={(e) => onSelectWilaya(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">Toutes les Wilayas (58)</option>
              {ALGERIA_WILAYAS.map((w) => (
                <option key={w.id} value={String(w.id)}>
                  {w.code} - {w.name} ({w.name_ar})
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 pointer-events-none text-zinc-400 text-[10px]">▼</div>
          </div>

          {/* Delivery Status Filter */}
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
            <select
              value={selectedStatus}
              onChange={(e) => onSelectStatus(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">Tous les Statuts</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 pointer-events-none text-zinc-400 text-[10px]">▼</div>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Counter of active orders matching filters */}
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          Affichage de <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalFilteredOrders}</span> sur{' '}
          <span>{totalOrders}</span> colis
        </div>
      </div>
    </div>
  );
};
