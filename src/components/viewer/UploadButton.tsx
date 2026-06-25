import { useEffect, useState } from "react";
import { VodClip } from "../../types";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Cloud } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface UploadButtonProps {
    clip: VodClip;
    reloadClips: () => void;
}
export default function UploadButton({ clip, reloadClips }: UploadButtonProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const unlisten = listen<number>("upload_progress", (event) => {
            setUploadProgress(event.payload);
        });

        return () => {
            unlisten.then((ul) => ul());
        };
    }, [clip]);

    return clip.remote_path ? (
        <div
            className="flex items-center justify-center w-10 h-10 opacity-100 text-mocha-green cursor-pointer"
            title="Already uploaded"
            onClick={() => writeText(clip.remote_path as string)}
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
    );
}
