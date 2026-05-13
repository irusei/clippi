import clsx from "clsx";

interface InputProps {
    type: string;
    className?: string;
    value: any;
    onChange?: (newValue: string) => void;
    onKeyDown?: (key: string) => void;
}

export default function Input({type, className, value, onChange, onKeyDown}: InputProps) {
    return (
        <input 
            type={type}
            className={clsx("bg-mocha-base text-mocha-text p-2.5 rounded-lg border border-transparent outline-none transition-colors focus:border-mocha-mauve", className)}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={(e) => onKeyDown?.(e.key)}
        />
    )
}