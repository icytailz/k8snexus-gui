import { invoke } from '@tauri-apps/api/core';
import type { ClusterContext, Workload } from '../types';

export interface ClusterInfo {
    status: 'Healthy' | 'Warning' | 'Critical' | 'Offline' | 'Connecting...' | 'Error';
    nodeCount: number;
    cpuUsage: number;
    memUsage: number;
    error?: string;
}

export interface WorkloadsResponse {
    items: Workload[];
    error?: string;
}

export interface Resource {
    id: string;
    name: string;
    namespace: string;
    creationTimestamp: string;
}

export interface ResourcesResponse {
    items: Resource[];
    error?: string;
}

export interface DiscoveredCluster {
    contextName: string;
    clusterName: string;
    server: string;
    namespace: string;
    isCurrentContext: boolean;
    provider: 'local' | 'aws' | 'azure' | 'gcp';
}

export interface ExecRequest {
    namespace: string;
    podName: string;
    container?: string;
    command: string[];
}

export interface ExecResponse {
    output: string;
    error?: string;
}

// Tauri API wrapper functions
export const tauri = {
    async getClusterInfo(config: ClusterContext): Promise<ClusterInfo> {
        return await invoke<ClusterInfo>('get_cluster_info', { config });
    },

    async getWorkloads(config: ClusterContext): Promise<WorkloadsResponse> {
        return await invoke<WorkloadsResponse>('get_workloads', { config });
    },

    async getResources(config: ClusterContext, resourceType: string): Promise<ResourcesResponse> {
        return await invoke<ResourcesResponse>('get_resources', {
            config,
            resourceType
        });
    },

    async saveClusters(clusters: ClusterContext[]): Promise<void> {
        return await invoke('save_clusters', { clusters });
    },

    async loadClusters(): Promise<ClusterContext[]> {
        return await invoke<ClusterContext[]>('load_clusters');
    },

    async discoverClusters(): Promise<DiscoveredCluster[]> {
        return await invoke<DiscoveredCluster[]>('discover_clusters');
    },

    async execPodCommand(config: ClusterContext, request: ExecRequest): Promise<ExecResponse> {
        return await invoke<ExecResponse>('exec_pod_command', { config, request });
    },

    async getPodContainers(config: ClusterContext, namespace: string, podName: string): Promise<string[]> {
        return await invoke<string[]>('get_pod_containers', { config, namespace, podName });
    },
};
