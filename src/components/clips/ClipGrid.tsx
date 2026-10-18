import { ChevronDown, ChevronRight } from "lucide-react";
import { ClipSearch, DateGroup, VodClip } from "../../types";
import { setCollapsedDays } from "../../utils/filterClips";
import Clip from "../Clip";
import clsx from "clsx";

interface ClipGridProps {
    groups: DateGroup[];
    selectedIds: Set<string>;
    search: ClipSearch;
    setSearch: (search: ClipSearch) => void;
    onSelect: (
        clip: VodClip,
        event: React.MouseEvent,
        index: number,
    ) => void;
}

export default function ClipGrid({
    groups,
    selectedIds,
    search,
    setSearch,
    onSelect,
}: ClipGridProps) {
    let index = 0;

    const sections = groups.map((group) => ({
        ...group,
        tiles: group.clips.map((clip) => ({ clip, index: index++ })),
    }));

    return (
        <>
            {sections.map((section) => {
                const collapsed = search.collapsedDayKeys.includes(
                    section.dayKey,
                );

                return (
                    <div
                        key={section.dayKey}
                        className="flex flex-col gap-y-3 py-3"
                    >
                        <div
                            className="flex items-center gap-x-2 transition-colors rounded-sm hover:bg-mocha-surface0 cursor-pointer"
                            onClick={() =>
                                setSearch(
                                    setCollapsedDays(
                                        search,
                                        section.dayKey,
                                        !collapsed,
                                    ),
                                )
                            }
                        >
                            {collapsed ? (
                                <ChevronRight
                                    className="w-4 h-4 text-mocha-overlay1 shrink-0"
                                />
                            ) : (
                                <ChevronDown
                                    className="w-4 h-4 text-mocha-overlay1 shrink-0"
                                />
                            )}

                            <p
                                className={clsx(
                                    "text-lg font-semibold truncate",
                                    collapsed
                                        ? "text-mocha-overlay1"
                                        : "text-mocha-text",
                                )}
                            >
                                {section.heading}
                            </p>

                            <p className="ml-3 text-sm font-semibold text-mocha-overlay2">
                                {section.clips.length} clip
                                {section.clips.length !== 1 ? "s" : ""}
                            </p>
                        </div>

                        {!collapsed && (
                            <div className="flex flex-row flex-wrap gap-y-6 gap-x-3">
                                {section.tiles.map(({ clip, index: tileIndex }) => (
                                    <Clip
                                        key={clip.id}
                                        clip={clip}
                                        isSelected={selectedIds.has(clip.id)}
                                        onSelect={(event) =>
                                            onSelect(
                                                clip,
                                                event,
                                                tileIndex,
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}
