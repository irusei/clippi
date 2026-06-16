# clippi

a lightweight game clipping\* app for windows and linux

\*the clipping part is coming soon, only records full sessions for now

## features

- records game clips using obs
- auto-detects games when running
- basic clip editor
- organized clip library
- settings

## linux disclaimer

the linux version of the app does not use obs but instead requires programs installed on the host such as `gpu-screen-recorder`, `ffmpeg` and `ffprobe`
viewing clips also isn't possible atm due to an unmerged pr for tauri, but hopefully as soon as it gets merged it can work properly (you can use vlc for this instead for now)
due to limitations of wayland (cba to try x11) window capture isn't possible and the whole main display gets captured

tested on cachyos w/ wayland

## setup

### development (windows)

requires cmake, powershell, npm and cargo. compiling the obs sources [probably requires visual studio 2026](https://github.com/irusei/clippi-libobs-rs/blob/2bf9f88a2f7573004e246818f92aa4d3d63226e9/libobs/build.rs#L73) with the msvc c++ build tools installed

```bash
npm install
npm run tauri dev # (it will crash here)
```

### build

```bash
npm install
npm run tauri build
```

## disclaimer

this app downloads both ffmpeg and obs from known and safe repos (see [deps.rs](installer/src/deps.rs)), but it is **NOT** affiliated with the makers of said software in any capacity
