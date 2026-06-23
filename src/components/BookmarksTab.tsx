import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { VodClip } from "../types";
import { getMarkerData } from "../integration/MarkerData";
import { formatTime } from "../utils";

type FilterMode = "all" | "bookmarks" | "game";

export default function BookmarksTab({
    clip,
    onSeek,
}: {
    clip: VodClip;
    onSeek: (timestamp: number) => void;
}) {
    const [filter, setFilter] = useState<FilterMode>("all");

    const filteredEntries: {
        label: string;
        time: number;
        colorClass: string;
    }[] = useMemo(() => {
        if (filter === "all")
            return getMarkerData(clip.integration_result, clip.bookmarks);
        if (filter === "bookmarks")
            return clip.bookmarks.map((b) => ({
                label: b.name,
                time: b.timestamp / 1000,
                colorClass: "bg-mocha-green",
            }));

        // filter === game
        return getMarkerData(clip.integration_result, []);
    }, [clip, filter]);

    const availableFilters: FilterMode[] =
        clip.integration_result != null
            ? ["all", "bookmarks", "game"]
            : ["all"];

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-2 pt-2 pb-1">
                <span className="text-xs text-mocha-overlay1">
                    {filteredEntries.length} entries
                </span>
                {availableFilters.length > 1 && (
                    <button
                        onClick={() => {
                            const idx = availableFilters.indexOf(filter);
                            setFilter(
                                availableFilters[
                                    (idx + 1) % availableFilters.length
                                ],
                            );
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-mocha-surface0 hover:bg-mocha-surface1 text-xs text-mocha-overlay1 transition-colors"
                    >
                        <Filter className="w-3 h-3" />
                        <span className="capitalize">{filter}</span>
                    </button>
                )}
            </div>
            {filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-12 text-mocha-overlay1">
                    <p className="text-sm">No entries</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
                    {filteredEntries.map((marker, index) => (
                        <button
                            key={index}
                            title={marker.label}
                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-mocha-surface0/50 transition-colors text-left"
                            onClick={() => onSeek(marker.time)}
                        >
                            <div
                                className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${marker.colorClass}`}
                            />
                            <span className="text-xs text-mocha-text truncate flex-1">
                                {marker.label}
                            </span>
                            <span className="text-[10px] text-mocha-overlay1 shrink-0">
                                {formatTime(marker.time)}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
