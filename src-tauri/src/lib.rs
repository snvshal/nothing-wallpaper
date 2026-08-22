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

fn focus_window(win: &tauri::WebviewWindow) {
    let _ = win.unminimize();
    let _ = win.show();
    let _ = win.set_always_on_top(true);
    let _ = win.set_focus();
    let _ = win.set_always_on_top(false);
}

fn open_settings(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        focus_window(&win);
        return;
    }

    if let Ok(win) = tauri::WebviewWindowBuilder::new(
        app,
        "settings",
        tauri::WebviewUrl::App("settings.html".into()),
    )
    .title("Nothing Wallpaper")
    .inner_size(720.0, 520.0)
    .min_inner_size(560.0, 400.0)
    .center()
    .additional_browser_args(
        "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,ElasticOverscroll,OverscrollHistoryNavigation,msExperimentalScrolling",
    )
    .build()
    {
        focus_window(&win);
    }
}

#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) {
    open_settings(&app);
}

#[cfg(target_os = "windows")]
fn prevent_default_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    use tauri_plugin_prevent_default::{Flags, PlatformOptions};

    let dev = cfg!(debug_assertions);

    tauri_plugin_prevent_default::Builder::new()
        .with_flags(Flags::debug())
        .platform(
            PlatformOptions::new()
                .browser_accelerator_keys(dev)
                .default_context_menus(dev)
                .dev_tools(dev)
                .general_autofill(true)
                .password_autosave(false)
                .swipe_navigation(false)
                .pinch_zoom(false),
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
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(prevent_default_plugin())
        .invoke_handler(tauri::generate_handler![
            get_memory_usage,
            open_settings_window
        ])
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

            // System tray
            {
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

                let settings_item =
                    MenuItem::with_id(handle, "settings", "Settings", true, None::<&str>)?;
                let quit_item = MenuItem::with_id(handle, "quit", "Quit", true, None::<&str>)?;
                let menu = Menu::with_items(handle, &[&settings_item, &quit_item])?;

                let _tray = TrayIconBuilder::with_id("main-tray")
                    .icon(app.default_window_icon().unwrap().clone())
                    .tooltip("Nothing Wallpaper")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "settings" => open_settings(app),
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            open_settings(tray.app_handle());
                        }
                    })
                    .build(app)?;
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
