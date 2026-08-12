import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Input from "../ui/Input";
import { invoke } from "@tauri-apps/api/core";

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
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/50" />

            <div
                className="relative w-100 bg-mocha-mantle rounded-xl border border-mocha-surface0 shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3 border-b border-mocha-surface0">
                    <div className="flex items-center gap-2 px-4 bg-mocha-base max-w-full rounded-lg">
                        <Search className="h-4 w-4 text-mocha-text shrink-0" />
                        <Input
                            type="text"
                            value={query}
                            placeholder="Search games..."
                            onChange={setQuery}
                            onKeyDown={(key) => {
                                if (key === "Enter") submitSearch();
                            }}
                            className="flex-1 focus:border-none border-none rounded-sm"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 max-h-100">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <span className="animate-spin inline-block w-5 h-5 border-2 border-mocha-mauve border-t-transparent rounded-full" />
                            <p className="text-sm text-mocha-overlay1">
                                Searching...
                            </p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <p className="text-sm text-mocha-red">{error}</p>
                        </div>
                    )}

                    {!loading && !error && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <p className="text-sm text-mocha-overlay1">
                                No results found
                            </p>
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        results.map((result, index) => (
                            <button
                                key={index}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-mocha-base transition-colors text-left"
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
                                    <p className="text-xs text-mocha-overlay1">
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
