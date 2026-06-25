import { useState } from "react";
import { VodClip } from "../../types";
import BookmarksTab from "./panel/BookmarksTab";  
import LeagueScoreboardTab from "../integration/league/LeagueScoreboardTab";
import { LeagueResult } from "../../integration/league/LeagueTypes";

interface RightPanelProps {
    clip: VodClip;
    onSeek: (timestamp: number) => void;
    onClose: () => void;
}

export default function RightPanel({ clip, onSeek, onClose }: RightPanelProps) {
    type Tab = "bookmarks" | "scoreboard";
    const [activeTab, setActiveTab] = useState<Tab>(() => {
        if (clip.integration_result?.type === "LeagueResult")
            return "scoreboard";
        return "bookmarks";
    });

    const tabs: { key: Tab; label: string; show: boolean }[] = [
        { key: "bookmarks", label: "Bookmarks", show: true },
        {
            key: "scoreboard",
            label: "Scoreboard",
            show: clip.integration_result?.type === "LeagueResult",
        },
    ];

    return (
        <div className="absolute inset-0 z-30 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />

            <div className="relative w-80 h-full bg-mocha-mantle border-l border-mocha-surface0 flex flex-col shadow-2xl">
                <div className="flex border-b border-mocha-surface0">
                    {tabs
                        .filter((t) => t.show)
                        .map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                                    activeTab === tab.key
                                        ? "text-mocha-mauve border-b-2 border-mocha-mauve"
                                        : "text-mocha-overlay1 hover:text-mocha-text"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeTab === "bookmarks" && (
                        <BookmarksTab clip={clip} onSeek={onSeek} />
                    )}
                    {activeTab === "scoreboard" &&
                        clip.integration_result?.type === "LeagueResult" && (
                            <LeagueScoreboardTab
                                result={clip.integration_result as LeagueResult}
                            />
                        )}
                </div>
            </div>
        </div>
    );
}
