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
