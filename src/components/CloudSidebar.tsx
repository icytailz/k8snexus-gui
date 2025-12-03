import React, { useState } from 'react';
import { Activity, Layout, UserCog, Plus, Trash2 } from 'lucide-react';
import { ClusterContext, PROVIDERS, NewClusterConfig } from '../types';
import { AddClusterModal } from './AddClusterModal';

/* ==================================================================================================================
   MODULE: CLOUD SIDEBAR
   Description: Navigation for multi-cloud contexts.
   ================================================================================================================== */

export const CloudSidebar = ({
  clusters,
  activeContext,
  onContextSelect,
  onAddCluster,
  onRemoveCluster,
  onDiscoverClusters,
  activeResourceView,
  onResourceSelect
}: {
  clusters: ClusterContext[],
  activeContext: ClusterContext | null,
  onContextSelect: (c: ClusterContext | null) => void,
  onAddCluster: (config: NewClusterConfig) => void,
  onRemoveCluster: (id: string) => void,
  onDiscoverClusters?: () => void,
  activeResourceView?: string,
  onResourceSelect?: (resource: string) => void
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, resource: string } | null>(null);

  const resources = [
    'Nodes', 'Namespaces', 'Pods', 'Deployments', 'StatefulSets', 'DaemonSets',
    'Services', 'Ingresses', 'ConfigMaps', 'Secrets', 'PVCs', 'ServiceAccounts'
  ];

  const handleContextMenu = (e: React.MouseEvent, resource: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, resource });
  };

  // Close context menu on click elsewhere
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="w-64 flex flex-col bg-zinc-900 border-r border-zinc-800 flex-shrink-0 relative h-full">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="text-white" size={14} />
          </div>
          <h1 className="font-semibold text-sm text-zinc-100 tracking-tight">KubeNexus</h1>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => onContextSelect(null)}
            className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all duration-200 ${activeContext === null ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`}
          >
            <Layout size={14} /> Global View
          </button>

          <div className="my-4 border-t border-zinc-800/50"></div>

          {PROVIDERS.map(p => {
            const pClusters = clusters.filter(c => c.provider === p.id);
            const Icon = p.icon;
            return (
              <div key={p.id} className="mb-4">
                <div className={`text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2 px-3`}>
                  {p.label}
                </div>
                <div className="space-y-0.5">
                  {pClusters.map(c => (
                    <div key={c.id} className="group relative">
                      <div className="flex items-center">
                        <button
                          onClick={() => onContextSelect(c)}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-all duration-200 ${activeContext?.id === c.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={12} className={activeContext?.id === c.id ? 'text-blue-400' : 'text-zinc-500'} />
                            {c.name}
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemoveCluster(c.id); }}
                          className="absolute right-2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all duration-200"
                          title="Remove Cluster"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Expanded Resource Tree for Active Cluster */}
                      {activeContext?.id === c.id && (
                        <div className="ml-3 mt-1 space-y-0.5 border-l border-zinc-800 pl-2">
                          {resources.map(resource => (
                            <div
                              key={resource}
                              onClick={() => onResourceSelect && onResourceSelect(resource)}
                              onContextMenu={(e) => handleContextMenu(e, resource)}
                              className={`text-[11px] cursor-pointer py-1 px-2 rounded-sm flex items-center gap-2 transition-all duration-200 ${activeResourceView === resource ? 'text-blue-400 bg-blue-500/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                            >
                              {activeResourceView === resource && <div className="w-1 h-1 rounded-full bg-blue-500"></div>}
                              {resource}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {pClusters.length === 0 && (
                    <div className="text-[10px] text-zinc-600 italic px-3 py-1">No clusters</div>
                  )}
                </div>
              </div>
            )
          })}

          <div className="space-y-2 mt-4">
            {onDiscoverClusters && (
              <button
                onClick={onDiscoverClusters}
                className="w-full border border-dashed border-blue-800/50 rounded-md p-2 text-xs text-blue-400 hover:text-blue-300 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all duration-200 flex items-center justify-center gap-2"
                title="Discover clusters from kubeconfig (Cmd+Shift+D)"
              >
                <Activity size={12} /> Discover Clusters
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full border border-dashed border-zinc-800 rounded-md p-2 text-xs text-zinc-500 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Plus size={12} /> Add Cluster
            </button>
            <button
              onClick={async () => {
                if (confirm('Are you sure you want to reset the app? This will remove all clusters.')) {
                  // Clear local storage/state via Tauri
                  try {
                    // @ts-ignore
                    await window.__TAURI__.invoke('save_clusters', { clusters: [] });
                    window.location.reload();
                  } catch (e) {
                    console.error(e);
                    // Fallback reload
                    window.location.reload();
                  }
                }
              }}
              className="w-full border border-dashed border-red-900/30 rounded-md p-2 text-xs text-red-700 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 mt-4"
            >
              Reset App
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-zinc-900 border border-zinc-800 rounded-md shadow-xl z-50 py-1 w-40"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 mb-1">{contextMenu.resource}</div>
          <button className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors">Refresh</button>
          <button className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors">Describe</button>
          <button className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors">Edit YAML</button>
        </div>
      )}

      {/* User Info Footer */}
      <div className="mt-auto p-3 border-t border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <UserCog size={12} className="text-zinc-400" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-medium text-zinc-300 truncate">DevOps Lead</div>
          </div>
        </div>
      </div>
      <AddClusterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={onAddCluster}
      />
    </div>
  );
};