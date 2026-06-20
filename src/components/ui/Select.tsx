import clsx from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useRef, useEffect, useMemo, ReactNode } from "react";

type SelectContentProps =
    | {
          options: [string, string][];
          children?: never;
      }
    | {
          options?: never;
          children: [string, ReactNode][];
      };

type SelectProps = SelectContentProps & {
    className?: string;
    value?: string;
    onChange?: (newValue: string) => void;
    disabled?: boolean;
    placeholderValue?: string;
    selectedLabel?: ReactNode;
};

export function Select({
    className,
    disabled,
    value,
    onChange,
    options,
    children,
    placeholderValue,
    selectedLabel,
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                setSearch("");
            }
        }

        // validate select options
        if (
            options &&
            options.length > 0 &&
            !options.find((opt) => opt[1] == value)
        ) {
            onChange?.(options[0][1]);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
        if (!options) return [];
        if (!search.trim()) return options;

        const q = search.toLowerCase();

        return options.filter(
            ([label, val]) =>
                label.toLowerCase().includes(q) ||
                val.toLowerCase().includes(q),
        );
    }, [options, search]);

    const filteredChildren = useMemo(() => {
        if (!children) return [];
        if (!search.trim()) return children;

        const q = search.toLowerCase();

        return children.filter(([key, child]) => {
            const text = typeof child === "string" ? child : key;

            return (
                key.toLowerCase().includes(q) || text.toLowerCase().includes(q)
            );
        });
    }, [children, search]);

    return (
        <div
            className={clsx("relative transition-all", className)}
            ref={containerRef}
        >
            <div
                className={clsx(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg bg-mocha-base cursor-pointer transition-all",
                    disabled
                        ? "opacity-50 pointer-events-none outline-none"
                        : "hover:border-mocha-mauve focus-within:ring-1 focus-within:ring-mocha-mauve/50",
                )}
                onClick={() => {
                    if (!disabled) setIsOpen(true);
                    inputRef.current?.focus();
                }}
            >
                {isOpen ? (
                    <input
                        ref={inputRef}
                        value={search}
                        placeholder={placeholderValue || "Select an option"}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent text-mocha-text focus:outline-none"
                    />
                ) : selectedLabel ? (
                    <div className="flex items-center gap-2 text-mocha-text">
                        {selectedLabel}
                    </div>
                ) : (
                    <input
                        value={
                            options
                                ? (options.find((x) => x[1] == value)! ??
                                      [])[0] || ""
                                : ""
                        }
                        readOnly
                        placeholder={placeholderValue || "Select an option"}
                        className="w-full bg-transparent text-mocha-text focus:outline-none"
                    />
                )}

                <div className="ml-2 shrink-0 text-mocha-overlay1">
                    {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </div>
            </div>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full bg-mocha-base border border-mocha-mauve/10 overflow-hidden z-20">
                    <div className="max-h-60 overflow-y-auto scrollbar-hide">
                        {children ? (
                            filteredChildren.length > 0 ? (
                                filteredChildren.map(([key, child]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={clsx(
                                            "w-full px-3 py-2 text-left transition-colors",
                                            value === key
                                                ? "bg-mocha-mauve/10 text-mocha-mauve"
                                                : "text-mocha-text hover:bg-mocha-mauve/20",
                                        )}
                                        onClick={() => {
                                            onChange?.(key);
                                            setIsOpen(false);
                                            setSearch("");
                                        }}
                                    >
                                        {child}
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-4 text-center text-sm text-mocha-subtext0">
                                    No results found
                                </div>
                            )
                        ) : filteredOptions.length > 0 ? (
                            filteredOptions.map(([label, val]) => (
                                <button
                                    key={val}
                                    type="button"
                                    className={clsx(
                                        "w-full px-3 py-2 text-left transition-colors",
                                        value === val
                                            ? "bg-mocha-mauve/10 text-mocha-mauve"
                                            : "text-mocha-text hover:bg-mocha-mauve/20",
                                    )}
                                    onClick={() => {
                                        onChange?.(val);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    {label}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-mocha-subtext0">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
