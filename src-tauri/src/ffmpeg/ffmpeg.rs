use std::{path::PathBuf, process::Command};

use crate::ffmpeg::ffprobe;

#[cfg(target_os = "windows")]
const FFMPEG_NAME: &str = "./ffmpeg.exe";
#[cfg(target_os = "linux")]
const FFMPEG_NAME: &str = "ffmpeg";

pub fn extract_middle_frame(
    input: &PathBuf,
    output: &PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    let duration = ffprobe::duration(input);
    let midpoint = duration / 2.0;

    let status = Command::new(FFMPEG_NAME)
        .args([
            "-ss",
            &midpoint.to_string(),
            "-i",
            &input.to_string_lossy().to_string(),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            "-update",
            "1",
            &output.to_string_lossy().to_string(),
            "-y",
        ])
        .status()?;

    if !status.success() {
        return Err("ffmpeg failed".into());
    }

    Ok(())
}

pub fn trim_clip(
    input: &PathBuf,
    output: &PathBuf,
    start: f64,
    end: f64,
) -> Result<(), Box<dyn std::error::Error>> {
    let duration = end - start;

    if duration <= 0.0 {
        return Err("Invalid trim range".into());
    }

    let status = Command::new(FFMPEG_NAME)
        .args([
            "-ss",
            &start.to_string(),
            "-i",
            &input.to_string_lossy(),
            "-t",
            &duration.to_string(),
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-preset",
            "fast",
            "-y",
            &output.to_string_lossy(),
        ])
        .status()?;

    if !status.success() {
        return Err("ffmpeg failed".into());
    }

    Ok(())
}
