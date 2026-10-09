import { AlertCircle } from "lucide-react";
import { ReactNode } from "react";

interface DisclaimerProps {
    title: string;
    description: ReactNode;
    kind?: "warning" | "danger";
}

export function Disclaimer({ title, description, kind = "warning" }: DisclaimerProps) {
    const color = kind === "danger" ? "mocha-red" : "mocha-yellow";

    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 border rounded-lg border-${color}/40 bg-${color}/5 text-${color}`}
        >
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5`} />
            <div>
                <p className={`text-sm font-medium`}>{title}</p>
                <p className={`text-xs mt-1 text-${color}/80`}>
                    {description}
                </p>
            </div>
        </div>
    );
}
