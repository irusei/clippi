import { useEffect, useState } from "react";
import { ClipSearch, Settings, StorageInfo, VodClip } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import ClipGrid from "../components/clips/ClipGrid";
import ClipViewer from "../components/ClipViewer";
import FiltersSidebar from "../components/clips/FiltersSidebar";
import {
    filterClips,
    getUniqueGames,
    groupByDay,
    sortClips,
} from "../utils/filterClips";
import Input from "../components/ui/Input";
import { AlertCircle, SearchIcon, Trash2, X } from "lucide-react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { isOverStorageLimit } from "../utils";
import { Disclaimer } from "../components/ui/Disclaimer";

interface ClipTabProps {
    onClipEditor: (open: boolean) => void;
}

export default function ClipTab({ onClipEditor }: ClipTabProps) {
    const [clips, setClips] = useState<VodClip[]>([]);
    const [selectedClip, setSelectedClip] = useState<VodClip | null>(null);
    const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(
        new Set(),
    );
    const [lastSelectedClipId, setLastSelectedClipId] = useState<string | null>(
        null,
    );
    // hide the status bar when a clip is opened in the editor
    useEffect(() => {
        onClipEditor(selectedClip != null);
    }, [selectedClip]);

    const [search, setSearch] = useState<ClipSearch>({
        search: "",
        gameName: "",
        favoritedOnly: false,
        facets: {},
        collapsedDayKeys: [],
    });
    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
    const [maxStorageLimit, setMaxStorageLimit] = useState<string>("unlimited");

    const isStorageLimitReached =
        storageInfo &&
        isOverStorageLimit(storageInfo.clips_size, maxStorageLimit);

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

    const visible = sortClips(filterClips(clips, search));
    const groups = groupByDay(visible);
    const games = getUniqueGames(clips);

    function handleClipClick(
        clip: VodClip,
        event: React.MouseEvent,
        index: number,
    ) {
        if (event.shiftKey && lastSelectedClipId != null) {
            const lastIdx = visible.findIndex(
                (c) => c.id === lastSelectedClipId,
            );
            if (lastIdx !== -1) {
                const start = Math.min(lastIdx, index);
                const end = Math.max(lastIdx, index);
                const newSelected = new Set(selectedClipIds);
                for (let i = start; i <= end; i++) {
                    newSelected.add(visible[i].id);
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
            setSelectedClip(clip);
        }
    }

    async function handleDeleteSelected() {
        let clipsToDelete = [...selectedClipIds]
            .map((clip_id) => clips.find((c) => c.id === clip_id))
            .filter((clip) => clip && !clip.favorited);

        const confirmed = await confirm(
            "Only non-favorited clips will be deleted.",
            `Delete ${clipsToDelete.length} clip${clipsToDelete.length > 1 ? "s" : ""}?`,
        );
        if (!confirmed) return;

        for (const clip of clipsToDelete) {
            await invoke("delete_clip", { clip });
        }

        setSelectedClipIds(new Set());
    }

    useEffect(() => {
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
    }, []);

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

    return (
        <div className="relative bg-mocha-mantle w-full h-full flex flex-col">
            {selectedClip === null && (
                <>
                    <div className="flex items-center gap-x-3 px-6 py-3 bg-mocha-base border-b border-mocha-surface0 justify-between shrink-0">
                        <h2 className="text-xl font-semibold text-mocha-text">
                            Your clips
                        </h2>

                        <div className="relative flex items-center w-1/6 min-w-0">
                            <Input
                                type="text"
                                placeholder={"Search"}
                                className="w-full h-9 rounded-md pl-7 py-3"
                                value={search.search}
                                onChange={(value) =>
                                    setSearch({ ...search, search: value })
                                }
                            />

                            <SearchIcon
                                className="absolute left-2 inset-y-auto w-4 h-4 text-mocha-overlay1 pointer-events-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-row flex-1 min-h-0">
                        <FiltersSidebar
                            clips={clips}
                            games={games}
                            search={search}
                            setSearch={setSearch}
                        />

                        <div className="flex-1 min-w-0 min-h-0 overflow-y-scroll px-6 pt-4 pb-14 flex flex-col">
                            {isStorageLimitReached && (
                                <div className="flex items-center gap-3 px-4 py-3 border border-mocha-red rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-mocha-red" />
                                    <div>
                                        <p className="text-sm font-medium text-mocha-red">
                                            Storage limit reached
                                        </p>
                                        <p className="text-xs text-mocha-red/80">
                                            You cannot record clips until you free
                                            up space or increase your storage limit
                                            in settings.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {visible.length === 0 && (
                                <Disclaimer
                                    title="No clips found"
                                    description="No clips were found for this query."
                                />
                            )}

                            <ClipGrid
                                groups={groups}
                                selectedIds={selectedClipIds}
                                search={search}
                                setSearch={setSearch}
                                onSelect={(clip, event, index) =>
                                    handleClipClick(clip, event, index)
                                }
                            />
                        </div>
                    </div>

                    {selectedClipIds.size > 0 && (
                        <div className="absolute left-72 right-0 bottom-0 z-20 flex items-center justify-between gap-3 px-4 py-2 min-h-10 bg-mocha-base border-t border-mocha-surface0">
                            <p className="text-sm text-mocha-overlay1 font-medium">
                                {selectedClipIds.size} clip
                                {selectedClipIds.size !== 1 ? "s" : ""}{" "}
                                selected
                            </p>

                            <div className="flex flex-row gap-x-2">
                                <button
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-mocha-overlay2 hover:bg-mocha-overlay2/10 transition-colors rounded-lg font-medium"
                                    onClick={() => {
                                        setSelectedClipIds(new Set());
                                        setLastSelectedClipId(null);
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                    Deselect all
                                </button>
                                <button
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-mocha-red hover:bg-mocha-red/10 transition-colors rounded-lg font-medium"
                                    onClick={handleDeleteSelected}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}
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
