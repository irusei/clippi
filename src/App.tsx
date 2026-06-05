import { Gamepad2Icon, Settings, VideoIcon } from "lucide-react";
import "./App.css";
import ClipTab from "./tabs/ClipTab";
import { ReactElement, useEffect, useState } from "react";
import SettingTab from "./tabs/SettingTab";
import GameTab from "./tabs/GameTab";
import { DetectedGame } from "./types";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

document.addEventListener(
  "contextmenu",
  (e) => {
    e.preventDefault();
  },
  false,
);

enum Tab {
  Clips,
  Settings,
  Games,
}

interface SidebarButtonProps {
  selected: boolean;
  icon: ReactElement;
  onClick: () => void;
}

function SidebarButton({ selected, icon, onClick }: SidebarButtonProps) {
  return (
    <div
      className={`relative w-16 h-16 p-5 items-center ${selected ? "text-mocha-mauve" : "text-mocha-lavender"} hover:text-mocha-mauve transition-all justify-center`}
      onClick={() => {
        if (!selected) onClick();
      }}
    >
      {selected && (
        <div className="absolute w-1 h-16 top-0 left-0 bg-mocha-mauve" />
      )}
      {icon}
    </div>
  );
}

interface SidebarProps {
  currentTab: Tab;
  setCurrentTab: React.Dispatch<React.SetStateAction<Tab>>;
}

function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  return (
    <div className="z-10 flex flex-col w-16 h-screen bg-mocha-base border-r border-mocha-crust/50">
      <SidebarButton
        selected={currentTab === Tab.Clips}
        icon={<VideoIcon className="w-full h-full" />}
        onClick={() => setCurrentTab(Tab.Clips)}
      />
      <SidebarButton
        selected={currentTab === Tab.Games}
        icon={<Gamepad2Icon className="w-full h-full" />}
        onClick={() => setCurrentTab(Tab.Games)}
      />
      <SidebarButton
        selected={currentTab === Tab.Settings}
        icon={<Settings className="w-full h-full" />}
        onClick={() => setCurrentTab(Tab.Settings)}
      />
    </div>
  );
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.Clips);
  const [currentGame, setCurrentGame] = useState<DetectedGame | null>(null);

  function getCurrentGame() {
    invoke("get_current_game").then((res) => {
      setCurrentGame(res as DetectedGame | null);
    });
  }

  // current game listener
  useEffect(() => {
    getCurrentGame();
    const unlisten = listen("set_current_game", (event) => {
      let game = event.payload as DetectedGame | null;

      // todo: timestamps, estimated size ig
      setCurrentGame(game);
    });
    return () => {
      unlisten.then((ul) => ul());
    };
  }, []);

  return (
    <div className="flex flex-row h-screen w-screen relative">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      {currentTab === Tab.Clips && <ClipTab />}
      {currentTab === Tab.Games && <GameTab />}
      {currentTab === Tab.Settings && <SettingTab />}

      {/* now playing game panel */}
      {currentGame != null && (
        <div className="w-full absolute bottom-0 h-10 bg-mocha-base items-center text-center flex p-4 gap-x-2 justify-end border-t border-mocha-crust/50">
          <img className="h-5 w-5" src={currentGame.icon ?? ""} />
          <p className="text-mocha-text">{currentGame.name}</p>
          <div className="h-2 w-2 rounded-xl bg-mocha-green" />
        </div>
      )}
    </div>
  );
}
