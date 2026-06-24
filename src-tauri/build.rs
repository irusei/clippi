#[cfg(target_os = "windows")]
fn main() {
    use std::{fs, path::Path, process::Command};
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

    // fix app requiring dependencies on npm run tauri dev
    let second_dest_exe = Path::new("target/debug/installer.exe");

    fs::create_dir_all(second_dest_exe.parent().unwrap()).unwrap();
    fs::copy(&target_exe, &second_dest_exe)
        .unwrap_or_else(|e| panic!("failed to copy installer.exe: {}", e));

    Command::new(second_dest_exe)
        .spawn()
        .unwrap()
        .wait()
        .unwrap();

    tauri_build::build()
}

#[cfg(target_os = "linux")]
fn main() {
    tauri_build::build()
}
