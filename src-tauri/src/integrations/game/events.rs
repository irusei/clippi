use std::{
    sync::{Arc, LazyLock, Mutex},
    thread,
};

use dyn_clone::DynClone;

use crate::{
    integrations::game::lol::league_events::LeagueGameIntegration, storage::games::DetectedGameData,
};

#[typetag::serde(tag = "type")]
pub trait GameIntegrationResult: DynClone + Send {}
pub trait GameIntegration {
    fn get_result(&self) -> Option<Box<dyn GameIntegrationResult>>;
    fn run(&mut self) {}
}

dyn_clone::clone_trait_object!(GameIntegrationResult);

static CURRENT_GAME_INTEGRATION: LazyLock<
    Arc<Mutex<Option<Box<dyn GameIntegration + Send + Sync>>>>,
> = LazyLock::new(|| Arc::new(Mutex::new(None))); // what

pub fn start_integration(game: &DetectedGameData) {
    let event: Box<dyn GameIntegration + Send + Sync> = match game.name.as_str() {
        "League of Legends" => Box::new(LeagueGameIntegration::default()),
        _ => return,
    };

    *CURRENT_GAME_INTEGRATION.lock().unwrap() = Some(event);

    thread::spawn({
        let integration = CURRENT_GAME_INTEGRATION.clone();

        move || {
            let mut integration = integration.lock().unwrap();

            if let Some(integration) = integration.as_mut() {
                integration.run();
            }
        }
    });
}

pub fn stop_integration() -> Option<Box<dyn GameIntegrationResult>> {
    let mut current_integration = CURRENT_GAME_INTEGRATION.lock().unwrap();

    if current_integration.is_some() {
        let result = current_integration
            .as_mut()
            .map(|integration| integration.get_result())
            .unwrap();

        return result;
    }

    return None;
}
