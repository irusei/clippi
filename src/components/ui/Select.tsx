import clsx from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface SelectProps {
  className?: string;
  value?: string;
  onChange?: (newValue: string) => void;
  options: [string, string][];
  disabled?: boolean;
}

export function Select({
  className,
  disabled,
  value,
  onChange,
  options,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={clsx(
          "w-full py-2.5 px-3 rounded-lg flex items-center justify-between text-mocha-text appearance-none cursor-pointer transition-colors bg-mocha-base border border-mocha-base",
          disabled
            ? "opacity-50 cursor-not-allowed pointer-events-none"
            : "hover:border-mocha-mauve hover:border focus:outline-mocha-mauve focus:outline-none focus:ring-1 focus:ring-mocha-mauve/50",
          className,
        )}
        disabled={disabled ?? false}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="flex-1 text-left truncate">
          {value || "Select an option"}
        </span>
        <div className="ml-3 shrink-0">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-mocha-text" />
          ) : (
            <ChevronDown className="w-4 h-4 text-mocha-text" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-mocha-base border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide z-10">
          {options.map(([option, optionValue]) => (
            <button
              key={option}
              type="button"
              className={clsx(
                "w-full px-3 py-2 text-left transition-colors cursor-pointer",
                value === optionValue
                  ? "bg-mocha-mauve/10 text-mocha-mauve"
                  : "text-mocha-text hover:bg-border hover:bg-mocha-mauve/20",
              )}
              onClick={() => {
                onChange?.(optionValue);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
