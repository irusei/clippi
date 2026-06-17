import { useEffect, useState } from "react";
import { VodClip } from "../types";
import { FilterOptions, LeagueFilter } from "../types";
import { LeagueResult } from "../integration/league/LeagueTypes";
import {
    getSelf,
    getImageFromChampionName,
    getPositionName,
} from "../integration/league/LeagueUtils";
import { Select } from "./ui/Select";

interface ChampionEntry {
    name: string;
    image: string;
    count: number;
}

interface PositionEntry {
    raw: string;
    name: string;
    count: number;
}

export interface FilterMenuProps {
    gameName: string;
    filterOptions: FilterOptions;
    setFilterOptions: (options: FilterOptions) => void;
    clips: VodClip[];
}

export function FilterMenu({
    gameName,
    filterOptions,
    setFilterOptions,
    clips,
}: FilterMenuProps) {
    const isLeague = gameName === "League of Legends";

    const [championEntries, setChampionEntries] = useState<ChampionEntry[]>([]);
    const [positionEntries, setPositionEntries] = useState<PositionEntry[]>([]);

    useEffect(() => {
        if (isLeague) {
            const leagueClips = clips.filter(
                (clip) => clip.integration_result?.type === "LeagueResult",
            );

            if (leagueClips.length === 0) {
                setChampionEntries([]);
                setPositionEntries([]);
                return;
            }

            const championCounts = new Map<string, number>();
            const positionCounts = new Map<string, number>();

            leagueClips.forEach((clip) => {
                const result = clip.integration_result as LeagueResult;
                const self = getSelf(result);
                if (self) {
                    championCounts.set(
                        self.championName,
                        (championCounts.get(self.championName) ?? 0) + 1,
                    );
                    positionCounts.set(
                        self.position,
                        (positionCounts.get(self.position) ?? 0) + 1,
                    );
                }
            });

            (async () => {
                const champList = await Promise.all(
                    Array.from(championCounts.entries())
                        .sort((a, b) => b[1] - a[1])
                        .map(async ([name, count]) => ({
                            name,
                            image: (await getImageFromChampionName(name)) ?? "",
                            count,
                        })),
                );

                const posList = Array.from(positionCounts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([raw, count]) => ({
                        raw,
                        name: getPositionName(raw),
                        count,
                    }));

                setChampionEntries(champList);
                setPositionEntries(posList);
            })();
        } else {
            setChampionEntries([]);
            setPositionEntries([]);
        }

        if (isLeague) {
            const current = filterOptions as LeagueFilter;
            if (current.type !== "league") {
                setFilterOptions({
                    type: "league",
                    championName: undefined,
                    positionName: undefined,
                });
            }
        } else if (filterOptions.type !== "") {
            setFilterOptions({ type: "" });
        }
    }, [gameName, filterOptions.type, setFilterOptions]);

    if (!gameName) return null;

    if (isLeague) {
        const leagueFilter = filterOptions as LeagueFilter;
        const champion = leagueFilter.championName ?? "";
        const position = leagueFilter.positionName ?? "";

        return (
            <>
                <Select
                    className="w-1/4"
                    value={champion}
                    placeholderValue={"Filter by champion..."}
                        selectedLabel={
                            champion
                                ? (() => {
                                      const entry = championEntries.find(
                                          (c) => c.name === champion,
                                      );
                                      return entry ? (
                                          <>
                                              <img
                                                  className="w-5 h-5"
                                                  src={entry.image}
                                                  alt={entry.name}
                                              />
                                              <p className="text-mocha-text truncate">
                                                  {entry.name}
                                              </p>
                                          </>
                                      ) : null;
                                  })()
                                : undefined
                        }
                        onChange={(val) =>
                            setFilterOptions({
                                ...leagueFilter,
                                championName:
                                    champion === val ? undefined : val,
                            })
                        }
                    >
                        {championEntries.map(({ name, image, count }) => [
                            name,
                            <div className="flex flex-row items-center space-x-2">
                                <img
                                    className="w-5 h-5"
                                    src={image}
                                    alt={name}
                                />
                                <p className="text-mocha-text truncate">
                                    {name}
                                </p>
                                <p className="text-mocha-overlay2">{count}</p>
                            </div>,
                        ])}
                    </Select>

                <Select
                    className="w-1/5"
                    value={position}
                    placeholderValue={"Filter by position..."}
                        selectedLabel={
                            position
                                ? (() => {
                                      const entry = positionEntries.find(
                                          (p) => p.raw === position,
                                      );
                                      return entry ? (
                                          <p className="text-mocha-text">
                                              {entry.name}
                                          </p>
                                      ) : null;
                                  })()
                                : undefined
                        }
                        onChange={(val) =>
                            setFilterOptions({
                                ...leagueFilter,
                                positionName:
                                    position === val ? undefined : val,
                            })
                        }
                    >
                        {positionEntries.map(({ raw, name, count }) => [
                            raw,
                            <div className="flex flex-row items-center space-x-2">
                                <p className="text-mocha-text">{name}</p>
                                <p className="text-mocha-overlay2">{count}</p>
                            </div>,
                        ])}
                    </Select>
            </>
        );
    }

    return null;
}
