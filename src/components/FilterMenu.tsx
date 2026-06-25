import { VodClip } from "../types";
import { FilterOptions } from "../types";
import { LeagueFilterMenu } from "./integration/league/LeagueFilterMenu";

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
    if (gameName === "League of Legends")
        return (
            <LeagueFilterMenu
                filterOptions={filterOptions}
                setFilterOptions={setFilterOptions}
                clips={clips}
            />
        );

    return null;
}
