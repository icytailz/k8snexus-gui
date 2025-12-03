use anyhow::Result;
use k8s_openapi::api::core::v1::{ConfigMap, Namespace, Node, PersistentVolumeClaim, Pod, Secret, Service, ServiceAccount};
use k8s_openapi::api::apps::v1::{DaemonSet, Deployment, StatefulSet};
use k8s_openapi::api::networking::v1::Ingress;
use kube::api::ListParams;
use kube::Api;

use crate::types::{Resource, ResourcesResponse};

/// Get generic resources by type (Pods, Nodes, Services, ConfigMaps, etc.)
pub async fn get_resources(
    client: kube::Client,
    resource_type: &str,
) -> ResourcesResponse {
    let result = match resource_type {
        "Pods" => fetch_resources::<Pod>(client).await,
        "Nodes" => fetch_resources::<Node>(client).await,
        "Services" => fetch_resources::<Service>(client).await,
        "ConfigMaps" => fetch_resources::<ConfigMap>(client).await,
        "Namespaces" => fetch_resources::<Namespace>(client).await,
        "Deployments" => fetch_resources::<Deployment>(client).await,
        "StatefulSets" => fetch_resources::<StatefulSet>(client).await,
        "DaemonSets" => fetch_resources::<DaemonSet>(client).await,
        "Ingresses" => fetch_resources::<Ingress>(client).await,
        "Secrets" => fetch_resources::<Secret>(client).await,
        "PVCs" => fetch_resources::<PersistentVolumeClaim>(client).await,
        "ServiceAccounts" => fetch_resources::<ServiceAccount>(client).await,
        _ => {
            return ResourcesResponse {
                items: vec![],
                error: Some(format!("Unsupported resource type: {}", resource_type)),
            }
        }
    };
    
    result.unwrap_or_else(|e| ResourcesResponse {
        items: vec![],
        error: Some(e.to_string()),
    })
}

async fn fetch_resources<K>(client: kube::Client) -> Result<ResourcesResponse>
where
    K: kube::Resource,
    <K as kube::Resource>::DynamicType: Default,
    K: serde::de::DeserializeOwned + Clone + std::fmt::Debug,
{
    let api: Api<K> = Api::all(client);
    
    match api.list(&ListParams::default()).await {
        Ok(list) => {
            let items = list
                .items
                .iter()
                .map(|item| {
                    let meta = K::meta(item);
                    Resource {
                        id: meta.uid.clone().unwrap_or_default(),
                        name: meta.name.clone().unwrap_or_default(),
                        namespace: meta.namespace.clone().unwrap_or_else(|| "default".to_string()),
                        creation_timestamp: meta
                            .creation_timestamp
                            .as_ref()
                            .map(|ts| ts.0.to_rfc3339())
                            .unwrap_or_default(),
                    }
                })
                .collect();
            
            Ok(ResourcesResponse {
                items,
                error: None,
            })
        }
        Err(e) => {
            let error_msg = if e.to_string().contains("connection refused") {
                "Connection refused. Is the cluster running?".to_string()
            } else {
                e.to_string()
            };
            
            Ok(ResourcesResponse {
                items: vec![],
                error: Some(error_msg),
            })
        }
    }
}
