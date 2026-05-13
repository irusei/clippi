import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { VodClip } from "../types";
import { Play, Pause, ArrowLeft, FolderOpen, Volume2, Maximize, ChevronLeft, ChevronRight, Scissors, VolumeOff } from "lucide-react"
import { useRef, useState, useEffect, useCallback } from "react";
import { formatTime } from "../utils";
import TimelineMarker from "./TimelineMarker";



interface ClipViewerProps {
    clip: VodClip;
    onExitClip: () => void;
    setSelectedClipToLastClip: () => void;
}

export default function ClipViewer({ clip, onExitClip, setSelectedClipToLastClip }: ClipViewerProps) {
    const playerRef = useRef<HTMLVideoElement | null>(null);
    const timelineRef = useRef<HTMLDivElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [trimLeft, setTrimLeft] = useState<number>(0);
    const [trimRight, setTrimRight] = useState<number>(clip.duration);
    const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
    const [volume, setVolume] = useState(1);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const newTime = (x / rect.width) * clip.duration;

        if (isDragging === 'left') {
            setTrimLeft(Math.min(newTime, trimRight - 0.001));
        } else {
            setTrimRight(Math.max(newTime, trimLeft + 0.001));
        }
    }, [isDragging, trimLeft, trimRight, clip.duration]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(null);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
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
    }

    return (
        <div className="relative flex flex-col w-full h-screen overflow-hidden text-mocha-text bg-mocha-base font-sans">
            
            <div className="absolute z-20 flex items-center justify-between w-full p-4 pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto opacity-100 px-4 py-2">
                    <ArrowLeft className="w-5 h-5 hover:text-mocha-lavender cursor-pointer" onClick={onExitClip} />
                    <p className="font-medium">{clip.title}</p>
                </div>
                <div 
                    className="flex items-center justify-center w-10 h-10 opacity-100 hover:text-mocha-lavender cursor-pointer pointer-events-auto"
                    onClick={() => invoke("open_clip_in_explorer", { clip })}
                >
                    <FolderOpen className="w-5 h-5" />
                </div>
            </div>

            <div className="relative flex items-center justify-center flex-1 bg-mocha-crust overflow-hidden">
                <video
                    ref={playerRef}
                    src={convertFileSrc(clip.path)}
                    className="max-w-full max-h-full"
                    autoPlay
                    onClick={togglePlay}
                    onTimeUpdate={() => playerRef.current && setCurrentTime(playerRef.current.currentTime)}
                />

                <div className="absolute bottom-0 left-0 w-full p-4 bg-linear-to-t from-mocha-base/90 to-transparent">
                    <div className="relative w-full h-1 bg-mocha-surface0 rounded-full mb-3 group cursor-pointer">
                        <div 
                            className="absolute top-0 left-0 h-full bg-mocha-mauve rounded-full" 
                            style={{ width: `${(currentTime / clip.duration) * 100}%` }}
                        />
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={togglePlay}>
                                {isPlaying ? <Pause/> : <Play/>}
                            </button>
                            <div className="flex items-center gap-2 group">
                                {volume == 0 ? <VolumeOff onClick={mute} className="w-5 h-5 cursor-pointer" /> : <Volume2 onClick={mute} className="w-5 h-5 cursor-pointer" />}
                                <input type="range" min="0" max="1" step="0.1" className="w-16 h-1 accent-mocha-mauve cursor-pointer" value={volume} onChange={e => {
                                    setVolume(parseFloat(e.target.value)); 
                                    playerRef.current!.volume = parseFloat(e.target.value)
                                }}/>
                            </div>
                            <span className="text-xs font-semibold font-mono">{formatTime(currentTime)} / {formatTime(clip.duration)}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <Maximize className="w-5 h-5 cursor-pointer" onClick={() => {
                                playerRef.current?.requestFullscreen();
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-mocha-mantle border-t border-mocha-surface0 select-none p-4 pb-6">
                <div 
                    ref={timelineRef}
                    className="relative h-28 w-full bg-mocha-crust/50 cursor-pointer rounded-lg border border-mocha-surface0"
                    onClick={(e) => {
                        if (isDragging) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        if (playerRef.current) playerRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * clip.duration;
                    }}
                >
                    <div 
                        className="absolute h-full bg-mocha-lavender/10 border-x border-mocha-lavender/40"
                        style={{ 
                            left: `${(trimLeft / clip.duration) * 100}%`, 
                            width: `${((trimRight - trimLeft) / clip.duration) * 100}%` 
                        }}
                    />

                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
                        style={{ left: `${(currentTime / clip.duration) * 100}%` }}
                    />

                    <TimelineMarker 
                        label="START"
                        time={trimLeft}
                        duration={clip.duration}
                        colorClass="bg-mocha-mauve"
                        onMouseDown={(e) => { e.stopPropagation(); setIsDragging('left'); }}
                        hidden={false}
                    />

                    <TimelineMarker 
                        label="END"
                        time={trimRight}
                        duration={clip.duration}
                        colorClass="bg-mocha-red"
                        onMouseDown={(e) => { e.stopPropagation(); setIsDragging('right'); }}
                        hidden={false}
                    />

                    {clip.bookmarks.map((bookmark_time) => (
                        <TimelineMarker
                            label="BOOKMARK"
                            time={bookmark_time / 1000}
                            duration={clip.duration}
                            colorClass="bg-mocha-green"
                            hidden={true}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between px-2 py-3">
                    <div className="flex flex-col"></div>

                    <div className="flex items-center gap-3">
                        <button 
                            className="flex items-center px-3 py-3 bg-mocha-surface0 hover:bg-mocha-surface1 rounded-lg text-sm font-semibold"
                            onClick={() => setTrimLeft(currentTime)}
                        >
                            <ChevronLeft className="h-4 w-4" /><Scissors className="w-4 h-4"/>
                        </button>
                        <button 
                            className="flex items-center px-3 py-3 bg-mocha-surface0 hover:bg-mocha-surface1 rounded-lg text-sm font-semibold "
                            onClick={() => setTrimRight(currentTime)}
                        >
                            <ChevronRight className="h-4 w-4" /><Scissors className="w-4 h-4"/>
                        </button>
                        <button
                            className="px-10 py-2 bg-mocha-mauve hover:bg-mocha-mauve/80 text-mocha-base font-semibold rounded-lg transition-all disabled:opacity-50"
                            disabled={trimLeft == 0 && trimRight == clip.duration}
                            onClick={() => {
                                invoke("trim_clip", { clip, start: trimLeft, end: trimRight }).then((res) => {
                                    if (res) setSelectedClipToLastClip();
                                });
                            }}
                        >
                            Export Selection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}