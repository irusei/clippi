import { BaseResult } from "../../types";

interface LeagueData {
    current_player_data: LeagueCurrentPlayer;
    players: LeaguePlayer[];
    game_events: LeagueGameEvents;
    game_stats: LeagueGameStats;
}

export type LeagueResult = BaseResult & {
    type: "LeagueResult";
    offset: number;
    data: LeagueData;
};

export interface LeaguePlayer {
    championName: string;
    level: number;
    position: string;
    riotId: string;
    team: string;

    scores: LeaguePlayerScore;
    runes: LeaguePartialRunes;
    items: LeagueItem[];
    summonerSpells: LeagueSummonerSpells;
}

export interface LeaguePlayerScore {
    assists: number;
    creepScore: number;
    deaths: number;
    kills: number;
    wardScore: number;
}

export interface LeagueSummonerSpells {
    summonerSpellOne: LeagueSummonerSpell;
    summonerSpellTwo: LeagueSummonerSpell;
}

export interface LeagueSummonerSpell {
    displayName: string;
}

export interface LeagueCurrentPlayer {
    riotId: string;
    fullRunes: LeagueFullRunes;
}

export interface LeagueFullRunes {
    generalRunes: LeagueRune[];
    keystone: LeagueRune;
    primaryRuneTree: LeagueRuneTree;
    secondaryRuneTree: LeagueRuneTree;
}

export interface LeagueGameStats {
    gameMode: string;
    gameTime: number;
}

export interface LeagueItem {
    count: number;
    displayName: string;
    price: number;
    slot: number;
}

export interface LeagueRune {
    displayName: string;
}

export interface LeaguePartialRunes {
    keystone: LeagueRune;
    primaryRuneTree: LeagueRuneTree;
    secondaryRuneTree: LeagueRuneTree;
}

export interface LeagueRuneTree {
    displayName: string;
}

export interface LeagueGameEvents {
    Events: LeagueGameEvent[];
}

export type LeagueGameResult = "Win" | "Lose";

export type LeagueGameEvent =
    | GameStart
    | GameEnd
    | MinionsSpawning
    | FirstBrick
    | FirstBlood
    | TurretKilled
    | InhibKilled
    | InhibRespawningSoon
    | InhibRespawned
    | DragonKill
    | HeraldKill
    | BaronKill
    | ChampionKill
    | Multikill
    | Ace
    | HordeKill;

export interface BaseEvent {
    EventName: string;
    EventId: number;
    EventTime: number;
}

export interface GameStart extends BaseEvent {
    EventName: "GameStart";
}

export interface GameEnd extends BaseEvent {
    EventName: "GameEnd";
    Result: LeagueGameResult;
}

export interface MinionsSpawning extends BaseEvent {
    EventName: "MinionsSpawning";
}

export interface FirstBrick extends BaseEvent {
    EventName: "FirstBrick";
    KillerName: string;
}

export interface FirstBlood extends BaseEvent {
    EventName: "FirstBlood";
    Recipient: string;
}

export interface TurretKilled extends BaseEvent {
    EventName: "TurretKilled";
    TurretKilled: string;
    KillerName: string;
    Assisters: string[];
}

export interface InhibKilled extends BaseEvent {
    EventName: "InhibKilled";
    InhibKilled: string;
    KillerName: string;
    Assisters: string[];
}

export interface InhibRespawningSoon extends BaseEvent {
    EventName: "InhibRespawningSoon";
    InhibRespawningSoon: string;
}

export interface InhibRespawned extends BaseEvent {
    EventName: "InhibRespawned";
    InhibRespawned: string;
}

export interface DragonKill extends BaseEvent {
    EventName: "DragonKill";
    DragonType: string;
    Stolen: string;
    KillerName: string;
    Assisters: string[];
}

export interface HeraldKill extends BaseEvent {
    EventName: "HeraldKill";
    Stolen: string;
    KillerName: string;
    Assisters: string[];
}

export interface BaronKill extends BaseEvent {
    EventName: "BaronKill";
    Stolen: string;
    KillerName: string;
    Assisters: string[];
}

export interface ChampionKill extends BaseEvent {
    EventName: "ChampionKill";
    VictimName: string;
    KillerName: string;
    Assisters: string[];
}

export interface Multikill extends BaseEvent {
    EventName: "Multikill";
    KillerName: string;
    KillStreak: number;
}

export interface Ace extends BaseEvent {
    EventName: "Ace";
    Acer: string;
    AcingTeam: string;
}

export interface HordeKill extends BaseEvent {
    EventName: "HordeKill";
    KillerName: string;
    Assisters: string[];
    Stolen: string;
}
