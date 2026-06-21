use std::{thread, time::Duration};

use serde::{Deserialize, Serialize};

use crate::{
    integrations::game::{
        events::{GameIntegration, GameIntegrationResult},
        lol::league_struct::{
            LeagueCurrentPlayer, LeagueData, LeagueGameEvents, LeagueGameStats, LeaguePlayer,
        },
    },
    watcher,
};

#[derive(Default)]
pub struct LeagueGameIntegration {
    pub result: Option<LeagueResult>,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct LeagueResult {
    pub offset: u64,
    pub data: LeagueData,
}

#[typetag::serde]
impl GameIntegrationResult for LeagueResult {
    fn clip_name(&self) -> Option<String> {
        let data = &self.data;
        let riot_id = &data.current_player_data.riot_id;

        let my_player = data.players.iter().find(|p| p.riot_id == *riot_id)?;
        let my_champion = my_player.champion_name.as_str();
        let my_team = &my_player.team;
        let my_position = &my_player.position;

        let enemy_champion = data
            .players
            .iter()
            .find(|p| p.team != *my_team && p.position == *my_position)
            .map(|p| p.champion_name.as_str())
            .unwrap_or("Unknown");

        let result = data.game_events.events.iter().find_map(|e| match e {
            crate::integrations::game::lol::league_struct::LeagueGameEvent::GameEnd {
                result,
                ..
            } => Some(result),
            _ => None,
        });

        let result_str = match result {
            Some(crate::integrations::game::lol::league_struct::LeagueGameResult::Win) => "Win",
            Some(crate::integrations::game::lol::league_struct::LeagueGameResult::Lose) => "Lose",
            None => "VOD",
        };

        Some(format!(
            "{} vs {} - {}",
            my_champion, enemy_champion, result_str
        ))
    }
}

impl GameIntegration for LeagueGameIntegration {
    fn get_result(&self) -> Option<Box<dyn GameIntegrationResult>> {
        let result = self.result.clone();
        if result.is_some() {
            Some(Box::new(result.unwrap()))
        } else {
            None
        }
    }

    fn run(&mut self) {
        let mut offset: u64 = 0;

        thread::sleep(Duration::from_millis(5));

        while watcher::get_current_game().is_some() {
            let data = fetch_data();
            if data.is_ok() {
                let unwrapped_data = data.unwrap();

                // keep note when the actual game started compared to the recording
                // this should be literally impossible for it to be 0
                if offset == 0 && unwrapped_data.game_events.events.len() > 0 {
                    if let Some(start_time) = watcher::get_recording_start_time() {
                        let game_time = unwrapped_data.game_stats.game_time;

                        let elapsed_ms =
                            start_time.elapsed().unwrap_or(Duration::ZERO).as_millis() as u64;
                        let game_ms = (game_time.floor() as u64) * 1000;

                        offset = elapsed_ms.saturating_sub(game_ms);
                    }
                }

                self.result = Some(LeagueResult {
                    data: unwrapped_data,
                    offset: offset,
                });
            }

            thread::sleep(Duration::from_millis(100));
        }
    }
}

fn fetch_players() -> Result<Vec<LeaguePlayer>, Box<dyn std::error::Error>> {
    let player_list_endpoint = "https://127.0.0.1:2999/liveclientdata/playerlist";

    let client = reqwest::blocking::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()?;

    let players: Vec<LeaguePlayer> = client.get(player_list_endpoint).send()?.json()?;
    Ok(players)
}

fn fetch_current_player_data() -> Result<LeagueCurrentPlayer, Box<dyn std::error::Error>> {
    let player_data_endpoint = "https://127.0.0.1:2999/liveclientdata/activeplayer";

    let client = reqwest::blocking::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()?;

    Ok(client.get(player_data_endpoint).send()?.json()?)
}

fn fetch_game_events() -> Result<LeagueGameEvents, Box<dyn std::error::Error>> {
    let event_endpoint = "https://127.0.0.1:2999/liveclientdata/eventdata";

    let client = reqwest::blocking::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()?;

    Ok(client.get(event_endpoint).send()?.json()?)
}

fn fetch_game_stats() -> Result<LeagueGameStats, Box<dyn std::error::Error>> {
    let stats_endpoint: &str = "https://127.0.0.1:2999/liveclientdata/gamestats";

    let client = reqwest::blocking::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()?;

    Ok(client.get(stats_endpoint).send()?.json()?)
}

fn fetch_data() -> Result<LeagueData, Box<dyn std::error::Error>> {
    Ok(LeagueData {
        current_player_data: fetch_current_player_data()?,
        players: fetch_players()?,
        game_events: fetch_game_events()?,
        game_stats: fetch_game_stats()?,
    })
}
