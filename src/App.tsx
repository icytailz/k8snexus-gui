import React, { useState, useMemo } from 'react';
import { Terminal } from 'lucide-react';
import { CLUSTERS, INITIAL_WORKLOADS, ClusterContext, Workload, NewClusterConfig } from './types';
import { CloudSidebar } from './components/CloudSidebar';
import { WorkloadDashboard } from './components/WorkloadDashboard';
import { TerminalPanel } from './components/TerminalPanel';
import { getEnvColor, EnvBadge } from './components/ui/EnvBadge';

/* ==================================================================================================================
   MODULE: MAIN APP ORCHESTRATOR
   Description: Root component that wires all modules together and manages global state.
   ================================================================================================================== */

export default function App() {
  const [activeContext, setActiveContext] = useState<ClusterContext | null>(null);
  const [activeResourceView, setActiveResourceView] = useState('Pods');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Domain Data State
  const [clusters, setClusters] = useState<ClusterContext[]>([]);
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [genericResources, setGenericResources] = useState<any[]>([]);

  // Terminal Logic State
  const [terminalHistory, setTerminalHistory] = useState<string[]>(['KubeNexus Shell v2.4.0', 'Type "help" for commands.']);
  const [isVimMode, setIsVimMode] = useState(false);
  const [vimFile, setVimFile] = useState<{ id: string, name: string, content: string } | null>(null);

  // Computed State
  const visibleWorkloads = useMemo(() => activeContext ? workloads.filter(w => w.contextId === activeContext.id) : [], [workloads, activeContext]);

  // Load clusters on startup
  React.useEffect(() => {
    if (window.electron) {
      window.electron.loadClusters().then((savedClusters: ClusterContext[]) => {
        if (savedClusters && savedClusters.length > 0) {
          setClusters(savedClusters);
          setActiveContext(savedClusters[0]);
        }
      });
    }
  }, []);

  // Save clusters whenever they change
  React.useEffect(() => {
    if (window.electron && clusters.length > 0) {
      window.electron.saveClusters(clusters);
    }
  }, [clusters]);

  // Effect to refresh data when switching contexts or resource view
  React.useEffect(() => {
    if (activeContext && window.electron) {
      const fetchLatest = async () => {
        try {
          const clusterInfo = await window.electron.getClusterInfo(activeContext);
          setClusters(prev => prev.map(c => c.id === activeContext.id ? { ...c, ...clusterInfo } : c));

          if (activeResourceView === 'Pods') {
            const workloadsRes = await window.electron.getWorkloads(activeContext);
            if (workloadsRes.error) {
              console.error("Workload fetch error:", workloadsRes.error);
            }
            // Replace existing workloads for this context
            setWorkloads(prev => [...prev.filter(w => w.contextId !== activeContext.id), ...(workloadsRes.items || [])]);
          } else {
            // Generic resource fetch
            const res = await window.electron.getResources(activeContext, activeResourceView);
            if (res.error) {
              console.error(`Failed to fetch ${activeResourceView}:`, res.error);
            }
            setGenericResources(res.items || []);
          }
        } catch (e) {
          console.error("Failed to refresh cluster data", e);
        }
      };
      fetchLatest();
    }
  }, [activeContext?.id, activeResourceView]);

  // Terminal Command Processor
  const handleTerminalCommand = (cmdInput: string) => {
    const cmd = cmdInput.trim();
    const newHistory = [...terminalHistory, `➜ ~ ${cmd}`];

    if (cmd === 'clear') {
      setTerminalHistory([]);
      return;
    }

    if (cmd === 'help') {
      newHistory.push('Available commands:', '  kubectl get pods', '  kubectl edit pod <name>', '  clear', '  echo <msg>');
    } else if (cmd === 'kubectl get pods') {
      newHistory.push('NAME            READY   STATUS    RESTARTS   AGE');
      visibleWorkloads.forEach(w => {
        newHistory.push(`${w.name.padEnd(15)} ${w.replicas}/${w.replicas}     ${w.status.padEnd(9)} 0          ${w.uptime}`);
      });
    } else if (cmd.startsWith('kubectl edit pod')) {
      const podName = cmd.split(' ')[3];
      const workload = visibleWorkloads.find(w => w.name === podName);
      if (workload) {
        const yamlContent = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: ${workload.name}\n  namespace: default\nspec:\n  containers:\n  - name: ${workload.name}\n    image: ${workload.image}\n    resources:\n      limits:\n        memory: "128Mi"\n        cpu: "500m"\n  replicas: ${workload.replicas}\nstatus:\n  phase: ${workload.status}`;
        setVimFile({ id: workload.id, name: `${workload.name}.yaml`, content: yamlContent });
        setIsVimMode(true);
        return;
      } else {
        newHistory.push(`Error: pods "${podName}" not found`);
      }
    } else if (cmd) {
      newHistory.push(`zsh: command not found: ${cmd}`);
    }
    setTerminalHistory(newHistory);
  };

  const handleVimSave = (content: string) => {
    if (!vimFile) return;
    const match = content.match(/replicas:\s*(\d+)/);
    if (match) {
      const newReplicas = parseInt(match[1]);
      setWorkloads(prev => prev.map(w => w.id === vimFile.id ? { ...w, replicas: newReplicas } : w));
      setTerminalHistory(prev => [...prev, `pod/${vimFile.name.replace('.yaml', '')} edited`]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-blue-500/30 overflow-hidden relative">

      {/* Custom Title Bar - Matches Electron titleBarOverlay height */}
      <div className="h-[35px] w-full bg-zinc-950 flex items-center justify-center border-b border-white/5 select-none z-50 draggable">
        <div className="text-[11px] font-medium text-zinc-500 tracking-wide">K8sNexus GUI</div>
      </div>

      {/* Content */}
      <div className={`flex-1 flex overflow-hidden ${isTerminalOpen ? 'h-[60%]' : 'h-full'} transition-all duration-300 relative z-10`}>

        {/* Module: Sidebar */}
        <CloudSidebar
          clusters={clusters}
          activeContext={activeContext}
          onContextSelect={setActiveContext}
          activeResourceView={activeResourceView}
          onResourceSelect={setActiveResourceView}
          onAddCluster={async (config) => {
            const newClusterId = `ctx-${config.name}-${Date.now()}`;

            // Initial cluster object (status pending)
            const newCluster: ClusterContext = {
              id: newClusterId,
              name: config.name,
              provider: config.provider,
              region: config.region,
              environment: config.environment,
              status: 'Connecting...',
              cpuUsage: 0,
              memUsage: 0,
              nodeCount: 0,
              kubeconfig: config.kubeconfig // Store kubeconfig
            };

            const updatedClusters = [...clusters, newCluster];
            setClusters(updatedClusters);
            setActiveContext(newCluster);

            // Save immediately
            if (window.electron) {
              window.electron.saveClusters(updatedClusters);
            }

            if (window.electron) {
              try {
                // Fetch real cluster info
                const clusterInfo = await window.electron.getClusterInfo({ ...config, id: newClusterId });

                setClusters(prev => prev.map(c => c.id === newClusterId ? { ...c, ...clusterInfo } : c));

                // Fetch real workloads
                const workloadsRes = await window.electron.getWorkloads({ ...config, id: newClusterId });
                if (workloadsRes.error) {
                  console.error("Workload fetch error:", workloadsRes.error);
                  // You might want to show this in the UI
                  setClusters(prev => prev.map(c => c.id === newClusterId ? { ...c, status: 'Warning' } : c));
                }
                setWorkloads(prev => [...prev, ...(workloadsRes.items || [])]);
              } catch (error) {
                console.error("Failed to fetch cluster data", error);
                setClusters(prev => prev.map(c => c.id === newClusterId ? { ...c, status: 'Error' } : c));
              }
            } else {
              // Fallback for web mode (if needed, or just show error)
              console.warn("Electron API not available");
            }
          }}
          onRemoveCluster={(id) => {
            const newClusters = clusters.filter(c => c.id !== id);
            setClusters(newClusters);
            setWorkloads(workloads.filter(w => w.contextId !== id));
            if (activeContext?.id === id) {
              setActiveContext(newClusters.length > 0 ? newClusters[0] : null);
            }
            // Save immediately
            if (window.electron) {
              window.electron.saveClusters(newClusters);
            }
          }}
        />

        {/* Module: Main Content Area */}
        <div className="flex-1 flex flex-col bg-zinc-950">
          {/* Global Header */}
          <header className={`h-12 flex items-center justify-between px-6 border-b border-white/5 bg-zinc-950`}>
            <div className="flex items-center gap-3">
              <h2 className="font-medium text-sm tracking-tight text-zinc-100">{activeContext ? activeContext.name : 'Global View'}</h2>
              {activeContext && <EnvBadge env={activeContext.environment} />}
              <span className="text-zinc-500 text-xs font-medium">/ {activeResourceView}</span>
            </div>
            <button
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`p-1.5 rounded hover:bg-white/5 transition-all duration-200 ${isTerminalOpen ? 'text-blue-400 bg-white/5' : 'text-zinc-500'}`}
              title="Toggle Terminal"
            >
              <Terminal size={16} />
            </button>
          </header>

          {/* Module: Dashboard */}
          {activeResourceView === 'Pods' ? (
            <WorkloadDashboard
              activeContext={activeContext}
              visibleWorkloads={visibleWorkloads}
            />
          ) : (
            <div className="p-6 overflow-auto bg-zinc-950">
              <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-6">
                <h3 className="text-xs font-bold mb-6 text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">{activeResourceView}</h3>
                {genericResources.length === 0 ? (
                  <div className="text-zinc-500 italic p-4 text-center text-sm">No {activeResourceView} found.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {genericResources.map((res: any) => (
                      <div key={res.id} className="p-4 bg-zinc-900 rounded border border-white/5 hover:border-zinc-700 transition-all duration-200 group">
                        <div className="font-medium text-zinc-200 mb-1 group-hover:text-blue-400 transition-colors text-sm">{res.name}</div>
                        <div className="text-xs text-zinc-500 flex justify-between items-center">
                          <span>Namespace: <span className="text-zinc-400">{res.namespace}</span></span>
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-3 font-mono">
                          Created: {new Date(res.creationTimestamp).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Module: Terminal */}
      <TerminalPanel
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        history={terminalHistory}
        onCommand={handleTerminalCommand}
        isVimMode={isVimMode}
        vimFile={vimFile}
        onVimSave={handleVimSave}
        onVimExit={() => { setIsVimMode(false); setVimFile(null); }}
      />
    </div>
  );
}