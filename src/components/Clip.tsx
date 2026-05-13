import { Play, Trash } from "lucide-react";
import { VodClip } from "../types";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { formatTime, parseSize } from "../utils";

interface ClipProps {
    clip: VodClip
    onClick: () => void;
}

export default function Clip({ clip, onClick}: ClipProps) {
    return (
        <div className={"flex flex-col rounded-md w-80 h-60 bg-mocha-base border-mocha-base border-2 hover:cursor-pointer overflow-hidden"} onClick={onClick}>
            <div className={"relative h-2/3 w-full bg-mocha-mantle flex items-center justify-center"}>
                <img className={"w-full h-full absolute"} src={convertFileSrc(clip.thumbnail)}/>
                <Play className={"z-10 w-8 h-8 text-mocha-text"}/>
                <div className={"z-10 absolute top-20 right-2 w-15 h-8 bg-mocha-base items-center flex justify-center text-mocha-text rounded-md"}>
                    {formatTime(clip.duration).slice(0, -4)}
                </div>
            </div>
            <div className={"p-2 px-4 w-full text-mocha-text"}>
                <p>{clip.title}</p>
                <div className={"flex flex-row gap-2 py-1 text-sm items-center text-mocha-overlay2"}>
                    {clip.game.icon && <img src={clip.game.icon} className="w-4 h-4"/>}
                    <p>{clip.game.name}</p>
                </div>
                <div className={"flex flex-row gap-2 py-1 text-sm w-full justify-between text-mocha-overlay2"}>
                    <p>{parseSize(clip.size)}</p>
                    <Trash className="w-4 h-4 text-mocha-red hover:cursor-pointer" onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        let confirm = window.confirm("Are you sure you want to delete this clip?");
                        if (confirm) {
                            invoke("delete_clip", {clip: clip});
                        }
                    }}/>
                </div>
            </div>
        </div>
    )
}