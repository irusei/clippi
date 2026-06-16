import { Play, Pencil, Trash } from "lucide-react";
import { VodClip } from "../types";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { formatTime, parseSize } from "../utils";
import { useState } from "react";
import Input from "./ui/Input";
import LeagueClipCard from "./integration/LeagueClipCard";
import { confirm } from "@tauri-apps/plugin-dialog";

interface ClipProps {
    clip: VodClip;
    onClick: () => void;
}

export default function Clip({ clip, onClick }: ClipProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(clip.title);

    return (
        <div
            className="flex flex-row w-full h-24 rounded-md bg-mocha-base border-2 border-mocha-base overflow-hidden hover:cursor-pointer gap-x-4"
            onClick={onClick}
        >
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
                            <p>{parseSize(clip.size)}</p>
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
            <div className="flex-1 justify-end flex flex-row p-6 items-center">
                <Trash
                    className="text-mocha-red w-4 h-4"
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
                />
            </div>
        </div>
    );
}
