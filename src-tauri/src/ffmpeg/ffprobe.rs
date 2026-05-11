use std::process::Command;
use std::path::Path;

pub fn duration(path: &Path) -> f64 {
    let output = Command::new("./ffprobe.exe")
        .args([
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            path.to_str().unwrap(),
        ])
        .output()
        .unwrap();

    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse()
        .unwrap()
}
