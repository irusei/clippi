import { Result, Bookmark as BookmarkType } from "../types";
import { LeagueGameEvent } from "../integration/league/LeagueTypes";

export interface MarkerData {
    label: string;
    time: number;
    colorClass: string;
}

export function getMarkerData(
    integration: Result | null,
    bookmarks: BookmarkType[],
): MarkerData[] {
    if (integration == null)
        return bookmarks.map((b) => ({
            label: b.name,
            time: b.timestamp / 1000,
            colorClass: "bg-mocha-green",
        }));

    const markers: MarkerData[] = [];
    const offset = integration.offset / 1000;

    function add(event: LeagueGameEvent, name: string, color: string) {
        markers.push({
            label: name,
            time: event.EventTime + offset,
            colorClass: color,
        });
    }

    const username = integration.data.current_player_data.riotId.split("#")[0];

    if (integration.type === "LeagueResult") {
        for (const event of integration.data.game_events.Events) {
            switch (event.EventName) {
                case "ChampionKill":
                    if (
                        event.KillerName === username ||
                        event.Assisters.includes(username)
                    ) {
                        add(event, `KILL`, "bg-mocha-mauve");
                    } else if (event.VictimName === username) {
                        add(event, `DEATH`, "bg-mocha-red");
                    }
                    break;
                case "TurretKilled":
                    if (
                        event.KillerName === username ||
                        event.Assisters.includes(username)
                    ) {
                        add(event, "TURRET DESTROYED", "bg-mocha-blue");
                    }
                    break;
                case "BaronKill":
                case "DragonKill":
                case "HeraldKill":
                case "HordeKill":
                    if (
                        event.KillerName === username ||
                        event.Assisters.includes(username)
                    ) {
                        add(event, "OBJECTIVE", "bg-mocha-lavender");
                    }
                    break;
            }
        }
    }

    const all = [
        ...markers,
        ...bookmarks.map((b) => ({
            label: b.name,
            time: b.timestamp / 1000,
            colorClass: "bg-mocha-green",
        })),
    ];

    return all.sort((a, b) => a.time - b.time);
}
