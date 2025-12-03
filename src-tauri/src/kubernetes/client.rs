use anyhow::Result;
use kube::{config::KubeConfigOptions, Config};

/// Creates a Kubernetes client from a kubeconfig string
pub async fn from_kubeconfig(kubeconfig: &str) -> Result<kube::Client> {
    let config = Config::from_custom_kubeconfig(
        kube::config::Kubeconfig::from_yaml(kubeconfig)?,
        &KubeConfigOptions::default(),
    )
    .await?;
    
    Ok(kube::Client::try_from(config)?)
}

/// Creates a Kubernetes client from the default kubeconfig
pub async fn from_default() -> Result<kube::Client> {
    let config = Config::infer().await?;
    Ok(kube::Client::try_from(config)?)
}
