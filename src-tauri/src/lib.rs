#[cfg(target_os = "windows")]
mod mouse_hook;

use serde::Serialize;
use sysinfo::System;
use tauri::Manager;
use tauri_plugin_wallpaper::WallpaperExt;

#[derive(Serialize)]
struct MemoryInfo {
    total_bytes: u64,
    used_bytes: u64,
    available_bytes: u64,
    used_percent: f64,
}

#[tauri::command]
fn get_memory_usage() -> MemoryInfo {
    let mut sys = System::new();
    sys.refresh_memory();

    let total = sys.total_memory();
    let used = sys.used_memory();
    let available = sys.available_memory();
    let used_percent = if total > 0 {
        (used as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    MemoryInfo {
        total_bytes: total,
        used_bytes: used,
        available_bytes: available,
        used_percent,
    }
}

#[cfg(target_os = "windows")]
fn prevent_default_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    use tauri_plugin_prevent_default::PlatformOptions;

    tauri_plugin_prevent_default::Builder::new()
        .platform(
            PlatformOptions::new()
                .browser_accelerator_keys(false)
                .default_context_menus(false)
                .dev_tools(false)
                .general_autofill(true)
                .password_autosave(false),
        )
        .build()
}

#[cfg(not(target_os = "windows"))]
fn prevent_default_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_prevent_default::init()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_wallpaper::init())
        .plugin(prevent_default_plugin())
        .invoke_handler(tauri::generate_handler![get_memory_usage])
        .setup(|app| {
            let handle = app.handle();
            handle
                .wallpaper()
                .attach(tauri_plugin_wallpaper::AttachRequest::new("main"))?;

            #[cfg(target_os = "windows")]
            {
                let window = app.get_webview_window("main").unwrap();
                let hwnd = window.hwnd().unwrap();
                mouse_hook::install(hwnd.0 as isize);
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            #[cfg(target_os = "windows")]
            if let tauri::RunEvent::Exit = event {
                mouse_hook::uninstall();
            }
        });
}
