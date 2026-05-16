import clsx from "clsx";

interface InputProps {
    ref?: React.RefObject<HTMLInputElement | null>;
    type: string;
    className?: string;
    placeholder?: string;
    value: any;
    onChange?: (newValue: string) => void;
    onKeyDown?: (key: string) => void;
    onBlur?: () => void;
    autoFocus?: boolean;
}

export default function Input({ref, type, className, value, placeholder, onChange, onKeyDown, onBlur, autoFocus = false,}: InputProps) {
    return (
        <input 
            ref={ref ?? null}
            type={type}
            className={clsx("bg-mocha-base text-mocha-text p-2.5 rounded-lg border border-transparent outline-none transition-colors focus:border-mocha-mauve", className)}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={(e) => onKeyDown?.(e.key)}
            onBlur={() => onBlur?.()}
            autoFocus={autoFocus}
        />
    )
}