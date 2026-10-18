import { useEffect, useState } from "react";
import { DetectedGame, ClipSearch, VodClip } from "../../types";
import { getFacetsForGame, countFacetOptions } from "../../utils/facets";
import { Film, Star } from "lucide-react";
import clsx from "clsx";

interface BadgeRowProps {
    selected: boolean;
    label: string;
    count: number;
    icon?: () => any;
    onClick?: () => void;
}

function BadgeRow({
    selected,
    label,
    count,
    icon,
    onClick,
}: BadgeRowProps) {
    return (
        <div
            className={clsx("relative w-full flex items-center gap-2 px-2 py-1 rounded-lg transition-colors hover:bg-mocha-surface0 cursor-pointer select-none", selected && "bg-mocha-surface0 text-mocha-text")}
            onClick={onClick}
        >
            {selected && <div className={"absolute top-0 left-0 w-1 h-full bg-mocha-mauve rounded-none"} />}

            <div className="flex items-center gap-2 min-w-0 truncate">
                {icon?.()}

                <p
                    className={clsx(
                        "truncate",
                        selected ? "font-medium" : "text-mocha-subtext0",
                    )}
                >
                    {label}
                </p>
            </div>

            <p className="ml-auto text-xs tabular-nums text-mocha-overlay2">
                {count}
            </p>
        </div>
    );
}

interface FacetSectionProps {
    groupKey: string;
    title: string;
    selectedRaw: string | null;
    options: { raw: string; label: string; count: number }[];
    images: Record<string, string>;
    onToggle: (raw: string) => void;
}

function FacetSection({
    groupKey,
    title,
    selectedRaw,
    options,
    images,
    onToggle,
}: FacetSectionProps) {
    return (
        <div className="flex flex-col ml-4 gap-y-1">
            <p className="text-xs text-mocha-overlay1 font-medium py-1">
                {title}
            </p>

            {options.map((option) => {
                const image = images[`${groupKey}:${option.raw}`];

                return (
                    <BadgeRow
                        key={option.raw}
                        selected={option.raw === selectedRaw}
                        label={option.label}
                        count={option.count}
                        icon={image ? () => (
                            <img
                                src={image}
                                alt={option.label}
                                className="w-4 h-4 rounded-sm bg-mocha-surface0 object-cover shrink-0"
                            />
                        ) : undefined}
                        onClick={() => onToggle(option.raw)}
                    />
                );
            })}
        </div>
    );
}

interface FiltersSidebarProps {
    clips: VodClip[];
    games: [DetectedGame, number][];
    search: ClipSearch;
    setSearch: (search: ClipSearch) => void;
}

export default function FiltersSidebar({
    clips,
    games,
    search,
    setSearch,
}: FiltersSidebarProps) {
    const [facetImages, setFacetImages] = useState<Record<string, string>>({});

    const entry = games.find(
        (game) => game[0].name === search.gameName,
    );
    const facetGroups = entry ? getFacetsForGame(entry[0].name) : [];
    const gameClips = clips.filter(
        (clip) => clip.game.name === search.gameName,
    );

    useEffect(() => {
        const missing = facetGroups.filter((group) => group.image).flatMap(
            (group) =>
                countFacetOptions(group, gameClips).map((option) => ({
                    group,
                    option,
                })),
        );

        const unresolved = missing.filter(
            ({ group, option }) =>
                facetImages[`${group.key}:${option.raw}`] === undefined,
        );

        if (unresolved.length === 0) return;

        (async () => {
            const resolved = await Promise.all(
                unresolved.map(async ({ group, option }): Promise<[string, string]> => [
                    `${group.key}:${option.raw}`,
                    (await group.image?.(option)) ?? "",
                ]),
            );

            const images = { ...facetImages };

            for (const [key, image] of resolved) images[key] = image;

            setFacetImages(images);
        })();
    }, [search.gameName, clips]);

    const favoritedCount = clips.filter((clip) => clip.favorited).length;

    return (
        <div className="w-72 shrink-0 flex flex-col bg-mocha-base border-r border-mocha-surface0 px-4 py-3 gap-y-1 overflow-y-auto">
            <BadgeRow
                selected={!search.gameName && !search.favoritedOnly}
                label={"All clips"}
                count={clips.length}
                icon={() => (
                    <Film
                        className={clsx(
                            "w-4 h-4",
                            !search.gameName && !search.favoritedOnly
                                ? "text-mocha-text"
                                : "text-mocha-overlay1",
                        )}
                    />
                )}
                onClick={() =>
                    setSearch({
                        ...search,
                        gameName: "",
                        facets: {},
                        favoritedOnly: false,
                    })
                }
            />

            {games.map(([game, count]) => (
                <div key={game.name} className="flex flex-col gap-y-1">
                    <BadgeRow
                        selected={search.gameName === game.name}
                        label={game.name}
                        count={count}
                        icon={() =>
                            game.icon ? (
                                <img
                                    className="w-4 h-4 rounded-sm bg-mocha-surface0 object-cover shrink-0"
                                    src={game.icon}
                                    alt={game.name}
                                />
                            ) : (
                                <div
                                    className="w-4 h-4 rounded-sm bg-mocha-surface0"
                                />
                            )
                        }
                        onClick={() =>
                            setSearch({
                                ...search,
                                gameName: search.gameName === game.name ? "" : game.name,
                                facets:
                                    search.gameName === game.name
                                        ? search.facets
                                        : {},
                            })
                        }
                    />

                    {search.gameName === game.name &&
                        facetGroups.map((group) => (
                            <FacetSection
                                key={group.key}
                                groupKey={group.key}
                                title={group.label}
                                selectedRaw={search.facets[group.key]}
                                options={countFacetOptions(group, gameClips)}
                                images={facetImages}
                                onToggle={(raw) =>
                                    setSearch(
                                        toggleFacet(search, group.key, raw),
                                    )
                                }
                            />
                        ))}
                </div>
            ))}

            <BadgeRow
                selected={search.favoritedOnly}
                label={"Favorited"}
                count={favoritedCount}
                icon={() => (
                    <Star
                        className={clsx(
                            "w-4 h-4",
                            search.favoritedOnly
                                ? "fill-mocha-yellow text-mocha-yellow"
                                : "text-mocha-overlay1",
                        )}
                    />
                )}
                onClick={() =>
                    setSearch({
                        ...search,
                        favoritedOnly: !search.favoritedOnly,
                    })
                }
            />
        </div>
    );
}

function toggleFacet(
    search: ClipSearch,
    key: string,
    raw: string,
): ClipSearch {
    const facets = { ...search.facets };

    if (facets[key] === raw) {
        delete facets[key];
    } else {
        facets[key] = raw;
    }

    return { ...search, facets };
}
