import { Play, Trash, Pencil } from "lucide-react";
import { VodClip } from "../types";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { formatTime, parseSize } from "../utils";
import { useState } from "react";
import Input from "./ui/Input";

interface ClipProps {
  clip: VodClip;
  onClick: () => void;
}

export default function Clip({ clip, onClick }: ClipProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(clip.title);

  return (
    <div
      className={
        "flex flex-col rounded-md w-80 h-60 bg-mocha-base border-mocha-base border-2 hover:cursor-pointer overflow-hidden"
      }
      onClick={onClick}
    >
      <div
        className={
          "relative min-h-3/5 w-full bg-mocha-mantle flex items-center justify-center"
        }
      >
        <img
          className={"w-full h-full absolute"}
          src={convertFileSrc(clip.thumbnail)}
        />
        <Play className={"z-10 w-8 h-8 text-mocha-text"} />
        <div
          className={
            "z-10 absolute top-25 right-2 w-15 h-8 bg-mocha-base items-center flex justify-center text-mocha-text rounded-md"
          }
        >
          {formatTime(clip.duration).slice(0, -4)}
        </div>
      </div>
      <div className={"p-2 px-4 w-full text-mocha-text"}>
        {isEditingTitle ? (
          <Input
            className="w-full min-h-5 max-h-5"
            autoFocus={true}
            type="text"
            value={titleInput}
            onChange={(value) => setTitleInput(value)}
            onBlur={() => {
              if (titleInput !== clip.title) {
                invoke("rename_clip", { clip, newTitle: titleInput.trim() });
              }
              setIsEditingTitle(false);
            }}
            onKeyDown={(key) => {
              if (key === "Enter") {
                if (titleInput !== clip.title) {
                  invoke("rename_clip", { clip, newTitle: titleInput.trim() });
                }
                setIsEditingTitle(false);
              }
            }}
          />
        ) : (
          <div
            className="flex items-center gap-2 h-5 cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingTitle(true);
            }}
          >
            <p className="truncate">{clip.title}</p>
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
          </div>
        )}
        <div
          className={
            "flex flex-row gap-2 py-1 text-sm items-center text-mocha-overlay2"
          }
        >
          {clip.game.icon && <img src={clip.game.icon} className="w-4 h-4" />}
          <p>{clip.game.name}</p>
        </div>
        <div
          className={
            "flex flex-row gap-2 py-0.5 text-sm w-full justify-between text-mocha-overlay2"
          }
        >
          <div className="flex flex-row gap-x-2">
            <p>{parseSize(clip.size)}</p>
            <p>{clip.date}</p>
          </div>
          <Trash
            className="w-4 h-4 text-mocha-red hover:cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              let confirm = window.confirm(
                "Are you sure you want to delete this clip?",
              );
              if (confirm) {
                invoke("delete_clip", { clip: clip });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
