use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct KovaaKsData {
    pub scenarios: Vec<KovaaKsScenario>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct KovaaKsScenario {
    pub name: String,
    pub adjusted_finish_time: u64,
    pub score: f64,
}
