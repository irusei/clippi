import clsx from "clsx";
import { Keyboard } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface KeybindingInputProps {
    value: string;
    onChange: (key: string) => void;
}

const modifierMap: Record<string, string> = {
    ControlLeft: "LControl",
    ControlRight: "RControl",
    ShiftLeft: "LShift",
    ShiftRight: "RShift",
    AltLeft: "LAlt",
    AltRight: "RAlt",
    Meta: "LMeta",
};

const modifierValues = new Set(Object.values(modifierMap));

function formatKeyName(code: string): string {
    if (code in modifierMap) return modifierMap[code];
    if (code.startsWith("Digit")) return "Key" + code.slice(5);
    if (code.startsWith("Key")) return code.slice(3);
    if (/^F[0-9]{1,2}$/.test(code)) return code;
    return code;
}

export function KeybindingInput({ value, onChange }: KeybindingInputProps) {
    const [listening, setListening] = useState(false);
    const [pendingKey, setPendingKey] = useState("");
    const modifiersRef = useRef<string[]>([]);
    const prevValueRef = useRef(value);

    useEffect(() => {
        prevValueRef.current = value;
    }, [value]);

    useEffect(() => {
        if (!listening) return;

        const handler = (e: KeyboardEvent) => {
            if (e.code === "Escape") {
                setListening(false);
                setPendingKey("");
                modifiersRef.current = [];
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const formatted = formatKeyName(e.code);
            const isModifier = modifierValues.has(formatted);

            if (isModifier) {
                if (!modifiersRef.current.includes(formatted)) {
                    modifiersRef.current.push(formatted);
                }
                setPendingKey(modifiersRef.current.join("+"));
                return;
            }

            modifiersRef.current.push(formatted);
            const finalKey = modifiersRef.current.join("+");
            setPendingKey(finalKey);
            onChange(finalKey);
            setListening(false);
        };

        window.addEventListener("keydown", handler);
        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, [listening, onChange]);

    const display = listening ? "..." : pendingKey || value || "";

    return (
        <div
            className={clsx(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-mocha-mantle cursor-pointer transition-all border max-w-xs",
                listening
                    ? "border-mocha-mauve ring-1 ring-mocha-mauve/50"
                    : "border-transparent",
            )}
            onClick={() => {
                setListening(true);
                setPendingKey("");
                modifiersRef.current = [];
            }}
        >
            <Keyboard className="w-4 h-4 shrink-0 text-mocha-overlay1" />
            <input
                value={display}
                readOnly
                placeholder="Press to set"
                className="w-full bg-transparent text-mocha-text focus:outline-none"
            />
        </div>
    );
}
