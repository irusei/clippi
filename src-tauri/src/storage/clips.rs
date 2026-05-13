use std::{fs::{self, File, OpenOptions}, io::Write, path::PathBuf, sync::{LazyLock, Mutex}};

use serde::{Deserialize, Serialize};

use crate::{ffmpeg::{self, ffprobe}, send_clips, storage::{games::DetectedGameData, settings::get_clipping_folder}};

#[derive(Serialize, Deserialize, Clone, Default)]
pub enum ClipType {
    #[default]
    Recording,
    Clip // trims will be by default clips
}

fn default_uuid() -> uuid::Uuid {
    uuid::Uuid::new_v4()
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Clip {
    #[serde(default = "default_uuid")]
    pub id: uuid::Uuid,
    #[serde(default)]
    pub clip_type: ClipType,
    pub path: PathBuf,
    pub title: String,
    pub duration: u64, 
    pub game: DetectedGameData,
    pub size: u64,
    pub thumbnail: String,
    #[serde(default)]
    pub bookmarks: Vec<u128>
}

static CLIPS: LazyLock<Mutex<Vec<Clip>>> = LazyLock::new(|| {
    Mutex::new(load_from_file())
});

fn split_last_dot(s: &str) -> Option<(&str, &str)> {
    let pos = s.rfind('.')?;
    let (left, right) = s.split_at(pos);
    Some((left, &right[1..]))
}


fn load_from_file() -> Vec<Clip> {
    let mut path = get_clipping_folder();

    path.push("clips.json");

    let exists = path.exists();

    match exists {
        false => vec![],
        true => {
            let file = File::open(&path).expect("Failed to open clips.json");
            serde_json::from_reader(file).expect("Failed to deserialize json")
        }
    }
}
fn save_to_file() {
    let mut path = get_clipping_folder();

    path.push("clips.json");
    let clips = get_clips();
    let json = serde_json::to_string_pretty(&clips).expect("Failed to serialize json");

    let mut clips_file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&path)
        .expect("Failed to open clips.json");

    clips_file.write_all(json.as_bytes()).expect("Failed to write clips.json");

    // send to app
    send_clips();
}
pub fn store_clip(clip_type: ClipType, clip_path: PathBuf, game_data: DetectedGameData, bookmark_times: Vec<u128>) {
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
            path: new_path,
            title: clip_filename.to_string_lossy().to_string(),
            duration: duration,
            game: game_data,
            size: file_size,
            thumbnail: thumbnail.to_string_lossy().to_string(),
            bookmarks: bookmark_times
        });
    }
    save_to_file();
}

pub fn store_new_trim(clip_path: PathBuf, game_data: DetectedGameData) {
    // prepare move
    let clip_filename = clip_path.file_name().expect("Failed to get filename?");
    if let Some((clip_name_no_extension, extension)) = split_last_dot(&clip_filename.to_string_lossy().to_string()) {
        let mut new_path = get_clipping_folder();

        // create necessary folders for game, etc and prepare new path
        new_path.push("trims");
        new_path.push(&game_data.name);

        fs::create_dir_all(&new_path).unwrap();

        new_path.push(format!("{} - Trim {}.{}", clip_name_no_extension, fs::read_dir(&new_path).iter().len() + 1, extension));

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

        ffmpeg::ffmpeg::extract_middle_frame(&new_path, &thumbnail).expect("Failed to get thumbnail");
        
        // add to clips and save
        {
            let mut clips_locked = CLIPS.lock().unwrap();
            clips_locked.push(Clip {
                id: uuid::Uuid::new_v4(),
                clip_type: ClipType::Clip,
                path: new_path.clone(),
                title: new_path.file_name().unwrap().to_string_lossy().to_string(),
                duration: duration,
                game: game_data,
                size: file_size,
                thumbnail: thumbnail.to_string_lossy().to_string(),
                bookmarks: Vec::new() // reset bookmarks, maybe it's better if we don't?
            });

        }
        save_to_file();
    }


}

pub fn delete_clip(clip: Clip) {
    // delete clip from fs
    fs::remove_file(&clip.path).expect("Failed to delete clip");
    fs::remove_file(&clip.thumbnail).expect("Failed to delete clip thumbnail");
    
    {   
        let mut clips = CLIPS.lock().unwrap();
        clips.retain(|c| c.path != clip.path);
    }

    save_to_file();
}

pub fn get_clips() -> Vec<Clip> {
    let clips_locked= CLIPS.lock().unwrap();
    let cc = &*clips_locked;
    return cc.iter().cloned().collect();
}

pub fn reload_clips() {
    let mut clips_locked = CLIPS.lock().unwrap();
    *clips_locked = load_from_file();
}