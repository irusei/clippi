use device_query::{DeviceQuery, Keycode, device_state};
use libobs_simple::{
    output::{simple::{HardwarePreset, ObsContextSimpleExt, X264Preset}},
    sources::{ObsObjectUpdater, ObsSourceBuilder, windows::{ObsGameCaptureMode, ObsWindowCaptureMethod}},
};
use libobs_wrapper::{
    context::ObsContext,
    data::{output::{ObsOutputTrait}, video::ObsVideoInfoBuilder},
    scenes::{SceneItemExtSceneTrait, SceneItemTrait},
    utils::{ObsPath, StartupInfo},
};
use libobs_window_helper::{WindowSearchMode};
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, path::PathBuf, time::{Duration, SystemTime, UNIX_EPOCH}};

use crate::{sound, storage::games::DetectedGameData, watcher, windows_utils::{find_window_by_exe, wait_for_window}};

type OnFinishedCallback = Box<dyn FnOnce((PathBuf, Vec<usize>)) + Send>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VodEncoder {
    X264,
    H264,
    HEVC,
    AV1
}

#[derive(Debug, Clone)]
pub struct RecordingSettings {
    pub resolution: (u32, u32),
    pub framerate: u32,
    pub bitrate: u32,
    pub folder: PathBuf,
    pub window_capture: bool,
    pub encoder: VodEncoder,

    pub capture_mic: bool,
    pub capture_desktop_audio: bool
}

fn get_date_format() -> String {
    let now = SystemTime::now();
    let secs_since_epoch = now
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();

    let days = secs_since_epoch / 86400;
    let seconds_today = secs_since_epoch % 86400;
    let hours = seconds_today / 3600;
    let minutes = (seconds_today % 3600) / 60;
    let seconds = seconds_today % 60;

    let year = 1970 + days / 365;
    let month = (days % 365) / 30 + 1;
    let day = (days % 365) % 30 + 1;

    let date = format!(
        "{:04}-{:02}-{:02} {:02}-{:02}-{:02}",
        year, month, day, hours, minutes, seconds
    );

    date
}

