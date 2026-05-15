use rodio::{Decoder};
use std::fs::File;
use std::path::PathBuf;
use anyhow::Result;

pub fn play_sound(sound_path: PathBuf) -> Result<()> {
    let handle = rodio::DeviceSinkBuilder::open_default_sink()?;
    let _player = rodio::Player::connect_new(&handle.mixer());
    let file = File::open(sound_path)?;
    let source = Decoder::try_from(file)?;

    handle.mixer().add(source);

    std::thread::sleep(std::time::Duration::from_secs(5));

    Ok(())
}