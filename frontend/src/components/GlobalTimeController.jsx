import React, { useState, useRef, useEffect } from 'react';
import { Clock, RefreshCw, ChevronDown, Calendar } from 'lucide-react';

const TIME_OPTIONS = [
  { label: 'Last 15 min',   value: '15m' },
  { label: 'Last 1 hour',   value: '1h'  },
  { label: 'Last 6 hours',  value: '6h'  },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days',   value: '7d'  },
  { label: 'Last 30 days',  value: '30d' },
  { label: 'Custom Range',  value: 'custom' },
];

const REFRESH_OPTIONS = [
  { label: 'Off',  value: 0     },
  { label: '5s',   value: 5000  },
  { label: '15s',  value: 15000 },
  { label: '30s',  value: 30000 },
  { label: '1 min',value: 60000 },
];

/**
 * GlobalTimeController
 * Props:
 *   timeRange       : string  — current value e.g. "24h"
 *   onTimeChange    : fn      — called with new value
 *   refreshInterval : number  — ms (0 = off)
 *   onRefreshChange : fn      — called with ms
 *   onRefresh       : fn      — called when manual refresh button clicked
 *   customStart     : string  — ISO datetime string
 *   customEnd       : string  — ISO datetime string
 *   onCustomChange  : fn(start, end) — called when custom range is applied
 */
export default function GlobalTimeController({
  timeRange = '24h',
  onTimeChange,
  refreshInterval = 0,
  onRefreshChange,
  onRefresh,
  customStart,
  customEnd,
  onCustomChange,
}) {
  const [timeOpen, setTimeOpen]       = useState(false);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [showCustom, setShowCustom]   = useState(false);
  const [localStart, setLocalStart]   = useState(customStart || '');
  const [localEnd, setLocalEnd]       = useState(customEnd   || '');
  const [spinning, setSpinning]       = useState(false);

  const selectedTime    = TIME_OPTIONS.find(o => o.value === timeRange) || TIME_OPTIONS[3];
  const selectedRefresh = REFRESH_OPTIONS.find(o => o.value === refreshInterval) || REFRESH_OPTIONS[0];

  const handleTimeSelect = (option) => {
    setTimeOpen(false);
    if (option.value === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onTimeChange?.(option.value);
    }
  };

  const handleRefreshSelect = (option) => {
    setRefreshOpen(false);
    onRefreshChange?.(option.value);
  };

  const handleManualRefresh = () => {
    setSpinning(true);
    onRefresh?.();
    setTimeout(() => setSpinning(false), 800);
  };

  const handleCustomApply = () => {
    if (!localStart || !localEnd) return;
    // Normalise to UTC ISO
    const start = localStart.includes('Z') ? localStart : `${localStart}:00Z`;
    const end   = localEnd.includes('Z')   ? localEnd   : `${localEnd}:00Z`;
    onCustomChange?.(start, end);
    onTimeChange?.('custom');
    setShowCustom(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* ── Time Range Picker ── */}
      <div className="relative">
        <button
          id="global-time-range-btn"
          onClick={() => { setTimeOpen(v => !v); setRefreshOpen(false); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-siem-panel border border-siem-border rounded-lg text-xs font-bold text-siem-text hover:bg-siem-bg transition-all shadow-sm"
        >
          <Clock className="w-3.5 h-3.5 text-siem-muted" />
          {timeRange === 'custom' ? 'Custom Range' : selectedTime.label}
          <ChevronDown className={`w-3.5 h-3.5 text-siem-muted transition-transform ${timeOpen ? 'rotate-180' : ''}`} />
        </button>

        {timeOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setTimeOpen(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-siem-panel border border-siem-border rounded-xl shadow-xl z-50 py-1.5">
              {TIME_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleTimeSelect(option)}
                  className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-siem-bg transition-colors
                    ${timeRange === option.value ? 'text-blue-600 bg-blue-50/50 font-bold' : 'text-siem-muted'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Auto Refresh Picker ── */}
      <div className="relative">
        <button
          id="global-auto-refresh-btn"
          onClick={() => { setRefreshOpen(v => !v); setTimeOpen(false); }}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all shadow-sm
            ${refreshInterval > 0
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-siem-panel border-siem-border text-siem-text hover:bg-siem-bg'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${refreshInterval > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          {selectedRefresh.label === 'Off' ? 'Auto Refresh' : `Auto: ${selectedRefresh.label}`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${refreshOpen ? 'rotate-180' : ''}`} />
        </button>

        {refreshOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setRefreshOpen(false)} />
            <div className="absolute right-0 mt-2 w-40 bg-siem-panel border border-siem-border rounded-xl shadow-xl z-50 py-1.5">
              {REFRESH_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleRefreshSelect(option)}
                  className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-siem-bg transition-colors
                    ${refreshInterval === option.value ? 'text-blue-600 bg-blue-50/50 font-bold' : 'text-siem-muted'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Manual Refresh ── */}
      <button
        id="global-manual-refresh-btn"
        onClick={handleManualRefresh}
        title="Refresh now"
        className="p-1.5 bg-siem-panel border border-siem-border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm group"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-siem-muted group-hover:text-blue-600 transition-all ${spinning ? 'animate-spin' : ''}`} />
      </button>

      {/* ── Custom Range Panel ── */}
      {showCustom && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowCustom(false)} />
          <div className="absolute right-0 top-12 mt-1 w-72 bg-siem-panel border border-siem-border rounded-xl shadow-2xl z-50 p-4 space-y-3"
               style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Custom Time Range</h4>
            </div>
            <div>
              <label className="text-[10px] font-bold text-siem-muted uppercase tracking-widest block mb-1">Start (UTC)</label>
              <input
                type="datetime-local"
                value={localStart}
                onChange={e => setLocalStart(e.target.value)}
                className="w-full px-3 py-2 border border-siem-border rounded-lg text-xs font-medium text-siem-text focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-siem-muted uppercase tracking-widest block mb-1">End (UTC)</label>
              <input
                type="datetime-local"
                value={localEnd}
                onChange={e => setLocalEnd(e.target.value)}
                className="w-full px-3 py-2 border border-siem-border rounded-lg text-xs font-medium text-siem-text focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCustomApply}
                disabled={!localStart || !localEnd}
                className="flex-1 py-2 bg-blue-600 text-white text-xs font-black rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors uppercase tracking-widest"
              >
                Apply Range
              </button>
              <button
                onClick={() => setShowCustom(false)}
                className="px-4 py-2 border border-siem-border text-siem-muted text-xs font-bold rounded-lg hover:bg-siem-bg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
