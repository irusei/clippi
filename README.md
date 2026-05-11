# clippi

a lightweight game clipping* app for windows

*the clipping part is coming soon, only records full sessions for now

## features

- records game clips using obs
- auto-detects games when running
- basic clip editor
- organized clip library
- settings

## setup

### development

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
