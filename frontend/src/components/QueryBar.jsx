import React, { useState, useEffect, useRef } from 'react';
import { Search, Info, HelpCircle, ChevronRight, Terminal } from 'lucide-react';

const SUGGESTIONS = {
  keys: [
    { label: 'source:',      desc: 'Telemetry source' },
    { label: 'severity:',    desc: 'Alert severity' },
    { label: 'source_ip:',   desc: 'Originating IP' },
    { label: 'event_type:',  desc: 'Event category' },
    { label: 'rule_name:',   desc: 'Detection rule' },
    { label: 'mitre:',       desc: 'MITRE Technique (e.g. T1190)' },
    { label: 'tags:',        desc: 'Metadata tags' },
  ],
  values: {
    'severity:': ['critical', 'high', 'medium', 'low'],
    'source:':   ['suricata', 'hl7', 'modbus', 'sysmon'],
    'tags:':     ['ids', 'network', 'endpoint', 'healthcare'],
    'event_type:': ['alert', 'flow', 'http', 'dns', 'ssh'],
  }
};

export default function QueryBar({ onSearch, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionList, setSuggestionList] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearch(query);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    const cursorPos = e.target.selectionStart;
    const textBefore = value.substring(0, cursorPos);
    const lastWordMatch = textBefore.match(/([a-zA-Z0-9_:]+)$/);
    const lastWord = lastWordMatch ? lastWordMatch[1] : "";

    if (!lastWord) {
      setShowSuggestions(false);
      return;
    }

    let matches = [];
    if (lastWord.includes(':')) {
      const [key, partialVal] = lastWord.split(':');
      const keyWithColon = `${key}:`;
      if (SUGGESTIONS.values[keyWithColon]) {
        matches = SUGGESTIONS.values[keyWithColon]
          .filter(v => v.startsWith(partialVal.toLowerCase()))
          .map(v => ({ label: v, desc: `Value for ${key}`, isValue: true }));
      }
    } else {
      matches = SUGGESTIONS.keys.filter(k => k.label.startsWith(lastWord.toLowerCase()));
    }

    if (matches.length > 0) {
      setSuggestionList(matches);
      setSelectedIndex(0);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestionList.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestionList.length) % suggestionList.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applySuggestion(suggestionList[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (suggestion) => {
    const cursorPos = inputRef.current.selectionStart;
    const textBefore = query.substring(0, cursorPos);
    const textAfter = query.substring(cursorPos);
    const lastWordMatch = textBefore.match(/([a-zA-Z0-9_:]+)$/);
    const lastWord = lastWordMatch ? lastWordMatch[1] : "";
    const baseText = textBefore.substring(0, textBefore.length - lastWord.length);
    
    let newWord = suggestion.label;
    if (suggestion.isValue) {
      const [key] = lastWord.split(':');
      newWord = `${key}:${suggestion.label} `;
    } else {
      newWord = `${suggestion.label}`;
    }

    const newQuery = baseText + newWord + textAfter;
    setQuery(newQuery);
    setShowSuggestions(false);
    
    setTimeout(() => {
      inputRef.current.focus();
      const newPos = baseText.length + newWord.length;
      inputRef.current.setSelectionRange(newPos, newPos);
    }, 0);
  };

  return (
    <div className="relative enterprise-card p-4 mb-6">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-siem-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-white"
            placeholder="search source:suricata severity:critical..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />

          {showSuggestions && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-siem-panel border border-siem-border shadow-2xl z-50 overflow-hidden rounded-xl">
              <div className="p-2 border-b border-siem-border bg-slate-900 flex items-center justify-between">
                <span className="text-[10px] font-black text-siem-muted uppercase tracking-widest px-2">ASQL Autocomplete</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {suggestionList.map((item, idx) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => applySuggestion(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors
                      ${idx === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-siem-border/50 text-siem-text'}`}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className={`w-3 h-3 ${idx === selectedIndex ? 'text-blue-200' : 'text-siem-border'}`} />
                      <span className="font-mono text-xs font-bold">{item.label}</span>
                    </div>
                    <span className={`text-[10px] font-medium ${idx === selectedIndex ? 'text-blue-100' : 'text-siem-muted'}`}>
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          type="submit"
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
        >
          HUNT
        </button>
      </form>
      <div className="mt-3 flex items-center gap-6 text-[10px] text-siem-muted font-bold uppercase tracking-widest">
        <div className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-blue-500" /> Use <b className="text-white">AND</b> for intersection</div>
        <div className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Example: <code className="bg-slate-900 px-1 rounded lowercase">severity:high source:suricata</code></div>
      </div>
    </div>
  );
}
