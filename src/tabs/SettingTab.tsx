import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react"
import { VodSettings } from "../types";

export default function SettingTab() {
    const [settings, setSettings] = useState<VodSettings | null>(null);

    useEffect(() => {
        invoke('get_settings').then((res) => {
            setSettings(res as VodSettings);
        });
    }, []);

    const updateSetting = (key: keyof VodSettings, value: any) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        invoke('set_settings', { newSettings: newSettings });
    };

    if (!settings) return <div className="p-8 text-mocha-text">Loading...</div>;

    return (
        <div className="bg-mocha-mantle w-full h-full">
            <div className="px-10 py-5 overflow-y-hidden h-full flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-mocha-text">Recording Settings</h2>

                <div className="flex flex-col gap-2">
                    <label className="text-sm text-mocha-overlay2">Clip Storage Path</label>
                    <input 
                        className="bg-mocha-base border-2 border-mocha-surface0 text-mocha-text p-2 rounded-md focus:border-mocha-blue outline-none transition-colors"
                        value={settings.clip_path}
                        onChange={(e) => updateSetting('clip_path', e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-mocha-overlay2">Resolution</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number"
                            className="bg-mocha-base border-2 border-mocha-surface0 text-mocha-text p-2 rounded-md w-full focus:border-mocha-blue outline-none"
                            value={settings.resolution[0]}
                            onChange={(e) => updateSetting('resolution', [parseInt(e.target.value), settings.resolution[1]])}
                        />
                        <span className="text-mocha-overlay2">x</span>
                        <input 
                            type="number"
                            className="bg-mocha-base border-2 border-mocha-surface0 text-mocha-text p-2 rounded-md w-full focus:border-mocha-blue outline-none"
                            value={settings.resolution[1]}
                            onChange={(e) => updateSetting('resolution', [settings.resolution[0], parseInt(e.target.value)])}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm text-mocha-overlay2">Framerate (FPS)</label>
                    <select 
                        className="bg-mocha-base border-2 border-mocha-surface0 text-mocha-text p-2 rounded-md focus:border-mocha-blue outline-none"
                        value={settings.framerate}
                        onChange={(e) => updateSetting('framerate', parseInt(e.target.value))}
                    >
                        {[30, 60, 120, 144].map(fps => <option key={fps} value={fps}>{fps} FPS</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-mocha-overlay2">Bitrate (Kbps)</label>
                    <input 
                        type="number"
                        className="bg-mocha-base border-2 border-mocha-surface0 text-mocha-text p-2 rounded-md focus:border-mocha-blue outline-none"
                        value={settings.bitrate}
                        onChange={(e) => updateSetting('bitrate', parseInt(e.target.value))}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm text-mocha-overlay2">Encoder</label>
                    <select 
                        className="bg-mocha-base border-2 border-mocha-surface0 text-mocha-text p-2 rounded-md focus:border-mocha-blue outline-none"
                        value={settings.encoder}
                        onChange={(e) => updateSetting('encoder', e.target.value)}
                    >
                        <option value="X264">x264 (CPU)</option>
                        <option value="H264">H.264</option>
                        <option value="HEVC">HEVC (H.265)</option>
                        <option value="AV1">AV1</option>
                    </select>
                </div>
                <div className="flex flex-row gap-2">
                    <input
                        type="checkbox"
                        checked={settings.capture_mic}
                        className="w-4 h-4 accent-mocha-blue"
                        onChange={(e) => updateSetting('capture_mic', e.target.checked)}
                    />

                    <label className="text-sm text-mocha-overlay2">Capture microphone</label>
                </div>
                <div className="flex flex-row gap-2">
                    <input
                        type="checkbox"
                        checked={settings.capture_desktop_audio}
                        className="w-4 h-4 accent-mocha-blue"
                        onChange={(e) => updateSetting('capture_desktop_audio', e.target.checked)}
                    />

                    <label className="text-sm text-mocha-overlay2">Capture desktop audio</label>
                </div>
            </div>
        </div>
    );
}