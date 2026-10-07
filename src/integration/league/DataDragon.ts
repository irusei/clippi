export interface DDChampion {
    name: string;
    squarePortraitPath: string;
}

export interface DDItem {
    name: string;
    iconPath: string;
}

export interface DDSpell {
    name: string;
    iconPath: string;
}

export interface DDRune {
    name: string;
    iconPath: string;
}

let champions: DDChampion[] = [];
let items: DDItem[] = [];
let spells: DDSpell[] = [];

async function fetchCD(endpoint: String) {
    return (
        await fetch(
            "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/" +
                endpoint,
        )
    ).json();
}

async function prepare() {
    if (champions.length === 0) champions = await fetchChampions();
    if (items.length === 0) items = await fetchItems();
    if (spells.length === 0) spells = await fetchSpells();
}

async function fetchChampions(): Promise<DDChampion[]> {
    return (await fetchCD("champion-summary.json")) as unknown as DDChampion[];
}

async function fetchItems(): Promise<DDItem[]> {
    return (await fetchCD("items.json")) as unknown as DDItem[];
}

async function fetchSpells(): Promise<DDSpell[]> {
    return (await fetchCD("summoner-spells.json")) as unknown as DDItem[];
}

export async function getChampionData(championName: string) {
    await prepare(); // make sure all data exists
    return champions.find((champion) => champion.name === championName);
}

export async function getItemData(itemName: string) {
    await prepare();
    return items.find((item) => item.name === itemName);
}

export async function getSpellData(spellName: string) {
    await prepare();
    return spells.find((spell) => spell.name === spellName);
}
