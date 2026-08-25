#[cfg(target_os = "windows")]
mod mouse_hook;

use serde::Serialize;
use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{Networks, System};
use tauri::Manager;
use tauri_plugin_wallpaper::WallpaperExt;

struct NetworkSpeedTracker {
    networks: Networks,
    last_check: Instant,
}

static NET_TRACKER: Mutex<Option<NetworkSpeedTracker>> = Mutex::new(None);

fn format_speed(bytes_per_sec: f64) -> String {
    if bytes_per_sec >= 1024.0 * 1024.0 {
        format!("{:.1} MB/s", bytes_per_sec / (1024.0 * 1024.0))
    } else if bytes_per_sec >= 1024.0 {
        format!("{:.0} KB/s", bytes_per_sec / 1024.0)
    } else {
        format!("{:.0} B/s", bytes_per_sec)
    }
}

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

#[derive(Serialize)]
struct WifiInfo {
    enabled: bool,
    connected: bool,
    ssid: String,
    signal_level: u8,
    rx_rate: String,
    tx_rate: String,
}

#[cfg(target_os = "windows")]
fn query_connected_network_com() -> (bool, String) {
    use windows::Win32::Networking::NetworkListManager::{
        INetwork, INetworkListManager, NetworkListManager, NLM_ENUM_NETWORK_CONNECTED,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED,
    };

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        if let Ok(nlm) =
            CoCreateInstance::<_, INetworkListManager>(&NetworkListManager, None, CLSCTX_ALL)
        {
            let is_internet = nlm
                .IsConnectedToInternet()
                .map(|b| b.as_bool())
                .unwrap_or(false);
            let is_connected =
                is_internet || nlm.IsConnected().map(|b| b.as_bool()).unwrap_or(false);

            if let Ok(enum_net) = nlm.GetNetworks(NLM_ENUM_NETWORK_CONNECTED) {
                let mut fetched = 0u32;
                let mut net_arr: [Option<INetwork>; 1] = [None];
                if enum_net.Next(&mut net_arr, Some(&mut fetched)).is_ok() && fetched > 0 {
                    if let Some(net) = &net_arr[0] {
                        if let Ok(name_bstr) = net.GetName() {
                            let name = name_bstr.to_string();
                            if !name.trim().is_empty() {
                                return (true, name);
                            }
                        }
                    }
                }
            }

            return (
                is_connected,
                if is_connected {
                    "Connected".into()
                } else {
                    "No Internet".into()
                },
            );
        }

        (false, "Disconnected".into())
    }
}

