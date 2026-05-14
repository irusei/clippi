use std::{path::PathBuf, sync::{LazyLock, Mutex}};

use tauri::{AppHandle, Emitter, Manager, menu::{Menu, MenuItem}, tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent}};

use crate::{integrations::discord::rpc, storage::{clips::Clip, games::DetectedGameData, settings::{Settings, get_clipping_folder}}};

use std::thread::spawn;

pub mod watcher;
pub mod storage;
pub mod ffmpeg;
pub mod integrations;
pub mod recorder;
pub mod detector;
pub mod windows_utils;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
static APP_HANDLE: LazyLock<Mutex<Option<AppHandle>>> = LazyLock::new(|| {
    Mutex::new(None)
});

fn send_clips() {
    let handle = APP_HANDLE.lock().unwrap();
    if let Some(handle) = &*handle {
        let mut clips = storage::clips::get_clips();
        clips.reverse();
        handle.emit("set_clips", clips).unwrap();
    }
}

fn announce_current_game(game: Option<&DetectedGameData>) {
    let handle = APP_HANDLE.lock().unwrap();
    if let Some(handle) = &*handle {
        handle.emit("set_current_game", game).unwrap();
    }
}

#[tauri::command]
fn get_clips(handle: AppHandle) -> Vec<Clip> {
    *APP_HANDLE.lock().unwrap() = Some(handle);

    let mut clips = storage::clips::get_clips();
    clips.reverse();

    clips
}

#[tauri::command]
fn open_clip_in_explorer(clip: Clip) {
    let path = PathBuf::from(clip.path);

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        Command::new("explorer")
            .args(["/select,", path.to_str().unwrap()])
            .spawn()
            .map_err(|e| e.to_string()).expect("Failed to open clip");
    }
}

#[tauri::command]
fn trim_clip(clip: Clip, start: f64, end: f64) -> bool {
    let mut output_path = get_clipping_folder();
    output_path.push(clip.path.file_name().unwrap());

    let action_count = clip.action_count[(start.floor() as usize)..=(std::cmp::min(end.floor() as usize, clip.action_count.len()))].iter().cloned().collect::<Vec<usize>>();

    match ffmpeg::ffmpeg::trim_clip(&clip.path, &output_path, start, end) {
        Ok(_) => {
            storage::clips::store_new_trim(output_path, clip.game, action_count);
            true
        },
        Err(_) => false,
    }
}

#[tauri::command]
fn delete_clip(clip: Clip) {
    storage::clips::delete_clip(clip);
}

#[tauri::command]
fn get_settings() -> Settings {
    storage::settings::get_settings()
}

#[tauri::command]
fn set_settings(new_settings: Settings) {
    storage::settings::set_settings(new_settings);
}

#[tauri::command]
fn get_games() -> Vec<DetectedGameData> {
    storage::games::get_games()
}

#[tauri::command]
fn add_game(game: DetectedGameData) {
    storage::games::add_game(game);
}

#[tauri::command]
fn remove_game(game: DetectedGameData) {
    storage::games::delete_game(game);
}

#[tauri::command]
fn edit_game(old_game: DetectedGameData, new_game: DetectedGameData) {
    storage::games::edit_game(old_game, new_game);
}

#[tauri::command]
fn get_current_game() -> Option<DetectedGameData> {
    watcher::get_current_game()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    spawn(|| {
        rpc::init();    
        watcher::init();
    });
    tauri::Builder::default()
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // 2. Budowa ikony zasobnika
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                window.hide().unwrap();
            }
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_clips, open_clip_in_explorer, trim_clip, delete_clip, get_settings, set_settings, get_games, add_game, remove_game, edit_game, get_current_game])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
