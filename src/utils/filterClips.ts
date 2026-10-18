import { ClipSearch, DateGroup, DetectedGame, VodClip } from "../types";
import { getFacetGroup } from "./facets";
import { getClipDayKey, getClipTimestamp, formatDayHeading } from "../utils";

export function filterClips(clips: VodClip[], search: ClipSearch): VodClip[] {
    const query = search.search.trim().toLowerCase();

    return clips.filter((clip) => {
        if (query && !`${clip.title} ${clip.game.name}`.toLowerCase().includes(query)) {
            return false;
        }

        if (search.gameName && clip.game.name !== search.gameName) {
            return false;
        }

        if (search.favoritedOnly && !clip.favorited) {
            return false;
        }

        for (const [key, raw] of Object.entries(search.facets)) {
            const group = getFacetGroup(clip.game.name, key);
            if (!group || !group.values(clip).some((value) => value.raw === raw)) {
                return false;
            }
        }

        return true;
    });
}

export function sortClips(clips: VodClip[]): VodClip[] {
    // TODO: add different sorting
    return [...clips].sort((a, b) => {
        const byDate = getClipTimestamp(b.date) - getClipTimestamp(a.date);
        return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
    });
}

export function groupByDay(clips: VodClip[]): DateGroup[] {
    const groups: DateGroup[] = [];

    for (const clip of clips) {
        const dayKey = getClipDayKey(clip.date);
        const last = groups[groups.length - 1];

        // When this is ran clips are already sorted so this works but should keep this in mind
        if (last && last.dayKey === dayKey) {
            last.clips.push(clip);
        } else {
            groups.push({ dayKey, heading: formatDayHeading(dayKey), clips: [clip] });
        }
    }

    return groups;
}

export function getUniqueGames(clips: VodClip[]): [DetectedGame, number][] {
    const counts = new Map<string, [DetectedGame, number]>();

    for (const clip of clips) {
        const indexed = counts.get(clip.game.name);
        if (indexed) {
            counts.set(clip.game.name, [indexed[0], indexed[1] + 1]);
        } else {
            counts.set(clip.game.name, [clip.game, 1]);
        }
    }

    return Array.from(counts.values()).sort((a, b) => b[1] - a[1]);
}

export function setCollapsedDays(
    search: ClipSearch,
    dayKey: string,
    collapsed: boolean,
): ClipSearch {
    // remove if found
    const collapsedDayKeys = search.collapsedDayKeys.filter(
        (key) => key !== dayKey,
    );

    // add back if collapsing
    if (collapsed) collapsedDayKeys.push(dayKey);

    return { ...search, collapsedDayKeys };
}
