use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    sync::{LazyLock, Mutex},
};

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct GamePreference {
    #[serde(default)]
    pub enabled: bool,
}

static GAME_PREFERENCES: LazyLock<Mutex<std::collections::HashMap<String, GamePreference>>> =
    LazyLock::new(|| Mutex::new(load_preferences_from_file()));

pub fn get_game_preferences() -> std::collections::HashMap<String, GamePreference> {
    let prefs = GAME_PREFERENCES.lock().unwrap();
    prefs.clone()
}

pub fn set_game_preference(game_name: &str, enabled: bool) {
    {
        let mut prefs = GAME_PREFERENCES.lock().unwrap();
        prefs
            .entry(game_name.to_string())
            .or_insert_with(GamePreference::default)
            .enabled = enabled;
    }

    save_preferences_to_file();
}

pub fn is_game_enabled(game_name: &str) -> bool {
    let prefs = GAME_PREFERENCES.lock().unwrap();
    prefs.get(game_name).map(|p| p.enabled).unwrap_or(true) // default to enabled if not set
}

fn load_preferences_from_file() -> std::collections::HashMap<String, GamePreference> {
    let mut path = dirs::data_local_dir().expect("Failed to get dir for preferences");
    path.push("clippi");

    fs::create_dir_all(&path).expect("Failed to create local dir");

    path.push("game_preferences.json");

    let exists = path.exists();

    match exists {
        false => std::collections::HashMap::new(),
        true => {
            let file = File::open(&path).expect("Failed to open game_preferences.json");
            serde_json::from_reader(file).unwrap_or_else(|_| std::collections::HashMap::new())
        }
    }
}

fn save_preferences_to_file() {
    let mut path = dirs::data_local_dir().expect("Failed to get dir for preferences");
    path.push("clippi");

    fs::create_dir_all(&path).expect("Failed to create local dir");

    path.push("game_preferences.json");

    let prefs = get_game_preferences();
    let json = serde_json::to_string_pretty(&prefs).expect("Failed to serialize json");

    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&path)
        .expect("Failed to open game_preferences.json");

    file.write_all(json.as_bytes())
        .expect("Failed to write to game_preferences.json");
}
