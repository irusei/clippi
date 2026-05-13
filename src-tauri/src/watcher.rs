use serde::Deserialize;
use wmi::{WMIConnection};

use crate::{announce_current_game, detector::detector, recorder::recorder::{RecordingSettings, record}, storage::{clips::store_clip, settings::{get_clipping_folder, get_settings}}, windows_utils::{get_titles, wait_for_window}};

#[derive(Deserialize, Debug)]
#[serde(rename = "__InstanceCreationEvent")]
struct NewProcessEvent {
    #[serde(rename = "TargetInstance")]
    target_instance: Process,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "PascalCase")]
struct Process {
    name: String,
    process_id: u32,
}

fn handle_process(proc: Process) {
    let filename = proc.name;
    let is_game: bool = detector::process_exists(&filename);
    if is_game {
        // wait for window
        println!("FOUND GAME: {}", &filename);
        match wait_for_window(&filename, 45) { 
            Ok(_) => {
                let titles = get_titles(proc.process_id);
                let default_title = String::from("");
                let window_title = titles.get(0).unwrap_or(&default_title);
                println!("MATCHED WINDOW TITLE: {}", window_title);
                if let Some(detected_game) = detector::get_detected_game(&filename, window_title) {
                    let w_name = filename.clone();
                    
                    let settings = get_settings();

                    let recorder_settings = RecordingSettings {
                        resolution: settings.resolution,
                        framerate: settings.framerate,
                        bitrate: settings.bitrate,
                        folder: get_clipping_folder(),
                        window_capture: detected_game.use_window_capture,
                        encoder: settings.encoder,

                        capture_desktop_audio: settings.capture_desktop_audio,
                        capture_mic: settings.capture_mic
                    };

                    // announce to frontend that we're playin a game
                    announce_current_game(Some(&detected_game));

                    std::thread::spawn({
                        let w_name = w_name.clone();         
                        let recorder_settings = recorder_settings.clone();
                        let detected_game_cloned = detected_game.clone();

                        move || {
                            if let Err(e) = record(w_name, &detected_game, recorder_settings,
                                Box::new(move |(clip_path, bookmark_times)| {
                                    store_clip(crate::storage::clips::ClipType::Recording, clip_path, detected_game_cloned, bookmark_times);
                                    announce_current_game(None); // finished gaming
                                })
                            ) {
                                eprintln!("An error occurred while recording: {:?}", e);
                            }
                        }
                    });
                }
            },
            Err(_) => println!("failed to wait for window for process {}, unable to record", &filename)
        }
    }
}
#[tokio::main]
pub async fn init() {
    tauri::async_runtime::spawn(async {
        let wmi_con = WMIConnection::new().expect("WMI Connection Failed");

        // get existing processes
        let processes: Vec<Process> = wmi_con.raw_query("SELECT Name, ProcessId FROM Win32_Process").unwrap();

        for proc in processes {
            handle_process(proc);
        }

        // new process event
        let iterator = wmi_con
            .exec_notification_query(
                "SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Process'"
            ).expect("Query Failed");

        for result in iterator {
            match result {
                Ok(wrapper) => {
                    let event: NewProcessEvent = wrapper.into_desr().expect("Failed to deserialize");
                    handle_process(event.target_instance);
                }
                Err(e) => eprintln!("Notification error: {:?}", e),
            }
        }
    }).await.unwrap();
}