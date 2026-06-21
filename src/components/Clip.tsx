import { Play, Pencil, Trash, Cloud } from "lucide-react";
import { VodClip } from "../types";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { formatTime, formatBytes } from "../utils";
import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import Input from "./ui/Input";
import LeagueClipCard from "./integration/league/LeagueClipCard";
import { getGameResult } from "../integration/league/LeagueUtils";
import { confirm } from "@tauri-apps/plugin-dialog";

interface ClipProps {
    clip: VodClip;
    onSelect: (e: React.MouseEvent) => void;
    isSelected: boolean;
}

export default function Clip({ clip, onSelect, isSelected }: ClipProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(clip.title);
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

    let stripColor =
        clip.integration_result?.type === "LeagueResult"
            ? getGameResult(clip.integration_result) === "Win"
                ? "bg-mocha-green"
                : "bg-mocha-red"
            : undefined;  

    return (
        <div
            className={`flex flex-row w-full h-24 rounded-md bg-mocha-base overflow-hidden hover:cursor-pointer transition-colors ${
                isSelected
                    ? "border-2 border-mocha-mauve"
                    : "border-2 border-mocha-base"
            }`}
            onClick={onSelect}
        >
            {stripColor && <div className={`w-1 ${stripColor} shrink-0`}></div>}
            <div className="flex flex-row max-w-1/3 min-w-1/3 gap-x-2">
                <div className="relative w-40 h-full bg-mocha-mantle flex items-center justify-center shrink-0">
                    <img
                        src={convertFileSrc(clip.thumbnail)}
                        className="absolute w-full h-full object-cover"
                    />

                    <Play className="z-10 w-6 h-6 text-mocha-text" />

                    <div className="absolute bottom-1 right-1 px-2 py-0.5 text-xs bg-mocha-base text-mocha-text rounded">
                        {formatTime(clip.duration).slice(0, -4)}
                    </div>
                </div>

                <div className="flex flex-col gap-y-1 p-2 text-mocha-text">
                    <div
                        className="flex items-center gap-2 group"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingTitle(true);
                        }}
                    >
                        {isEditingTitle ? (
                            <Input
                                type="text"
                                autoFocus
                                className="w-100 h-6"
                                value={titleInput}
                                onChange={setTitleInput}
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
                            />
                        ) : (
                            <>
                                <p className="truncate font-medium">
                                    {clip.title}
                                </p>
                                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-mocha-overlay2">
                        {clip.game.icon && (
                            <img src={clip.game.icon} className="w-4 h-4" />
                        )}
                        <p className="truncate">{clip.game.name}</p>
                    </div>

                    <div className="flex justify-between items-center text-xs text-mocha-overlay2">
                        <div className="flex gap-2">
                            <p>{formatBytes(clip.size)}</p>
                            <p>{clip.date}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 max-w-1/2 min-w-1/2">
                {clip.integration_result?.type === "LeagueResult" && (
                    <LeagueClipCard
                        integrationResult={clip.integration_result}
                    />
                )}
            </div>
            <div className="flex-1 justify-end flex flex-row p-4 items-center">
                {clip.remote_path ? (
                    <div
                        className="flex items-center gap-1 text-xs text-mocha-green"
                        title="Already uploaded"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            writeText(clip.remote_path as string);
                        }}
                    >
                        <Cloud className="w-4 h-4" />
                        <span>Uploaded</span>
                    </div>
                ) : (
                    <>
                        {isUploading && (
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-mocha-surface0 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-mocha-mauve rounded-full transition-all"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        <div
                            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-mocha-surface0 cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (clip.remote_path) return;
                                setIsUploading(true);
                                setUploadProgress(0);

                                invoke("upload_clip", { clip })
                                    .then((res) => {
                                        writeText(res as string);
                                        setIsUploading(false);
                                        setUploadProgress(0);
                                    })
                                    .catch((err) => {
                                        setIsUploading(false);
                                        setUploadProgress(0);
                                        alert(err);
                                    });
                            }}
                        >
                            <Cloud className="w-5 h-5 text-mocha-text" />
                        </div>
                    </>
                )}
                <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-mocha-surface0 cursor-pointer"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        confirm("Are you sure you want to delete this clip?", {
                            title: "Delete Clip",
                            kind: "warning",
                        }).then((result) => {
                            if (result) invoke("delete_clip", { clip: clip });
                        });
                    }}
                >
                    <Trash className="w-5 h-5 text-mocha-red hover:text-mocha-red/80" />
                </div>
            </div>
        </div>
    );
}
