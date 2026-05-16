import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Input from "./ui/Input";

interface ProcessPickerProps {
    onProcessSelected: (processName: string) => void;
    existingExecutables?: string[];
}

export default function ProcessPicker({ onProcessSelected, existingExecutables }: ProcessPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [processes, setProcesses] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && processes.length === 0) {
            setLoading(true);
            invoke<string[]>("list_processes").then((procs) => {
                setProcesses(procs);
                setLoading(false);
            })
        }
    }, [isOpen]);

    const filtered = processes
        .filter((p) => p.toLowerCase().includes(search.toLowerCase()))
        .filter((p) => !existingExecutables!.includes(p));

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center text-center justify-center gap-2 bg-mocha-mauve hover:bg-mocha-mauve/80 transition-colors rounded-md py-2 px-4 font-semibold text-mocha-base"
            >
                <p className="text-center">Pick process</p>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-mocha-base border border-mocha-base rounded-xl z-20 overflow-hidden">
                    <div className="w-full p-2 border-b border-mocha-base/20">
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
                                {search ? "No matches found" : "No processes available"}
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
