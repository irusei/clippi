import { useEffect, useState } from "react";
import { DetectedGame, Settings, StorageInfo, VodClip } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Clip from "../components/Clip";
import ClipViewer from "../components/ClipViewer";
import { FilterMenu } from "../components/FilterMenu";
import { filterClips } from "../utils/filterClips";
import { FilterOptions } from "../types";
import { Select } from "../components/ui/Select";
import { isOverStorageLimit } from "../utils";
import { AlertCircle, Trash2 } from "lucide-react";
import { platform } from "@tauri-apps/plugin-os";
import { confirm } from "@tauri-apps/plugin-dialog";

function getSortedUniqueGames(clips: VodClip[]): [DetectedGame, number][] {
    let sortedGames: Map<string, [DetectedGame, number]> = new Map();

    clips.forEach((clip: VodClip) => {
        if (sortedGames.has(clip.game.name)) {
            const indexed = sortedGames.get(clip.game.name)!;
            sortedGames.set(clip.game.name, [indexed[0], indexed[1] + 1]);
        } else {
            sortedGames.set(clip.game.name, [clip.game, 1]);
        }
    });

    return Array.from(sortedGames.values()).sort((a, b) => b[1] - a[1]);
}

export default function ClipTab() {
    const [clips, setClips] = useState<VodClip[]>([]);
    const [selectedClip, setSelectedClip] = useState<VodClip | null>(null);
    const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(
        new Set(),
    );
    const [lastSelectedClipId, setLastSelectedClipId] = useState<string | null>(
        null,
    );
    const [uniqueGames, setUniqueGames] = useState<[DetectedGame, number][]>(
        [],
    );
    const [selectedGameName, setSelectedGameName] = useState<string>("");
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        type: "",
    });
    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
    const [maxStorageLimit, setMaxStorageLimit] = useState<string>("unlimited");

    const isStorageLimitReached =
        storageInfo &&
        isOverStorageLimit(storageInfo.clips_size, maxStorageLimit);

    function _setSelectedClip(clip: VodClip) {
        if (platform() === "windows") setSelectedClip(clip);
        else
            alert(
                "unfortunately due to tauri requiring a merged PR (#14402) clip playback isn't really possible atm, this will be fixed when this gets hopefully merged",
            );
    }

    function getClips() {
        invoke("get_clips").then((res) => {
            setClips(res as VodClip[]);
            if (selectedClip == null) return;
            for (const clip of res as VodClip[]) {
                if (clip.id === selectedClip?.id) {
                    setSelectedClip(clip);
                    break;
                }
            }
        });
    }

    function handleClipClick(
        clip: VodClip,
        event: React.MouseEvent,
        index: number,
    ) {
        const filteredClips = filterClips(
            clips,
            selectedGameName,
            filterOptions,
        );

        if (event.shiftKey && lastSelectedClipId != null) {
            const lastIdx = filteredClips.findIndex(
                (c) => c.id === lastSelectedClipId,
            );
            if (lastIdx !== -1) {
                const start = Math.min(lastIdx, index);
                const end = Math.max(lastIdx, index);
                const newSelected = new Set(selectedClipIds);
                for (let i = start; i <= end; i++) {
                    newSelected.add(filteredClips[i].id);
                }
                setSelectedClipIds(newSelected);
            }
        } else if (event.ctrlKey) {
            const newSelected = new Set(selectedClipIds);
            if (newSelected.has(clip.id)) {
                newSelected.delete(clip.id);
            } else {
                newSelected.add(clip.id);
            }
            setSelectedClipIds(newSelected);
            setLastSelectedClipId(clip.id);
        } else {
            _setSelectedClip(clip);
        }
    }

    async function handleDeleteSelected() {
        const confirmed = await confirm(
            `Delete ${selectedClipIds.size} clip${selectedClipIds.size > 1 ? "s" : ""}?`,
        );
        if (!confirmed) return;

        for (const clipId of selectedClipIds) {
            const clip = clips.find((c) => c.id === clipId);
            if (clip) {
                await invoke("delete_clip", { clip });
            }
        }

        setSelectedClipIds(new Set());
    }

    // set and update unique games for filtering
    useEffect(() => {
        setUniqueGames(getSortedUniqueGames(clips));

        // update storage limit in case settings change
        const ul1 = listen("settings_updated", () => {
            invoke("get_storage_info").then((res) => {
                setStorageInfo(res as StorageInfo);
            });
            invoke("get_settings").then((res) => {
                const settings = res as Settings;
                setMaxStorageLimit(settings.max_storage_limit as string);
            });
        });

        invoke("get_storage_info").then((res) => {
            setStorageInfo(res as StorageInfo);
        });
        invoke("get_settings").then((res) => {
            const settings = res as Settings;
            setMaxStorageLimit(settings.max_storage_limit as string);
        });

        return () => {
            ul1.then((ul) => ul());
        };
    }, [clips]);

    useEffect(() => {
        const ul1 = listen("set_clips", (event) => {
            setClips(event.payload as VodClip[]);
        });

        const ul2 = listen("show_trimmed_clip", () => {
            invoke("get_clips").then((res) => {
                let clips = res as VodClip[];
                setClips(clips);
                setSelectedClip(clips[0]);
            });
        });

        getClips();

        return () => {
            ul1.then((ul) => ul());
            ul2.then((ul) => ul());
        };
    }, []);

    const filteredClips = filterClips(clips, selectedGameName, filterOptions);

    return (
        <div className="bg-mocha-mantle w-full h-full">
            {selectedClip === null && (
                <>
                    <div className="px-10 py-8 overflow-y-scroll h-full flex flex-col gap-y-2">
                        <div className="flex flex-row gap-x-3 items-center">
                            <h2 className="text-3xl font-semibold text-mocha-text mb-2">
                                Your clips
                            </h2>
                        </div>
                        <label className="text-sm font-medium text-mocha-overlay2">
                            Filter
                        </label>
                        <div className="flex flex-row gap-x-3 items-center w-full">
                            <Select
                                className="w-1/4"
                                value={selectedGameName}
                                placeholderValue={"Filter games..."}
                                selectedLabel={
                                    selectedGameName
                                        ? (() => {
                                              const game = uniqueGames.find(
                                                  ([g]) =>
                                                      g.name ===
                                                      selectedGameName,
                                              );
                                              return game ? (
                                                  <>
                                                      <img
                                                          className="w-5 h-5"
                                                          src={
                                                              game[0].icon ?? ""
                                                          }
                                                          alt={game[0].name}
                                                      />
                                                      <p className="text-mocha-text truncate">
                                                          {game[0].name}
                                                      </p>
                                                  </>
                                              ) : null;
                                          })()
                                        : undefined
                                }
                                onChange={(val) =>
                                    setSelectedGameName(
                                        selectedGameName === val ? "" : val,
                                    )
                                }
                            >
                                {uniqueGames.map(([game, count]) => [
                                    game.name,
                                    <div className="flex flex-row items-center space-x-2">
                                        <img
                                            className="w-5 h-5"
                                            src={game.icon ?? ""}
                                            alt={game.name}
                                        />

                                        <p className="text-mocha-text truncate">
                                            {game.name}
                                        </p>

                                        <p className="text-mocha-overlay2">
                                            {count}
                                        </p>
                                    </div>,
                                ])}
                            </Select>
                            <FilterMenu
                                gameName={selectedGameName}
                                filterOptions={filterOptions}
                                setFilterOptions={setFilterOptions}
                                clips={clips}
                            />
                        </div>

                        {isStorageLimitReached && (
                            <div className="flex items-center gap-3 px-4 py-3 border border-mocha-red rounded-lg">
                                <AlertCircle className="w-5 h-5 text-mocha-red" />
                                <div>
                                    <p className="text-sm font-medium text-mocha-red">
                                        Storage limit reached
                                    </p>
                                    <p className="text-xs text-mocha-red">
                                        You cannot record clips until you free
                                        up space or increase your storage limit
                                        in settings.
                                    </p>
                                </div>
                            </div>
                        )}

                        {selectedClipIds.size > 0 && (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-mocha-overlay1 py-2 font-medium">
                                    {selectedClipIds.size} clip
                                    {selectedClipIds.size !== 1 ? "s" : ""}{" "}
                                    selected
                                </p>
                                <button
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-mocha-red hover:bg-mocha-red/10 transition-colors rounded-lg font-medium"
                                    onClick={handleDeleteSelected}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        )}

                        <div className={"flex flex-col gap-3"}>
                            {filteredClips.map((clip, index) => (
                                <Clip
                                    key={clip.id}
                                    clip={clip}
                                    isSelected={selectedClipIds.has(clip.id)}
                                    onSelect={(e) =>
                                        handleClipClick(clip, e, index)
                                    }
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {selectedClip != null && (
                <ClipViewer
                    clip={selectedClip}
                    onExitClip={() => setSelectedClip(null)}
                    reloadClips={getClips}
                />
            )}
        </div>
    );
}
