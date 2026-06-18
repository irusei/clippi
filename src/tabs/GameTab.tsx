import { useEffect, useState } from "react";
import { DetectedGame } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { Switch } from "../components/ui/Switch";
import Input from "../components/ui/Input";
import ProcessPicker from "../components/ProcessPicker";
import { Plus, Save, Search, Trash } from "lucide-react";
import { SettingsContainer } from "../components/ui/SettingsContainer";

interface GameProps {
    game: DetectedGame;
    selected: boolean;
    onClick: () => void;
}

export function GameView({ game, onClick, selected }: GameProps) {
    return (
        <div
            className={`flex flex-row items-center gap-x-4 px-2 py-2 bg-mocha-base border-mocha-base border rounded-sm text-mocha-text ${selected ? "border-mocha-mauve bg-mocha-mauve/20" : ""} hover:border-mocha-mauve transition-all hover:cursor-pointer`}
            onClick={onClick}
        >
            <img className="w-8 h-8" src={game.icon ?? ""} />
            <p className="truncate text-md">{game.name}</p>
        </div>
    );
}
export default function GameTab() {
    let [supportedGames, setSupportedGames] = useState<DetectedGame[]>([]);
    let [chosenGame, setChosenGame] = useState<DetectedGame | null>(null);
    let [modifiedGame, setModifiedGame] = useState<DetectedGame | null>(null);
    let [searchQuery, setSearchQuery] = useState<string>("");

    function getGames() {
        invoke("get_games").then((games) => {
            setSupportedGames(games as DetectedGame[]);
        });
    }

    function editGame() {
        invoke("edit_game", { oldGame: chosenGame, newGame: modifiedGame });
        setChosenGame(modifiedGame);
        getGames();
    }

    function deleteGame() {
        setChosenGame(null);
        setModifiedGame(null);
        invoke("remove_game", { game: chosenGame }).then(() => getGames());
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
                    <h2 className="text-3xl font-semibold text-mocha-text mb-4">
                        Supported games
                    </h2>
                    <button
                        onClick={() => {
                            const new_game: DetectedGame = {
                                name: "New game",
                                icon: "",
                                executables: [],
                                use_window_capture: false,
                                title_regex: [],
                            };
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
                                });
                            });
                        }}
                        className="bg-mocha-mauve hover:bg-mocha-mauve/80 transition-colors rounded-md py-2 px-4 font-semibold text-mocha-base mt-2 items-center flex flex-row gap-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <p>New game</p>
                    </button>
                </div>
                <div className="flex flex-row flex-1 min-h-0 w-full pr">
                    <div className="flex flex-col min-w-1/3 max-w-1/3 gap-y-4 overflow-x-hidden">
                        <div className="flex items-center gap-2 px-4 bg-mocha-base max-w-full rounded-lg">
                            <Search className="h-4 w-4 text-mocha-text shrink-0" />
                            <Input
                                type="text"
                                value={searchQuery}
                                placeholder="Search..."
                                onChange={(value) => setSearchQuery(value)}
                                className="focus:border-none border-none max-w-40 rounded-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-y-2 overflow-y-auto pr-4">
                            {supportedGames
                                .filter(
                                    (game) =>
                                        game.name
                                            .toLowerCase()
                                            .includes(searchQuery) ||
                                        game.executables.filter((exe) =>
                                            exe
                                                .toLowerCase()
                                                .includes(searchQuery),
                                        ).length > 0,
                                )
                                .map((game) => (
                                    <GameView
                                        key={game.name}
                                        game={game}
                                        selected={
                                            chosenGame != null &&
                                            chosenGame == game
                                        }
                                        onClick={() => {
                                            setChosenGame(game);
                                            setModifiedGame(game);
                                        }}
                                    />
                                ))}
                        </div>
                    </div>

                    {modifiedGame != null && (
                        <div className="flex flex-col min-w-2/3 max-w-2/3 text-mocha-text px-6 py-4 gap-y-4 overflow-y-auto ml-4 bg-mocha-base/20 rounded-xl">
                            <div className="flex flex-row items-center justify-between">
                                <div className="flex flex-row items-center gap-x-4 text-mocha-text">
                                    <img
                                        className="w-8 h-8"
                                        src={modifiedGame.icon ?? ""}
                                    />
                                    <p className="text-lg font-semibold">
                                        {modifiedGame.name}
                                    </p>
                                </div>
                                <div className="flex flex-row gap-x-2">
                                    <button
                                        onClick={() => editGame()}
                                        className="bg-mocha-mauve hover:bg-mocha-mauve/80 transition-colors rounded-md p-2 text-mocha-base flex items-center justify-center"
                                    >
                                        <Save className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => deleteGame()}
                                        className="bg-mocha-red hover:bg-mocha-red/80 transition-colors rounded-md p-2 text-mocha-base flex items-center justify-center"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <section className="flex flex-col gap-4">
                                <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                                    INFO
                                </h3>
                                <SettingsContainer
                                    title="Name"
                                    description="The name of the game"
                                >
                                    <Input
                                        className="bg-mocha-mantle min-w-1/2"
                                        type="text"
                                        value={modifiedGame.name}
                                        onChange={(value) =>
                                            updateField("name", value)
                                        }
                                    />
                                </SettingsContainer>
                                <SettingsContainer
                                    title="Icon"
                                    description="URL to the icon"
                                >
                                    <Input
                                        className="bg-mocha-mantle min-w-1/2"
                                        type="text"
                                        value={modifiedGame.icon ?? ""}
                                        onChange={(value) =>
                                            updateField("icon", value)
                                        }
                                    />
                                </SettingsContainer>
                            </section>

                            <section className="flex flex-col gap-4">
                                <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                                    DETECTION
                                </h3>

                                <div className="flex flex-col gap-4 p-4 rounded-lg bg-mocha-base">
                                    <div className="flex flex-row justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium text-mocha-text">
                                                Executables
                                            </span>

                                            <span className="text-xs text-mocha-overlay1">
                                                Processes used to detect the
                                                running game
                                            </span>
                                        </div>

                                        <ProcessPicker
                                            onProcessSelected={(
                                                processName,
                                            ) => {
                                                updateField("executables", [
                                                    ...modifiedGame.executables,
                                                    processName,
                                                ]);
                                            }}
                                            existingExecutables={
                                                modifiedGame.executables
                                            }
                                        />
                                    </div>

                                    <div className="flex flex-col gap-y-2">
                                        {modifiedGame.executables.map(
                                            (exe, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2"
                                                >
                                                    <span className="text-xs text-mocha-overlay1 w-6">
                                                        {index + 1}.
                                                    </span>

                                                    <Input
                                                        className="bg-mocha-mantle flex-1"
                                                        type="text"
                                                        value={exe}
                                                        onChange={(value) => {
                                                            const updated = [
                                                                ...modifiedGame.executables,
                                                            ];
                                                            updated[index] =
                                                                value;
                                                            updateField(
                                                                "executables",
                                                                updated,
                                                            );
                                                        }}
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [
                                                                ...modifiedGame.executables,
                                                            ];
                                                            updated.splice(
                                                                index,
                                                                1,
                                                            );
                                                            updateField(
                                                                "executables",
                                                                updated,
                                                            );
                                                        }}
                                                        className="text-red-400 hover:text-red-500 px-2"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 p-4 rounded-lg bg-mocha-base">
                                    <div className="flex flex-row justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium text-mocha-text">
                                                Regex title rules
                                            </span>

                                            <span className="text-xs text-mocha-overlay1">
                                                Regex patterns used to match
                                                window titles
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => {
                                                updateField("title_regex", [
                                                    ...modifiedGame.title_regex,
                                                    "",
                                                ]);
                                            }}
                                            className="p-2 text-mocha-mauve flex items-center justify-center hover:cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-y-2">
                                        {modifiedGame.title_regex.map(
                                            (regex, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2"
                                                >
                                                    <span className="text-xs text-mocha-overlay1 w-6">
                                                        {index + 1}.
                                                    </span>

                                                    <Input
                                                        className="bg-mocha-mantle flex-1"
                                                        type="text"
                                                        value={regex}
                                                        onChange={(value) => {
                                                            const updated = [
                                                                ...modifiedGame.title_regex,
                                                            ];
                                                            updated[index] =
                                                                value;
                                                            updateField(
                                                                "title_regex",
                                                                updated,
                                                            );
                                                        }}
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [
                                                                ...modifiedGame.title_regex,
                                                            ];
                                                            updated.splice(
                                                                index,
                                                                1,
                                                            );
                                                            updateField(
                                                                "title_regex",
                                                                updated,
                                                            );
                                                        }}
                                                        className="text-red-400 hover:text-red-500 px-2"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </section>

                            <section className="flex flex-col gap-4">
                                <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                                    COMPATIBILITY
                                </h3>

                                <SettingsContainer title="Use window capture">
                                    <Switch
                                        checked={
                                            modifiedGame.use_window_capture
                                        }
                                        onChecked={(value) =>
                                            updateField(
                                                "use_window_capture",
                                                value,
                                            )
                                        }
                                    />
                                </SettingsContainer>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
