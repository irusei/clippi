export interface DetectedGame {
  name: string;
  icon: string | null;
  executables: string[];
  use_window_capture: boolean;
  title_regex: string[];
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
  bookmarks: number[];
}

export type ClipType = "Recording" | "Clip";
export type VodEncoder = "X264" | "H264" | "HEVC" | "AV1";

export interface VodSettings {
  clip_path: string;
  resolution: [number, number],
  framerate: number,
  bitrate: number,
  encoder: VodEncoder
  capture_desktop_audio: boolean,
  capture_mic: boolean
}
