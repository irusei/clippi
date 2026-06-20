use std::path::PathBuf;

use serde::Serialize;

use crate::storage::{clips::get_clips, settings::get_clipping_folder};

#[derive(Serialize, Clone)]
pub struct StorageInfo {
    pub clipping_folder: String,
    pub total_space: u64,
    pub free_space: u64,
    pub used_space: u64,
    pub clips_size: u64,
}

pub fn get_storage_info() -> StorageInfo {
    let clipping_folder = get_clipping_folder();
    let path = clipping_folder.to_string_lossy().to_string();

    let (total_space, free_space) = get_disk_space(&clipping_folder);
    let used_space = total_space.saturating_sub(free_space);
    let clips_size = calculate_clips_size();

    StorageInfo {
        clipping_folder: path,
        total_space,
        free_space,
        used_space,
        clips_size,
    }
}

pub fn calculate_clips_size() -> u64 {
    get_clips().iter().map(|c| c.size).sum()
}

fn get_disk_space(path: &PathBuf) -> (u64, u64) {
    let total = fs2::total_space(&path).unwrap_or(0);
    let free = fs2::free_space(&path).unwrap_or(0);
    (total, free)
}
