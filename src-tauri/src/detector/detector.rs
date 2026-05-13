use regex::Regex;

use crate::storage::games::{DetectedGameData, get_games};

pub fn process_exists(filename: &String) -> bool {
    get_games()
        .iter()
        .any(|game| game.executables.contains(filename))
}

pub fn get_detected_game(filename: &String, window_titles: &Vec<String>) -> Option<DetectedGameData> {
    let games: Vec<DetectedGameData> = get_games()
        .iter()
        .filter(|game| game.executables.contains(filename))
        .cloned().collect();
    
    for game in games {
        if game.title_regex.len() == 0 {
            return Some(game) // return game if no title to match for it
        }
        for window_title in window_titles {
            for match_regex in &game.title_regex {
                match Regex::new(&match_regex) {
                    Ok(re) => {
                        match re.is_match(&window_title) {
                            true => return Some(game),
                            false => continue
                        }
                    },
                    Err(_) => {
                        println!("invalid regex pattern for game {}", &game.name);
                        return None;
                    }
                }
            }
        }
    }
    
    None
}
