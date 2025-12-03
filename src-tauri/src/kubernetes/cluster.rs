use anyhow::Result;
use k8s_openapi::api::core::v1::Node;
use kube::api::ListParams;
use kube::Api;

use crate::types::ClusterInfo;

/// Get cluster information (node count, status, etc.)
pub async fn get_info(client: kube::Client) -> Result<ClusterInfo> {
    let nodes: Api<Node> = Api::all(client);
    
    match nodes.list(&ListParams::default()).await {
        Ok(node_list) => {
            let node_count = node_list.items.len();
            
            // Placeholder values for CPU and memory usage
            // In a real implementation, you'd query metrics-server or similar
            let cpu_usage = (rand::random::<f64>() * 20.0 + 10.0).floor();
            let mem_usage = (rand::random::<f64>() * 30.0 + 20.0).floor();
            
            Ok(ClusterInfo {
                status: "Healthy".to_string(),
                node_count,
                cpu_usage,
                mem_usage,
                error: None,
            })
        }
        Err(e) => {
            let error_msg = if e.to_string().contains("connection refused") {
                "Connection refused. Is the cluster running?".to_string()
            } else {
                e.to_string()
            };
            
            Ok(ClusterInfo {
                status: "Error".to_string(),
                node_count: 0,
                cpu_usage: 0.0,
                mem_usage: 0.0,
                error: Some(error_msg),
            })
        }
    }
}

// Simple random function placeholder
mod rand {
    pub fn random<T: Random>() -> T {
        T::random()
    }
    
    pub trait Random {
        fn random() -> Self;
    }
    
    impl Random for f64 {
        fn random() -> Self {
            // Simple pseudo-random using system time
            use std::time::{SystemTime, UNIX_EPOCH};
            let nanos = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .subsec_nanos();
            (nanos % 1000) as f64 / 1000.0
        }
    }
}
