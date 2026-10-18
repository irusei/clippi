import { useEffect, useState } from "react";
import { DetectedGame, GamePreference } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { Switch } from "../components/ui/Switch";
import Input from "../components/ui/Input";
import ProcessPicker from "../components/ProcessPicker";
import SteamGridDBPicker from "../components/integration/SteamGridDBPicker";
import { Plus, Save, Search, Trash, Sparkles } from "lucide-react";
import { SettingsContainer } from "../components/ui/SettingsContainer";
import { clamp } from "../utils";
import clsx from "clsx";
import { platform } from "@tauri-apps/plugin-os";
import { Disclaimer } from "../components/ui/Disclaimer";

interface GameProps {
    game: DetectedGame;
    selected: boolean;
    onClick: () => void;
}

export function GameView({ game, onClick, selected }: GameProps) {
    return (
        <div
            className={clsx(
                "relative w-full flex items-center gap-2 px-2 py-1 rounded-lg transition-colors hover:bg-mocha-surface0 cursor-pointer select-none",
                selected && "bg-mocha-surface0 text-mocha-text",
            )}
            onClick={onClick}
        >
            {selected && (
                <div className="absolute top-0 left-0 w-1 h-full bg-mocha-mauve rounded-none" />
            )}

            <div className="flex items-center gap-2 min-w-0 truncate">
                {game.icon ? (
                    <img
                        src={game.icon}
                        alt={game.name}
                        className="w-4 h-4 rounded-sm bg-mocha-surface0 object-cover shrink-0"
                    />
                ) : (
                    <div className="w-4 h-4 rounded-sm bg-mocha-surface0" />
                )}

                <p className={clsx("truncate", selected ? "font-medium" : "text-mocha-subtext0")}>
                    {game.name}
                </p>
            </div>
        </div>
    );
}
export default function GameTab() {
    let [supportedGames, setSupportedGames] = useState<DetectedGame[]>([]);
    let [chosenGame, setChosenGame] = useState<DetectedGame | null>(null);
    let [modifiedGame, setModifiedGame] = useState<DetectedGame | null>(null);
    let [searchQuery, setSearchQuery] = useState<string>("");
    let [gamePreferences, setGamePreferences] = useState<GamePreference | null>(
        null,
    );
    let [pickerOpen, setPickerOpen] = useState(false);

    function selectIcon(iconUrl: string) {
        if (!modifiedGame) return;
        updateField("icon", iconUrl);
        setPickerOpen(false);
    }

    function getGames() {
        invoke("get_games").then((games) => {
            setSupportedGames(games as DetectedGame[]);
        });
    }

    function getPreferences() {
        if (chosenGame == null) return;
        invoke("get_game_preference", { gameName: chosenGame!.name }).then(
            (prefs) => {
                setGamePreferences(prefs as GamePreference);
            },
        );
    }

    function editGame() {
        invoke("edit_game", { oldGame: chosenGame, newGame: modifiedGame });
        if (gamePreferences != null)
            invoke("set_game_preference", {
                gameName: modifiedGame!.name,
                preferences: gamePreferences,
            });

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

    const updatePreferenceField = (key: keyof GamePreference, value: any) => {
        if (!gamePreferences) return;
        setGamePreferences({ ...gamePreferences, [key]: value });
    };

    useEffect(() => {
        getGames();
    }, []);

    // update preferences
    useEffect(getPreferences, [chosenGame]);

    const query = searchQuery.trim().toLowerCase();
    const filteredGames = supportedGames.filter(
        (game) =>
            `${game.name} ${game.executables.join(" ")}`.toLowerCase().includes(query),
    );

    return (
        <div className="relative bg-mocha-mantle w-full h-full flex flex-col">
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
                <div className="flex items-center justify-between gap-x-3 px-6 py-2.5 bg-mocha-base border-b border-mocha-surface0 shrink-0">
                    <h2 className="text-xl font-semibold text-mocha-text">
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
                        className="flex items-center gap-x-2 px-3 py-2 rounded-md bg-mocha-base text-mocha-text font-medium hover:bg-mocha-surface0 border border-mocha-surface0 transition-colors shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <p>New game</p>
                    </button>
                </div>
                <div className="flex flex-row flex-1 min-h-0">
                    <div className="w-72 shrink-0 flex flex-col bg-mocha-base border-r border-mocha-surface0 px-4 py-3 gap-y-1">
                        <div className="relative flex items-center w-full shrink-0">
                            <Input
                                type="text"
                                placeholder={"Search"}
                                className="w-full h-9 rounded-md pl-7 py-3"
                                value={searchQuery}
                                onChange={(value) => setSearchQuery(value)}
                            />

                            <Search
                                className="absolute left-2 inset-y-auto w-4 h-4 text-mocha-overlay1 pointer-events-none"
                            />
                        </div>

                        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto gap-y-1">
                            {filteredGames.length === 0 && (
                                <p className="text-sm text-mocha-overlay2 py-4">
                                    No games match this search
                                </p>
                            )}

                            {filteredGames.map((game) => (
                                <GameView
                                    key={game.name}
                                    game={game}
                                    selected={chosenGame?.name === game.name}
                                    onClick={() => {
                                        setChosenGame(game);
                                        setModifiedGame(game);
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {modifiedGame != null && (
                        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-y-scroll px-6 pt-4 gap-y-4">
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
                                        className="flex items-center justify-center p-2 rounded-sm border border-mocha-surface0 bg-mocha-base text-mocha-green hover:bg-mocha-green/10 transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => deleteGame()}
                                        className="flex items-center justify-center p-2 rounded-sm border border-mocha-surface0 bg-mocha-base text-mocha-red hover:bg-mocha-red/10 transition-colors"
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
                                    <div className="relative flex min-w-1/2 flex-row gap-2 items-center">
                                        <Input
                                            className="bg-mocha-mantle flex-1"
                                            type="text"
                                            value={modifiedGame.icon ?? ""}
                                            onChange={(value) =>
                                                updateField("icon", value)
                                            }
                                        />
                                        <button
                                            onClick={() =>
                                                setPickerOpen(!pickerOpen)}
                                            className="flex items-center justify-center p-2 rounded-sm bg-mocha-base text-mocha-mauve hover:bg-mocha-surface0 transition-colors"
                                            title="Fetch icon from SteamGridDB"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                        </button>

                                        <SteamGridDBPicker
                                            isOpen={pickerOpen}
                                            gameName={modifiedGame?.name ?? ""}
                                            onSelect={selectIcon}
                                            onClose={() => setPickerOpen(false)}
                                        />
                                    </div>
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
                                                        className="flex items-center text-mocha-red hover:bg-mocha-red/10 p-2 rounded-sm transition-colors"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>

                                {platform() === "windows" && (
                                    <div className="flex flex-col p-4 rounded-lg bg-mocha-base gap-y-4">
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

                                        {modifiedGame.title_regex.length > 0 && (
                                            <div className="flex flex-col gap-y-2">
                                                {modifiedGame.title_regex.map(
                                                    (regex, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Input
                                                                className="bg-mocha-mantle flex-1"
                                                                type="text"
                                                                value={regex}
                                                                onChange={(
                                                                    value,
                                                                ) => {
                                                                    const updated =
                                                                        [
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
                                                                    const updated =
                                                                        [
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
                                                                className="flex items-center text-mocha-red hover:bg-mocha-red/10 px-2 rounded-sm transition-colors"
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="flex flex-col gap-4">
                                <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                                    COMPATIBILITY
                                </h3>

                                {platform() === "windows" && (
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
                                )}
                            </section>

                            {gamePreferences && (
                                <section className="flex flex-col gap-4">
                                    <h3 className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                                        PERSONAL SETTINGS
                                    </h3>

                                    <div className="flex flex-col gap-3 px-1">
                                        <SettingsContainer
                                            title="Enable"
                                            description="Enable recording for this game"
                                        >
                                            <Switch
                                                checked={
                                                    gamePreferences.enabled
                                                }
                                                onChecked={(value) =>
                                                    updatePreferenceField(
                                                        "enabled",
                                                        value,
                                                    )
                                                }
                                            />
                                        </SettingsContainer>

                                        {platform() === "windows" && (
                                            <>
                                                <Disclaimer
                                                    title="Width/Height Override"
                                                    description="If you're using a custom resolution for this game, make sure to set it below so clippi can properly capture the game"
                                                />
                                                <SettingsContainer
                                                    title="Width Override"
                                                    description="Override width resolution for this game"
                                                >
                                                    <Input
                                                        type="number"
                                                        className="bg-mocha-mantle w-1/2"
                                                        value={
                                                            gamePreferences.resolution_x_override
                                                        }
                                                        onChange={(value) => {
                                                            updatePreferenceField(
                                                                "resolution_x_override",
                                                                value
                                                                    ? clamp(
                                                                          parseInt(
                                                                              value,
                                                                          ),
                                                                          1,
                                                                          8192,
                                                                      )
                                                                    : null,
                                                            );
                                                        }}
                                                    />
                                                </SettingsContainer>

                                                <SettingsContainer
                                                    title="Height Override"
                                                    description="Override height resolution for this game"
                                                >
                                                    <Input
                                                        type="number"
                                                        className="bg-mocha-mantle w-1/2"
                                                        value={
                                                            gamePreferences.resolution_y_override
                                                        }
                                                        onChange={(value) => {
                                                            updatePreferenceField(
                                                                "resolution_y_override",
                                                                value
                                                                    ? clamp(
                                                                          parseInt(
                                                                              value,
                                                                          ),
                                                                          1,
                                                                          8192,
                                                                      )
                                                                    : null,
                                                            );
                                                        }}
                                                    />
                                                </SettingsContainer>
                                            </>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
