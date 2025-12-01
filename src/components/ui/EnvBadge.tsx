import React from 'react';
import { AlertOctagon, Check, Laptop } from 'lucide-react';
import { EnvType } from '../../types';

export const getEnvColor = (env: 'prod' | 'dev' | 'local') => {
  switch (env) {
    case 'prod': return 'border-red-500/50 bg-red-950/20 text-red-100';
    case 'dev': return 'border-emerald-500/50 bg-emerald-950/20 text-emerald-100';
    case 'local': return 'border-blue-500/50 bg-blue-950/20 text-blue-100';
    default: return 'border-slate-800 bg-slate-900 text-slate-200';
  }
};

export const EnvBadge = ({ env }: { env: EnvType }) => {
  switch (env) {
    case 'prod': return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-500/30 px-2 py-0.5 rounded bg-red-500/10"><AlertOctagon size={10} /> Production</span>;
    case 'dev': return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded bg-emerald-500/10"><Check size={10} /> Development</span>;
    case 'local': return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded bg-blue-500/10"><Laptop size={10} /> Local</span>;
    default: return null;
  }
};