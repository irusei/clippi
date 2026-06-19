import { Result, Bookmark as BookmarkType } from "../types";
import { LeagueGameEvent } from "../integration/league/LeagueTypes";
import { getPlayerPosition } from "../integration/league/LeagueUtils";
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
                        const enemyPos = getPlayerPosition(
                            integration,
                            event.VictimName,
                        );
                        add(
                            event,
                            `KILLED ${enemyPos != null ? enemyPos.toUpperCase() : event.VictimName}`,
                            "bg-mocha-mauve",
                        );
                    } else if (event.VictimName === username) {
                        const killerPos = getPlayerPosition(
                            integration,
                            event.KillerName,
                        );
                        add(
                            event,
                            `DIED TO ${killerPos != null ? killerPos.toUpperCase() : event.KillerName}`,
                            "bg-mocha-red",
                        );
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
                    if (
                        event.KillerName === username ||
                        event.Assisters.includes(username)
                    ) {
                        add(event, "TOOK BARON", "bg-mocha-lavender");
                    }
                    break;
                case "DragonKill":
                    if (
                        event.KillerName === username ||
                        event.Assisters.includes(username)
                    ) {
                        add(event, `TOOK DRAGON`, "bg-mocha-lavender");
                    }
                    break;
                case "HeraldKill":
                    if (
                        event.KillerName === username ||
                        event.Assisters.includes(username)
                    ) {
                        add(event, "TOOK HERALD", "bg-mocha-lavender");
                    }
                    break;
                case "HordeKill":
                    if (
                        event.KillerName === username ||
                        event.Assisters.includes(username)
                    ) {
                        add(event, "TOOK VOIDGRUBS", "bg-mocha-lavender");
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
