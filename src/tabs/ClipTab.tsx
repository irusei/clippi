import { useEffect, useState } from "react";
import { DetectedGame, VodClip } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Clip from "../components/Clip";
import ClipViewer from "../components/ClipViewer";

function getSortedUniqueGames(clips: VodClip[]): [DetectedGame, number][] {
  let sortedGames: Map<string, [DetectedGame, number]> = new Map();

  clips.forEach((clip: VodClip) => {

    if (sortedGames.has(clip.game.name)) {
      const indexed = sortedGames.get(clip.game.name)!;
      sortedGames.set(
        clip.game.name,
        [
          indexed[0],
          indexed[1] + 1
        ]
      );
    } else {
      sortedGames.set(clip.game.name, [clip.game, 1]);
    }
  });

  console.log(sortedGames);

  return Array.from(sortedGames.values()).sort((a, b) => b[1] - a[1]);
}

export default function ClipTab() {
  const [clips, setClips] = useState<VodClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<VodClip | null>(null);
  const [uniqueGames, setUniqueGames] = useState<[DetectedGame, number][]>([]);
  const [selectedGameName, setSelectedGameName] = useState<string>("");
  
  // runs on trim, sets clip to trim
  function setSelectedClipToLastClip() {
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

  // set and update unique games for filtering
  useEffect(() => {
    setUniqueGames(getSortedUniqueGames(clips));
  }, [clips]);

  console.log(uniqueGames);

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
        <div className="px-10 py-2 overflow-y-scroll h-full gap-y-2">
            <h2 className="text-2xl font-bold text-mocha-text py-4" >Your clips</h2>
            <div className="overflow-x-auto w-full flex flex-row gap-x-4 py-2 mb-2">
              {uniqueGames.map(([game, count]) => (
                <div key={game.name} className={`p-2 h-10 flex flex-row space-x-2 bg-mocha-base rounded-lg items-center justify-center cursor-pointer border ${selectedGameName === game.name ? "border-mocha-mauve" : "border-mocha-base/50 hover:border-mocha-mauve/50"}`} 
                onClick={() => setSelectedGameName(selectedGameName === game.name ? "" : game.name)}>
                  <img className="w-5 h-5" src={game.icon ?? ""}/>
                  <p className="text-mocha-text">{game.name}</p>
                  <p className="text-mocha-overlay2">{count}</p>
                </div>
              ))}
            </div>
            <div className={"flex flex-row flex-wrap gap-6"}>
                {clips.map((clip) => {
                  if (selectedGameName == "" || clip.game.name == selectedGameName)
                    return <Clip key={clip.id} clip={clip} onClick={() => setSelectedClip(clip)}/>
                })}
            </div>
        </div>
      </>
      }

      {selectedClip != null && <ClipViewer clip={selectedClip} onExitClip={() => setSelectedClip(null)} setSelectedClipToLastClip={setSelectedClipToLastClip}/>}
    </div>
  )
}