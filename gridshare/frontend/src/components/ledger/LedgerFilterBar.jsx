import React from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Calendar,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const TYPE_FILTERS = [
  { id: 'ALL', label: 'ALL' },
  { id: 'P2P', label: 'P2P' },
  { id: 'GRID_IMPORT', label: 'GRID IMPORT' },
  { id: 'GRID_EXPORT', label: 'GRID EXPORT' },
  { id: 'BATTERY', label: 'BATTERY' },
  { id: 'SYSTEM', label: 'SYSTEM' },
];

export const STATUS_FILTERS = [
  { id: 'ALL', label: 'ALL' },
  { id: 'SETTLED', label: 'SETTLED' },
  { id: 'CONFIRMED', label: 'CONFIRMED' },
  { id: 'TRANSFERRING', label: 'TRANSFERRING' },
  { id: 'PENDING', label: 'PENDING' },
  { id: 'FAILED', label: 'FAILED' },
];

export const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'highest_energy', label: 'Highest Energy (kWh)' },
  { id: 'lowest_energy', label: 'Lowest Energy (kWh)' },
  { id: 'highest_value', label: 'Highest Value (₹)' },
  { id: 'lowest_value', label: 'Lowest Value (₹)' },
];

export const DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'all', label: 'All Time' },
];

export default function LedgerFilterBar({
  searchQuery,
  onSearchChange,
  activeType,
  onTypeChange,
  activeStatus,
  onStatusChange,
  sortBy,
  onSortChange,
  dateRange,
  onDateRangeChange,
  onExportCSV,
  onResetFilters,
  totalMatching = 0,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card space-y-3">
      {/* Row 1: Search & Date Range & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search transaction ID, seller, buyer, or node..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-emerald-600 font-medium"
          />
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
          <Calendar className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
          {DATE_RANGES.map((dr) => (
            <button
              key={dr.id}
              onClick={() => onDateRangeChange(dr.id)}
              className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                dateRange === dr.id
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {dr.label}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center space-x-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-emerald-600"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Export CSV Button */}
        <button
          onClick={onExportCSV}
          className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition"
          title="Export transactions report as CSV"
        >
          <Download className="h-3.5 w-3.5 text-emerald-600" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Row 2: Type Filter & Status Filter Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pt-2 border-t border-slate-100 gap-3 text-xs">
        {/* Type Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Type:</span>
          {TYPE_FILTERS.map((tf) => (
            <button
              key={tf.id}
              onClick={() => onTypeChange(tf.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeType === tf.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Status:</span>
          {STATUS_FILTERS.map((sf) => (
            <button
              key={sf.id}
              onClick={() => onStatusChange(sf.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeStatus === sf.id
                  ? sf.id === 'SETTLED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sf.label}
            </button>
          ))}

          {/* Reset Filters button */}
          {(activeType !== 'ALL' || activeStatus !== 'ALL' || searchQuery || dateRange !== 'all') && (
            <button
              onClick={onResetFilters}
              className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-rose-600 font-semibold ml-2 underline"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
