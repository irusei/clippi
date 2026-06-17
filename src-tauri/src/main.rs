// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

fn set_cwd_to_exe_dir() -> std::io::Result<()> {
    let exe_path = env::current_exe()?;
    let exe_dir = exe_path.parent().expect("exe has no parent directory");

    env::set_current_dir(exe_dir)?;
    Ok(())
}

#[cfg(target_os = "linux")]
fn has_nvidia_gpu() -> bool {
    std::fs::metadata("/sys/module/nvidia").is_ok()
}

#[tokio::main]
async fn main() {
    #[cfg(target_os = "linux")]
    if has_nvidia_gpu() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    set_cwd_to_exe_dir().expect("failed to set cwd");
    clippi_lib::run()
}
