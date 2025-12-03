use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterContext {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub region: String,
    pub environment: String,
    pub status: String,
    #[serde(rename = "cpuUsage")]
    pub cpu_usage: f64,
    #[serde(rename = "memUsage")]
    pub mem_usage: f64,
    #[serde(rename = "nodeCount")]
    pub node_count: usize,
    pub kubeconfig: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterInfo {
    pub status: String,
    #[serde(rename = "nodeCount")]
    pub node_count: usize,
    #[serde(rename = "cpuUsage")]
    pub cpu_usage: f64,
    #[serde(rename = "memUsage")]
    pub mem_usage: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workload {
    pub id: String,
    pub name: String,
    pub namespace: String,
    pub image: String,
    #[serde(rename = "contextId")]
    pub context_id: String,
    pub status: String,
    pub replicas: i32,
    pub uptime: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkloadsResponse {
    pub items: Vec<Workload>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub id: String,
    pub name: String,
    pub namespace: String,
    #[serde(rename = "creationTimestamp")]
    pub creation_timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesResponse {
    pub items: Vec<Resource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    Local,
    Aws,
    Azure,
    Gcp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredCluster {
    #[serde(rename = "contextName")]
    pub context_name: String,
    #[serde(rename = "clusterName")]
    pub cluster_name: String,
    pub server: String,
    pub namespace: String,
    #[serde(rename = "isCurrentContext")]
    pub is_current_context: bool,
    pub provider: ProviderType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecRequest {
    pub namespace: String,
    #[serde(rename = "podName")]
    pub pod_name: String,
    pub container: Option<String>,
    pub command: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecResponse {
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
