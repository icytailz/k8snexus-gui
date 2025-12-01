const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const k8s = require('@kubernetes/client-node');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        autoHideMenuBar: true, // Hide the default menu bar
        titleBarStyle: 'hidden', // Frameless window for premium look
        titleBarOverlay: {
            color: '#09090b', // Match bg-zinc-950
            symbolColor: '#e4e4e7', // Match text-zinc-200
            height: 35 // Slightly taller for better hit target
        }
    });

    // In development, load from localhost
    // In production, load from dist/index.html
    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;

    win.loadURL(startUrl);

    // Open DevTools in dev mode
    if (process.env.ELECTRON_START_URL) {
        win.webContents.openDevTools();
    }
}

// Helper to get K8s API client
function getK8sApi(config) {
    const kc = new k8s.KubeConfig();
    if (config && config.kubeconfig) {
        kc.loadFromString(config.kubeconfig);
    } else {
        kc.loadFromDefault();
    }
    return kc.makeApiClient(k8s.CoreV1Api);
}

app.whenReady().then(() => {
    // Persistence Handlers
    const userDataPath = app.getPath('userData');
    const clustersFile = path.join(userDataPath, 'clusters.json');

    ipcMain.handle('save-clusters', async (event, clusters) => {
        try {
            fs.writeFileSync(clustersFile, JSON.stringify(clusters, null, 2));
            return { success: true };
        } catch (err) {
            console.error('Failed to save clusters:', err);
            return { error: err.message };
        }
    });

    ipcMain.handle('load-clusters', async () => {
        try {
            if (fs.existsSync(clustersFile)) {
                const data = fs.readFileSync(clustersFile, 'utf8');
                return JSON.parse(data);
            }
            return [];
        } catch (err) {
            console.error('Failed to load clusters:', err);
            return [];
        }
    });

    // IPC Handlers
    ipcMain.handle('get-cluster-info', async (event, config) => {
        try {
            console.log('Fetching cluster info for:', config.name);
            const k8sApi = getK8sApi(config);
            let nodesRes = await k8sApi.listNode();

            if (nodesRes && nodesRes.items) {
                nodesRes = { body: nodesRes };
            }

            if (!nodesRes || !nodesRes.body) {
                throw new Error('Invalid response from Kubernetes API');
            }

            const nodes = nodesRes.body.items;

            return {
                status: 'Healthy',
                nodeCount: nodes.length,
                cpuUsage: Math.floor(Math.random() * 20) + 10, // Placeholder
                memUsage: Math.floor(Math.random() * 30) + 20, // Placeholder
            };
        } catch (err) {
            console.error('Failed to get cluster info:', err);
            if (err.code === 'ECONNREFUSED') {
                return { status: 'Error', nodeCount: 0, cpuUsage: 0, memUsage: 0, error: `Connection refused. Is the cluster running?` };
            }
            return { status: 'Error', nodeCount: 0, cpuUsage: 0, memUsage: 0, error: err.message };
        }
    });

    ipcMain.handle('get-workloads', async (event, config) => {
        try {
            console.log('Fetching workloads for:', config.name);
            const k8sApi = getK8sApi(config);
            let podsRes = await k8sApi.listPodForAllNamespaces();

            if (podsRes && podsRes.items) {
                podsRes = { body: podsRes };
            }

            if (!podsRes || !podsRes.body) {
                throw new Error('Invalid response from Kubernetes API');
            }

            return {
                items: podsRes.body.items.map(pod => {
                    const container = pod.spec.containers[0];

                    // Calculate uptime
                    const startTime = pod.status.startTime ? new Date(pod.status.startTime) : new Date();
                    const diffMs = new Date() - startTime;
                    const uptimeHrs = Math.floor(diffMs / (1000 * 60 * 60));
                    const uptime = uptimeHrs > 24 ? `${Math.floor(uptimeHrs / 24)}d` : `${uptimeHrs}h`;

                    return {
                        id: pod.metadata.uid,
                        name: pod.metadata.name,
                        image: container.image,
                        contextId: config ? config.id : 'local',
                        status: pod.status.phase,
                        replicas: 1,
                        uptime: uptime
                    };
                })
            };
        } catch (err) {
            console.error('Failed to get workloads:', err);
            if (err.code === 'ECONNREFUSED') {
                return { items: [], error: `Connection refused. Is the cluster running?` };
            }
            return { items: [], error: err.message };
        }
    });

    ipcMain.handle('get-resources', async (event, { config, resourceType }) => {
        try {
            console.log(`Fetching ${resourceType} for:`, config.name);
            const k8sApi = getK8sApi(config);

            // Simple mapping for now
            let res;
            if (resourceType === 'Pods') {
                res = await k8sApi.listPodForAllNamespaces();
            } else if (resourceType === 'Nodes') {
                res = await k8sApi.listNode();
            } else if (resourceType === 'Services') {
                res = await k8sApi.listServiceForAllNamespaces();
            } else if (resourceType === 'ConfigMaps') {
                res = await k8sApi.listConfigMapForAllNamespaces();
            } else {
                // Default or empty for unimplemented types
                return { items: [] };
            }

            if (res && res.items) {
                res = { body: res };
            }

            if (!res || !res.body) {
                throw new Error('Invalid response from Kubernetes API');
            }

            return {
                items: res.body.items.map(item => ({
                    id: item.metadata.uid,
                    name: item.metadata.name,
                    namespace: item.metadata.namespace,
                    creationTimestamp: item.metadata.creationTimestamp,
                    // Add more generic fields as needed
                }))
            };
        } catch (err) {
            console.error(`Failed to get ${resourceType}:`, err);
            if (err.code === 'ECONNREFUSED') {
                return { items: [], error: `Connection refused. Is the cluster running at ${err.address}:${err.port}?` };
            }
            return { items: [], error: err.message };
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
