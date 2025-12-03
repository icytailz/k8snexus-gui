import React, { useState, useMemo } from 'react';
import { Terminal } from 'lucide-react';
import { ClusterContext, Workload, NewClusterConfig } from './types';
import { CloudSidebar } from './components/CloudSidebar';
import { Dashboard } from './components/Dashboard';
import { TerminalPanel } from './components/TerminalPanel';
import { getEnvColor, EnvBadge } from './components/ui/EnvBadge';
import { tauri } from './lib/tauri';

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
    tauri.loadClusters().then(async (savedClusters: ClusterContext[]) => {
      if (savedClusters && savedClusters.length > 0) {
        // Deduplicate saved clusters
        const uniqueSaved = savedClusters.filter((c, index, self) =>
          index === self.findIndex((t) => t.name === c.name)
        );

        setClusters(uniqueSaved);
        setActiveContext(uniqueSaved[0]);

        // If we found duplicates, save the cleaned list
        if (uniqueSaved.length !== savedClusters.length) {
          console.log(`Cleaned up ${savedClusters.length - uniqueSaved.length} duplicate clusters`);
          tauri.saveClusters(uniqueSaved);
        }
      } else {
        // Auto-discover clusters from kubeconfig if no saved clusters
        try {
          const discovered = await tauri.discoverClusters();
          console.log(`Discovered ${discovered.length} clusters from kubeconfig`);
        } catch (err) {
          console.error('Failed to auto-discover clusters:', err);
        }
      }
    }).catch(err => console.error('Failed to load clusters:', err));
  }, []);

  // Save clusters whenever they change
  React.useEffect(() => {
    if (clusters.length > 0) {
      tauri.saveClusters(clusters).catch(err => console.error('Failed to save clusters:', err));
    }
  }, [clusters]);

  // Effect to refresh data when switching contexts or resource view
  React.useEffect(() => {
    if (activeContext) {
      const fetchLatest = async () => {
        try {
          const clusterInfo = await tauri.getClusterInfo(activeContext);
          setClusters(prev => prev.map(c => c.id === activeContext.id ? { ...c, ...clusterInfo } : c));

          if (activeResourceView === 'Pods') {
            const workloadsRes = await tauri.getWorkloads(activeContext);
            if (workloadsRes.error) {
              console.error("Workload fetch error:", workloadsRes.error);
            }
            // Replace existing workloads for this context
            setWorkloads(prev => [...prev.filter(w => w.contextId !== activeContext.id), ...(workloadsRes.items || [])]);
          } else {
            // Generic resource fetch
            const res = await tauri.getResources(activeContext, activeResourceView);
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

  // Discover clusters from kubeconfig
  const handleDiscoverClusters = async () => {
    try {
      const discovered = await tauri.discoverClusters();

      if (discovered.length === 0) {
        console.log('No clusters found in kubeconfig');
        return;
      }

      // Filter out clusters that already exist (case-insensitive)
      const existingNames = new Set(clusters.map(c => c.name.toLowerCase()));
      const uniqueDiscovered = discovered.filter(d => !existingNames.has(d.contextName.toLowerCase()));

      if (uniqueDiscovered.length === 0) {
        console.log('No new clusters found to import');
        // Optional: Trigger a cleanup of existing duplicates just in case
        const uniqueClusters = clusters.filter((c, index, self) =>
          index === self.findIndex((t) => t.name === c.name)
        );
        if (uniqueClusters.length !== clusters.length) {
          setClusters(uniqueClusters);
          tauri.saveClusters(uniqueClusters);
        }
        return;
      }

      // Convert discovered clusters to ClusterContext
      const newClusters: ClusterContext[] = uniqueDiscovered.map(d => ({
        id: `discovered-${d.contextName}-${Date.now()}`,
        name: d.contextName,
        provider: d.provider,
        region: 'auto-discovered',
        environment: d.isCurrentContext ? 'dev' : 'local',
        status: 'Connecting...',
        cpuUsage: 0,
        memUsage: 0,
        nodeCount: 0,
        kubeconfig: undefined, // Will use default kubeconfig
      }));

      // Combine and deduplicate everything
      const allClusters = [...clusters, ...newClusters];
      const uniqueAllClusters = allClusters.filter((c, index, self) =>
        index === self.findIndex((t) => t.name === c.name)
      );

      setClusters(uniqueAllClusters);

      // Set first discovered cluster as active if no active context
      if (!activeContext && newClusters.length > 0) {
        setActiveContext(newClusters[0]);
      }

      // Save immediately
      try {
        await tauri.saveClusters(uniqueAllClusters);
        console.log(`Imported ${newClusters.length} new clusters (cleaned duplicates)`);
      } catch (err) {
        console.error('Failed to save discovered clusters:', err);
      }
    } catch (err) {
      console.error('Failed to discover clusters:', err);
    }
  };

  // Execute command in pod
  const handleExecPod = async (workload: Workload) => {
    if (!activeContext) return;

    setIsTerminalOpen(true);
    setTerminalHistory(prev => [...prev, `➜ ~ Connecting to pod ${workload.name}...`]);

    try {
      // Execute a shell command (trying bash first, then sh)
      const command = ['/bin/bash', '-c', 'echo "Connected to pod. Type exit to close." && /bin/bash'];

      const response = await tauri.execPodCommand(activeContext, {
        namespace: workload.namespace || 'default',
        podName: workload.name,
        container: undefined, // Will use first container
        command: ['/bin/sh', '-c', 'echo "=== Pod Shell ==="; echo "Pod: ' + workload.name + '"; echo "Image: ' + workload.image + '"; echo ""; ls -la']
      });

      if (response.error) {
        setTerminalHistory(prev => [...prev, `Error: ${response.error}`]);
      } else {
        setTerminalHistory(prev => [...prev, response.output]);
      }
    } catch (err) {
      setTerminalHistory(prev => [...prev, `Failed to exec into pod: ${err}`]);
    }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + D = Discover Clusters
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        handleDiscoverClusters();
      }
      // Cmd/Ctrl + ` = Toggle Terminal
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDiscoverClusters]);

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
          onDiscoverClusters={handleDiscoverClusters}
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
            try {
              await tauri.saveClusters(updatedClusters);
            } catch (err) {
              console.error('Failed to save clusters:', err);
            }

            try {
              // Fetch real cluster info
              const clusterInfo = await tauri.getClusterInfo(newCluster);

              setClusters(prev => prev.map(c => c.id === newClusterId ? { ...c, ...clusterInfo } : c));

              // Fetch real workloads
              const workloadsRes = await tauri.getWorkloads(newCluster);
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
          }}
          onRemoveCluster={(id) => {
            const newClusters = clusters.filter(c => c.id !== id);
            setClusters(newClusters);
            setWorkloads(workloads.filter(w => w.contextId !== id));
            if (activeContext?.id === id) {
              setActiveContext(newClusters.length > 0 ? newClusters[0] : null);
            }
            // Save immediately
            tauri.saveClusters(newClusters).catch(err => console.error('Failed to save clusters:', err));
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
            <Dashboard
              activeContext={activeContext}
              visibleWorkloads={visibleWorkloads}
              onExecPod={handleExecPod}
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