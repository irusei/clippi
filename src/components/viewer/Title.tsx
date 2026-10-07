import { useEffect, useState } from "react";
import { VodClip } from "../../types";
import Input from "../ui/Input";
import { invoke } from "@tauri-apps/api/core";
import { Pencil } from "lucide-react";
interface TitleProps {
    clip: VodClip;
}
export default function Title({ clip }: TitleProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(clip.title);

    useEffect(() => {
        setTitleInput(clip.title);
        setIsEditingTitle(false);
    }, [clip.id]);

    return isEditingTitle ? (
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
            <p className="font-medium">{titleInput}</p>
            <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
        </div>
    );
}
