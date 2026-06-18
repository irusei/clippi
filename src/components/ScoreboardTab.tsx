import { useState, useEffect } from "react";

import {
    getGameResult,
    getImageFromChampionName,
    getImageFromSpellName,
    getSelf,
    getPositionName,
} from "../integration/league/LeagueUtils";
import { LeagueResult, LeaguePlayer } from "../integration/league/LeagueTypes";
import { formatTime } from "../utils";

function groupPlayersByTeam(
    players: LeaguePlayer[],
): { team: string; players: LeaguePlayer[] }[] {
    const teamMap = new Map<string, LeaguePlayer[]>();
    players.forEach((player) => {
        if (!teamMap.has(player.team)) {
            teamMap.set(player.team, []);
        }
        teamMap.get(player.team)!.push(player);
    });
    return Array.from(teamMap.entries()).map(([team, players]) => ({
        team,
        players,
    }));
}

function getTeamBgColor(team: string): string {
    switch (team) {
        case "ORDER":
            return "bg-mocha-blue/5 border-mocha-blue/20";
        case "CHAOS":
            return "bg-mocha-red/5 border-mocha-red/20";
        default:
            return "";
    }
}

function ChampionIcon({
    championName,
    title,
}: {
    championName: string;
    title?: string;
}) {
    const [src, setSrc] = useState("");
    useEffect(() => {
        getImageFromChampionName(championName).then((s) => {
            if (s) setSrc(s);
        });
    }, [championName]);

    return (
        <img
            className="w-6 h-6 rounded-md bg-mocha-surface0 border border-mocha-crust object-cover"
            src={src || ""}
            alt={championName}
            title={title}
        />
    );
}

function PlayerRow({
    player,
    isSelf,
    gameTime,
    selfTeam,
}: {
    player: LeaguePlayer;
    isSelf: boolean;
    gameTime: number;
    selfTeam: string | undefined;
}) {
    const [spells, setSpells] = useState<{ name: string; src: string }[]>([]);

    useEffect(() => {
        async function fetchSpells() {
            const spells = await Promise.all([
                getImageFromSpellName(
                    player.summonerSpells.summonerSpellOne.displayName,
                ).then((src) => ({
                    name: player.summonerSpells.summonerSpellOne.displayName,
                    src: src || "",
                })),
                getImageFromSpellName(
                    player.summonerSpells.summonerSpellTwo.displayName,
                ).then((src) => ({
                    name: player.summonerSpells.summonerSpellTwo.displayName,
                    src: src || "",
                })),
            ]);
            setSpells(spells);
        }
        fetchSpells();
    }, [player]);

    return (
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-mocha-base/50 hover:bg-mocha-base transition-colors">
            <ChampionIcon
                championName={player.championName}
                title={player.championName}
            />
            <div className="flex flex-col gap-0.5">
                {spells.map((spell, i) => (
                    <img
                        key={i}
                        className="w-4 h-4 rounded bg-mocha-surface0 border border-mocha-crust object-cover"
                        src={spell.src}
                        alt=""
                        title={spell.name}
                    />
                ))}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-1">
                    <span
                        className={`text-xs font-medium truncate ${isSelf ? "text-mocha-mauve" : "text-mocha-text"}`}
                        title={player.riotId}
                    >
                        {player.riotId}
                    </span>
                    {isSelf && (
                        <span className="text-[10px] text-mocha-mauve bg-mocha-mauve/10 px-1 rounded">
                            YOU
                        </span>
                    )}
                    <span className="text-[10px] text-mocha-overlay1 bg-mocha-surface0 px-1 rounded">Lv.{player.level}</span>
                </div>
                <div className="text-[10px] text-mocha-overlay1">
                    <span>{getPositionName(player.position)}</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-px">
                <div className="font-medium text-xs text-mocha-text">
                    {player.scores.kills}
                    <span className="text-mocha-overlay0">/</span>
                    <span className="text-mocha-red">
                        {player.scores.deaths}
                    </span>
                    <span className="text-mocha-overlay0">/</span>
                    {player.scores.assists}
                </div>
                {player.team === selfTeam && (
                    <div className="text-[10px] text-mocha-overlay1">
                        ~{player.scores.creepScore} CS
                        {gameTime > 0 && (
                            <span className="text-mocha-overlay0">
                                {" "}
                                (
                                {(
                                    player.scores.creepScore /
                                    (gameTime / 60)
                                ).toFixed(1)}
                                /min)
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TeamPanel({
    group,
    selfPlayer,
    gameTime,
}: {
    group: { team: string; players: LeaguePlayer[] };
    selfPlayer: LeaguePlayer | null;
    gameTime: number;
}) {
    return (
        <div className={`border rounded-lg p-2 ${getTeamBgColor(group.team)}`}>
            <div className="flex flex-col gap-1">
                {group.players.map((player) => (
                    <PlayerRow
                        key={player.riotId}
                        player={player}
                        isSelf={selfPlayer?.riotId === player.riotId}
                        gameTime={gameTime}
                        selfTeam={selfPlayer?.team}
                    />
                ))}
            </div>
        </div>
    );
}

export default function ScoreboardTab({ result }: { result: LeagueResult }) {
    const [gameTime] = useState(result.data.game_stats.gameTime);
    const self = getSelf(result);
    const gameResult = getGameResult(result);
    const teams = groupPlayersByTeam(result.data.players);

    return (
        <div className="p-2 space-y-2">
            <div className="flex items-center justify-between text-xs text-mocha-overlay1 px-1">
                <span>{result.data.game_stats.gameMode}</span>
                <span>{formatTime(result.data.game_stats.gameTime)}</span>
            </div>
            {gameResult && (
                <div className="flex justify-end">
                    <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            gameResult === "Win"
                                ? "text-mocha-green bg-mocha-green/10"
                                : "text-mocha-red bg-mocha-red/10"
                        }`}
                    >
                        {gameResult}
                    </span>
                </div>
            )}
            <div className="flex flex-col gap-2">
                {teams.map((team) => (
                    <TeamPanel
                        key={team.team}
                        group={team}
                        selfPlayer={self}
                        gameTime={gameTime}
                    />
                ))}
            </div>
        </div>
    );
}
