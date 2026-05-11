use std::{env, fs::{self}, io::Cursor, path::{Path}};

use anyhow::{Result, bail};
use sha2::{Digest, Sha256};
use zip::ZipArchive;

static OBS_DOWNLOAD_URL: &str = "https://github.com/obsproject/obs-studio/releases/download/32.1.2/OBS-Studio-32.1.2-Windows-x64.zip";
static OBS_CHECKSUM: &str = "8d97e4563bd8d22d03e63042aa7dccede1d555c9bd35ce8a9e5019b0d0201bf6";

static FFMPEG_DOWNLOAD_URL: &str = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip";

fn set_cwd_to_exe_dir() -> std::io::Result<()> {
    let exe_path = env::current_exe()?;
    let exe_dir = exe_path
        .parent()
        .expect("exe has no parent directory");

    env::set_current_dir(exe_dir)?;
    Ok(())
}

fn strip_zip_root(path: &str) -> Option<&str> {
    let mut parts = path.splitn(2, '/');
    parts.next()?;
    parts.next()  
}

async fn fetch_obs() -> Result<()> {
    println!("fetching obs");
    if fs::exists("obs.dll")? {
        println!("obs exists");
        return Ok(());
    }

    let obs_bytes = reqwest::get(OBS_DOWNLOAD_URL).await?.bytes().await?;

    // check checksum
    let mut hasher = Sha256::new();
    Digest::update(&mut hasher, &obs_bytes);

    let checksum = hex::encode(hasher.finalize());

    if checksum != OBS_CHECKSUM {
        bail!("invalid obs checksum")
    }

    // create and extract archive
    let reader = Cursor::new(obs_bytes);
    let mut archive = ZipArchive::new(reader)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;

        let name = file.name(); // do not strip for obs

        let stripped = name.strip_prefix("bin/64bit/").unwrap_or(name);

        let out_path = Path::new("./").join(stripped);

        if file.is_dir() {
            fs::create_dir_all(&out_path)?;
            continue;
        }

        println!("writing file: {}", out_path.display());

        let mut out_file = fs::File::create(&out_path)?;
        std::io::copy(&mut file, &mut out_file)?;
    }

    Ok(())
}

async fn fetch_ffmpeg() -> Result<()> {
    println!("fetching ffmpeg");
    if fs::exists("ffmpeg.exe")? {
        println!("ffmpeg exists");
        return Ok(());
    }

    let ffmpeg_bytes = reqwest::get(FFMPEG_DOWNLOAD_URL).await?.bytes().await?;

    // Checking checksum is not possible due to the retention policy for this :(
    
    // check checksum
    // let mut hasher = Sha256::new();
    // Digest::update(&mut hasher, &ffmpeg_bytes);

    // let checksum = hex::encode(hasher.finalize());

    // if checksum != FFMPEG_CHECKSUM {
    //     bail!("invalid ffmpeg checksum")
    // }

    // create and extract archive
    let reader = Cursor::new(ffmpeg_bytes);
    let mut archive = ZipArchive::new(reader)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;

        let name = match strip_zip_root(file.name()) {
            Some(n) => n,
            None => continue,
        };

        if !name.starts_with("bin/") {
            continue;
        }

        let stripped = name.strip_prefix("bin/").unwrap();
        let out_path = Path::new(".").join(stripped);

        if file.is_dir() {
            fs::create_dir_all(&out_path)?;
            continue;
        }

        println!("writing file: {}", out_path.display());

        let mut out_file = fs::File::create(&out_path)?;
        std::io::copy(&mut file, &mut out_file)?;
    }

    Ok(())
}

pub async fn fetch_deps() {
    set_cwd_to_exe_dir().expect("failed to set cwd");
    fetch_obs().await.expect("failed to install obs");
    fetch_ffmpeg().await.expect("failed to install ffmpeg");
}