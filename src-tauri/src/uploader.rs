use std::path::PathBuf;

use anyhow::Result;
use futures_util::TryStreamExt;
use reqwest::{
    multipart::{Form, Part},
    Client,
};
use tauri::Emitter;
use tokio::fs::File;
use tokio_util::io::ReaderStream;

pub async fn upload_clip(
    app: tauri::AppHandle,
    endpoint: &str,
    token: &str,
    file_path: &PathBuf,
) -> Result<String, anyhow::Error> {
    let client = Client::new();

    let filename = file_path
        .file_name()
        .unwrap()
        .to_string_lossy()
        .into_owned();

    let file = File::open(&file_path).await?;
    let total_size = file.metadata().await?.len();

    let app_for_emit = app.clone();

    let mut uploaded = 0u64;

    let stream = ReaderStream::new(file).map_ok(move |chunk| {
        uploaded += chunk.len() as u64;

        let progress = uploaded as f64 * 100.0 / total_size as f64;

        let _ = app_for_emit.emit("upload_progress", progress);

        chunk
    });

    let body = reqwest::Body::wrap_stream(stream);

    let part = Part::stream_with_length(body, total_size)
        .file_name(filename)
        .mime_str("video/mp4")?;

    let response = client
        .post(format!("{}/api/upload", endpoint))
        .header("authorization", token)
        .multipart(Form::new().part("file", part))
        .send()
        .await?
        .error_for_status()?;

    let body: serde_json::Value = response.json().await?;

    let url = body
        .get("files")
        .and_then(|f| f.get(0))
        .and_then(|f| f.get("url"))
        .and_then(|u| u.as_str())
        .ok_or_else(|| anyhow::anyhow!("Failed to parse upload response"))?
        .to_string();

    Ok(url)
}
