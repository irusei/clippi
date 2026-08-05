#[cfg(target_os = "windows")]
use std::{
    path::Path,
    thread::sleep,
    time::{Duration, Instant},
};

#[cfg(target_os = "linux")]
use sysinfo::System;
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
};
#[cfg(target_os = "windows")]
use wmi::WMIConnection;

#[cfg(target_os = "windows")]
use libobs_window_helper::WindowInfo;

use crate::watcher::{get_current_game, handle_process, Process};

#[cfg(target_os = "windows")]
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

#[cfg(target_os = "windows")]
pub fn wait_for_window(
    window_exe_name: &str,
    timeout_secs: u64,
) -> Result<WindowInfo, anyhow::Error> {
    let start = Instant::now();
    loop {
        let windows = libobs_window_helper::get_all_windows(
            libobs_window_helper::WindowSearchMode::IncludeMinimized,
        )?;

        if let Some(window) = find_window_by_exe(&windows, window_exe_name) {
            return Ok(window.clone());
        }

        if start.elapsed() > Duration::from_secs(timeout_secs) {
            return Err(anyhow::anyhow!(
                "no window found matching '{}' after {} seconds",
                window_exe_name,
                timeout_secs
            ));
        }

        sleep(Duration::from_millis(100));
    }
}

#[cfg(target_os = "windows")]
#[derive(Clone)]
struct Context {
    pid: u32,
    titles: Vec<String>,
}

// i love unsafe
#[cfg(target_os = "windows")]
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

#[cfg(target_os = "windows")]
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

#[cfg(target_os = "linux")]
pub fn get_titles(_pid: u32) -> Vec<String> {
    vec![] // TODO: idk how to do this
}

#[cfg(target_os = "linux")]
pub fn helper_get_processes() -> Vec<Process> {
    let mut processes: Vec<Process> = vec![];
    let mut sys = System::new_all();
    sys.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        true,
        sysinfo::ProcessRefreshKind::nothing().without_tasks(),
    );

    for (pid, proc) in sys.processes() {
        use std::path::Path;

        if proc.cmd().is_empty() {
            continue;
        }

        let mut proc_name = Path::new(proc.cmd().get(0).unwrap())
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        // handle wine games with their weird windows pathing
        if proc_name.ends_with(".exe") {
            match proc_name.split("\\").last() {
                Some(new_proc_name) => {
                    proc_name = new_proc_name.to_string();
                }
                None => {}
            }
        }

        let process = Process {
            name: proc_name,
            process_id: pid.as_u32(),
        };

        processes.push(process);
    }

    processes
}

#[cfg(target_os = "windows")]
pub fn helper_get_processes() -> Vec<Process> {
    let wmi_con = match WMIConnection::new() {
        Ok(con) => con,
        Err(_) => return vec![],
    };

    wmi_con
        .raw_query("SELECT Name, ProcessId, ExecutablePath FROM Win32_Process")
        .unwrap()
}

#[cfg(target_os = "windows")]
pub fn rescan_processes(wmi_con: &WMIConnection) {
    if get_current_game().is_none() {
        let processes: Vec<Process> = wmi_con
            .raw_query("SELECT Name, ProcessId, ExecutablePath FROM Win32_Process")
            .unwrap();

        for proc in processes {
            handle_process(proc);
        }
    }
}

#[cfg(target_os = "linux")]
pub fn rescan_processes() {
    if get_current_game().is_none() {
        for proc in helper_get_processes() {
            handle_process(proc);
        }
    }
}

#[cfg(target_os = "windows")]
pub fn list_processes() -> Vec<String> {
    let mut names: Vec<String> = helper_get_processes()
        .iter()
        .map(|p| p.name.clone())
        .collect();

    names.sort();
    names.dedup();
    names
}

#[cfg(target_os = "linux")]
pub fn list_processes() -> Vec<String> {
    helper_get_processes()
        .iter()
        .map(|proc| proc.name.clone())
        .collect::<Vec<String>>()
}
