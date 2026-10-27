import React from 'react';

// Marks content the server serves only in demo mode, with simulated: true.
export const SimulatedBadge: React.FC<{ label?: string }> = ({ label = 'Simulated · demo mode' }) => (
  <span className="shrink-0 text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
    {label}
  </span>
);
