use std::{fs::{self, File, OpenOptions}, io::Write, sync::{LazyLock, Mutex}};

use serde::{Deserialize, Serialize};


#[derive(Serialize, Deserialize, Clone, PartialEq)]
pub struct DetectedGameData {
    pub name: String,
    pub icon: Option<String>,
    // these two fields hurt, they should only be visible in the games editor but I'll make them separate later. TODO
    #[serde(default)]
    pub executables: Vec<String>,
    #[serde(default)]
    pub use_window_capture: bool,
    #[serde(default)]
    pub title_regex: Vec<String>,
}

static GAMES: LazyLock<Mutex<Vec<DetectedGameData>>> = LazyLock::new(|| {
    Mutex::new(load_games_from_file())
});

pub fn get_games() -> Vec<DetectedGameData> {
    let settings_locked = GAMES.lock().unwrap();
    return settings_locked.clone();
}

pub fn add_game(game: DetectedGameData) {
    {
        let mut games = GAMES.lock().unwrap();
        games.push(game);
        games.sort_by(|a, b| a.name.cmp(&b.name));
    }
    save_games_to_file();
}

pub fn delete_game(game: DetectedGameData) {
    {
        let mut games = GAMES.lock().unwrap();
        games.retain(|game_data| !game_data.eq(&game));
        games.sort_by(|a, b| a.name.cmp(&b.name));
    }
    save_games_to_file();
}

pub fn edit_game(old_game: DetectedGameData, new_game: DetectedGameData) {
    {
        let mut locked_games = GAMES.lock().unwrap();

        if let Some(game) = locked_games.iter_mut().find(|game| **game == old_game) {
            *game = new_game;
        }
    }

    save_games_to_file();
}

fn check_for_diff(base_games: Vec<DetectedGameData>, games_file_content: Vec<DetectedGameData>) -> Vec<DetectedGameData> {
    let mut new_gfc = games_file_content.clone();
    for base_game in base_games {
        let position = games_file_content.iter().position(|file_game| file_game.name == base_game.name);
        if let Some(position) = position {
            // this has its drawbacks, but idc
            new_gfc[position] = base_game;
        } else {
            new_gfc.push(base_game);
        }
    }

    new_gfc.sort_by(|a, b| a.name.cmp(&b.name));

    return new_gfc;
}

fn load_games_from_file() -> Vec<DetectedGameData> {
    let mut path = dirs::data_local_dir().expect("Failed to get dir for games");
    path.push("clippi");

    fs::create_dir_all(&path).expect("Failed to create local dir");

    path.push("games.json");

    let exists = path.exists();

    let games = serde_json::from_str::<Vec<DetectedGameData>>(include_str!("../games.json")).expect("Failed to deserialize games.json");
    match exists {
        false => {
            games
        }
        true => {
            let file = File::open(&path).expect("Failed to open games.json");
            let games_file_content: Vec<DetectedGameData> = serde_json::from_reader(file).expect("Failed to deserialize json");
            check_for_diff(games, games_file_content)
        }
    }
}

fn save_games_to_file() {
    let mut path = dirs::data_local_dir().expect("Failed to get dir for games");
    path.push("clippi");

    fs::create_dir_all(&path).expect("Failed to create local dir");

    path.push("games.json");

    let games = get_games();
    let json = serde_json::to_string_pretty(&games).expect("Failed to serialize json");

    let mut games_file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&path)
        .expect("Failed to open settings.json");

    games_file.write_all(json.as_bytes()).expect("Failed to write games.json");
}
