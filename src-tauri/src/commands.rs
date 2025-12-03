use crate::kubernetes;
use crate::persistence;
use crate::types::*;

/// Get cluster information
#[tauri::command]
pub async fn get_cluster_info(config: ClusterContext) -> Result<ClusterInfo, String> {
    let client = if let Some(ref kubeconfig) = config.kubeconfig {
        kubernetes::client::from_kubeconfig(kubeconfig)
            .await
            .map_err(|e| format!("Failed to create client: {}", e))?
    } else {
        kubernetes::client::from_default()
            .await
            .map_err(|e| format!("Failed to create client: {}", e))?
    };
    
    kubernetes::cluster::get_info(client)
        .await
        .map_err(|e| e.to_string())
}

/// Get workloads (pods) for a cluster
#[tauri::command]
pub async fn get_workloads(config: ClusterContext) -> WorkloadsResponse {
    let client = match (
        config.kubeconfig.as_ref().map(|kc| kubernetes::client::from_kubeconfig(kc)),
        config.kubeconfig.is_none().then(|| kubernetes::client::from_default())
    ) {
        (Some(fut), _) => match fut.await {
            Ok(c) => c,
            Err(e) => return WorkloadsResponse {
                items: vec![],
                error: Some(format!("Failed to create client: {}", e)),
            },
        },
        (None, Some(fut)) => match fut.await {
            Ok(c) => c,
            Err(e) => return WorkloadsResponse {
                items: vec![],
                error: Some(format!("Failed to create client: {}", e)),
            },
        },
        _ => return WorkloadsResponse {
            items: vec![],
            error: Some("No kubeconfig provided".to_string()),
        },
    };
    
    kubernetes::workloads::get_workloads(client, &config.id).await
}

/// Get generic resources (Services, ConfigMaps, etc.)
#[tauri::command]
pub async fn get_resources(config: ClusterContext, resource_type: String) -> ResourcesResponse {
    let client = match (
        config.kubeconfig.as_ref().map(|kc| kubernetes::client::from_kubeconfig(kc)),
        config.kubeconfig.is_none().then(|| kubernetes::client::from_default())
    ) {
        (Some(fut), _) => match fut.await {
            Ok(c) => c,
            Err(e) => return ResourcesResponse {
                items: vec![],
                error: Some(format!("Failed to create client: {}", e)),
            },
        },
        (None, Some(fut)) => match fut.await {
            Ok(c) => c,
            Err(e) => return ResourcesResponse {
                items: vec![],
                error: Some(format!("Failed to create client: {}", e)),
            },
        },
        _ => return ResourcesResponse {
            items: vec![],
            error: Some("No kubeconfig provided".to_string()),
        },
    };
    
    kubernetes::resources::get_resources(client, &resource_type).await
}

/// Save clusters to persistent storage
#[tauri::command]
pub async fn save_clusters(
    app_handle: tauri::AppHandle,
    clusters: Vec<ClusterContext>,
) -> Result<(), String> {
    persistence::save_clusters(&app_handle, clusters)
        .map_err(|e| e.to_string())
}

/// Load clusters from persistent storage
#[tauri::command]
pub async fn load_clusters(app_handle: tauri::AppHandle) -> Result<Vec<ClusterContext>, String> {
    persistence::load_clusters(&app_handle)
        .map_err(|e| e.to_string())
}

/// Discover clusters from default kubeconfig
#[tauri::command]
pub async fn discover_clusters() -> Vec<DiscoveredCluster> {
    kubernetes::discovery::discover_clusters().await
}

/// Execute a command in a pod
#[tauri::command]
pub async fn exec_pod_command(
    config: ClusterContext,
    request: ExecRequest,
) -> ExecResponse {
    let client = match (
        config.kubeconfig.as_ref().map(|kc| kubernetes::client::from_kubeconfig(kc)),
        config.kubeconfig.is_none().then(|| kubernetes::client::from_default())
    ) {
        (Some(fut), _) => match fut.await {
            Ok(c) => c,
            Err(e) => return ExecResponse {
                output: String::new(),
                error: Some(format!("Failed to create client: {}", e)),
            },
        },
        (None, Some(fut)) => match fut.await {
            Ok(c) => c,
            Err(e) => return ExecResponse {
                output: String::new(),
                error: Some(format!("Failed to create client: {}", e)),
            },
        },
        _ => return ExecResponse {
            output: String::new(),
            error: Some("No kubeconfig provided".to_string()),
        },
    };
    
    println!("Tauri Command Exec: namespace='{}', pod='{}', container={:?}", request.namespace, request.pod_name, request.container);

    match kubernetes::exec::exec_in_pod(
        client,
        &request.namespace,
        &request.pod_name,
        request.container.as_deref(),
        request.command,
    ).await {
        Ok(output) => ExecResponse {
            output,
            error: None,
        },
        Err(e) => ExecResponse {
            output: String::new(),
            error: Some(e.to_string()),
        },
    }
}

/// Get containers in a pod
#[tauri::command]
pub async fn get_pod_containers(
    config: ClusterContext,
    namespace: String,
    pod_name: String,
) -> Result<Vec<String>, String> {
    let client = if let Some(ref kubeconfig) = config.kubeconfig {
        kubernetes::client::from_kubeconfig(kubeconfig)
            .await
            .map_err(|e| format!("Failed to create client: {}", e))?
    } else {
        kubernetes::client::from_default()
            .await
            .map_err(|e| format!("Failed to create client: {}", e))?
    };
    
    kubernetes::exec::get_pod_containers(client, &namespace, &pod_name)
        .await
        .map_err(|e| e.to_string())
}
