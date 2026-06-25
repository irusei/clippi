use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::{LazyLock, Mutex},
};

use log::{error, info};
use serde::{Deserialize, Serialize};

use crate::{
    ffmpeg::{self, ffprobe},
    integrations::game::events::GameIntegrationResult,
    send_clips,
    storage::{self, games::DetectedGameData, settings::get_clipping_folder},
    uploader,
};

#[derive(Serialize, Deserialize, Clone, Default)]
pub enum ClipType {
    #[default]
    Recording,
    Clip, // trims will be by default clips
}

fn default_uuid() -> uuid::Uuid {
    uuid::Uuid::new_v4()
}

#[derive(Clone, Deserialize, Serialize)]
pub struct Bookmark {
    pub name: String,
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Clip {
    #[serde(default = "default_uuid")]
    pub id: uuid::Uuid,
    #[serde(default)]
    pub clip_type: ClipType,
    pub path: String,
    pub title: String,
    pub duration: u64,
    pub game: DetectedGameData,
    pub size: u64,
    pub thumbnail: String,
    #[serde(default)]
    pub bookmarks: Vec<Bookmark>,
    #[serde(default)]
    pub action_count: Vec<usize>,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub integration_result: Option<Box<dyn GameIntegrationResult>>,
    #[serde(default)]
    pub remote_path: Option<String>,
    #[serde(default)]
    pub favorited: bool,
}

static CLIPS: LazyLock<Mutex<Vec<Clip>>> = LazyLock::new(|| Mutex::new(load_from_file()));

fn split_last_dot(s: &str) -> Option<(&str, &str)> {
    let pos = s.rfind('.')?;
    let (left, right) = s.split_at(pos);
    Some((left, &right[1..]))
}

pub fn prefix_path(clip_path: &str) -> String {
    let clip_path = clip_path.trim_start_matches('/');

    let folder = get_clipping_folder()
        .to_string_lossy()
        .replace('\\', "/")
        .trim_end_matches('/')
        .to_string();

    format!("{}/{}", folder, clip_path)
}

pub fn clean_path(clip_path: &str) -> String {
    let folder = get_clipping_folder().to_string_lossy().replace('\\', "/");

    let path = clip_path.replace('\\', "/");

    path.strip_prefix(&folder).unwrap_or(&path).to_string()
}

fn load_from_file() -> Vec<Clip> {
    let mut path = get_clipping_folder();

    path.push("clips.json");

    let exists = path.exists();

    match exists {
        false => vec![],
        true => {
            let file = File::open(&path).expect("Failed to open clips.json");
            let clips: Vec<Clip> =
                serde_json::from_reader(file).expect("Failed to deserialize json");

            clips
                .iter()
                .cloned()
                .filter(|clip| PathBuf::from(prefix_path(&clip.path)).exists())
                .collect::<Vec<Clip>>()
        }
    }
}
fn save_to_file() {
    let mut path = get_clipping_folder();

    path.push("clips.json");
    let clips = get_clips();
    let json = serde_json::to_string(&clips).expect("Failed to serialize json");

    let mut clips_file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&path)
        .expect("Failed to open clips.json");

    clips_file
        .write_all(json.as_bytes())
        .expect("Failed to write clips.json");

    // send to app
    send_clips();
}
pub fn store_clip(
    clip_type: ClipType,
    clip_path: PathBuf,
    game_data: DetectedGameData,
    bookmark_times: Vec<Bookmark>,
    action_count: Vec<usize>,
    integration_result: Option<Box<dyn GameIntegrationResult>>,
) {
    let clip_name = integration_result.as_ref().and_then(|r| r.clip_name());
    // prepare move
    let clip_filename = clip_path.file_name().expect("Failed to get filename?");
    let mut new_path = get_clipping_folder();

    // create necessary folders for game, etc and prepare new path
    new_path.push("clips");
    new_path.push(&game_data.name);

    fs::create_dir_all(&new_path).unwrap();

    new_path.push(clip_filename);

    // move
    fs::rename(&clip_path, &new_path).unwrap();

    // get size (in bytes), duration of mp4
    let metadata = fs::metadata(&new_path).unwrap(); // file exists, can unwrap
    let file_size = metadata.len();

    let duration = ffprobe::duration(&new_path) as u64;
    // generate thumbnail
    let mut thumbnail = get_clipping_folder();
    thumbnail.push("thumbnails");
    thumbnail.push(&game_data.name);

    fs::create_dir_all(&thumbnail).unwrap();

    thumbnail.push(clip_filename.to_string_lossy().to_string() + ".jpg");

    ffmpeg::ffmpeg::extract_middle_frame(&new_path, &thumbnail).expect("Failed to get thumbnail");
    // add to clips and save
    {
        let mut clips_locked = CLIPS.lock().unwrap();
        clips_locked.push(Clip {
            id: uuid::Uuid::new_v4(),
            clip_type: clip_type,
            path: clean_path(&new_path.to_string_lossy().to_string()),
            title: clip_name.unwrap_or_else(|| format!("{} VOD", &game_data.name)),
            duration: duration,
            game: game_data,
            size: file_size,
            thumbnail: clean_path(&thumbnail.to_string_lossy().to_string()),
            bookmarks: bookmark_times,
            action_count: action_count,
            date: chrono::Local::now().format("%Y-%m-%d %H:%M").to_string(),
            integration_result: integration_result,
            remote_path: None,
            favorited: false,
        });
    }
    info!("clip stored ({}s, {} bytes)", duration, file_size);
    save_to_file();
}

