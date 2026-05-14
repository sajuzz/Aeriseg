import React from 'react';

export default function StatusBadge({ status, className = "" }) {
  const styles = {
    // Investigation Status
    OPEN: "bg-blue-50 text-blue-700 border-blue-200",
    INVESTIGATING: "bg-orange-50 text-orange-700 border-orange-200",
    CLOSED: "bg-slate-50 text-slate-600 border-slate-200",
    
    // Severity Levels
    CRITICAL: "bg-red-50 text-red-700 border-red-200",
    HIGH: "bg-orange-50 text-orange-700 border-orange-200",
    MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
    LOW: "bg-green-50 text-green-700 border-green-200"
  };

  const currentStyle = styles[status?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${currentStyle} ${className}`}>
      {status}
    </span>
  );
}
