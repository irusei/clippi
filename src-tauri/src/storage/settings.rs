use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::{LazyLock, Mutex},
};

use serde::{Deserialize, Serialize};

use crate::{
    integrations::discord::rpc, recorder::recorder::VodEncoder, storage::clips::reload_clips,
    watcher::get_current_game,
};

#[derive(Serialize, Deserialize, Clone)]
pub struct Settings {
    pub clip_path: String,
    pub resolution: (u32, u32),
    pub framerate: u32,
    pub bitrate: u32,
    pub encoder: VodEncoder,

    #[serde(default)]
    pub capture_desktop_audio: bool,
    #[serde(default)]
    pub capture_mic: bool,

    #[serde(default)]
    pub discord_rpc_enabled: bool,
    #[serde(default)]
    pub windows_autostart: bool,

    #[serde(default = "default_bookmark_key")]
    pub bookmark_key: String,

    #[serde(default = "default_recording_enabled")]
    pub recording_enabled: bool,

    #[serde(default)]
    pub upload_endpoint: Option<String>,

    #[serde(default)]
    pub upload_token: Option<String>,

    #[serde(default = "default_max_storage_limit")]
    pub max_storage_limit: String,
}

fn default_recording_enabled() -> bool {
    true
}

fn default_bookmark_key() -> String {
    String::from("F8")
}

fn default_max_storage_limit() -> String {
    String::from("Unlimited")
}

static SETTINGS: LazyLock<Mutex<Settings>> =
    LazyLock::new(|| Mutex::new(load_settings_from_file()));

pub fn get_settings() -> Settings {
    let settings_locked = SETTINGS.lock().unwrap();
    return settings_locked.clone();
}

pub fn is_over_limit(total_clip_size: u64) -> bool {
    fn remove_unit_from_max_clip_size(max_clip_size: String) -> u64 {
        max_clip_size.split_once("GB").unwrap().0.parse().unwrap()
    }

    let max_clip_size = get_settings().max_storage_limit;
    if max_clip_size == "Unlimited" {
        return false;
    }

    let gb_bytes = 1024 * 1024 * 1024;
    let max_clip_size_digit = remove_unit_from_max_clip_size(max_clip_size);

    return total_clip_size >= max_clip_size_digit * gb_bytes;
}

fn load_settings_from_file() -> Settings {
    let mut path = dirs::data_local_dir().expect("Failed to get dir for settings");
    path.push("clippi");

    fs::create_dir_all(&path).expect("Failed to create local dir");

    path.push("settings.json");

    let exists = path.exists();

    match exists {
        false => {
            let mut video_dir = dirs::video_dir().expect("Failed to get video dir");
            video_dir.push("clippi");

            fs::create_dir_all(&video_dir).expect("Failed to create local dir");

            Settings {
                clip_path: video_dir.to_string_lossy().to_string(),
                resolution: (1920, 1080),
                framerate: 60,
                bitrate: 10000,
                encoder: VodEncoder::AV1,
                capture_desktop_audio: false,
                capture_mic: false,
                discord_rpc_enabled: false,
                windows_autostart: false,
                bookmark_key: String::from("F8"),
                recording_enabled: true,
                upload_endpoint: None,
                upload_token: None,
                max_storage_limit: String::from("Unlimited"),
            }
        }
        true => {
            let file = File::open(&path).expect("Failed to open settings.json");
            serde_json::from_reader(file).expect("Failed to deserialize json")
        }
    }
}

fn save_settings_to_file() {
    let mut path = dirs::data_local_dir().expect("Failed to get dir for settings");
    path.push("clippi");

    fs::create_dir_all(&path).expect("Failed to create local dir");

    path.push("settings.json");

    let settings = get_settings();
    let json = serde_json::to_string(&settings).expect("Failed to serialize json");

    let mut settings_file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&path)
        .expect("Failed to open settings.json");

    settings_file
        .write_all(json.as_bytes())
        .expect("Failed to write settings.json");
}

pub fn get_clipping_folder() -> PathBuf {
    let settings = get_settings();
    let path = PathBuf::from(settings.clip_path);
    fs::create_dir_all(&path).unwrap();

    return path;
}

pub fn set_settings(new_settings: Settings) {
    // set discord rpc activity instantly
    let old_settings = get_settings();
    if new_settings.discord_rpc_enabled != old_settings.discord_rpc_enabled {
        if !new_settings.discord_rpc_enabled {
            rpc::clear_activity();
        } else {
            if let Some(game) = get_current_game() {
                rpc::set_activity(&game);
            } else {
                rpc::clear_activity();
            }
        }
    }

    // update autostart if changed
    if new_settings.windows_autostart != old_settings.windows_autostart {
        set_windows_autostart(new_settings.windows_autostart).unwrap();
    }

    {
        let mut settings_locked = SETTINGS.lock().unwrap();
        *settings_locked = new_settings;
    }

    save_settings_to_file();
    reload_clips();
}

#[cfg(target_os = "windows")]
pub fn set_windows_autostart(autostart: bool) -> std::io::Result<()> {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_WRITE};
    use winreg::RegKey;

    let app_path = std::env::current_exe()?.to_string_lossy().into_owned();

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    let run_key = hkcu.open_subkey_with_flags(
        "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        KEY_WRITE,
    )?;

    if autostart {
        run_key.set_value("clippi", &format!("\"{}\"", app_path))?;
    } else {
        let _ = run_key.delete_value("clippi");
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn set_windows_autostart(_autostart: bool) -> std::io::Result<()> {
    Ok(())
}
