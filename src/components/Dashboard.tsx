import React from 'react';
import { Terminal } from 'lucide-react';
import { ClusterContext, Workload } from '../types';
import { EnvBadge } from './ui/EnvBadge';
import { StatusPill } from './ui/StatusPill';

/* ==================================================================================================================
   MODULE: WORKLOAD DASHBOARD
   Description: The main view containing stats and the resources table.
   ================================================================================================================== */

export const Dashboard = ({
  activeContext,
  visibleWorkloads,
  onExecPod
}: {
  activeContext: ClusterContext | null,
  visibleWorkloads: Workload[],
  onExecPod?: (workload: Workload) => void
}) => {
  return (
    <main className="flex-1 overflow-auto p-6 bg-zinc-950">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg">
          <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Total Workloads</div>
          <div className="text-3xl font-bold text-zinc-100">{visibleWorkloads.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg">
          <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Cluster Health</div>
          <div className="text-3xl font-bold text-emerald-400">100%</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg">
          <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Environment</div>
          <div className="mt-1">{activeContext ? <EnvBadge env={activeContext.environment} /> : <span className="text-zinc-400 text-sm">Global</span>}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Active Workloads</h3>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
          title="Force Refresh (Cmd+R)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
          Refresh
        </button>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/50 text-zinc-500 font-medium uppercase text-[10px] tracking-wider border-b border-zinc-800">
            <tr>
              <th className="p-4 font-bold">Name</th>
              <th className="p-4 font-bold">Namespace</th>
              <th className="p-4 font-bold">Replicas</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Age</th>
              <th className="p-4 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {visibleWorkloads.map(w => (
              <tr key={w.id} className="hover:bg-zinc-800/30 transition-colors duration-200">
                <td className="p-4 font-mono text-blue-400 font-medium text-xs">{w.name}</td>
                <td className="p-4 font-mono text-zinc-400 text-xs">{w.namespace}</td>
                <td className="p-4 flex gap-1 items-center">
                  {[...Array(w.replicas)].map((_, i) => <div key={i} className="w-1.5 h-3 bg-blue-600 rounded-sm"></div>)}
                  <span className="ml-2 text-xs text-zinc-600">({w.replicas})</span>
                </td>
                <td className="p-4"><StatusPill status={w.status} /></td>
                <td className="p-4 text-zinc-500 font-mono text-xs">{w.uptime}</td>
                <td className="p-4">
                  {onExecPod && (
                    <button
                      onClick={() => onExecPod(w)}
                      className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border border-blue-600/20 hover:border-blue-600/40"
                      title="Execute shell in pod"
                    >
                      <Terminal size={12} />
                      Exec
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {visibleWorkloads.length === 0 && (
              <tr><td colSpan={6} className="p-12 text-center text-zinc-600 italic text-xs">No workloads found in this context.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};