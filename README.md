# clippi

a lightweight game clipping* app for windows and linux

*the clipping part is coming soon, only records full sessions for now

## features

- records game clips using obs
- auto-detects games when running
- basic clip editor
- organized clip library
- settings

## linux disclaimer
the linux version of the app does not use obs but instead requires programs installed on the host as `gpu-screen-recorder`, `ffmpeg` and `ffprobe`
viewing clips also isn't possible atm due to an unmerged pr for tauri, but hopefully as soon as it gets merged it can work properly (you can use vlc for this instead)
due to limitations of wayland (cba to try x11) window capture isn't possible and the whole main display gets captured

tested on cachyos w/ wayland

## setup

### development (windows)

```bash
npm install
npm run tauri dev # (it will crash here)

# only on first start:
cd installer
cargo build --release
cp target/release/installer.exe ../src-tauri/target/debug/installer.exe
cd ../src-tauri/target/debug
./installer.exe # downloads obs & ffmpeg
cd ../../..

# subsequent attempts only need to run this
npm run tauri dev # (it will no longer crash here)
```

### build

```bash
npm install
npm run tauri build
```

## disclaimer

this app downloads both ffmpeg and obs from known and safe repos (see [deps.rs](installer/src/deps.rs)), but it is **NOT** affiliated with the makers of said software in any capacity
