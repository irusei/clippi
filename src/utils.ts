export const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
};

export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function smooth(arr: number[], window: number = 3): number[] {
    return arr.map((_, i) => {
        const start = Math.max(0, i - window);
        const slice = arr.slice(start, i + 1);

        const sum = slice.reduce((a, b) => a + b, 0);
        return sum / slice.length;
    });
}

export function parseStorageLimit(limit: string): number {
    if (limit === "Unlimited") return Infinity;

    const split = limit.split("GB")!;

    const value = parseInt(split[0]);
    return value * 1024 * 1024 * 1024;
}

export function isOverStorageLimit(usedBytes: number, limit: string): boolean {
    const limitBytes = parseStorageLimit(limit);
    return usedBytes >= limitBytes!;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

const WEEKDAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export function parseClipDate(raw: string): Date | null {
    const [datePart, timePart] = raw.split(/[ T]/);
    if (!datePart) return null;

    const numbers = datePart.split("-").map(Number);
    if (numbers.length !== 3 || numbers.some(isNaN)) return null;

    const [year, month, day] = numbers;
    const timeNumbers = (timePart ?? "").split(":").map(Number);
    const hour = Number.isFinite(timeNumbers[0]) ? timeNumbers[0] : 0;
    const minute = Number.isFinite(timeNumbers[1]) ? timeNumbers[1] : 0;

    return new Date(year, month - 1, day, hour, minute);
}

export function getClipTimestamp(raw: string): number {
    const parsed = parseClipDate(raw);
    return parsed ? parsed.getTime() : 0;
}

export function getClipDayKey(raw: string): string {
    const parsed = parseClipDate(raw);
    if (!parsed) return raw;
    return `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
}

export function formatClipTime(raw: string): string {
    const parsed = parseClipDate(raw);
    if (!parsed) return "";
    return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

export function formatDayHeading(dayKey: string): string {
    const [year, month, day] = dayKey.split("-").map(Number);
    if (!month || !day) return dayKey;

    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysAgo = Math.round((today.getTime() - date.getTime()) / 86400000);
    if (daysAgo === 0) return "Today";
    if (daysAgo === 1) return "Yesterday";

    const heading = `${WEEKDAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
    return date.getFullYear() === today.getFullYear()
        ? heading
        : `${heading} ${date.getFullYear()}`;
}
