use anyhow::Result;
use k8s_openapi::api::core::v1::Pod;
use kube::api::AttachParams;
use kube::Api;

/// Execute a command in a pod
pub async fn exec_in_pod(
    client: kube::Client,
    namespace: &str,
    pod_name: &str,
    container: Option<&str>,
    command: Vec<String>,
) -> Result<String> {
    let pods: Api<Pod> = Api::namespaced(client, namespace);
    
    let mut attach_params = AttachParams::default();
    attach_params.stdin = false;
    attach_params.stdout = true;
    attach_params.stderr = true;
    attach_params.tty = false;
    
    if let Some(container_name) = container {
        attach_params.container = Some(container_name.to_string());
    }
    
    // Execute the command
    let mut attached = pods
        .exec(pod_name, &command, &attach_params)
        .await?;
    
    let mut output = String::new();
    
    // Read stdout
    if let Some(stdout) = attached.stdout() {
        use tokio::io::AsyncReadExt;
        let mut stdout_reader = tokio::io::BufReader::new(stdout);
        let mut buffer = String::new();
        stdout_reader.read_to_string(&mut buffer).await?;
        output.push_str(&buffer);
    }
    
    // Read stderr
    if let Some(stderr) = attached.stderr() {
        use tokio::io::AsyncReadExt;
        let mut stderr_reader = tokio::io::BufReader::new(stderr);
        let mut buffer = String::new();
        stderr_reader.read_to_string(&mut buffer).await?;
        if !buffer.is_empty() {
            output.push_str("\n[stderr]:\n");
            output.push_str(&buffer);
        }
    }
    
    Ok(output)
}

/// Get list of containers in a pod
use crate::types::{ExecRequest, ExecResponse};

/// Execute a command in a pod via Tauri command
pub async fn exec_pod_command(
    client: kube::Client,
    request: ExecRequest,
) -> Result<ExecResponse, String> {
    println!("Exec request: namespace={}, pod={}, container={:?}", request.namespace, request.pod_name, request.container);
    
    match exec_in_pod(
        client,
        &request.namespace,
        &request.pod_name,
        request.container.as_deref(),
        request.command,
    ).await {
        Ok(output) => Ok(ExecResponse {
            output,
            error: None,
        }),
        Err(e) => Ok(ExecResponse {
            output: String::new(),
            error: Some(e.to_string()),
        }),
    }
}

/// Get list of containers in a pod
pub async fn get_pod_containers(
    client: kube::Client,
    namespace: &str,
    pod_name: &str,
) -> Result<Vec<String>> {
    let pods: Api<Pod> = Api::namespaced(client, namespace);
    
    let pod = pods.get(pod_name).await?;
    
    let containers: Vec<String> = pod
        .spec
        .unwrap_or_default()
        .containers
        .iter()
        .map(|c| c.name.clone())
        .collect();
    
    Ok(containers)
}
