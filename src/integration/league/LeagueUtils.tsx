import { LeagueResult, LeaguePlayer, LeagueGameResult } from "./LeagueTypes";
import { getChampionData, getItemData, getSpellData } from "./DataDragon";

export function getPlayerData(
    integration: LeagueResult,
    riotId: string,
): LeaguePlayer | null {
    return integration.data.players.find((p) => p.riotId === riotId) ?? null;
}

export function getOppositeTeam(team: "CHAOS" | "ORDER"): "CHAOS" | "ORDER" {
    return team === "CHAOS" ? "ORDER" : "CHAOS";
}

export function getSelf(integration: LeagueResult): LeaguePlayer | null {
    return (
        getPlayerData(
            integration,
            integration.data.current_player_data.riotId,
        ) ?? null
    );
}

export function getOpponentLaner(
    integration: LeagueResult,
): LeaguePlayer | null {
    let currentPlayer = getPlayerData(
        integration,
        integration.data.current_player_data.riotId,
    );

    if (!currentPlayer || currentPlayer?.position === "NONE") return null;

    return (
        integration.data.players.find(
            (p) =>
                p.team ===
                    getOppositeTeam(currentPlayer.team as "CHAOS" | "ORDER") &&
                p.position === currentPlayer.position,
        ) ?? null
    );
}

export async function getImageFromChampionName(
    championName: string,
): Promise<string | null> {
    let champion = await getChampionData(championName);

    if (!champion) return null;

    const split = champion.squarePortraitPath.split("/");
    const img = split[split.length - 1];

    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${img}`;
}

export async function getImageFromItemName(
    itemName: string,
): Promise<string | null> {
    let item = await getItemData(itemName);
    if (!item) return null;
    const split = item.iconPath.split("/");
    const img = split[split.length - 1].toLowerCase();

    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/items/icons2d/${img}`;
}

export async function getImageFromSpellName(
    spellName: string,
): Promise<string | null> {
    let img;
    if (spellName === "Primal Smite" || spellName === "Unleashed Smite") {
        img = "summoner_smite.png";
    } else {
        let spell = await getSpellData(spellName);
        if (!spell) return null;
        const split = spell.iconPath.split("/");
        img = split[split.length - 1].toLowerCase();
    }

    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/data/spells/icons2d/${img}`;
}

export function getImageFromRuneName(runeName: string): string {
    const lowercaseRune = runeName.toLowerCase();
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/${lowercaseRune}/${lowercaseRune}_icon.svg`;
}

export function getGameResult(
    integration: LeagueResult,
): LeagueGameResult | null {
    if (integration.data.game_events.Events.length === 0) return null;

    const lastEvent =
        integration.data.game_events.Events[
            integration.data.game_events.Events.length - 1
        ];
    if (lastEvent.EventName != "GameEnd") return null;

    return lastEvent.Result;
}
