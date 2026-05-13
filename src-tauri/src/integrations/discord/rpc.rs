use std::{sync::{LazyLock, Mutex}};

use discord_rpc_client::Client as DiscordRPC;

use crate::storage::games::DetectedGameData;

static RPC: LazyLock<Mutex<Option<DiscordRPC>>> = LazyLock::new(|| {
    Mutex::new(None)
});

static CLIENT_ID: u64 = 1504193773650051294;

pub fn init() {
    std::thread::spawn(|| {
        let mut drpc = DiscordRPC::new(CLIENT_ID);
        drpc.start();
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
            if let Err(why) = drpc.set_activity(|activity|
                activity.details(format!("Recording {}", game.name))
                    .assets(|assets| assets
                        .large_image("meowl")
                    )
            ) {
                println!("Failed to set presence: {}", why);
            }
        }
    });
}