/**
 * TimeRangePicker  —  lightweight standalone picker
 * Still used by ThreatHunt and other pages that don't need the full
 * GlobalTimeController. For the Dashboard use GlobalTimeController instead.
 */
import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

const TIME_OPTIONS = [
  { label: 'Last 15 min',   value: '15m'   },
  { label: 'Last 1 hour',   value: '1h'    },
  { label: 'Last 6 hours',  value: '6h'    },
  { label: 'Last 24 hours', value: '24h'   },
  { label: 'Last 7 days',   value: '7d'    },
  { label: 'Last 30 days',  value: '30d'   },
];

export default function TimeRangePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = TIME_OPTIONS.find(o => o.value === value) || TIME_OPTIONS[3];

  return (
    <div className="relative">
      <button
        id="time-range-picker-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-siem-panel border border-siem-border rounded-lg text-xs font-bold text-siem-text hover:bg-siem-bg transition-all shadow-sm"
      >
        <Clock className="w-3.5 h-3.5 text-siem-muted" />
        {selected.label}
        <ChevronDown className={`w-3.5 h-3.5 text-siem-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 bg-siem-panel border border-siem-border rounded-xl shadow-xl z-50 py-1.5">
            {TIME_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-siem-bg transition-colors
                  ${value === option.value ? 'text-blue-600 bg-blue-50/50 font-bold' : 'text-siem-muted'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
