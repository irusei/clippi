import { AlertCircle } from "lucide-react";
import { ReactNode } from "react";

interface DisclaimerProps {
    title: string;
    description: ReactNode;
}

export function Disclaimer({ title, description }: DisclaimerProps) {
    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 border rounded-lg border-mocha-yellow/40 bg-mocha-yellow/5 text-mocha-yellow`}
        >
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5`} />
            <div>
                <p className={`text-sm font-medium`}>{title}</p>
                <p className={`text-xs mt-1 text-mocha-yellow/80`}>
                    {description}
                </p>
            </div>
        </div>
    );
}
