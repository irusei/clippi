use std::{
    sync::{LazyLock, Mutex},
    thread,
    time::{Duration, SystemTime},
};

use device_query::{device_state, DeviceQuery, Keycode};
use serde::Deserialize;
use std::str::FromStr;

fn parse_bookmark_key(key_str: &str) -> Vec<Keycode> {
    key_str
        .split('+')
        .filter_map(|k| Keycode::from_str(k).ok())
        .collect()
}

use crate::{
    announce_current_game,
    detector::detector,
    integrations::{
        discord::rpc,
        game::events::{start_integration, stop_integration},
    },
    recorder::recorder::{record, RecordingSettings},
    sound,
    storage::{
        self,
        clips::{store_clip, Bookmark},
        game_preferences::{self},
        games::DetectedGameData,
        settings::{get_clipping_folder, get_settings},
        storage_info,
    },
};

use crate::platform_utils::rescan_processes;

#[cfg(target_os = "windows")]
use crate::platform_utils::{get_titles, wait_for_window};
#[cfg(target_os = "windows")]
use wmi::WMIConnection;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
pub struct Process {
    pub name: String,
    pub process_id: u32,
}

static RECORDING_START_TIME: LazyLock<Mutex<Option<SystemTime>>> =
    LazyLock::new(|| Mutex::new(None));

static CURRENT_GAME: LazyLock<Mutex<Option<DetectedGameData>>> = LazyLock::new(|| Mutex::new(None));

static CURRENT_BOOKMARKS: LazyLock<Mutex<Vec<Bookmark>>> = LazyLock::new(|| Mutex::new(vec![]));

static INPUT_ACTION_COUNT: LazyLock<Mutex<Vec<usize>>> =
    LazyLock::new(|| Mutex::new(Vec::from([0])));

static INPUT_MONITOR_RUNNING: LazyLock<Mutex<bool>> = LazyLock::new(|| Mutex::new(false));

pub fn get_current_game() -> Option<DetectedGameData> {
    return CURRENT_GAME.lock().unwrap().clone();
}

pub fn get_current_bookmarks() -> Vec<Bookmark> {
    return CURRENT_BOOKMARKS.lock().unwrap().clone();
}

pub fn get_recording_start_time() -> Option<SystemTime> {
    return RECORDING_START_TIME.lock().unwrap().clone();
}

pub fn set_current_game(current_game: Option<DetectedGameData>) {
    *CURRENT_BOOKMARKS.lock().unwrap() = Vec::new();
    *CURRENT_GAME.lock().unwrap() = current_game;
}

pub fn add_bookmark(name: String) {
    if let Some(start_time) = get_recording_start_time() {
        CURRENT_BOOKMARKS.lock().unwrap().push(Bookmark {
            name,
            timestamp: start_time.elapsed().unwrap_or(Duration::ZERO).as_millis() as u64,
        })
    }
}

pub fn set_recording_start_time(time: Option<SystemTime>) {
    *RECORDING_START_TIME.lock().unwrap() = time;
}

pub fn start_input_monitoring() {
    *INPUT_MONITOR_RUNNING.lock().unwrap() = true;
    *INPUT_ACTION_COUNT.lock().unwrap() = Vec::from([0]);

    thread::spawn(|| {
        let device_state = device_state::DeviceState::new();
        let mut bookmark_debounce = false;

        let mut previous_keys: std::collections::HashSet<Keycode> =
            std::collections::HashSet::new();
        let mut previous_mb: Vec<bool> = Vec::new();
        let mut last_action_push = SystemTime::now();
        let mut actions_this_second = 0;

        let settings = get_settings();
        let mut bookmark_keys: Vec<Keycode> = parse_bookmark_key(&settings.bookmark_key);

        // avoid bookmark keys being empty
        // if bookmark_keys is empty, there will be an automatic bookmark every 10ms due to .all() returning true
        if bookmark_keys.len() == 0 {
            bookmark_keys = vec![Keycode::F8];
        }

        loop {
            {
                if !*INPUT_MONITOR_RUNNING.lock().unwrap() {
                    break;
                }
            }

            std::thread::sleep(Duration::from_millis(10));

            let keys = device_state.get_keys();
            let mouse_buttons = device_state.get_mouse().button_pressed;

            let bookmark_keys_down = bookmark_keys.iter().all(|k| keys.contains(k));

            if bookmark_keys_down && !bookmark_debounce {
                bookmark_debounce = true;
                add_bookmark(String::from("BOOKMARK"));
                let _ = sound::play_sound(std::path::PathBuf::from("./assets/bookmark.wav"));
            } else if !bookmark_keys_down && bookmark_debounce {
                bookmark_debounce = false;
            }

            let key_difference = keys
                .clone()
                .into_iter()
                .filter(|x| !previous_keys.contains(x))
                .collect::<Vec<Keycode>>()
                .len();
            actions_this_second += key_difference;
            previous_keys = keys.into_iter().collect();

            for i in 0..previous_mb.len() {
                let previous_option = previous_mb.get(i);
                let now_option = mouse_buttons.get(i);

                if previous_option.is_some_and(|x| x == &false)
                    && now_option.is_some_and(|x| x == &true)
                {
                    actions_this_second += 1;
                }
            }

            previous_mb = mouse_buttons;

            if last_action_push.elapsed().unwrap_or(Duration::ZERO) >= Duration::from_secs(1) {
                INPUT_ACTION_COUNT.lock().unwrap().push(actions_this_second);
                actions_this_second = 0;
                last_action_push = SystemTime::now();
            }
        }
    });
}

