import { VodClip } from "../types";
import { FilterOptions, LeagueFilter } from "../types";
import { LeagueResult } from "../integration/league/LeagueTypes";
import { getSelf } from "../integration/league/LeagueUtils";

export function filterClips(
    clips: VodClip[],
    selectedGameName: string,
    filterOptions: FilterOptions,
    favoritedOnly: boolean = false,
): VodClip[] {
    return clips.filter((clip) => {
        if (selectedGameName && clip.game.name !== selectedGameName) {
            return false;
        }

        if (favoritedOnly && !clip.favorited) {
            return false;
        }

        if (filterOptions.type === "league") {
            const leagueFilter = filterOptions as LeagueFilter;

            if (leagueFilter.championName) {
                if (clip.integration_result?.type !== "LeagueResult")
                    return false;
                const self = getSelf(clip.integration_result as LeagueResult);
                if (!self || self.championName !== leagueFilter.championName)
                    return false;
            }

            if (leagueFilter.positionName) {
                if (clip.integration_result?.type !== "LeagueResult")
                    return false;
                const self = getSelf(clip.integration_result as LeagueResult);
                if (!self || self.position !== leagueFilter.positionName)
                    return false;
            }
        }

        return true;
    });
}
