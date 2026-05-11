// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod deps;

#[cfg(not(target_os = "windows"))]
compile_error!("This application only supports Windows.");

#[tokio::main]
async fn main() {
    #[cfg(not(target_os = "windows"))]
    std::process::exit(0);

    deps::fetch_deps().await;
}