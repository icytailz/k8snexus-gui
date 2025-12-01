import {
  Laptop, Cloud, CloudLightning, Globe
} from 'lucide-react';

/* ==================================================================================================================
   MODULE: TYPES & CONSTANTS
   Description: Core domain definitions and mock data.
   ================================================================================================================== */

export type ProviderType = 'aws' | 'azure' | 'gcp' | 'local';
export type EnvType = 'prod' | 'dev' | 'local';

export interface CloudProvider {
  id: ProviderType;
  label: string;
  icon: any;
  color: string;
  authCommand: string;
}

declare global {
  interface Window {
    electron: {
      getClusterInfo: (config: any) => Promise<any>;
      getWorkloads: (config: any) => Promise<any>;
      saveClusters: (clusters: any[]) => Promise<any>;
      loadClusters: () => Promise<any[]>;
      getResources: (config: any, resourceType: string) => Promise<any>;
    };
  }
}

export interface ClusterContext {
  id: string;
  name: string;
  provider: ProviderType;
  region: string;
  environment: EnvType;
  status: 'Healthy' | 'Warning' | 'Critical' | 'Offline' | 'Connecting...' | 'Error';
  cpuUsage: number;
  memUsage: number;
  nodeCount: number;
  kubeconfig?: string;
}

export interface NewClusterConfig {
  name: string;
  provider: ProviderType;
  region: string;
  environment: EnvType;
  kubeconfig?: string;
}

export interface Workload {
  id: string;
  name: string;
  image: string;
  contextId: string;
  status: 'Running' | 'Pending' | 'Failed' | 'CrashLoopBackOff';
  replicas: number;
  uptime: string;
}

export const PROVIDERS: CloudProvider[] = [
  { id: 'local', label: 'Local Clusters', icon: Laptop, color: 'text-slate-300', authCommand: 'kubectl config use-context' },
  { id: 'aws', label: 'Amazon EKS', icon: CloudLightning, color: 'text-orange-400', authCommand: 'aws-vault exec' },
  { id: 'azure', label: 'Azure AKS', icon: Cloud, color: 'text-blue-400', authCommand: 'az account set' },
  { id: 'gcp', label: 'Google GKE', icon: Globe, color: 'text-emerald-400', authCommand: 'gcloud config set project' },
];

export const CLUSTERS: ClusterContext[] = [];

export const INITIAL_WORKLOADS: Workload[] = [];