pub fn record(
    window_exe_name: String,
    game: &DetectedGameData,
    settings: RecordingSettings,
    on_finished: OnFinishedCallback
) -> anyhow::Result<()> {

    let date = get_date_format();
    let output_file = format!("{} - {}.mp4", date, game.name);

    let full_path = settings.folder.join(output_file);

    let output_path = full_path.to_string_lossy().to_string();

    let video_info = ObsVideoInfoBuilder::new()
        .base_width(settings.resolution.0)
        .base_height(settings.resolution.1)
        .output_width(settings.resolution.0)
        .output_height(settings.resolution.1)
        .fps_num(settings.framerate)
        .fps_den(1)
        .build();

    let startup_info = StartupInfo::new()
        .set_video_info(video_info);
    
    let mut ctx = ObsContext::new(startup_info)?;

    let window = wait_for_window(&window_exe_name, 45)?;

    let mut scene = ctx.scene("main", Some(0))?;

    if settings.window_capture {
        let mut source = ctx
            .source_builder::<libobs_simple::sources::windows::WindowCaptureSourceBuilder, _>(
                "window capture",
            )?
            .set_capture_method(ObsWindowCaptureMethod::MethodWgc)
            .build()?;

        source
            .create_updater()?
            .set_window_raw(&*window.obs_id)
            .set_capture_method(ObsWindowCaptureMethod::MethodWgc)
            .set_capture_audio(!settings.capture_desktop_audio).unwrap()
            .update()?;
        
        let item = scene.add_source(source)?;
        item.fit_source_to_screen()?;
    } else {
        let mut source = ctx
            .source_builder::<libobs_simple::sources::windows::GameCaptureSourceBuilder, _>(
                "game capture",
            )?
            .set_capture_mode(ObsGameCaptureMode::CaptureSpecificWindow)
            .build()?;

        source
            .create_updater()?
            .set_window_raw(&*window.obs_id)
            .set_capture_audio(!settings.capture_desktop_audio).unwrap()
            .set_anti_cheat_hook(true)
            .update()?;
        
        let item = scene.add_source(source)?;
        item.fit_source_to_screen()?;
    }

    // create mic input
    if settings.capture_mic {
        let mic_source = ctx
            .source_builder::<libobs_simple::sources::windows::MicAudioSourceBuilder, _>(
                "mic capture"
            )?
            .build()?;

        scene.add_source(mic_source).expect("failed to add mic source");
    }

    // create desktop audio source
    if settings.capture_desktop_audio {
        let desktop_audio_source = ctx
            .source_builder::<libobs_simple::sources::windows::DesktopAudioSourceBuilder, _>(
                "desktop audio capture"
            )?
            .build()?;

        scene.add_source(desktop_audio_source).expect("failed to add desktop audio source");
    }

    let mut output_builder = ctx
        .simple_output_builder("rec", ObsPath::new(&output_path))
        .video_bitrate(settings.bitrate);

    // set encoder
    match settings.encoder {
        VodEncoder::H264 => {
            output_builder = output_builder.hardware_encoder(libobs_simple::output::simple::HardwareCodec::H264, HardwarePreset::Quality);
        },
        VodEncoder::HEVC => {
            output_builder = output_builder.hardware_encoder(libobs_simple::output::simple::HardwareCodec::HEVC, HardwarePreset::Quality);
        },
        VodEncoder::AV1 => {
            output_builder = output_builder.hardware_encoder(libobs_simple::output::simple::HardwareCodec::AV1, HardwarePreset::Quality);
        },
        VodEncoder::X264 => {
            output_builder = output_builder.x264_encoder(X264Preset::VeryFast);
        },
    }
        
    let mut output = output_builder.build()?;
    output.start()?;

    let started_time = SystemTime::now();
    watcher::set_recording_start_time(Some(started_time));

    let window_exe = window_exe_name.clone();

    // recording loop, wait for exit
    let device_state = device_state::DeviceState::new();
    let mut f8_debounce = false;

    let mut action_count: Vec<usize> = Vec::from([0]);
    let mut previous_keys: HashSet<Keycode> = HashSet::new();
    let mut previous_mb: Vec<bool> = Vec::new();
    let mut last_action_push = SystemTime::now();
    let mut actions_this_second = 0;

    // on alt+tab, windows sometimes disappear
    // need to make sure they're gone for at least two seconds before ending the recording
    let mut window_missing_start: Option<SystemTime> = None;
    let window_missing_time_threshold = Duration::from_secs(2);

    loop {
        std::thread::sleep(Duration::from_millis(50));

        // i actually don't know the impact of this on the cpu
        let keys = device_state.get_keys();
        let mouse_buttons = device_state.get_mouse().button_pressed;

        let f8_down = keys.clone().contains(&Keycode::F8);

        if f8_down && !f8_debounce {
            f8_debounce = true;

            watcher::add_bookmark(String::from("BOOKMARK"));
            
            std::thread::spawn(|| {
                let _ = sound::play_sound(PathBuf::from("./assets/bookmark.wav"));
            });

        } else if !f8_down && f8_debounce {
            f8_debounce = false;
        }

        // calculate action count
        let key_difference = keys.clone().into_iter().filter(|x| !previous_keys.contains(x)).collect::<Vec<Keycode>>().len();
        actions_this_second += key_difference;
        previous_keys = keys.into_iter().collect();

        for i in 0..previous_mb.len() {
            let previous_option = previous_mb.get(i);
            let now_option = mouse_buttons.get(i);

            if previous_option.is_some_and(|x| x == &false) && now_option.is_some_and(|x| x == &true) {
                actions_this_second += 1;
            }
        }

        previous_mb = mouse_buttons;

        // write action count on new second
        if last_action_push.elapsed().unwrap_or(Duration::ZERO) >= Duration::from_secs(1) {
            action_count.push(actions_this_second);
            actions_this_second = 0;
            last_action_push = SystemTime::now();
        }

        // check if window is still present
        match libobs_window_helper::get_all_windows(WindowSearchMode::IncludeMinimized) {
            Ok(windows) => {
                if find_window_by_exe(&windows, &window_exe).is_none() {
                    // make sure window has been missing for atleast a couple seconds
                    window_missing_start.get_or_insert(SystemTime::now());
                } else {
                    // reset timer
                    window_missing_start = None;
                }
            }
            Err(_) => {
                window_missing_start.get_or_insert(SystemTime::now());
            }
        }

        // Break if threshold seconds were elapsed for missing window
        if let Some(window_missing_start) = window_missing_start {
            if window_missing_start.elapsed().unwrap_or(Duration::ZERO) >= window_missing_time_threshold {
                break;
            }
        }
    }

    output.stop()?;
    let path = PathBuf::from(output_path);
    println!("saved to {:?}", path);

    action_count.push(0); // padding data
    on_finished((path, action_count));

    Ok(())
}