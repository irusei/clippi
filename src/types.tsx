import { LeagueResult } from "./integration/league/LeagueTypes";

export interface DetectedGame {
    name: string;
    icon: string | null;
    executables: string[];
    use_window_capture: boolean;
    title_regex: string[];
}

export interface Bookmark {
    name: string;
    timestamp: number;
}
export interface VodClip {
    id: string;
    clip_type: ClipType;
    path: string;
    title: string;
    duration: number;
    game: DetectedGame;
    size: number;
    thumbnail: string;
    bookmarks: Bookmark[];
    action_count: number[];
    date: string;
    integration_result: Result | null;
    remote_path?: string | null;
}

export type BaseResult = {
    type: string;
};

export type Result = LeagueResult;

export type ClipType = "Recording" | "Clip";
export type VodEncoder = "X264" | "H264" | "HEVC" | "AV1";

export interface Settings {
    clip_path: string;
    resolution: [number, number];
    framerate: number;
    bitrate: number;
    encoder: VodEncoder;
    capture_desktop_audio: boolean;
    capture_mic: boolean;
    discord_rpc_enabled: boolean;
    windows_autostart: boolean;
    bookmark_key: string;
    recording_enabled: boolean;
    upload_endpoint?: string | null;
    upload_token?: string | null;
}

export type BaseFilter = {
    type: string;
};

export type LeagueFilter = BaseFilter & {
    type: "league";
    championName?: string;
    positionName?: string;
};

export type FilterOptions = BaseFilter | LeagueFilter;

export interface StorageInfo {
    clipping_folder: string;
    total_space: number;
    free_space: number;
    used_space: number;
    clips_size: number;
}
