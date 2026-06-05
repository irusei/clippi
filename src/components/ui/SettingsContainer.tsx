import { ReactNode } from "react";

interface SettingsContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsContainer({
  title,
  description,
  children,
}: SettingsContainerProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-mocha-base">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-mocha-text">{title}</span>
        {description && (
          <span className="text-xs text-mocha-overlay1">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}
