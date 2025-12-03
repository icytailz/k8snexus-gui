use anyhow::Result;
use kube::config::{Kubeconfig, NamedContext};
use std::path::PathBuf;

use crate::types::{DiscoveredCluster, ProviderType};

/// Discover Kubernetes clusters from the default kubeconfig
pub async fn discover_clusters() -> Vec<DiscoveredCluster> {
    match load_kubeconfig() {
        Ok(kubeconfig) => parse_kubeconfig(kubeconfig),
        Err(e) => {
            log::warn!("Failed to load kubeconfig: {}", e);
            vec![]
        }
    }
}

/// Load kubeconfig from the default location
fn load_kubeconfig() -> Result<Kubeconfig> {
    let config_path = get_kubeconfig_path()?;
    
    if !config_path.exists() {
        return Err(anyhow::anyhow!("Kubeconfig not found at {:?}", config_path));
    }
    
    let config_content = std::fs::read_to_string(&config_path)?;
    let kubeconfig = Kubeconfig::from_yaml(&config_content)?;
    
    Ok(kubeconfig)
}

/// Get the default kubeconfig path
fn get_kubeconfig_path() -> Result<PathBuf> {
    if let Ok(kube_config_path) = std::env::var("KUBECONFIG") {
        Ok(PathBuf::from(kube_config_path))
    } else {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))?;
        Ok(PathBuf::from(home).join(".kube").join("config"))
    }
}

/// Parse kubeconfig and extract all contexts
fn parse_kubeconfig(kubeconfig: Kubeconfig) -> Vec<DiscoveredCluster> {
    let current_context = kubeconfig.current_context.clone().unwrap_or_default();
    let clusters = kubeconfig.clusters.clone();
    
    kubeconfig
        .contexts
        .into_iter()
        .filter_map(|named_context| {
            extract_cluster_info(named_context, &current_context, &clusters)
        })
        .collect()
}

/// Extract cluster information from a named context
fn extract_cluster_info(
    named_context: NamedContext,
    current_context: &str,
    clusters: &[kube::config::NamedCluster],
) -> Option<DiscoveredCluster> {
    let context_name = named_context.name.clone();
    let context = named_context.context?;
    let cluster_name = context.cluster.clone();
    
    // Find cluster details
    let cluster = clusters
        .iter()
        .find(|c| c.name == cluster_name)?;
    
    let server = cluster.cluster.as_ref()?.server.clone()?;
    let namespace = context.namespace.unwrap_or_else(|| "default".to_string());
    
    // Detect provider type based on context/cluster name
    let provider = detect_provider(&context_name, &cluster_name, &server);
    
    Some(DiscoveredCluster {
        context_name: context_name.clone(),
        cluster_name,
        server,
        namespace,
        is_current_context: context_name == current_context,
        provider,
    })
}

/// Detect provider type from context name, cluster name, or server URL
fn detect_provider(context_name: &str, cluster_name: &str, server: &str) -> ProviderType {
    let combined = format!("{} {} {}", context_name, cluster_name, server).to_lowercase();
    
    if combined.contains("docker-desktop") || combined.contains("docker.internal") {
        ProviderType::Local
    } else if combined.contains("minikube") {
        ProviderType::Local
    } else if combined.contains("kind") {
        ProviderType::Local
    } else if combined.contains("k3") {
        ProviderType::Local
    } else if combined.contains("microk8s") {
        ProviderType::Local
    } else if combined.contains("eks") || combined.contains("amazonaws") {
        ProviderType::Aws
    } else if combined.contains("aks") || combined.contains("azure") {
        ProviderType::Azure
    } else if combined.contains("gke") || combined.contains("googleapis") {
        ProviderType::Gcp
    } else {
        ProviderType::Local
    }
}