pub fn stop_input_monitoring() {
    *INPUT_MONITOR_RUNNING.lock().unwrap() = false;
    INPUT_ACTION_COUNT.lock().unwrap().push(0);
}

pub fn get_action_count() -> Vec<usize> {
    return INPUT_ACTION_COUNT.lock().unwrap().clone();
}

pub fn handle_process(proc: Process) {
    if get_current_game().is_some() {
        return;
    }

    let filename = proc.name;
    let is_game: bool = detector::process_exists(&filename);
    if is_game {
        // wait for window
        // linux support doesn't have window waiting implemented yet, so we check on a os case basis
        #[cfg(not(target_os = "windows"))]
        let titles: Vec<String> = vec![];
        #[cfg(target_os = "windows")]
        let mut titles: Vec<String> = vec![];
        #[cfg(target_os = "windows")]
        {
            match wait_for_window(&filename, 45) {
                Ok(_) => {
                    titles = get_titles(proc.process_id);
                }
                Err(_) => println!(
                    "failed to wait for window for process {}, unable to record",
                    &filename
                ),
            }
        }
        if let Some(detected_game) = detector::get_detected_game(&filename, &titles) {
            // check global recording toggle
            let settings = get_settings();
            if !settings.recording_enabled {
                return;
            }

            // check per-game toggle
            let preferences = game_preferences::get_game_preference(&detected_game.name);
            if !preferences.enabled {
                return;
            }

            // check storage limits
            if storage::settings::is_over_limit(storage_info::calculate_clips_size()) {
                return;
            }

            let w_name = filename.clone();

            let game_resolution = preferences
                .resolution_x_override
                .zip(preferences.resolution_y_override);

            let recorder_settings = RecordingSettings {
                resolution: settings.resolution,
                game_resolution,
                framerate: settings.framerate,
                bitrate: settings.bitrate,
                folder: get_clipping_folder(),
                window_capture: detected_game.use_window_capture,
                encoder: settings.encoder,

                capture_desktop_audio: settings.capture_desktop_audio,
                capture_mic: settings.capture_mic,
            };

            let recorder_settings = recorder_settings.clone();
            let detected_game_cloned = detected_game.clone();

            // announce to frontend that we're playin a game
            announce_current_game(Some(&detected_game));

            // discord rpc stuff
            set_current_game(Some(detected_game.clone()));
            if settings.discord_rpc_enabled {
                rpc::set_activity(&detected_game);
            }

            // enable auto events
            start_integration(&detected_game);

            // start input monitoring before recording begins
            start_input_monitoring();

            if let Err(e) = record(
                w_name,
                &detected_game,
                recorder_settings,
                Box::new(move |clip_path| {
                    thread::sleep(Duration::from_secs(1));
                    let bookmarks = get_current_bookmarks();
                    let action_count = get_action_count();

                    set_current_game(None);
                    set_recording_start_time(None);
                    announce_current_game(None);
                    stop_input_monitoring();
                    let integration_result = stop_integration();
                    rpc::clear_activity();

                    store_clip(
                        crate::storage::clips::ClipType::Recording,
                        clip_path,
                        detected_game_cloned,
                        bookmarks,
                        action_count,
                        integration_result,
                    );
                }),
            ) {
                eprintln!("An error occurred while recording: {:?}", e);

                set_current_game(None);
                set_recording_start_time(None);
                announce_current_game(None);
                stop_input_monitoring();
                stop_integration();
                rpc::clear_activity();
            }
        }
    }
}
#[tokio::main]
pub async fn init() {
    match tokio::task::spawn_blocking(|| {
        #[cfg(target_os = "windows")]
        {
            let wmi_con = WMIConnection::new().expect("WMI Connection Failed");

            // get existing processes
            // i feel like doing this in a loop is less messy than the window create event, because
            // if i would need to rescan games on a game chance in the games storage
            // it would require me to spawn countless threads, whereas this could just update dynamically?
            loop {
                rescan_processes(&wmi_con);

                thread::sleep(Duration::from_secs(1));
            }
        }
        #[cfg(target_os = "linux")]
        {
            loop {
                rescan_processes();
                thread::sleep(Duration::from_secs(1));
            }
        }
    })
    .await
    {
        Ok(_) => return,
        Err(e) => println!("watcher thread crashed: {}", e),
    }
}
