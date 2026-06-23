import { Result, Bookmark as BookmarkType } from "../types";
import { getPlayerPosition } from "./league/LeagueUtils";
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

    function add(time: number, name: string, color: string) {
        markers.push({
            label: name,
            time: time,
            colorClass: color,
        });
    }

    switch (integration.type) {
        case "LeagueResult":
            const offset = integration.offset / 1000;
            const username =
                integration.data.current_player_data.riotId.split("#")[0];
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
                                event.EventTime + offset,
                                `KILLED ${enemyPos != null ? enemyPos.toUpperCase() : event.VictimName}`,
                                "bg-mocha-mauve",
                            );
                        } else if (event.VictimName === username) {
                            const killerPos = getPlayerPosition(
                                integration,
                                event.KillerName,
                            );
                            add(
                                event.EventTime + offset,
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
                            add(
                                event.EventTime + offset,
                                "TURRET DESTROYED",
                                "bg-mocha-blue",
                            );
                        }
                        break;
                    case "BaronKill":
                        if (
                            event.KillerName === username ||
                            event.Assisters.includes(username)
                        ) {
                            add(
                                event.EventTime + offset,
                                "TOOK BARON",
                                "bg-mocha-lavender",
                            );
                        }
                        break;
                    case "DragonKill":
                        if (
                            event.KillerName === username ||
                            event.Assisters.includes(username)
                        ) {
                            add(
                                event.EventTime + offset,
                                `TOOK DRAGON`,
                                "bg-mocha-lavender",
                            );
                        }
                        break;
                    case "HeraldKill":
                        if (
                            event.KillerName === username ||
                            event.Assisters.includes(username)
                        ) {
                            add(
                                event.EventTime + offset,
                                "TOOK HERALD",
                                "bg-mocha-lavender",
                            );
                        }
                        break;
                    case "HordeKill":
                        if (
                            event.KillerName === username ||
                            event.Assisters.includes(username)
                        ) {
                            add(
                                event.EventTime + offset,
                                "TOOK VOIDGRUBS",
                                "bg-mocha-lavender",
                            );
                        }
                        break;
                }
            }
            break;
        case "KovaaKsResult":
            for (const scenario of integration.data.scenarios) {
                add(
                    scenario.adjusted_finish_time / 1000,
                    `${scenario.name} - ${scenario.score.toFixed(2)}`,
                    "bg-mocha-green",
                );
            }
            break;
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
