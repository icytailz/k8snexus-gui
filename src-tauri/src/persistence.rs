use anyhow::Result;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

use crate::types::ClusterContext;

/// Get the path to the clusters.json file in the app data directory
fn get_clusters_file_path(app_handle: &tauri::AppHandle) -> Result<PathBuf> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    fs::create_dir_all(&app_data_dir)?;
    Ok(app_data_dir.join("clusters.json"))
}

/// Save clusters to persistent storage
pub fn save_clusters(
    app_handle: &tauri::AppHandle,
    clusters: Vec<ClusterContext>,
) -> Result<()> {
    let file_path = get_clusters_file_path(app_handle)?;
    let json = serde_json::to_string_pretty(&clusters)?;
    fs::write(file_path, json)?;
    Ok(())
}

/// Load clusters from persistent storage
pub fn load_clusters(app_handle: &tauri::AppHandle) -> Result<Vec<ClusterContext>> {
    let file_path = get_clusters_file_path(app_handle)?;
    
    if !file_path.exists() {
        return Ok(vec![]);
    }
    
    let contents = fs::read_to_string(file_path)?;
    let clusters: Vec<ClusterContext> = serde_json::from_str(&contents)?;
    Ok(clusters)
}
