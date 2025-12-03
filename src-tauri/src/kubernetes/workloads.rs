use chrono::Utc;
use k8s_openapi::api::core::v1::Pod;
use kube::api::ListParams;
use kube::Api;

use crate::types::{Workload, WorkloadsResponse};

/// Get all pods (workloads) from all namespaces
pub async fn get_workloads(client: kube::Client, context_id: &str) -> WorkloadsResponse {
    let pods: Api<Pod> = Api::all(client);
    
    match pods.list(&ListParams::default()).await {
        Ok(pod_list) => {
            let items: Vec<Workload> = pod_list
                .items
                .iter()
                .map(|pod| {
                    let metadata = &pod.metadata;
                    let spec = pod.spec.as_ref();
                    let status = pod.status.as_ref();
                    
                    let name = metadata.name.clone().unwrap_or_default();
                    let namespace = metadata.namespace.clone().unwrap_or_else(|| "default".to_string());
                    let uid = metadata.uid.clone().unwrap_or_default();
                    
                    // Get first container image
                    let image = spec
                        .and_then(|s| s.containers.first())
                        .and_then(|c| c.image.clone())
                        .unwrap_or_else(|| "unknown".to_string());
                    
                    // Get pod status
                    let phase = status
                        .and_then(|s| s.phase.clone())
                        .unwrap_or_else(|| "Unknown".to_string());
                    
                    // Calculate uptime
                    let uptime = status
                        .and_then(|s| s.start_time.as_ref())
                        .map(|start_time| {
                            let start = start_time.0;
                            let now = Utc::now();
                            let diff = now.signed_duration_since(start);
                            
                            let hours = diff.num_hours();
                            if hours > 24 {
                                format!("{}d", hours / 24)
                            } else {
                                format!("{}h", hours)
                            }
                        })
                        .unwrap_or_else(|| "0h".to_string());
                    
                    Workload {
                        id: uid,
                        name,
                        namespace,
                        image,
                        context_id: context_id.to_string(),
                        status: phase,
                        replicas: 1,
                        uptime,
                    }
                })
                .collect();
            
            WorkloadsResponse {
                items,
                error: None,
            }
        }
        Err(e) => {
            let error_msg = if e.to_string().contains("connection refused") {
                "Connection refused. Is the cluster running?".to_string()
            } else {
                e.to_string()
            };
            
            WorkloadsResponse {
                items: vec![],
                error: Some(error_msg),
            }
        }
    }
}
