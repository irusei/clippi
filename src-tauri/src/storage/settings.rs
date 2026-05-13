use std::{fs::{self, File, OpenOptions}, io::Write, path::PathBuf, sync::{LazyLock, Mutex}};

use serde::{Deserialize, Serialize};

use crate::{integrations::discord::rpc, recorder::recorder::VodEncoder, storage::clips::reload_clips, watcher::get_current_game};


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
}

static SETTINGS: LazyLock<Mutex<Settings>> = LazyLock::new(|| {
    Mutex::new(load_settings_from_file())
});

pub fn get_settings() -> Settings {
    let settings_locked = SETTINGS.lock().unwrap();
    return settings_locked.clone();
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
    let json = serde_json::to_string_pretty(&settings).expect("Failed to serialize json");

    let mut settings_file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&path)
        .expect("Failed to open settings.json");

    settings_file.write_all(json.as_bytes()).expect("Failed to write settings.json");
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

    {
        let mut settings_locked = SETTINGS.lock().unwrap();
        *settings_locked = new_settings;
    }

    save_settings_to_file();
    reload_clips();
}