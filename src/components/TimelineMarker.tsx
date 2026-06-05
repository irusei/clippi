import { formatTime } from "../utils";

interface MarkerProps {
  label: string;
  time: number;
  duration: number;
  colorClass: string;
  hidden: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export default function TimelineMarker({
  label,
  time,
  duration,
  colorClass,
  hidden,
  onMouseDown,
}: MarkerProps) {
  const percent = (time / duration) * 100;
  const isNearEnd = percent > 90;

  let placementClass = isNearEnd ? "right-2 text-right" : "left-2 text-left";

  if (hidden)
    placementClass += " opacity-0 group-hover:opacity-100 transition-all";

  return (
    <div
      className={`group absolute top-0 bottom-0 w-1 ${colorClass} z-20 ${onMouseDown && "cursor-ew-resize"}`}
      style={{
        left: `${percent}%`,
        transform: isNearEnd ? "translateX(-100%)" : "none",
      }}
      onMouseDown={(e) => onMouseDown?.(e)}
    >
      <div
        className={`
                absolute top-2 flex flex-col ${colorClass} text-mocha-base px-2 py-1 
                rounded text-[10px] font-bold shadow-xl whitespace-nowrap 
                ${placementClass}
            `}
      >
        <span>{label}</span>
        <span className="font-mono">{formatTime(time)}</span>
      </div>
    </div>
  );
}
