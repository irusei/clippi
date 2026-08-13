use std::{
    path::PathBuf,
    process::Command,
    sync::{LazyLock, Mutex},
};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::{
    integrations::{discord::rpc, steamgriddb::icon},
    storage::{
        clips::{clean_path, prefix_path, Clip},
        game_preferences::{self as game_pref_storage, GamePreference},
        games::DetectedGameData,
        settings::{get_clipping_folder, Settings},
        storage_info::StorageInfo,
    },
};

use std::thread::spawn;

pub mod detector;
pub mod ffmpeg;
pub mod integrations;
pub mod platform_utils;
pub mod recorder;
pub mod sound;
pub mod storage;
pub mod uploader;
pub mod watcher;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
static APP_HANDLE: LazyLock<Mutex<Option<AppHandle>>> = LazyLock::new(|| Mutex::new(None));

fn send_clips() {
    let handle = APP_HANDLE.lock().unwrap();
    if let Some(handle) = &*handle {
        // map every clip to proper path
        let clips = storage::clips::get_clips()
            .iter()
            .rev()
            .cloned()
            .map(|mut clip| {
                clip.thumbnail = prefix_path(&clip.thumbnail);
                clip.path = prefix_path(&clip.path);
                clip
            })
            .collect::<Vec<Clip>>();
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

    // map every clip to proper path
    storage::clips::get_clips()
        .iter()
        .rev()
        .cloned()
        .map(|mut clip| {
            clip.thumbnail = prefix_path(&clip.thumbnail);
            clip.path = prefix_path(&clip.path);
            clip
        })
        .collect()
}

#[tauri::command]
fn open_clip_in_explorer(clip: Clip) {
    #[cfg(target_os = "windows")]
    {
        let path = PathBuf::from(&clip.path.replace("/", "\\"));
        Command::new("explorer")
            .args(["/select,", path.to_str().unwrap()])
            .spawn()
            .map_err(|e| e.to_string())
            .expect("Failed to open clip");
    }
    #[cfg(target_os = "linux")]
    {
        let path = PathBuf::from(&clip.path);
        let folder = path.parent().unwrap();
        Command::new("xdg-open")
            .arg(folder)
            .spawn()
            .map_err(|e| e.to_string())
            .expect("Failed to open folder");
    }
}

#[tauri::command]
fn trim_clip(clip: Clip, start: f64, end: f64) -> bool {
    let mut output_path = get_clipping_folder();

    // no need to prefix path here, as get_clips already prefixes it for the frontend and frontend returns full path
    let clip_path = PathBuf::from(&clip.path);

    output_path.push(&clip_path.file_name().unwrap());

    let action_count =
        clip.action_count[std::cmp::min(start.floor() as usize, clip.action_count.len())
            ..=(std::cmp::min(end.floor() as usize, clip.action_count.len()))]
            .iter()
            .cloned()
            .collect::<Vec<usize>>();

    match ffmpeg::ffmpeg::trim_clip(&clip_path, &output_path, start, end) {
        Ok(_) => {
            storage::clips::store_new_trim(output_path, clip.game, action_count);
            true
        }
        Err(_) => false,
    }
}

#[tauri::command]
fn delete_clip(clip: Clip) {
    let mut unprefixed_clip = clip.clone();
    unprefixed_clip.path = clean_path(&clip.path);
    unprefixed_clip.thumbnail = clean_path(&clip.thumbnail);

    storage::clips::delete_clip(unprefixed_clip);
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
fn get_game_preference(game_name: String) -> GamePreference {
    game_pref_storage::get_game_preference(&game_name)
}

#[tauri::command]
fn set_game_preference(game_name: String, preferences: GamePreference) {
    game_pref_storage::set_game_preference(&game_name, preferences);
}

#[tauri::command]
fn list_processes() -> Vec<String> {
    platform_utils::list_processes()
}

#[tauri::command]
fn rename_clip(clip: Clip, new_title: String) {
    storage::clips::rename_clip(clip, new_title);
}

#[tauri::command]
fn get_current_game() -> Option<DetectedGameData> {
    watcher::get_current_game()
}

#[tauri::command]
fn get_storage_info() -> StorageInfo {
    storage::storage_info::get_storage_info()
}

#[tauri::command]
async fn upload_clip(clip: Clip, app: tauri::AppHandle) -> Result<String, String> {
    storage::clips::upload_clip(app, clip).await
}

#[tauri::command]
fn toggle_favorite(clip: Clip) {
    storage::clips::toggle_favorite(clip);
}

#[tauri::command]
async fn search_steamgriddb(query: String) -> Result<serde_json::Value, String> {
    icon::search_steamgriddb(query).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    spawn(|| {
        rpc::init();
        watcher::init();
    });
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

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

                let _ = window.minimize();
                let _ = window.hide();
            }
        })
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let opt_window = app.get_webview_window("main");

            if let Some(window) = opt_window {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            get_clips,
            open_clip_in_explorer,
            trim_clip,
            delete_clip,
            rename_clip,
            toggle_favorite,
            get_settings,
            set_settings,
            get_games,
            add_game,
            remove_game,
            edit_game,
            get_current_game,
            list_processes,
            get_game_preference,
            set_game_preference,
            get_storage_info,
            upload_clip,
            search_steamgriddb
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
