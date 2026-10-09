import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Input from "../ui/Input";
import { Disclaimer } from "../ui/Disclaimer";
import { invoke } from "@tauri-apps/api/core";
import { Settings } from "../../types";

interface SteamGridDBPickerProps {
    isOpen: boolean;
    gameName: string;
    onSelect: (iconUrl: string) => void;
    onClose: () => void;
}

interface Icon {
    id: number;
    url: string;
    style: string[];
}

interface IconsResponse {
    data: {
        icons: Icon[];
        game: { name: string; release_date: number };
    };
}

export default function SteamGridDBPicker({
    isOpen,
    gameName,
    onSelect,
    onClose,
}: SteamGridDBPickerProps) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<
        { name: string; year: string; iconUrl: string }[]
    >([]);

    async function performSearch(q: string) {
        setLoading(true);
        setError(null);
        try {
            const settings = (await invoke("get_settings")) as Settings;
            if (!settings.steamgriddb_api_key) {
                setError(
                    "No SteamGridDB API key is configured, so icon search cannot run. Add your API key in Settings to fetch game icons.",
                );
                return;
            }

            const data = (await invoke("search_steamgriddb", {
                query: encodeURIComponent(q),
            })) as IconsResponse;
            const { icons, game } = data.data ?? {};
            if (!icons || !game) {
                setResults([]);
                return;
            }
            const year = game.release_date
                ? new Date(game.release_date * 1000).getFullYear().toString()
                : "";
            setResults(
                icons.map((i) => ({
                    name: game.name,
                    year,
                    iconUrl: i.url,
                })),
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to search");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (isOpen) {
            setQuery(gameName);
            performSearch(gameName);
        }
    }, [isOpen, gameName]);

    function submitSearch() {
        if (!query.trim()) return;
        performSearch(query);
    }

    if (!isOpen) return null;

    return (
        <div
            className="absolute left-0 top-full w-full min-w-2/3 max-w-full bg-mocha-base border border-mocha-mauve/10 rounded-xl overflow-hidden z-20 flex flex-col"
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-mocha-mauve/10">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-mocha-overlay2 uppercase tracking-wider">
                        Icons
                    </span>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-1 flex items-center justify-center transition-colors hover:bg-mocha-mauve/20 text-mocha-overlay2"
                    title="Close picker"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex flex-col px-3 py-2 gap-2">
                <Input
                    type="text"
                    value={query}
                    placeholder="Search games..."
                    onChange={setQuery}
                    onKeyDown={(key) => {
                        if (key === "Enter") submitSearch();
                    }}
                    className="w-full bg-mocha-mantle rounded-lg focus:border-none border-none"
                    autoFocus
                />

                <div className="max-h-60 overflow-y-auto scrollbar-hide flex flex-col">
                    {loading && (
                        <div className="flex items-center justify-center py-4 gap-2">
                            <span className="animate-spin inline-block w-5 h-5 border-2 border-mocha-mauve border-t-transparent rounded-full" />
                            <p className="text-sm text-mocha-overlay1">
                                Searching...
                            </p>
                        </div>
                    )}

                    {!loading &&
                        error && (
                            <Disclaimer
                                title={
                                    error.includes("Settings")
                                        ? "SteamGridDB not configured"
                                        : "Search failed"
                                }
                                description={error}
                                kind="danger"
                            />
                        )}

                    {!loading &&
                        !error &&
                        results.length === 0 && (
                            <div className="py-4 text-center text-sm text-mocha-subtext0">
                                No results found
                            </div>
                        )}

                    {!loading &&
                        !error &&
                        results.map((result, index) => (
                            <button
                                key={index}
                                type="button"
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-mocha-mauve/20 text-left"
                                onClick={() => onSelect(result.iconUrl)}
                            >
                                <img
                                    src={result.iconUrl}
                                    alt=""
                                    className="w-10 h-10 rounded-md object-contain bg-mocha-mantle shrink-0"
                                />
                                <div className="flex flex-col min-w-0 flex-1">
                                    <p className="text-sm font-medium text-mocha-text truncate">
                                        {result.name}
                                    </p>
                                    <p className="text-xs text-mocha-overlay2">
                                        {result.year}
                                    </p>
                                </div>
                            </button>
                        ))}
                </div>
            </div>
        </div>
    );
}
