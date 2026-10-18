import { Pencil, Trash, Cloud, Star } from "lucide-react";
import { VodClip } from "../types";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { formatTime, formatBytes, formatClipTime } from "../utils";
import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import Input from "./ui/Input";
import { confirm } from "@tauri-apps/plugin-dialog";
import clsx from "clsx";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { platform } from "@tauri-apps/plugin-os";

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

    function renameClip() {
        if (titleInput !== clip.title) {
            invoke("rename_clip", { clip, newTitle: titleInput.trim() });
        }
        setIsEditingTitle(false);
    }

    return (
        <div
            className={clsx(
                "flex flex-col w-1/3 min-w-60 max-w-80 gap-y-1 rounded-md hover:cursor-pointer",
                isSelected ? "ring-mocha-mauve ring-2" : "",
            )}
            onClick={onSelect}
            onDragStart={() => {
              if (platform() === "windows" && clip.path.charCodeAt(0) >= 71) {
                // this implementation of drag basically doesn't work, so when the external drive is located on a network share or a FUSE volume
                // (https://github.com/crabnebula-dev/drag-rs/pull/101)
                // it's going to panic on drag. i can't be bothered to add checking for a network share to avoid this implementation as it's most likely going to get fixed soon (i hope),
                // so a clip folder above the drive letter G: (google drive) is going to block dragging from library into other apps. sorry.
                return;
              }

              startDrag({ item: [clip.path], icon: clip.thumbnail })
            }}
        >
            <div className="relative w-full aspect-video bg-mocha-surface0 rounded-md overflow-hidden group shrink-0">
                <img
                    src={convertFileSrc(clip.thumbnail)}
                    alt={clip.title}
                    className="absolute w-full h-full object-cover"
                />

                <div className="absolute bottom-1 right-1 px-2 py-0.5 text-xs bg-mocha-base/80 text-mocha-text rounded">
                    {formatTime(clip.duration).slice(0, -4)}
                </div>

                {isUploading && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-mocha-surface0">
                        <div
                            className="h-full bg-mocha-mauve transition-all"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                )}

                <div className="absolute top-1 right-1 flex items-center gap-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div
                        title={"Edit clip name"}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            setIsEditingTitle(true);
                            setTitleInput(clip.title);
                        }}
                        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-mocha-mauve/30 cursor-pointer transition-colors"
                    >
                        <Pencil className="w-5 h-5 text-mocha-text" />
                    </div>

                    <div
                        className={clsx(
                            "flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:bg-mocha-red/30",
                            clip.favorited ? "cursor-not-allowed" : "cursor-pointer",
                        )}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            if (clip.favorited) return;
                            confirm("Are you sure you want to delete this clip?", {
                                title: "Delete Clip",
                                kind: "warning",
                            }).then((result) => {
                                if (result) invoke("delete_clip", { clip });
                            });
                        }}
                    >
                        <Trash
                            className={clsx(
                                "w-5 h-5 transition-colors",
                                clip.favorited ? "text-mocha-red/30" : "text-mocha-red",
                            )}
                        />
                    </div>

                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-mocha-yellow/30 cursor-pointer transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            invoke("toggle_favorite", { clip });
                        }}
                    >
                        <Star
                            className={clsx(
                                "w-5 h-5 transition-all",
                                clip.favorited
                                    ? "fill-mocha-yellow text-mocha-yellow"
                                    : "text-mocha-text",
                            )}
                        />
                    </div>

                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-mocha-green/30 cursor-pointer transition-colors"
                        title={clip.remote_path ? "Already uploaded" : "Upload clip"}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            if (clip.remote_path) {
                                writeText(clip.remote_path as string);
                                return;
                            }

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
                        <Cloud
                            className={clsx(
                                "w-5 h-5",
                                clip.remote_path
                                    ? "fill-mocha-green text-mocha-green"
                                    : "text-mocha-subtext0",
                            )}
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center pt-1">
                {isEditingTitle ? (
                    <Input
                        type="text"
                        autoFocus
                        className="w-full h-6 rounded-md"
                        value={titleInput}
                        onChange={setTitleInput}
                        onBlur={renameClip}
                        onKeyDown={(key) => {
                            if (key === "Enter") renameClip();
                        }}
                    />
                ) : (
                    <>
                        <p className="truncate text-mocha-text font-semibold">
                            {clip.title}
                        </p>
                    </>
                )}
            </div>

            <div className="flex items-center flex-wrap gap-x-1 pb-1 text-xs text-mocha-overlay1">
                {clip.game.icon && (
                    <img src={clip.game.icon} className="w-4 h-4 shrink-0" />
                )}
                <p className="truncate">{clip.game.name}</p>

                <div className="w-1 h-1 rounded-full bg-mocha-overlay1" />
                <p>{formatBytes(clip.size)}</p>

                <div className="w-1 h-1 rounded-full bg-mocha-overlay1" />
                <p>{formatClipTime(clip.date)}</p>
            </div>
        </div>
    );
}
