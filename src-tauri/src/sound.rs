use rodio::Decoder;
use std::fs::File;
use std::path::PathBuf;

pub fn play_sound(sound_path: PathBuf) {
    std::thread::spawn(|| {
        let handle =
            rodio::DeviceSinkBuilder::open_default_sink().expect("failed to open audio sink");
        let _player = rodio::Player::connect_new(&handle.mixer());
        let file = File::open(sound_path).expect("failed to open audio file");
        let source = Decoder::try_from(file).expect("failed to decode audio file");

        handle.mixer().add(source);

        std::thread::sleep(std::time::Duration::from_secs(5));
    });
}
