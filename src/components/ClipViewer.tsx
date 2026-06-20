import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { VodClip } from "../types";
import {
    Play,
    Pause,
    ArrowLeft,
    FolderOpen,
    Volume2,
    Maximize,
    ChevronLeft,
    ChevronRight,
    Scissors,
    VolumeOff,
    Pencil,
    PanelRightOpen,
    Cloud,
} from "lucide-react";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { formatTime, smooth } from "../utils";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import TimelineMarker from "./TimelineMarker";
import {
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import Input from "./ui/Input";
import { getCurrentWindow } from "@tauri-apps/api/window";
import RightPanel from "./RightPanel";
import { getMarkerData } from "../integration/MarkerData";

interface ClipViewerProps {
    clip: VodClip;
    onExitClip: () => void;
    setSelectedClipToLastClip: () => void;
    reloadClips: () => void;
}

export default function ClipViewer({
    clip,
    onExitClip,
    setSelectedClipToLastClip,
    reloadClips,
}: ClipViewerProps) {
    const playerRef = useRef<HTMLVideoElement | null>(null);
    const timelineRef = useRef<HTMLDivElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [trimLeft, setTrimLeft] = useState<number>(0);
    const [trimRight, setTrimRight] = useState<number>(clip.duration);
    const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null);
    const [volume, setVolume] = useState(1);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(clip.title);
    const [mouseDown, setMouseDown] = useState(false);
    const [showRightPanel, setShowRightPanel] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const unlisten = listen<number>("upload_progress", (event) => {
            setUploadProgress(event.payload);
        });

        return () => {
            unlisten.then((ul) => ul());
        };
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging || !timelineRef.current) return;

            const rect = timelineRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const newTime = (x / rect.width) * clip.duration;

            if (isDragging === "left") {
                setTrimLeft(Math.min(newTime, trimRight - 0.001));
            } else {
                setTrimRight(Math.max(newTime, trimLeft + 0.001));
            }
        },
        [isDragging, trimLeft, trimRight, clip.duration],
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(null);
    }, []);

    useEffect(() => {
        setCurrentTime(0);
        setTrimLeft(0);
        setTrimRight(clip.duration);
        setIsDragging(null);
        setTitleInput(clip.title);
        setIsEditingTitle(false);
        setMouseDown(false);

        const unlisten = listen("tauri://resize", () => {
            getCurrentWindow()
                .isMinimized()
                .then((minimized) => {
                    if (minimized) {
                        playerRef.current?.pause();
                        setIsPlaying(false);
                    }
                });
        });

        return () => {
            unlisten.then((ul) => ul());
        };
    }, [clip.id]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        // for fine adjustment of timeline
        const timelineMouseDown = () => setMouseDown(true);
        const timelineMouseUp = () => setMouseDown(false);

        window.addEventListener("mousedown", timelineMouseDown);
        window.addEventListener("mouseup", timelineMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("mousedown", timelineMouseDown);
            window.removeEventListener("mouseup", timelineMouseUp);
        };
    }, [isDragging, handleMouseMove]);

    const togglePlay = () => {
        if (isPlaying) playerRef.current?.pause();
        else playerRef.current?.play();
        setIsPlaying(!isPlaying);
    };

    const mute = () => {
        if (volume != 0) {
            setVolume(0);
            playerRef.current!.volume = 0;
        } else {
            setVolume(1);
            playerRef.current!.volume = 1;
        }
    };

    const timelineData = useMemo(() => {
        const maxPoints = 400;
        const data = clip.action_count;
        const step = Math.ceil(data.length / Math.min(maxPoints, data.length));

        const downsampled = data
            .filter((_, i) => i % step === 0)
            .map((v, i) => ({
                index: i * step,
                value: v,
            }));

        const values = downsampled.map((d) => d.value);
        const smoothedValues = smooth(values, 3);

        return downsampled.map((d, i) => ({
            index: d.index,
            value: smoothedValues[i],
        }));
    }, [clip.id]);

    const adjustTimeline = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget!.getBoundingClientRect();
        if (playerRef.current) {
            const newTime =
                ((e.clientX - rect.left) / rect.width) * clip.duration;
            playerRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    return (
        <div className="relative flex flex-col w-full h-screen text-mocha-text bg-mocha-base font-sans">
            <div className="absolute z-20 flex items-center justify-between w-full p-4 pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto opacity-100 px-4 py-2 max-h-10">
                    <ArrowLeft
                        className="w-5 h-5 hover:text-mocha-lavender cursor-pointer"
                        onClick={onExitClip}
                    />
                    {isEditingTitle ? (
                        <Input
                            type="text"
                            value={titleInput}
                            onChange={(value) => setTitleInput(value)}
                            onBlur={() => {
                                if (titleInput !== clip.title) {
                                    invoke("rename_clip", {
                                        clip,
                                        newTitle: titleInput.trim(),
                                    });
                                }
                                setIsEditingTitle(false);
                            }}
                            onKeyDown={(key) => {
                                if (key === "Enter") {
                                    if (titleInput !== clip.title) {
                                        invoke("rename_clip", {
                                            clip,
                                            newTitle: titleInput.trim(),
                                        });
                                    }
                                    setIsEditingTitle(false);
                                }
                            }}
                            className="w-100"
                            autoFocus={true}
                        />
                    ) : (
                        <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => setIsEditingTitle(true)}
                        >
                            <p className="font-medium">{clip.title}</p>
                            <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 pointer-events-auto">
                    {clip.remote_path ? (
                        <div
                            className="flex items-center justify-center w-10 h-10 opacity-100 text-mocha-green cursor-pointer"
                            title="Already uploaded"
                            onClick={() =>
                                writeText(clip.remote_path as string)
                            }
                        >
                            <Cloud className="w-5 h-5" />
                        </div>
                    ) : (
                        <>
                            {isUploading && (
                                <div className="flex items-center gap-1">
                                    <div className="w-12 h-1 bg-mocha-surface0 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-mocha-mauve rounded-full transition-all"
                                            style={{
                                                width: `${uploadProgress}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div
                                className="flex items-center justify-center w-10 h-10 opacity-100 hover:text-mocha-lavender cursor-pointer"
                                onClick={() => {
                                    if (clip.remote_path) return;
                                    setIsUploading(true);
                                    setUploadProgress(0);

                                    invoke("upload_clip", { clip })
                                        .then((res) => {
                                            writeText(res as string);
                                            setIsUploading(false);
                                            setUploadProgress(0);
                                            reloadClips();
                                        })
                                        .catch((err) => {
                                            setIsUploading(false);
                                            setUploadProgress(0);
                                            alert(err);
                                        });
                                }}
                            >
                                <Cloud className="w-5 h-5" />
                            </div>
                        </>
                    )}
                    <div
                        className="flex items-center justify-center w-10 h-10 opacity-100 hover:text-mocha-lavender cursor-pointer"
                        onClick={() =>
                            invoke("open_clip_in_explorer", { clip })
                        }
                    >
                        <FolderOpen className="w-5 h-5" />
                    </div>
                    <div
                        className="flex items-center justify-center w-10 h-10 opacity-100 hover:text-mocha-lavender cursor-pointer"
                        onClick={() => setShowRightPanel(!showRightPanel)}
                    >
                        <PanelRightOpen className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="relative flex items-center justify-center flex-1 bg-mocha-crust overflow-hidden">
                {showRightPanel && (
                    <RightPanel
                        clip={clip}
                        onSeek={(timestamp) => {
                            playerRef.current &&
                                (playerRef.current.currentTime = timestamp);
                            setCurrentTime(timestamp);
                        }}
                        onClose={() => setShowRightPanel(false)}
                    />
                )}

                <video
                    ref={playerRef}
                    src={convertFileSrc(clip.path)}
                    className="max-w-full max-h-full"
                    autoPlay
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePlay();
                    }}
                    onTimeUpdate={() =>
                        playerRef.current &&
                        setCurrentTime(playerRef.current.currentTime)
                    }
                    onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                />

                <div className="absolute bottom-0 left-0 w-full p-4 bg-linear-to-t from-mocha-base/90 to-transparent">
                    <div
                        className="relative w-full h-1 bg-mocha-surface0 rounded-full mb-3 group cursor-pointer"
                        onMouseMove={(e) => {
                            if (!mouseDown) return;
                            adjustTimeline(e);
                        }}
                        onMouseUp={(e) => {
                            adjustTimeline(e);
                        }}
                    >
                        <div
                            className="absolute top-0 left-0 h-full bg-mocha-mauve rounded-full"
                            style={{
                                width: `${(currentTime / clip.duration) * 100}%`,
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={togglePlay}>
                                {isPlaying ? <Pause /> : <Play />}
                            </button>
                            <div className="flex items-center gap-2 group">
                                {volume == 0 ? (
                                    <VolumeOff
                                        onClick={mute}
                                        className="w-5 h-5 cursor-pointer"
                                    />
                                ) : (
                                    <Volume2
                                        onClick={mute}
                                        className="w-5 h-5 cursor-pointer"
                                    />
                                )}
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    className="w-16 h-1 accent-mocha-mauve cursor-pointer"
                                    value={volume}
                                    onChange={(e) => {
                                        setVolume(parseFloat(e.target.value));
                                        playerRef.current!.volume = parseFloat(
                                            e.target.value,
                                        );
                                    }}
                                />
                            </div>
                            <span className="text-xs font-semibold font-mono">
                                {formatTime(currentTime)} /{" "}
                                {formatTime(clip.duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <Maximize
                                className="w-5 h-5 cursor-pointer"
                                onClick={() => {
                                    playerRef.current?.requestFullscreen();
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-mocha-mantle border-t border-mocha-surface0 select-none p-4 pb-6 space-y-3 overflow-y-auto max-h-[50vh]">
                <div
                    ref={timelineRef}
                    className="relative h-28 w-full bg-mocha-crust/50 cursor-pointer rounded-lg border border-mocha-surface0"
                    onClick={(e) => {
                        if (isDragging) return;
                        adjustTimeline(e);
                    }}
                    onMouseMove={(e) => {
                        if (isDragging) return;
                        if (!mouseDown) return;
                        adjustTimeline(e);
                    }}
                    onMouseUp={(e) => {
                        if (isDragging) return;
                        adjustTimeline(e);
                    }}
                >
                    <div
                        className="absolute h-full bg-mocha-lavender/10 border-x border-mocha-lavender/40"
                        style={{
                            left: `${(trimLeft / clip.duration) * 100}%`,
                            width: `${((trimRight - trimLeft) / clip.duration) * 100}%`,
                        }}
                    />

                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
                        style={{
                            left: `${(currentTime / clip.duration) * 100}%`,
                        }}
                    />

                    <TimelineMarker
                        label="START"
                        time={trimLeft}
                        duration={clip.duration}
                        colorClass="bg-mocha-mauve"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setIsDragging("left");
                        }}
                        hidden={false}
                    />

                    <TimelineMarker
                        label="END"
                        time={trimRight}
                        duration={clip.duration}
                        colorClass="bg-mocha-red"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setIsDragging("right");
                        }}
                        hidden={false}
                    />

                    {getMarkerData(clip.integration_result, clip.bookmarks).map(
                        (marker, i) => (
                            <TimelineMarker
                                key={i}
                                label={marker.label}
                                time={marker.time}
                                duration={clip.duration}
                                colorClass={marker.colorClass}
                                hidden={true}
                            />
                        ),
                    )}

                    <ResponsiveContainer width="100%" height={"100%"}>
                        <LineChart
                            data={timelineData}
                            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                        >
                            <XAxis
                                type="number"
                                dataKey="index"
                                domain={[0, clip.duration]}
                                height={0}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis domain={[0, "dataMax"]} hide />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#cba6f7"
                                dot={false}
                            />
                            <Tooltip
                                labelFormatter={(label) =>
                                    `${formatTime(label)}`
                                }
                                formatter={(value) => [`${value}`, "APS"]}
                                contentStyle={{
                                    backgroundColor: "#cba6f7",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "2px 7px",
                                    fontSize: "11px",
                                    color: "#cdd6f4",
                                }}
                                wrapperStyle={{
                                    zIndex: 400,
                                    pointerEvents: "none",
                                }}
                                labelStyle={{
                                    margin: 0,
                                    padding: 0,
                                    fontWeight: 700,
                                    color: "#1e1e2e",
                                }}
                                itemStyle={{
                                    margin: 0,
                                    padding: 0,
                                    fontFamily: "monospace",
                                    color: "#1e1e2e",
                                    fontWeight: 700,
                                }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between px-2 py-3">
                    <div className="flex flex-col">
                        {clip.action_count.length > 0 && (
                            <p className="text-mocha-text font-semibold">
                                APM:{" "}
                                {(
                                    (clip.action_count.reduce(
                                        (totalSum, cur) => totalSum + cur,
                                    ) /
                                        clip.action_count.length) *
                                    60
                                ).toFixed(2)}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            className="flex items-center px-3 py-3 bg-mocha-surface0 hover:bg-mocha-surface1 rounded-lg text-sm font-semibold"
                            onClick={() => setTrimLeft(currentTime)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <Scissors className="w-4 h-4" />
                        </button>
                        <button
                            className="flex items-center px-3 py-3 bg-mocha-surface0 hover:bg-mocha-surface1 rounded-lg text-sm font-semibold "
                            onClick={() => setTrimRight(currentTime)}
                        >
                            <ChevronRight className="h-4 w-4" />
                            <Scissors className="w-4 h-4" />
                        </button>
                        <button
                            className="px-10 py-2 bg-mocha-mauve hover:bg-mocha-mauve/80 text-mocha-base font-semibold rounded-lg transition-all disabled:opacity-50"
                            disabled={
                                trimLeft == 0 && trimRight == clip.duration
                            }
                            onClick={() => {
                                invoke("trim_clip", {
                                    clip,
                                    start: trimLeft,
                                    end: trimRight,
                                }).then((res) => {
                                    if (res) setSelectedClipToLastClip();
                                });
                            }}
                        >
                            Trim
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
