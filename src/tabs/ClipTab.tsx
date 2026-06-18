import { useEffect, useState } from "react";
import { DetectedGame, VodClip } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Clip from "../components/Clip";
import ClipViewer from "../components/ClipViewer";
import { FilterMenu } from "../components/FilterMenu";
import { filterClips } from "../utils/filterClips";
import { FilterOptions } from "../types";
import { parseSize } from "../utils";
import { platform } from "@tauri-apps/plugin-os";
import { Select } from "../components/ui/Select";

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
    const [uniqueGames, setUniqueGames] = useState<[DetectedGame, number][]>(
        [],
    );
    const [selectedGameName, setSelectedGameName] = useState<string>("");
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        type: "",
    });

    // runs on trim, sets clip to trim
    function setSelectedClipToLastClip() {
        invoke("get_clips").then((res) => {
            let clips = res as VodClip[];
            setClips(clips);
            setSelectedClip(clips[0]);
        });
    }

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
        });
    }

    // set and update unique games for filtering
    useEffect(() => {
        setUniqueGames(getSortedUniqueGames(clips));
    }, [clips]);

    useEffect(() => {
        const ul = listen("set_clips", (event) => {
            setClips(event.payload as VodClip[]);
        });

        getClips();

        return () => {
            ul.then((ul) => ul());
        };
    }, []);

    return (
        <div className="bg-mocha-mantle w-full h-full">
            {selectedClip === null && (
                <>
                    <div className="px-10 py-8 overflow-y-scroll h-full flex flex-col gap-y-2">
                        <div className="flex flex-row gap-x-3 items-center">
                            <h2 className="text-3xl font-semibold text-mocha-text mb-2">
                                Your clips
                            </h2>
                            {clips.length > 0 && (
                                <h2 className="text-lg font-semibold text-mocha-overlay1 mb-2 text-center">
                                    {parseSize(
                                        clips
                                            .map((clip) => clip.size)
                                            .reduce(
                                                (total_size, cur_size) =>
                                                    total_size + cur_size,
                                            ),
                                    )}
                                </h2>
                            )}
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

                        <div className={"flex flex-col gap-3"}>
                            {filterClips(
                                clips,
                                selectedGameName,
                                filterOptions,
                            ).map((clip) => (
                                <Clip
                                    key={clip.id}
                                    clip={clip}
                                    onClick={() => _setSelectedClip(clip)}
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
                    setSelectedClipToLastClip={setSelectedClipToLastClip}
                />
            )}
        </div>
    );
}
