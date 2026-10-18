import { VodClip } from "../types";
import { LeaguePlayer, LeagueResult } from "../integration/league/LeagueTypes";
import { getSelf, getPositionName, getImageFromChampionName } from "../integration/league/LeagueUtils";

export interface FacetValue {
    raw: string;
    label: string;
}

export interface FacetGroup {
    key: string;
    label: string;
    values: (clip: VodClip) => FacetValue[];
    image?: (value: FacetValue) => Promise<string | null>;
}

export interface GameFacets {
    gameName: string;
    groups: FacetGroup[];
}

function getLeagueSelf(clip: VodClip): LeaguePlayer | null {
    return clip.integration_result?.type === "LeagueResult"
        ? getSelf(clip.integration_result as LeagueResult)
        : null;
}

export const GAME_FACETS: GameFacets[] = [
    {
        gameName: "League of Legends",
        groups: [
            {
                key: "position",
                label: "Positions",
                values: (clip) => {
                    const self = getLeagueSelf(clip);
                    return self
                        ? [{ raw: self.position, label: getPositionName(self.position) }]
                        : [];
                },
            },
            {
                key: "champion",
                label: "Champions",
                values: (clip) => {
                    const self = getLeagueSelf(clip);
                    return self
                        ? [{ raw: self.championName, label: self.championName }]
                        : [];
                },
                image: ({ raw }) => getImageFromChampionName(raw),
            },
        ],
    },
];

export function getFacetsForGame(gameName: string): FacetGroup[] {
    return GAME_FACETS.find((facets) => facets.gameName === gameName)?.groups ?? [];
}

export function getFacetGroup(gameName: string, key: string): FacetGroup | null {
    return getFacetsForGame(gameName).find((group) => group.key === key) ?? null;
}

export interface FacetOption {
    raw: string;
    label: string;
    count: number;
}

export function countFacetOptions(group: FacetGroup, clips: VodClip[]): FacetOption[] {
    const counts = new Map<string, FacetOption>();

    for (const clip of clips) {
        for (const value of group.values(clip)) {
            const option = counts.get(value.raw);
            if (option) {
                option.count++;
            } else {
                counts.set(value.raw, { ...value, count: 1 });
            }
        }
    }

    return Array.from(counts.values()).sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    );
}
