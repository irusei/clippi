use std::{sync::{LazyLock, Mutex}};
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

use crate::storage::games::DetectedGameData;

static RPC: LazyLock<Mutex<Option<DiscordIpcClient>>> = LazyLock::new(|| {
    Mutex::new(None)
});

pub fn init() {
    std::thread::spawn(|| {
        let mut drpc = DiscordIpcClient::new("1504193773650051294");
        drpc.connect().expect("Failed to connect to Discord Rich Presence");
        *RPC.lock().unwrap() = Some(drpc);
    });
}

pub fn clear_activity() {
    std::thread::spawn(|| {
        let mut drpc = RPC.lock().unwrap();

        if let Some(drpc) = drpc.as_mut() {
            let _ = drpc.clear_activity();
        }
    });
}

pub fn set_activity(game: &DetectedGameData) {
    let game = game.clone();
    std::thread::spawn(move || {
        let mut drpc = RPC.lock().unwrap();

        if let Some(drpc) = drpc.as_mut() {
            let _ = drpc.set_activity(activity::Activity::new()
                .assets(activity::Assets::new().large_image("meowl"))
                .details(format!("Recording {}", &game.name))
            );
        }
    });
}