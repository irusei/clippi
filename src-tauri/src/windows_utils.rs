use std::{path::Path, thread::sleep, time::{Duration, Instant}};
use windows::Win32::Foundation::{HWND, LPARAM, BOOL};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowThreadProcessId,
    GetWindowTextLengthW, GetWindowTextW,
};
use libobs_window_helper::WindowInfo;

pub fn find_window_by_exe<'a>(
    windows: &'a [libobs_window_helper::WindowInfo],
    exe: &str,
) -> Option<&'a libobs_window_helper::WindowInfo> {
    let target = exe.to_lowercase();

    windows.iter().find(|w| {
        Path::new(&w.full_exe)
            .file_name()
            .map(|name| name.to_string_lossy().to_lowercase() == target)
            .unwrap_or(false)
    })
}

pub fn wait_for_window(window_exe_name: &str, timeout_secs: u64) -> Result<WindowInfo, anyhow::Error> {
    let start = Instant::now();
    loop {
        let windows = libobs_window_helper::get_all_windows(libobs_window_helper::WindowSearchMode::IncludeMinimized)?;
        
        if let Some(window) = find_window_by_exe(&windows, window_exe_name) {
            return Ok(window.clone());
        }

        if start.elapsed() > Duration::from_secs(timeout_secs) {
            return Err(anyhow::anyhow!("no window found matching '{}' after {} seconds", window_exe_name, timeout_secs));
        }

        sleep(Duration::from_millis(100));
    }
}

#[derive(Clone)]
struct Context {
    pid: u32,
    titles: Vec<String>,
}

// i love unsafe
unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let ctx = &mut *(lparam.0 as *mut Context);

    let mut pid = 0u32;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));

    if pid == ctx.pid {
        let len = GetWindowTextLengthW(hwnd);

        if len > 0 {
            let mut buf = vec![0u16; (len + 1) as usize];
            GetWindowTextW(hwnd, &mut buf);

            let title = String::from_utf16_lossy(&buf)
                .trim_end_matches('\0')
                .to_string();

            ctx.titles.push(title);
        }
    }

    true.into()
}

pub fn get_titles(pid: u32) -> Vec<String> {
    let mut ctx = Context {
        pid,
        titles: Vec::new(),
    };

    unsafe {
       let _ = EnumWindows(Some(enum_proc), LPARAM(&mut ctx as *mut _ as isize));
    }

    ctx.titles
}