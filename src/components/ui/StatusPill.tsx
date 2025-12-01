import React from 'react';

export const StatusPill = ({ status }: { status: string }) => {
  const colors: any = {
    Healthy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Running: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    CrashLoopBackOff: 'text-red-400 bg-red-500/10 border-red-500/20',
    Offline: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${colors[status] || colors.Offline}`}>
      {status}
    </span>
  );
};