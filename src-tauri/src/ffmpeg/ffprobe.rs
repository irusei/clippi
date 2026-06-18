use std::path::Path;

use crate::ffmpeg::process;

#[cfg(target_os = "windows")]
const FFPROBE_NAME: &str = "./ffprobe.exe";
#[cfg(target_os = "linux")]
const FFPROBE_NAME: &str = "ffprobe";

pub fn duration(path: &Path) -> f64 {
    let output = process::make(
        FFPROBE_NAME,
        &[
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            path.to_str().unwrap(),
        ],
    )
    .output()
    .unwrap();

    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse()
        .unwrap()
}
