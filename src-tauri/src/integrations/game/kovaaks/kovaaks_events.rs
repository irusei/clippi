use std::{ffi::OsString, thread, time::Duration};
use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};

use crate::platform_utils::helper_get_processes;
use crate::{
    integrations::game::{
        events::{GameIntegration, GameIntegrationResult},
        kovaaks::kovaaks_struct::{KovaaKsData, KovaaKsScenario},
    },
    watcher,
};

#[derive(Default)]
pub struct KovaaKsGameIntegration {
    pub result: Option<KovaaKsResult>,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct KovaaKsResult {
    pub data: KovaaKsData,
}

#[typetag::serde]
impl GameIntegrationResult for KovaaKsResult {
    fn clip_name(&self) -> Option<String> {
        let scenarios_count = self.data.scenarios.len();
        if scenarios_count >= 1 {
            Some(format!("KovaaK's - {} scenarios", scenarios_count))
        } else {
            None
        }
    }
}

impl GameIntegration for KovaaKsGameIntegration {
    fn get_result(&self) -> Option<Box<dyn GameIntegrationResult>> {
        let result = self.result.clone();
        if result.is_some() {
            Some(Box::new(result.unwrap()))
        } else {
            None
        }
    }

    fn run(&mut self) {
        // create a dictionary of files that have already been processed
        let mut watched_files: Vec<OsString> = vec![];

        let stats_dir = fetch_stat_dir();
        if stats_dir.is_none() {
            return;
        }

        let stats_dir = stats_dir.unwrap();

        if let Ok(files) = fs::read_dir(&stats_dir) {
            for file in files {
                if let Ok(file) = file {
                    watched_files.push(file.file_name());
                }
            }
        }

        self.result = Some(KovaaKsResult {
            data: KovaaKsData { scenarios: vec![] },
        });

        // main loop
        while watcher::get_current_game().is_some() {
            thread::sleep(Duration::from_millis(100));

            // loop over the directory
            if let Ok(files) = fs::read_dir(&stats_dir) {
                for file in files {
                    if let Ok(file) = file {
                        let file_name = file.file_name();
                        if !watched_files.iter().any(|f| f == &file_name) {
                            watched_files.push(file_name.clone());
                            let scenario = parse_csv(&file_name);
                            if scenario.is_some() {
                                self.result
                                    .as_mut()
                                    .unwrap()
                                    .data
                                    .scenarios
                                    .push(scenario.unwrap());
                            }
                        }
                    }
                }
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn fetch_kovaaks_base_dir() -> Option<PathBuf> {
    helper_get_processes()
        .iter()
        .filter(|proc| proc.name == "FPSAimTrainer-Win64-Shipping.exe")
        .filter_map(|proc| fs::read_link(format!("/proc/{}/cwd", proc.process_id)).ok())
        .next()
}

#[cfg(target_os = "windows")]
fn fetch_kovaaks_base_dir() -> Option<PathBuf> {
    helper_get_processes()
        .iter()
        .filter(|proc| proc.name == "FPSAimTrainer-Win64-Shipping.exe")
        .filter_map(|proc| {
            proc.executable_path.clone().map(|exe_path| {
                use std::path::Path;

                let path = PathBuf::from(exe_path);

                path.parent()?
                    .parent()?
                    .parent()?
                    .parent()
                    .map(Path::to_path_buf)
            })
        })
        .next()?
}
fn fetch_stat_dir() -> Option<PathBuf> {
    let base_dir = fetch_kovaaks_base_dir();
    if let Some(mut base_dir) = base_dir {
        base_dir.push("FPSAimTrainer");
        base_dir.push("stats");
        Some(base_dir)
    } else {
        None
    }
}

fn parse_csv(csv_path: &OsString) -> Option<KovaaKsScenario> {
    let extracted = extract_score_and_scenario(&csv_path);
    let rec_start_time = watcher::get_recording_start_time();

    if rec_start_time.is_none() {
        return None;
    }

    extracted.map(|extracted| KovaaKsScenario {
        name: extracted.1,
        adjusted_finish_time: rec_start_time
            .unwrap()
            .elapsed()
            .unwrap_or(Duration::ZERO)
            .as_millis() as u64,
        score: extracted.0,
    })
}

fn extract_score_and_scenario(path: &OsString) -> Option<(f64, String)> {
    let mut csv_path = PathBuf::from(fetch_stat_dir().unwrap());
    csv_path.push(&path);

    let content = fs::read_to_string(csv_path).ok()?;

    let mut score: Option<f64> = None;
    let mut scenario: Option<String> = None;

    for line in content.lines() {
        let line = line.trim();

        if let Some(v) = line.strip_prefix("Score:,") {
            score = v.parse::<f64>().ok();
        }

        if let Some(v) = line.strip_prefix("Scenario:,") {
            scenario = Some(v.to_string());
        }
    }

    score.zip(scenario)
}
