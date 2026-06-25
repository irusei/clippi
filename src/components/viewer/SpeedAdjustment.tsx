import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SpeedAdjustmentProps {
    currentPlaybackSpeed: number;
    onSpeedChange: (newSpeed: number) => void;
}
export default function SpeedAdjustment({
    currentPlaybackSpeed,
    onSpeedChange,
}: SpeedAdjustmentProps) {
    const speedListRef = useRef<HTMLDivElement>(null);
    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                showSpeedDropdown &&
                speedListRef.current &&
                !speedListRef.current.contains(e.target as Node)
            ) {
                setShowSpeedDropdown(false);
            }
        };
        window.addEventListener("mousedown", handleClickOutside);
        return () =>
            window.removeEventListener("mousedown", handleClickOutside);
    }, [showSpeedDropdown]);

    return (
        <div className="relative" ref={speedListRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowSpeedDropdown(!showSpeedDropdown);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold hover:bg-mocha-surface0/50 transition-colors"
            >
                {currentPlaybackSpeed}x
                <ChevronDown className="w-3 h-3" />
            </button>
            {showSpeedDropdown && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full left-0 mb-2 bg-mocha-mantle border border-mocha-surface0 rounded-lg shadow-lg overflow-hidden z-50"
                >
                    {speeds.map((speed) => (
                        <button
                            key={speed}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSpeedChange(speed);
                                setShowSpeedDropdown(false);
                            }}
                            className={`w-full px-3 py-1.5 text-sm font-mono hover:bg-mocha-surface0 transition-colors ${
                                currentPlaybackSpeed === speed
                                    ? "text-mocha-lavender bg-mocha-surface0/50"
                                    : "text-mocha-text"
                            }`}
                        >
                            {speed}x
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
