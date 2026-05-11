import { Gamepad2Icon, Settings, VideoIcon } from "lucide-react";
import "./App.css"
import ClipTab from "./tabs/ClipTab";
import { ReactElement, useState } from "react";
import SettingTab from "./tabs/SettingTab";
import GameTab from "./tabs/GameTab";

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
}, false);

enum Tab {
  Clips,
  Settings,
  Games
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
        if (!selected)
          onClick();
      }}
    >
      {selected && <div className="absolute w-1 h-16 top-0 left-0 bg-mocha-mauve"/>}
      {icon}
    </div>
  )
}

interface SidebarProps {
  currentTab: Tab;
  setCurrentTab: React.Dispatch<React.SetStateAction<Tab>>
}

function Sidebar({currentTab, setCurrentTab}: SidebarProps) {
  return (
    <div className="flex flex-col w-16 h-screen bg-mocha-base">
      <SidebarButton selected={currentTab === Tab.Clips} icon={<VideoIcon className="w-full h-full"/>} onClick={() => setCurrentTab(Tab.Clips)}/>
      <SidebarButton selected={currentTab === Tab.Games} icon={<Gamepad2Icon className="w-full h-full"/>} onClick={() => setCurrentTab(Tab.Games)}/>
      <SidebarButton selected={currentTab === Tab.Settings} icon={<Settings className="w-full h-full"/>} onClick={() => setCurrentTab(Tab.Settings)}/>
    </div>
  )
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.Clips);

  return (
    <div className="flex flex-row h-screen w-screen">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab}/>
      {currentTab === Tab.Clips && <ClipTab/>}
      {currentTab === Tab.Games && <GameTab/>}
      {currentTab === Tab.Settings && <SettingTab/>}
    </div>
  )
}