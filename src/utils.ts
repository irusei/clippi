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
