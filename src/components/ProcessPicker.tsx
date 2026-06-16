import { useState, useRef, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import Input from "./ui/Input";
import { Plus } from "lucide-react";

interface ProcessPickerProps {
    onProcessSelected: (processName: string) => void;
    existingExecutables?: string[];
}

export default function ProcessPicker({
    onProcessSelected,
    existingExecutables,
}: ProcessPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [processes, setProcesses] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && processes.length === 0) {
            setLoading(true);
            invoke<string[]>("list_processes").then((procs) => {
                setProcesses([...new Set(procs)]);
                setLoading(false);
            });
        }
    }, [isOpen]);

    const filtered = useMemo(
        () =>
            processes
                .filter((p) => p.toLowerCase().includes(search.toLowerCase()))
                .filter((p) => !existingExecutables!.includes(p)),
        [processes, search, existingExecutables],
    );

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                }}
                className="p-2 text-mocha-mauve flex items-center justify-center hover:cursor-pointer"
            >
                <Plus className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full w-50 mt-1 bg-mocha-base border border-mocha-mauve/10 rounded-xl z-20 overflow-hidden">
                    <div className="w-full p-1 border-b border-mocha-mantle">
                        <Input
                            className="w-full"
                            type="text"
                            placeholder="Search processes..."
                            value={search}
                            onChange={(value) => setSearch(value)}
                        />
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="px-4 py-6 text-center text-mocha-subtext2 text-sm">
                                Loading processes...
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-mocha-subtext2 text-sm">
                                {search
                                    ? "No matches found"
                                    : "No processes available"}
                            </div>
                        ) : (
                            filtered.map((proc) => (
                                <button
                                    key={proc}
                                    type="button"
                                    onClick={() => {
                                        onProcessSelected(proc);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-mocha-text hover:bg-border hover:bg-mocha-mauve/20 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <p className="truncate">{proc}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
