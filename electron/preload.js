const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getClusterInfo: (config) => ipcRenderer.invoke('get-cluster-info', config),
    getWorkloads: (config) => ipcRenderer.invoke('get-workloads', config),
    saveClusters: (clusters) => ipcRenderer.invoke('save-clusters', clusters),
    loadClusters: () => ipcRenderer.invoke('load-clusters'),
    getResources: (config, resourceType) => ipcRenderer.invoke('get-resources', { config, resourceType }),
});
