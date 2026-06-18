// slightly yoinked from https://github.com/Djazouli/LoLGameClientAPI/blob/master/src/model.rs#L289
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaguePlayer {
    pub champion_name: String,
    pub level: u32,
    pub position: String,
    pub riot_id: String,
    pub team: String,

    pub scores: LeaguePlayerScore,
    pub runes: LeaguePartialRunes,
    pub items: Vec<LeagueItem>,
    pub summoner_spells: LeagueSummonerSpells,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaguePlayerScore {
    pub assists: u32,
    pub creep_score: u32,
    pub deaths: u32,
    pub kills: u32,
    pub ward_score: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeagueSummonerSpells {
    pub summoner_spell_one: LeagueSummonerSpell,
    pub summoner_spell_two: LeagueSummonerSpell,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeagueSummonerSpell {
    pub display_name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeagueCurrentPlayer {
    pub riot_id: String,
    pub full_runes: LeagueFullRunes,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeagueFullRunes {
    pub general_runes: Vec<LeagueRune>,
    pub keystone: LeagueRune,
    pub primary_rune_tree: LeagueRuneTree,
    pub secondary_rune_tree: LeagueRuneTree,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeagueGameStats {
    pub game_mode: String,
    pub game_time: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeagueItem {
    pub count: u32,
    pub display_name: String,
    pub price: u16,
    pub slot: u16,
}
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeagueRune {
    pub display_name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaguePartialRunes {
    pub keystone: LeagueRune,
    #[serde(rename = "primaryRuneTree")]
    pub primary_rune_tree: LeagueRuneTree,
    #[serde(rename = "secondaryRuneTree")]
    pub secondary_rune_tree: LeagueRuneTree,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeagueRuneTree {
    pub display_name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LeagueGameEvents {
    #[serde(rename = "Events")]
    pub events: Vec<LeagueGameEvent>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum LeagueGameResult {
    Win,
    Lose,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "EventName")]
pub enum LeagueGameEvent {
    GameStart {
        #[serde(rename = "EventID")]
        event_id: u32,
        #[serde(rename = "EventTime")]
        event_time: f64,
    },

    GameEnd {
        #[serde(rename = "EventID")]
        event_id: u32,
        #[serde(rename = "EventTime")]
        event_time: f64,
        #[serde(rename = "Result")]
        result: LeagueGameResult,
    },

    MinionsSpawning {
        #[serde(rename = "EventID")]
        event_id: u32,
        #[serde(rename = "EventTime")]
        event_time: f64,
    },

    FirstBrick {
        #[serde(rename = "EventID")]
        event_id: u32,

        #[serde(rename = "EventTime")]
        event_time: f64,

        #[serde(rename = "KillerName")]
        killer_name: String,
    },

    FirstBlood {
        #[serde(rename = "EventID")]
        event_id: usize,
        #[serde(rename = "EventTime")]
        event_time: f64,
        #[serde(rename = "Recipient")]
        recipient: String,
    },

    TurretKilled {
        #[serde(rename = "EventID")]
        event_id: u32,

        #[serde(rename = "EventTime")]
        event_time: f64,

        #[serde(rename = "TurretKilled")]
        turret_killed: String,

        #[serde(rename = "KillerName")]
        killer_name: String,

        #[serde(rename = "Assisters")]
        assisters: Vec<String>,
    },

    InhibKilled {
        #[serde(rename = "EventID")]
        event_id: u32,

        #[serde(rename = "EventTime")]
        event_time: f64,

        #[serde(rename = "InhibKilled")]
        inhib_killed: String,

        #[serde(rename = "KillerName")]
        killer_name: String,

        #[serde(rename = "Assisters")]
        assisters: Vec<String>,
    },

    InhibRespawningSoon {
        #[serde(rename = "EventID")]
        event_id: usize,
        #[serde(rename = "EventTime")]
        event_time: f64,
        #[serde(rename = "InhibRespawningSoon")]
        inhib_respawning_soon: String,
    },

    InhibRespawned {
        #[serde(rename = "EventID")]
        event_id: usize,
        #[serde(rename = "EventTime")]
        event_time: f64,
        #[serde(rename = "InhibRespawned")]
        inhib_respawned: String,
    },

    DragonKill {
        #[serde(rename = "EventID")]
        event_id: u32,

        #[serde(rename = "EventTime")]
        event_time: f64,

        #[serde(rename = "DragonType")]
        dragon_type: String,

        #[serde(rename = "Stolen")]
        stolen: String,

        #[serde(rename = "KillerName")]
        killer_name: String,

        #[serde(rename = "Assisters")]
        assisters: Vec<String>,
    },

    HeraldKill {
        #[serde(rename = "EventID")]
        event_id: u32,

        #[serde(rename = "EventTime")]
        event_time: f64,

        #[serde(rename = "Stolen")]
        stolen: String,

        #[serde(rename = "KillerName")]
        killer_name: String,

        #[serde(rename = "Assisters")]
        assisters: Vec<String>,
    },

    BaronKill {
        #[serde(rename = "EventID")]
        event_id: u32,

        #[serde(rename = "EventTime")]
        event_time: f64,

        #[serde(rename = "Stolen")]
        stolen: String,

        #[serde(rename = "KillerName")]
        killer_name: String,

        #[serde(rename = "Assisters")]
        assisters: Vec<String>,
    },

    ChampionKill {
        #[serde(rename = "EventID")]
        event_id: u32,

        #[serde(rename = "EventTime")]
        event_time: f64,

        #[serde(rename = "VictimName")]
        victim_name: String,

        #[serde(rename = "KillerName")]
        killer_name: String,

        #[serde(rename = "Assisters")]
        assisters: Vec<String>,
    },

    Multikill {
        #[serde(rename = "EventID")]
        event_id: u32,

        #[serde(rename = "EventTime")]
        event_time: f64,

        #[serde(rename = "KillerName")]
        killer_name: String,

        #[serde(rename = "KillStreak")]
        kill_streak: u32,
    },

    Ace {
        #[serde(rename = "EventID")]
        event_id: u32,

        #[serde(rename = "EventTime")]
        event_time: f64,

        #[serde(rename = "Acer")]
        acer: String,

        #[serde(rename = "AcingTeam")]
        acing_team: String,
    },

    HordeKill {
        #[serde(rename = "EventID")]
        event_id: u32,

        #[serde(rename = "EventTime")]
        event_time: f64,

        #[serde(rename = "KillerName")]
        killer_name: String,

        #[serde(rename = "Assisters")]
        assisters: Vec<String>,

        #[serde(rename = "Stolen")]
        stolen: String,
    },
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LeagueData {
    pub current_player_data: LeagueCurrentPlayer,
    pub players: Vec<LeaguePlayer>,
    pub game_events: LeagueGameEvents,
    pub game_stats: LeagueGameStats,
}
