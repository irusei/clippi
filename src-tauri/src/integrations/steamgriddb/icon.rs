use crate::storage::settings::get_settings;

pub async fn search_steamgriddb(query: String) -> Result<serde_json::Value, String> {
    let settings = get_settings();
    let api_key = settings
        .steamgriddb_api_key
        .ok_or("No SteamGridDB API key configured")?;

    let games_url = format!(
        "https://www.steamgriddb.com/api/v2/search/autocomplete/{}",
        query
    );
    let games_res = reqwest::Client::new()
        .get(&games_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !games_res.status().is_success() {
        return Err(format!("HTTP {}", games_res.status()));
    }

    let games_body = games_res.text().await.map_err(|e| e.to_string())?;
    let games_resp: serde_json::Value =
        serde_json::from_str(&games_body).map_err(|e| e.to_string())?;
    let games: Vec<serde_json::Value> = games_resp["data"]
        .as_array()
        .ok_or("No data in response")?
        .clone();

    if games.is_empty() {
        return Ok(serde_json::json!({ "data": [] }));
    }

    let game = &games[0];
    let game_id = game["id"].as_u64().ok_or("No game id")?;
    let game_name = game["name"].as_str().unwrap_or("").to_string();
    let release_date = game["release_date"].as_u64();

    let icons_url = format!("https://www.steamgriddb.com/api/v2/icons/game/{}", game_id);
    let icons_res = reqwest::Client::new()
        .get(&icons_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !icons_res.status().is_success() {
        return Err(format!("HTTP {}", icons_res.status()));
    }

    let icons_body = icons_res.text().await.map_err(|e| e.to_string())?;
    let icons_resp: serde_json::Value =
        serde_json::from_str(&icons_body).map_err(|e| e.to_string())?;
    let icons: Vec<serde_json::Value> = icons_resp["data"]
        .as_array()
        .ok_or("No icons in response")?
        .clone();

    Ok(serde_json::json!({
        "data": {
            "icons": icons,
            "game": {
                "name": game_name,
                "release_date": release_date
            }
        }
    }))
}