#[tauri::command]
fn get_wifi_status() -> WifiInfo {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HANDLE;
        use windows::Win32::NetworkManagement::WiFi::{
            wlan_interface_state_connected, wlan_intf_opcode_current_connection, WlanCloseHandle,
            WlanEnumInterfaces, WlanFreeMemory, WlanOpenHandle, WlanQueryInterface,
            WLAN_CONNECTION_ATTRIBUTES, WLAN_INTERFACE_INFO_LIST,
        };

        let (mut rx_rate, mut tx_rate) = ("0 KB/s".to_string(), "0 KB/s".to_string());
        if let Ok(mut slot) = NET_TRACKER.lock() {
            let now = Instant::now();
            if let Some(tracker) = slot.as_mut() {
                let elapsed = now
                    .duration_since(tracker.last_check)
                    .as_secs_f64()
                    .max(0.1);
                tracker.networks.refresh(true);
                let mut total_rx = 0u64;
                let mut total_tx = 0u64;
                for data in tracker.networks.values() {
                    total_rx += data.received();
                    total_tx += data.transmitted();
                }
                rx_rate = format_speed(total_rx as f64 / elapsed);
                tx_rate = format_speed(total_tx as f64 / elapsed);
                tracker.last_check = now;
            } else {
                *slot = Some(NetworkSpeedTracker {
                    networks: Networks::new_with_refreshed_list(),
                    last_check: now,
                });
            }
        }

        let (com_connected, com_name) = query_connected_network_com();

        let mut client_handle = HANDLE::default();
        let mut negotiated_version = 0u32;
        unsafe {
            if WlanOpenHandle(2, None, &mut negotiated_version, &mut client_handle) != 0 {
                return WifiInfo {
                    enabled: com_connected,
                    connected: com_connected,
                    ssid: com_name,
                    signal_level: if com_connected { 3 } else { 0 },
                    rx_rate,
                    tx_rate,
                };
            }

            let mut interface_list: *mut WLAN_INTERFACE_INFO_LIST = core::ptr::null_mut();
            if WlanEnumInterfaces(client_handle, None, &mut interface_list) != 0
                || interface_list.is_null()
            {
                let _ = WlanCloseHandle(client_handle, None);
                return WifiInfo {
                    enabled: com_connected,
                    connected: com_connected,
                    ssid: com_name,
                    signal_level: if com_connected { 3 } else { 0 },
                    rx_rate,
                    tx_rate,
                };
            }

            let count = (*interface_list).dwNumberOfItems;
            if count == 0 {
                WlanFreeMemory(interface_list.cast());
                let _ = WlanCloseHandle(client_handle, None);
                return WifiInfo {
                    enabled: com_connected,
                    connected: com_connected,
                    ssid: com_name,
                    signal_level: if com_connected { 3 } else { 0 },
                    rx_rate,
                    tx_rate,
                };
            }

            let enabled = true;
            let mut connected = com_connected;
            let mut ssid = String::new();
            let mut signal_level = if com_connected { 3 } else { 0 };

            for i in 0..count {
                let info = (*interface_list).InterfaceInfo[i as usize];
                if info.isState == wlan_interface_state_connected {
                    connected = true;
                    let mut data_size = 0u32;
                    let mut data_ptr: *mut core::ffi::c_void = core::ptr::null_mut();
                    if WlanQueryInterface(
                        client_handle,
                        &info.InterfaceGuid,
                        wlan_intf_opcode_current_connection,
                        None,
                        &mut data_size,
                        &mut data_ptr,
                        None,
                    ) == 0
                        && !data_ptr.is_null()
                    {
                        let conn_attr = &*(data_ptr as *const WLAN_CONNECTION_ATTRIBUTES);
                        let raw_ssid = &conn_attr.wlanAssociationAttributes.dot11Ssid;
                        let len = (raw_ssid.uSSIDLength as usize).min(32);
                        if len > 0 {
                            if let Ok(s) = core::str::from_utf8(&raw_ssid.ucSSID[..len]) {
                                if !s.trim().is_empty() {
                                    ssid = s.to_string();
                                }
                            }
                        }
                        let quality = conn_attr.wlanAssociationAttributes.wlanSignalQuality;
                        signal_level = if quality >= 70 {
                            3
                        } else if quality >= 35 {
                            2
                        } else {
                            1
                        };
                        WlanFreeMemory(data_ptr);
                        break;
                    }
                }
            }

            WlanFreeMemory(interface_list.cast());
            let _ = WlanCloseHandle(client_handle, None);

            if ssid.is_empty() {
                ssid = if !com_name.is_empty() && com_name != "Disconnected" {
                    com_name
                } else if connected {
                    "Connected".into()
                } else if enabled {
                    "No Internet".into()
                } else {
                    "Wi-Fi Off".into()
                };
            }

            WifiInfo {
                enabled,
                connected,
                ssid,
                signal_level,
                rx_rate,
                tx_rate,
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        WifiInfo {
            enabled: true,
            connected: true,
            ssid: "Mock-5G".into(),
            signal_level: 3,
            rx_rate: "4.2 MB/s".into(),
            tx_rate: "1.1 MB/s".into(),
        }
    }
}

#[tauri::command]
fn toggle_wifi() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let status = get_wifi_status();
        let target_admin = if status.enabled {
            "disabled"
        } else {
            "enabled"
        };

        let status_res = Command::new("netsh")
            .args([
                "interface",
                "set",
                "interface",
                "name=Wi-Fi",
                &format!("admin={}", target_admin),
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        if status_res.is_err() || !status_res.as_ref().map(|s| s.success()).unwrap_or(false) {
            let _ = Command::new("explorer")
                .arg("ms-availablenetworks:")
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();
        }

        Ok(!status.enabled)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(true)
    }
}

fn focus_window(win: &tauri::WebviewWindow) {
    let _ = win.unminimize();
    let _ = win.show();
    let _ = win.set_always_on_top(true);
    let _ = win.set_focus();
    let _ = win.set_always_on_top(false);
}

#[cfg(target_os = "windows")]
fn round_corners(win: &tauri::WebviewWindow<tauri::Wry>) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND,
    };

    if let Ok(hwnd) = win.hwnd() {
        let preference = DWMWCP_ROUND;
        unsafe {
            let _ = DwmSetWindowAttribute(
                HWND(hwnd.0),
                DWMWA_WINDOW_CORNER_PREFERENCE,
                &preference as *const _ as *const core::ffi::c_void,
                std::mem::size_of_val(&preference) as u32,
            );
        }
    }
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
    .center()
    .decorations(false)
    .transparent(true)
    .resizable(false)
    .maximizable(false)
    .additional_browser_args(
        "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,ElasticOverscroll,OverscrollHistoryNavigation,msExperimentalScrolling",
    )
    .build()
    {
        focus_window(&win);
        #[cfg(target_os = "windows")]
        round_corners(&win);
    }
}

#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) {
    open_settings(&app);
}

#[derive(serde::Deserialize)]
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
struct RegionInput {
    id: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

#[tauri::command]
fn set_widget_regions(regions: Vec<RegionInput>) {
    #[cfg(target_os = "windows")]
    mouse_hook::set_regions(
        regions
            .into_iter()
            .map(|r| mouse_hook::WidgetRegion {
                id: r.id,
                rect: [
                    r.x.round() as i32,
                    r.y.round() as i32,
                    r.w.round() as i32,
                    r.h.round() as i32,
                ],
            })
            .collect(),
    );
    #[cfg(not(target_os = "windows"))]
    let _ = regions;
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
        .plugin(tauri_plugin_wallpaper::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(prevent_default_plugin())
        .invoke_handler(tauri::generate_handler![
            get_memory_usage,
            open_settings_window,
            set_widget_regions,
            get_wifi_status,
            toggle_wifi,
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
                mouse_hook::set_emitter(app.handle().clone());
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
