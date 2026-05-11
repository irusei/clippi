use std::{fs, path::Path, process::Command};

fn main() {
    let installer_dir = Path::new("../installer");

    let target_exe = installer_dir.join("target/release/installer.exe");
    let dest_exe = Path::new("installer.exe");

    let status = Command::new("cargo")
        .arg("build")
        .arg("--release")
        .current_dir(installer_dir)
        .status()
        .expect("failed to run cargo build for installer"); 

    if !status.success() {
        panic!("building installer failed");
    }

    fs::copy(&target_exe, &dest_exe)
        .unwrap_or_else(|e| panic!("failed to copy installer.exe: {}", e));

    tauri_build::build()
}