pub fn store_new_trim(clip_path: PathBuf, game_data: DetectedGameData, action_count: Vec<usize>) {
    // prepare move
    let clip_filename = clip_path.file_name().expect("Failed to get filename?");
    if let Some((_clip_name_no_extension, extension)) =
        split_last_dot(&clip_filename.to_string_lossy().to_string())
    {
        let mut new_path = get_clipping_folder();

        // create necessary folders for game, etc and prepare new path
        new_path.push("trims");
        new_path.push(&game_data.name);

        fs::create_dir_all(&new_path).unwrap();

        new_path.push(format!(
            "{} - Trim.{}",
            chrono::Local::now().format("%Y-%m-%d %H-%M-%S").to_string(),
            extension
        ));

        // move
        fs::rename(&clip_path, &new_path).unwrap();

        // get size (in bytes), duration of mp4
        let metadata = fs::metadata(&new_path).unwrap(); // file exists, can unwrap
        let file_size = metadata.len();

        let duration = ffprobe::duration(&new_path) as u64;
        // generate thumbnail
        let mut thumbnail = get_clipping_folder();
        thumbnail.push("thumbnails");
        thumbnail.push(&game_data.name);

        fs::create_dir_all(&thumbnail).unwrap();

        thumbnail.push(new_path.file_name().unwrap().to_string_lossy().to_string() + ".jpg");

        ffmpeg::ffmpeg::extract_middle_frame(&new_path, &thumbnail)
            .expect("Failed to get thumbnail");

        // add to clips and save
        {
            let mut clips_locked = CLIPS.lock().unwrap();
            clips_locked.push(Clip {
                id: uuid::Uuid::new_v4(),
                clip_type: ClipType::Clip,
                path: clean_path(&new_path.clone().to_string_lossy().to_string()),
                title: format!("{} - Trim", &game_data.name),
                duration: duration,
                game: game_data,
                size: file_size,
                thumbnail: clean_path(&thumbnail.to_string_lossy().to_string()),
                bookmarks: Vec::new(), // TODO: make this stay
                action_count: action_count,
                date: chrono::Local::now().format("%Y-%m-%d %H:%M").to_string(),
                integration_result: None, // TODO: make this stay
                remote_path: None,
                favorited: false,
            });
        }
        info!(
            "trim stored: {} - Trim.{} ({}s, {} bytes)",
            chrono::Local::now().format("%Y-%m-%d %H-%M-%S").to_string(),
            extension,
            duration,
            file_size
        );
        save_to_file();
    }
}

pub fn delete_clip(clip: Clip) {
    info!("deleting clip: {}", clip.title);

    // delete clip from fs
    let clip_path = prefix_path(&clip.path);
    let clip_thumbnail_path = prefix_path(&clip.thumbnail);
    fs::remove_file(&clip_path).expect("Failed to delete clip");
    fs::remove_file(&clip_thumbnail_path).expect("Failed to delete clip thumbnail");

    {
        let mut clips = CLIPS.lock().unwrap();
        clips.retain(|c| c.path != clip.path);
    }

    save_to_file();
}

pub async fn upload_clip(app: tauri::AppHandle, clip: Clip) -> Result<String, String> {
    info!("uploading clip: {}", clip.title);

    let settings = storage::settings::get_settings();

    let endpoint = settings
        .upload_endpoint
        .as_ref()
        .ok_or_else(|| "No upload endpoint configured".to_string())?;
    let token = settings
        .upload_token
        .as_ref()
        .ok_or_else(|| "No upload token configured".to_string())?;

    let full_path_buf = PathBuf::from(&clip.path);

    let remote_url = uploader::upload_clip(app, endpoint, token, &full_path_buf)
        .await
        .map_err(|e| {
            error!("upload failed for '{}': {}", clip.title, e);
            e.to_string()
        })?;

    // update clip with remote_path
    {
        let mut clips = CLIPS.lock().unwrap();
        for c in clips.iter_mut() {
            if c.id == clip.id {
                c.remote_path = Some(remote_url.clone());
                break;
            }
        }
    }
    save_to_file();

    info!("clip uploaded: {}", clip.title);
    Ok(remote_url)
}
pub fn get_clips() -> Vec<Clip> {
    let clips_locked = CLIPS.lock().unwrap();
    let cc = &*clips_locked;
    return cc.iter().cloned().collect();
}

pub fn reload_clips() {
    let mut clips_locked = CLIPS.lock().unwrap();
    *clips_locked = load_from_file();
}

pub fn rename_clip(clip: Clip, new_title: String) {
    {
        let mut clips = CLIPS.lock().unwrap();
        for c in clips.iter_mut() {
            if c.id == clip.id {
                c.title = new_title;
                break;
            }
        }
    }
    save_to_file();
}

pub fn toggle_favorite(clip: Clip) {
    {
        let mut clips = CLIPS.lock().unwrap();
        for c in clips.iter_mut() {
            if c.id == clip.id {
                c.favorited = !c.favorited;
                break;
            }
        }
    }
    save_to_file();
}
