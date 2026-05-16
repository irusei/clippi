import { useEffect, useState } from "react";
import { DetectedGame } from "../types"
import { invoke } from "@tauri-apps/api/core";
import { Switch } from "../components/ui/Switch";
import Input from "../components/ui/Input";
import ProcessPicker from "../components/ProcessPicker";

interface GameProps {
    game: DetectedGame;
    onClick: () => void;
}

export function GameView({game, onClick}: GameProps) {
    return (
        <div className="flex flex-row items-center gap-x-4 p-4 bg-mocha-base border-mocha-base border rounded-xl text-mocha-text hover:border-mocha-blue transition-all hover:cursor-pointer" onClick={onClick}>
            <img className="w-4 h-4" src={game.icon ?? ""}/>
            <p>{game.name}</p>
        </div>
    )
}
export default function GameTab() {
    let [supportedGames, setSupportedGames] = useState<DetectedGame[]>([]);
    let [chosenGame, setChosenGame] = useState<DetectedGame | null>(null);
    let [modifiedGame, setModifiedGame] = useState<DetectedGame | null>(null);

    function getGames() {
        invoke("get_games").then((games) => {
            setSupportedGames(games as DetectedGame[]);
        })
    }

    function editGame() {
        invoke("edit_game", {oldGame: chosenGame, newGame: modifiedGame});
        setChosenGame(modifiedGame);
        getGames();
    }
    
    function deleteGame() {
        setChosenGame(null);
        setModifiedGame(null);
        invoke("remove_game", {game: chosenGame}).then(() => getGames());
    }

    const updateField = (key: keyof DetectedGame, value: any) => {
        if (!modifiedGame) return;
        setModifiedGame({ ...modifiedGame, [key]: value });
    };

    useEffect(() => {
        getGames();
    }, []);

    return (
        <div className="bg-mocha-mantle w-full h-screen">
            <div className="px-10 py-8 h-full flex flex-col overflow-hidden">
                <div className="flex flex-row justify-between items-center space-x-60">
                    <h2 className="text-3xl font-semibold text-mocha-text mb-2">Supported games</h2>

                    <button
                        onClick={() => {
                            const new_game: DetectedGame = {
                                name: "New game",
                                icon: "",
                                executables: [],
                                use_window_capture: false,
                                title_regex: []
                            }
                            invoke("add_game", { game: new_game }).then(() => {
                                invoke("get_games").then((g) => {
                                    const games = g as DetectedGame[];
                                    setSupportedGames(games);

                                    // focus on the added game, need to do this because it sorts it :(
                                    for (let i = 0; i < games.length; i++) {
                                        if (games[i].name === new_game.name) {
                                            setChosenGame(games[i]);
                                            setModifiedGame(games[i]);
                                            break;
                                        }
                                    }
                                })
                            })
                        }}
                        className="bg-mocha-mauve hover:bg-mocha-mauve/80 flex-1 transition-colors rounded-md w-20 h-10 py-2 px-4 font-semibold text-mocha-base mt-2"
                    >
                        Add game
                    </button>
                </div>"

                <div className="flex flex-row flex-1 min-h-0 w-full">
                    <div className="flex flex-col w-1/2 gap-y-4 overflow-y-auto pr-4 ">
                        {supportedGames.map((game) => (
                            <GameView
                                game={game}
                                onClick={() => {
                                    setChosenGame(game);
                                    setModifiedGame(game);
                                }}
                            />
                        ))}
                    </div>

                    {modifiedGame != null && (
                        <div className="flex flex-col w-1/2 text-mocha-text px-6 py-4 gap-y-4 overflow-y-auto ml-4 bg-mocha-base/20 rounded-xl">
                            <div className="flex flex-row items-center gap-x-4 text-mocha-text">
                                <img className="w-4 h-4" src={modifiedGame.icon ?? ""}/>
                                <p>{modifiedGame.name}</p>
                            </div>
                            <div className="flex flex-col gap-y-2">
                                <label className="text-sm font-semibold text-mocha-subtext1">
                                    Game name
                                </label>

                                <Input
                                    type="text"
                                    value={modifiedGame.name}
                                    onChange={(value) => updateField('name', value)}
                                />
                            </div>

                            <div className="flex flex-col gap-y-2">
                                <label className="text-sm font-semibold text-mocha-subtext1">
                                    Icon path
                                </label>

                                <Input
                                    type="text"
                                    value={modifiedGame.icon ?? ""}
                                    onChange={(value) => updateField('icon', value)}
                                />
                            </div>

                            <div className="flex flex-col gap-y-2">
                                <label className="text-sm font-semibold text-mocha-subtext1">
                                    Executables
                                </label>

                                <div className="flex flex-col gap-y-2">
                                    {modifiedGame.executables.map((exe, index) => (
                                        <Input
                                            key={index}
                                            type="text"
                                            value={exe}
                                            onChange={(value) => {
                                                const updatedExecutables = [...modifiedGame.executables];
                                                updatedExecutables[index] = value;
                                                updateField('executables', updatedExecutables);
                                            }}
                                            onKeyDown={(key) => {
                                                if (key === "Backspace" && modifiedGame.executables[index] === "") {
                                                    const updatedExecutables = [...modifiedGame.executables];
                                                    updatedExecutables.splice(index, 1);
                                                    updateField('executables', updatedExecutables);
                                                }
                                            }}
                                        />
                                    ))}
                                </div>

                                 <ProcessPicker
                                    onProcessSelected={(processName) => {
                                        updateField('executables', [...modifiedGame.executables, processName]);
                                    }}
                                    existingExecutables={modifiedGame.executables}
                                />
                            </div>

                            <div className="flex flex-col gap-y-2">
                                <label className="text-sm font-semibold text-mocha-subtext1">
                                    Regex title rules
                                </label>

                                <div className="flex flex-col gap-y-2">
                                    {modifiedGame.title_regex.map((regex, index) => (
                                        <Input
                                            key={index}
                                            type="text"
                                            value={regex}
                                            onChange={(value) => {
                                                const updatedRules = [...modifiedGame.title_regex];
                                                updatedRules[index] = value;
                                                updateField('title_regex', updatedRules);
                                            }}
                                            onKeyDown={(key) => {
                                                if (key === "Backspace" && modifiedGame.title_regex[index] === "") {
                                                    const updatedRules = [...modifiedGame.title_regex];
                                                    updatedRules.splice(index, 1);
                                                    updateField('title_regex', updatedRules);
                                                }
                                            }}
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        updateField('title_regex', [...modifiedGame.title_regex, ""])
                                    }}
                                    className="bg-mocha-mauve hover:bg-mocha-mauve/80 transition-colors rounded-md py-2 px-4 font-semibold text-mocha-base mt-2"
                                >
                                    Add new regex rule
                                </button>
                            </div>

                            <div className="flex items-center gap-x-3 pt-2">
                                <label className="text-sm font-semibold text-mocha-subtext1">
                                    Use window capture
                                </label>
                                <Switch
                                    checked={modifiedGame.use_window_capture}
                                    onChecked={(value) => updateField('use_window_capture', value)}
                                />
                            </div>

                            <button
                                onClick={() => editGame()}
                                className="bg-mocha-mauve hover:bg-mocha-mauve/80 transition-colors rounded-md py-3 px-4 font-semibold text-mocha-base mt-4"
                            >
                                Apply
                            </button>
                            <button
                                onClick={() => deleteGame()}
                                className="bg-mocha-red hover:bg-mocha-red/80 transition-colors rounded-md py-3 px-4 font-semibold text-mocha-base mt-0"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}