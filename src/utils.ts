export const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
};

export const parseSize = (bytes: number) => {
    let kb = bytes / 1000;
    let mb = kb / 1000;
    let gb = mb / 1000;

    if (gb > 1) {
        return gb.toFixed(2) + "GB";
    } else {
        return mb.toFixed(2) + "MB";
    }
};

export function smooth(arr: number[], window: number = 3): number[] {
    return arr.map((_, i) => {
        const start = Math.max(0, i - window);
        const slice = arr.slice(start, i + 1);

        const sum = slice.reduce((a, b) => a + b, 0);
        return sum / slice.length;
    });
}
