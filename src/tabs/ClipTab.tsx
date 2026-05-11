import { useEffect, useState } from "react";
import { VodClip } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Clip from "../components/Clip";
import ClipViewer from "../components/ClipViewer";

export default function ClipTab() {
  const [clips, setClips] = useState<VodClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<VodClip | null>(null);

  function ssctls() {
    invoke('get_clips').then((res) => {
      let clips = res as VodClip[]
      setClips(clips);
      setSelectedClip(clips[0])
    });
  }
  function getClips() {
    invoke('get_clips').then((res) => {
      setClips((res as VodClip[]))
    });
  }
  useEffect(() => { 
    const ul = listen("set_clips", (event) => {
      setClips((event.payload as VodClip[]));
    });

    getClips();

    return () => {
      ul.then((ul) => ul());
    }
  }, []);

  return (
    <div className="bg-mocha-mantle w-full h-full relative">
      {selectedClip === null && 
      <>
        <div className="px-10 py-2 overflow-y-scroll h-full">
            <h2 className="text-2xl font-bold text-mocha-text py-4">Your clips</h2>
            <div className={"flex flex-row flex-wrap gap-6"}>
                {clips.map((clip) => (
                    <Clip clip={clip} onClick={() => setSelectedClip(clip)}/>
                ))}
            </div>
        </div>
      </>
      }

      {selectedClip != null && <ClipViewer clip={selectedClip} onExitClip={() => setSelectedClip(null)} ssctls={ssctls}/>}
    </div>
  )
}