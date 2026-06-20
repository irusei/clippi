import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Settings, StorageInfo } from "../types";
import { Switch } from "../components/ui/Switch";
import { SettingsContainer } from "../components/ui/SettingsContainer";
import Input from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { KeybindingInput } from "../components/ui/KeybindingInput";
import { platform } from "@tauri-apps/plugin-os";
import { Folder, HardDrive } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { formatBytes } from "../utils";
import { emit, listen } from "@tauri-apps/api/event";

export default function SettingTab() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [newClipPath, setNewClipPath] = useState<string | null>(null);
    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

    useEffect(() => {
        invoke("get_settings").then((res) => {
            let newSettings = res as Settings;
            setSettings(newSettings);
            setNewClipPath(newSettings.clip_path);
        });

        updateStorageInfo();

        // make sure storage info updates after clipped
        const ul = listen("set_clips", (_event) => {
            updateStorageInfo();
        });

        return () => {
            ul.then((ul) => ul());
        };
    }, []);

    function updateStorageInfo() {
        invoke("get_storage_info").then((res) => {
            setStorageInfo(res as StorageInfo);
        });
    }
    const updateSetting = (key: keyof Settings, value: any) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        invoke("set_settings", { newSettings: newSettings });
        emit("settings_updated");
    };

    function getResolution() {
        if (!settings) return;
        switch (settings.resolution[0]) {
            case 1280:
                return "720p";
            case 1920:
                return "1080p";
            case 2560:
                return "1440p";
            case 3840:
                return "4K";
            default:
                return null;
        }
    }

    function setResolution(newRes: string) {
        let res = null;

        switch (newRes) {
            case "720p":
                res = [1280, 720];
                break;
            case "1080p":
                res = [1920, 1080];
                break;
            case "1440p":
                res = [2560, 1440];
                break;
            case "4K":
                res = [3840, 2160];
                break;
            default:
                return;
        }

        updateSetting("resolution", res);
    }

    if (!settings) return <div className="p-8 text-mocha-text">Loading...</div>;

    return (
        <div className="bg-mocha-mantle w-full h-full">
            <div className="px-10 py-8 h-full flex flex-col gap-8 overflow-y-auto">
                <h2 className="text-3xl font-semibold text-mocha-text">
                    Settings
                </h2>

                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                        Output
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-mocha-text">
                                Resolution
                            </label>
                            <Select
                                value={getResolution() ?? ""}
                                onChange={(value) => setResolution(value)}
                                options={[
                                    ["720p", "720p"],
                                    ["1080p", "1080p"],
                                    ["1440p", "1440p"],
                                    ["4K", "4K"],
                                ]}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-mocha-text">
                                Framerate
                            </label>
                            <Select
                                value={settings.framerate.toString()}
                                onChange={(value) =>
                                    updateSetting("framerate", parseInt(value))
                                }
                                options={[
                                    ["30 FPS", "30"],
                                    ["60 FPS", "60"],
                                    ["120 FPS", "120"],
                                    ["144 FPS", "144"],
                                    ["165 FPS", "165"],
                                    ["240 FPS", "240"],
                                    ["360 FPS", "360"],
                                ]}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-mocha-text">
                                Bitrate (kbps)
                            </label>
                            <Input
                                type="number"
                                value={settings.bitrate}
                                onChange={(value) =>
                                    updateSetting("bitrate", parseInt(value))
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-mocha-text">
                                Codec
                            </label>
                            <Select
                                className=""
                                value={settings.encoder}
                                onChange={(value) =>
                                    updateSetting("encoder", value)
                                }
                                options={[
                                    ["x264 (CPU)", "X264"],
                                    ["H264", "H264"],
                                    ["HEVC", "HEVC"],
                                    ["AV1", "AV1"],
                                ]}
                            />
                        </div>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                        Storage
                    </h3>

                    <div className="flex flex-col gap-4 px-1">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-mocha-text">
                                Save Location
                            </label>
                            <div className="flex gap-4 justify-center items-center">
                                <Input
                                    type={"text"}
                                    className={"flex-1"}
                                    value={newClipPath}
                                    onBlur={() => {
                                        updateSetting("clip_path", newClipPath);
                                    }}
                                    onChange={(value) => setNewClipPath(value)}
                                />
                                <Folder
                                    className="text-mocha-mauve cursor-pointer w-5 h-5"
                                    onClick={() => {
                                        open({
                                            multiple: false,
                                            directory: true,
                                        }).then((folder) => {
                                            if (folder != null)
                                                setNewClipPath(folder);
                                        });
                                    }}
                                />
                            </div>
                        </div>

                        {storageInfo && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3 text-sm text-mocha-text">
                                    <HardDrive className="w-4 h-4 text-mocha-mauve" />
                                    <span>
                                        {formatBytes(storageInfo.free_space)}{" "}
                                        free of{" "}
                                        {formatBytes(storageInfo.total_space)}
                                    </span>
                                </div>
                                <div className="w-full bg-mocha-overlay1 rounded-full h-2 flex overflow-hidden">
                                    <div
                                        className="bg-mocha-mauve h-2"
                                        style={{
                                            width: `${
                                                storageInfo.total_space > 0
                                                    ? (storageInfo.clips_size /
                                                          storageInfo.total_space) *
                                                      100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                    <div
                                        className="bg-mocha-overlay2 h-2"
                                        style={{
                                            width: `${
                                                storageInfo.total_space > 0
                                                    ? Math.max(
                                                          0,
                                                          (storageInfo.used_space -
                                                              storageInfo.clips_size) /
                                                              storageInfo.total_space,
                                                      ) * 100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                    <div
                                        className="bg-mocha-surface1 h-2"
                                        style={{
                                            width: `${
                                                storageInfo.total_space > 0
                                                    ? (storageInfo.free_space /
                                                          storageInfo.total_space) *
                                                      100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-4 text-xs text-mocha-overlay2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-mocha-mauve" />
                                        <span>
                                            Clips{" "}
                                            <span className="font-medium">
                                                (
                                                {formatBytes(
                                                    storageInfo.clips_size,
                                                )}
                                                )
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-mocha-overlay2" />
                                        <span>Other files</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-mocha-surface1" />
                                        <span>Free</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-mocha-text">
                                Max Storage Limit
                            </label>
                            <Select
                                value={settings.max_storage_limit}
                                onChange={(value) =>
                                    updateSetting("max_storage_limit", value)
                                }
                                options={[
                                    ["10GB", "10GB"],
                                    ["25GB", "25GB"],
                                    ["50GB", "50GB"],
                                    ["100GB", "100GB"],
                                    ["250GB", "250GB"],
                                    ["Unlimited", "Unlimited"],
                                ]}
                            />
                        </div>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                        Audio
                    </h3>

                    <div className="flex flex-col gap-3 px-1">
                        <SettingsContainer
                            title="Microphone"
                            description="Capture audio from your microphone"
                        >
                            <Switch
                                checked={settings.capture_mic}
                                onChecked={(value) =>
                                    updateSetting("capture_mic", value)
                                }
                            />
                        </SettingsContainer>

                        <SettingsContainer
                            title="Desktop Audio"
                            description="Additionally capture desktop audio on top of game sounds"
                        >
                            <Switch
                                checked={settings.capture_desktop_audio}
                                onChecked={(value) =>
                                    updateSetting(
                                        "capture_desktop_audio",
                                        value,
                                    )
                                }
                            />
                        </SettingsContainer>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                        Recording
                    </h3>

                    <div className="flex flex-col gap-3 px-1">
                        <SettingsContainer
                            title="Enable Recording"
                            description="Whether to record gameplay"
                        >
                            <Switch
                                checked={settings.recording_enabled}
                                onChecked={(value) =>
                                    updateSetting("recording_enabled", value)
                                }
                            />
                        </SettingsContainer>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                        Hotkeys
                    </h3>
                    <div className="flex flex-col gap-3 px-1">
                        <SettingsContainer
                            title="Bookmark Key"
                            description="Key to press to create a bookmark during recording"
                        >
                            <KeybindingInput
                                value={settings.bookmark_key}
                                onChange={(key) =>
                                    updateSetting("bookmark_key", key)
                                }
                            />
                        </SettingsContainer>
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                        Miscellaneous
                    </h3>
                    <div className="flex flex-col gap-3 px-1">
                        <SettingsContainer
                            title="Discord Rich Presence"
                            description="Enable discord rich presence"
                        >
                            <Switch
                                checked={settings.discord_rpc_enabled}
                                onChecked={(value) =>
                                    updateSetting("discord_rpc_enabled", value)
                                }
                            />
                        </SettingsContainer>

                        {platform() === "windows" && (
                            <SettingsContainer
                                title="Autostart"
                                description="Run clippi on system startup"
                            >
                                <Switch
                                    checked={settings.windows_autostart}
                                    onChecked={(value) =>
                                        updateSetting(
                                            "windows_autostart",
                                            value,
                                        )
                                    }
                                />
                            </SettingsContainer>
                        )}
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                        Zipline Uploader
                    </h3>

                    <div className="flex flex-col gap-4 px-1">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-mocha-text">
                                Endpoint
                            </label>
                            <Input
                                type="text"
                                className="flex-1"
                                value={settings.upload_endpoint || ""}
                                onChange={(value) =>
                                    updateSetting(
                                        "upload_endpoint",
                                        value || undefined,
                                    )
                                }
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-mocha-text">
                                Token
                            </label>
                            <Input
                                type="password"
                                className="flex-1"
                                value={settings.upload_token || ""}
                                onChange={(value) =>
                                    updateSetting(
                                        "upload_token",
                                        value || undefined,
                                    )
                                }
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
