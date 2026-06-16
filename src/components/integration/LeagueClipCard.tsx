import { useEffect, useState } from "react";
import {
    getImageFromChampionName,
    getImageFromItemName,
    getImageFromRuneName,
    getImageFromSpellName,
    getOpponentLaner,
    getSelf,
} from "../../integration/league/LeagueUtils";
import {
    LeaguePlayer,
    LeagueResult,
} from "../../integration/league/LeagueTypes";

interface LeagueClipCardPlayerProps {
    isSelf: boolean;
    player: LeaguePlayer;
    gameTime: number;
}

function LeagueClipCardPlayer({
    isSelf,
    player,
    gameTime,
}: LeagueClipCardPlayerProps) {
    let [championImage, setChampionImage] = useState("");
    let [spellImages, setSpellImages] = useState<string[]>([]);
    let [itemCols, setItemCols] = useState<string[][]>([]);

    useEffect(() => {
        async function fetchImages() {
            setChampionImage(
                (await getImageFromChampionName(player.championName)) ?? "",
            );

            setSpellImages(
                [
                    await getImageFromSpellName(
                        player.summonerSpells.summonerSpellOne.displayName,
                    ),
                    await getImageFromSpellName(
                        player.summonerSpells.summonerSpellTwo.displayName,
                    ),
                ].filter((spell) => spell != null),
            );

            // item columns
            let itemImages = (
                (await Promise.all(
                    player.items.map(
                        async (item) =>
                            await getImageFromItemName(item.displayName),
                    ),
                )) as (string | null)[]
            ).filter((item, index) => item != null && index < 6);

            let cols: string[][] = [];

            itemImages.forEach((image, index) => {
                if (index % 2 === 0) {
                    cols.push([]);
                }

                cols[cols.length - 1].push(image!);
            });

            setItemCols(cols);
        }

        fetchImages();
    }, [player]);

    return (
        <div className="flex flex-row gap-x-1">
            <div className="relative">
                <img
                    className="w-10 h-10 rounded-md bg-mocha-surface0 border border-mocha-crust object-cover"
                    src={championImage}
                />

                <span className="absolute -bottom-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded text-[10px] font-bold text-white bg-mocha-crust border border-mocha-crust">
                    {player.level}
                </span>
            </div>

            <div className="flex flex-col gap-y-0.5">
                {spellImages.map((spellImage) => (
                    <img
                        className="w-5 h-5 rounded bg-mocha-surface0 border border-mocha-crust object-cover"
                        src={spellImage}
                    />
                ))}
            </div>

            <div className="flex flex-col gap-y-0.5">
                <img
                    className="w-5 h-5 rounded bg-mocha-surface0 border border-mocha-crust object-cover"
                    src={getImageFromRuneName(
                        player.runes.primaryRuneTree.displayName,
                    )}
                />
                <img
                    className="w-5 h-5 rounded bg-mocha-surface0 border border-mocha-crust object-cover"
                    src={getImageFromRuneName(
                        player.runes.secondaryRuneTree.displayName,
                    )}
                />
            </div>

            <div className="flex flex-col justify-center">
                <div className="flex flex-row px-3">
                    <p className="font-bold text-white">
                        {player.scores.kills}
                    </p>
                    <p className="font-bold text-white">/</p>
                    <p className="font-bold text-mocha-red">
                        {player.scores.deaths}
                    </p>
                    <p className="font-bold text-white">/</p>
                    <p className="font-bold text-white">
                        {player.scores.assists}
                    </p>
                </div>

                {/* league cs through localhost api only increases if we have vision on the enemy. insanely inaccurate for anything really */}
                {isSelf && (
                    <p className="text-mocha-overlay1 text-xs">
                        ~{player.scores.creepScore} CS (
                        {(player.scores.creepScore / (gameTime / 60)).toFixed(
                            1,
                        )}
                        )
                    </p>
                )}
            </div>

            {itemCols.map((col) => (
                <div className="flex flex-col gap-y-0.5">
                    {col.map((image) => (
                        <img
                            className="w-5 h-5 rounded bg-mocha-surface0 border border-mocha-crust object-cover"
                            src={image}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

interface LeagueClipCardProps {
    integrationResult: LeagueResult;
}

export default function LeaugeClipCard({
    integrationResult,
}: LeagueClipCardProps) {
    let player = getSelf(integrationResult);
    let opponent = getOpponentLaner(integrationResult);

    if (!player || !opponent) return <></>;

    return (
        <div className="p-4 py-8 flex flex-row gap-x-4 items-center justify-center">
            <LeagueClipCardPlayer
                isSelf={true}
                player={player}
                gameTime={integrationResult.data.game_stats.gameTime}
            />
            <p className="font-semibold text-mocha-overlay1">vs</p>
            <LeagueClipCardPlayer
                isSelf={false}
                player={opponent}
                gameTime={integrationResult.data.game_stats.gameTime}
            />
        </div>
    );
}
