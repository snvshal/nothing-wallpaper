#[cfg(target_os = "windows")]
mod mouse_hook;

use serde::{Deserialize, Serialize};
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

#[derive(Clone, Serialize)]
struct MediaInfo {
    is_playing: bool,
    title: String,
    artist: String,
    album: String,
    cover_base64: String,
}

#[cfg(target_os = "windows")]
static CURRENT_MEDIA: Mutex<Option<MediaInfo>> = Mutex::new(None);

#[cfg(target_os = "windows")]
fn encode_base64(bytes: &[u8]) -> String {
    const BASE64_ALPHABET: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut encoded = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };
        let n = ((b0 as u32) << 16) | ((b1 as u32) << 8) | (b2 as u32);
        encoded.push(BASE64_ALPHABET[((n >> 18) & 63) as usize] as char);
        encoded.push(BASE64_ALPHABET[((n >> 12) & 63) as usize] as char);
        if chunk.len() > 1 {
            encoded.push(BASE64_ALPHABET[((n >> 6) & 63) as usize] as char);
        } else {
            encoded.push('=');
        }
        if chunk.len() > 2 {
            encoded.push(BASE64_ALPHABET[(n & 63) as usize] as char);
        } else {
            encoded.push('=');
        }
    }
    encoded
}

/// Resolve the best-fit GSMTC session:
/// 1. CurrentSession if actively Playing (user's focused/primary media)
/// 2. Any other session that is actively Playing (background browser tab / Spotify)
/// 3. CurrentSession if paused (the last active session)
/// 4. First session in list as a final fallback
#[cfg(target_os = "windows")]
fn find_media_session() -> Option<windows::Media::Control::GlobalSystemMediaTransportControlsSession>
{
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    };

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .and_then(|op| op.get())
        .ok()?;

    // 1. Prefer CurrentSession if it is actively Playing
    if let Ok(current) = manager.GetCurrentSession() {
        let is_playing = current
            .GetPlaybackInfo()
            .ok()
            .and_then(|p| p.PlaybackStatus().ok())
            .map(|st| st == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing)
            .unwrap_or(false);

        if is_playing {
            return Some(current);
        }
    }

    // 2. Scan all sessions for any session that is actively Playing
    if let Ok(sessions) = manager.GetSessions() {
        if let Ok(count) = sessions.Size() {
            for i in 0..count {
                if let Ok(s) = sessions.GetAt(i) {
                    let is_playing = s
                        .GetPlaybackInfo()
                        .ok()
                        .and_then(|p| p.PlaybackStatus().ok())
                        .map(|st| {
                            st == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing
                        })
                        .unwrap_or(false);

                    if is_playing {
                        return Some(s);
                    }
                }
            }
        }
    }

    // 3. If nothing is playing, fall back to CurrentSession (last focused media)
    if let Ok(current) = manager.GetCurrentSession() {
        return Some(current);
    }

    // 4. Fall back to first session in list
    if let Ok(sessions) = manager.GetSessions() {
        if let Ok(count) = sessions.Size() {
            if count > 0 {
                return sessions.GetAt(0).ok();
            }
        }
    }

    None
}

#[cfg(target_os = "windows")]
fn query_media_info_internal(
    last_title: &mut String,
    last_artist: &mut String,
    last_cover: &mut String,
) -> MediaInfo {
    use windows::Storage::Streams::DataReader;

    let session = match find_media_session() {
        Some(s) => s,
        None => {
            return MediaInfo {
                is_playing: false,
                title: "Nothing Playing".into(),
                artist: "Idle".into(),
                album: String::new(),
                cover_base64: String::new(),
            };
        }
    };

    let is_playing = session
        .GetPlaybackInfo()
        .ok()
        .and_then(|p| p.PlaybackStatus().ok())
        .map(|s| {
            s == windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing
        })
        .unwrap_or(false);

    let media_props = session
        .TryGetMediaPropertiesAsync()
        .and_then(|op| op.get())
        .ok();

    let (title, artist, album) = if let Some(props) = media_props.as_ref() {
        let t = props.Title().map(|h| h.to_string()).unwrap_or_default();
        let a = props.Artist().map(|h| h.to_string()).unwrap_or_default();
        let alb = props
            .AlbumTitle()
            .map(|h| h.to_string())
            .unwrap_or_default();
        (t, a, alb)
    } else {
        (String::new(), String::new(), String::new())
    };

    if title.is_empty() && artist.is_empty() {
        return MediaInfo {
            is_playing,
            title: if is_playing {
                "Audio Playing".into()
            } else {
                "Nothing Playing".into()
            },
            artist: if is_playing {
                "System Audio".into()
            } else {
                "Idle".into()
            },
            album: String::new(),
            cover_base64: String::new(),
        };
    }

    let mut cover_base64 = String::new();
    let track_changed = *last_title != title || *last_artist != artist;

    if !track_changed && !last_cover.is_empty() {
        cover_base64 = last_cover.clone();
    } else if let Some(props) = media_props.as_ref() {
        if let Ok(thumb_ref) = props.Thumbnail() {
            if let Ok(stream_op) = thumb_ref.OpenReadAsync() {
                if let Ok(stream) = stream_op.get() {
                    if let Ok(size) = stream.Size() {
                        if size > 0 && size < 5 * 1024 * 1024 {
                            if let Ok(reader) = DataReader::CreateDataReader(&stream) {
                                if reader
                                    .LoadAsync(size as u32)
                                    .and_then(|op| op.get())
                                    .is_ok()
                                {
                                    let mut bytes = vec![0u8; size as usize];
                                    if reader.ReadBytes(&mut bytes).is_ok() {
                                        cover_base64 = format!(
                                            "data:image/jpeg;base64,{}",
                                            encode_base64(&bytes)
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        *last_title = title.clone();
        *last_artist = artist.clone();
        *last_cover = cover_base64.clone();
    }

    MediaInfo {
        is_playing,
        title,
        artist: if artist.is_empty() {
            "Media Player".into()
        } else {
            artist
        },
        album: if album.is_empty() {
            "Nothing OS".into()
        } else {
            album
        },
        cover_base64,
    }
}

#[cfg(target_os = "windows")]
fn start_media_monitor() {
    std::thread::Builder::new()
        .name("media_monitor".into())
        .spawn(|| {
            let mut last_title = String::new();
            let mut last_artist = String::new();
            let mut last_cover = String::new();

            loop {
                let info =
                    query_media_info_internal(&mut last_title, &mut last_artist, &mut last_cover);
                if let Ok(mut slot) = CURRENT_MEDIA.lock() {
                    *slot = Some(info);
                }
                std::thread::sleep(std::time::Duration::from_millis(600));
            }
        })
        .expect("failed to spawn media monitor thread");
}

#[tauri::command]
fn get_media_status() -> MediaInfo {
    #[cfg(target_os = "windows")]
    {
        if let Ok(guard) = CURRENT_MEDIA.lock() {
            if let Some(info) = guard.as_ref() {
                return info.clone();
            }
        }
        MediaInfo {
            is_playing: false,
            title: "Nothing Playing".into(),
            artist: "Idle".into(),
            album: String::new(),
            cover_base64: String::new(),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        MediaInfo {
            is_playing: false,
            title: "Nothing Playing".into(),
            artist: "Idle".into(),
            album: String::new(),
            cover_base64: String::new(),
        }
    }
}

#[tauri::command]
fn toggle_media_playback() -> bool {
    #[cfg(target_os = "windows")]
    {
        std::thread::spawn(|| {
            if let Some(session) = find_media_session() {
                let _ = session.TryTogglePlayPauseAsync();
            }
        });
        true
    }
    #[cfg(not(target_os = "windows"))]
    {
        true
    }
}

#[tauri::command]
fn next_media_track() -> bool {
    #[cfg(target_os = "windows")]
    {
        std::thread::spawn(|| {
            if let Some(session) = find_media_session() {
                let _ = session.TrySkipNextAsync();
            }
        });
        true
    }
    #[cfg(not(target_os = "windows"))]
    {
        true
    }
}

#[tauri::command]
fn previous_media_track() -> bool {
    #[cfg(target_os = "windows")]
    {
        std::thread::spawn(|| {
            if let Some(session) = find_media_session() {
                let _ = session.TrySkipPreviousAsync();
            }
        });
        true
    }
    #[cfg(not(target_os = "windows"))]
    {
        true
    }
}

#[tauri::command]
fn seek_media(delta_seconds: i64) -> bool {
    #[cfg(target_os = "windows")]
    {
        std::thread::spawn(move || {
            if let Some(session) = find_media_session() {
                if let Ok(timeline) = session.GetTimelineProperties() {
                    if let Ok(pos) = timeline.Position() {
                        let current_ticks = pos.Duration;
                        let delta_ticks = delta_seconds * 10_000_000;
                        let new_ticks = (current_ticks + delta_ticks).max(0);
                        let target_ticks = if let Ok(end) = timeline.EndTime() {
                            if end.Duration > 0 {
                                new_ticks.min(end.Duration)
                            } else {
                                new_ticks
                            }
                        } else {
                            new_ticks
                        };
                        if let Ok(op) = session.TryChangePlaybackPositionAsync(target_ticks) {
                            if let Ok(success) = op.get() {
                                if success {
                                    return;
                                }
                            }
                        }
                    }
                }
                // Fallback: If seeking is unsupported by the player, trigger skip
                if delta_seconds > 0 {
                    let _ = session.TrySkipNextAsync();
                } else {
                    let _ = session.TrySkipPreviousAsync();
                }
            }
        });
        true
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = delta_seconds;
        true
    }
}

// ---------------------------------------------------------------------------
// Screen Time Tracking Subsystem
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenTimeApp {
    pub name: String,
    pub seconds: u64,
    pub percentage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyScreenTime {
    pub day_offset: i32, // -9 to 0 (0 = today)
    pub seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenTimeData {
    pub total_seconds: u64,
    pub top_apps: Vec<ScreenTimeApp>,
    pub history_days: Vec<DailyScreenTime>,
}

static CURRENT_DAY: Mutex<u32> = Mutex::new(0);
static APP_DURATIONS: Mutex<Option<std::collections::HashMap<String, u64>>> = Mutex::new(None);
static DAILY_HISTORY: Mutex<Option<std::collections::HashMap<u32, u64>>> = Mutex::new(None);

fn get_today_key() -> u32 {
    let now = std::time::SystemTime::now();
    match now.duration_since(std::time::UNIX_EPOCH) {
        Ok(d) => (d.as_secs() / 86400) as u32,
        Err(_) => 0,
    }
}

#[cfg(target_os = "windows")]
fn clean_app_name(exe: &str) -> String {
    let lower = exe.to_lowercase();
    if lower.contains("code") {
        return "VS Code".to_string();
    }
    if lower.contains("chrome") {
        return "Chrome".to_string();
    }
    if lower.contains("msedge") || lower.contains("edge") {
        return "Edge".to_string();
    }
    if lower.contains("spotify") {
        return "Spotify".to_string();
    }
    if lower.contains("discord") {
        return "Discord".to_string();
    }
    if lower.contains("firefox") {
        return "Firefox".to_string();
    }
    if lower.contains("brave") {
        return "Brave".to_string();
    }
    if lower.contains("explorer") {
        return "Explorer".to_string();
    }
    if lower.contains("windowsterminal") || lower.contains("powershell") || lower.contains("cmd") {
        return "Terminal".to_string();
    }
    if lower.contains("slack") {
        return "Slack".to_string();
    }
    if lower.contains("telegram") {
        return "Telegram".to_string();
    }
    if lower.contains("notion") {
        return "Notion".to_string();
    }
    if lower.contains("figma") {
        return "Figma".to_string();
    }
    if lower.contains("steam") {
        return "Steam".to_string();
    }

    let base = exe.trim_end_matches(".exe").trim_end_matches(".EXE");
    if base.is_empty() {
        return "Desktop".to_string();
    }
    let mut chars = base.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

#[cfg(target_os = "windows")]
fn get_active_foreground_app() -> Option<String> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return None;
        }

        if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            let mut buf = [0u16; 512];
            let mut size = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(
                handle,
                PROCESS_NAME_FORMAT(0),
                windows::core::PWSTR(buf.as_mut_ptr()),
                &mut size,
            );
            let _ = CloseHandle(handle);
            if ok.is_ok() && size > 0 {
                let raw_path = String::from_utf16_lossy(&buf[..size as usize]);
                let exe_name = raw_path.rsplit('\\').next().unwrap_or(&raw_path);
                return Some(clean_app_name(exe_name));
            }
        }
        None
    }
}

#[cfg(target_os = "windows")]
fn start_screentime_tracker() {
    std::thread::spawn(|| loop {
        std::thread::sleep(std::time::Duration::from_secs(1));
        if let Some(app) = get_active_foreground_app() {
            if app.to_lowercase().contains("nothing-wallpaper") {
                continue;
            }
            let today = get_today_key();
            let mut day_guard = CURRENT_DAY.lock().unwrap();
            let mut app_guard = APP_DURATIONS.lock().unwrap();
            let mut hist_guard = DAILY_HISTORY.lock().unwrap();

            let map = app_guard.get_or_insert_with(std::collections::HashMap::new);
            let hist_map = hist_guard.get_or_insert_with(std::collections::HashMap::new);

            if *day_guard != today {
                *day_guard = today;
                map.clear();
            }
            *map.entry(app).or_insert(0) += 1;
            *hist_map.entry(today).or_insert(0) += 1;
        }
    });
}

#[tauri::command]
fn get_screen_time() -> ScreenTimeData {
    let app_guard = APP_DURATIONS.lock().unwrap();
    let map = match &*app_guard {
        Some(m) => m.clone(),
        None => std::collections::HashMap::new(),
    };

    let total_seconds: u64 = map.values().sum();
    let mut items: Vec<(String, u64)> = map.into_iter().collect();
    items.sort_by_key(|b| std::cmp::Reverse(b.1));

    let mut top_apps: Vec<ScreenTimeApp> = items
        .iter()
        .take(3)
        .map(|(name, seconds)| {
            let percentage = if total_seconds > 0 {
                (*seconds as f32 / total_seconds as f32) * 100.0
            } else {
                0.0
            };
            ScreenTimeApp {
                name: name.clone(),
                seconds: *seconds,
                percentage,
            }
        })
        .collect();

    let top3_sum: u64 = items.iter().take(3).map(|(_, s)| *s).sum();
    if total_seconds > top3_sum {
        let other_seconds = total_seconds - top3_sum;
        let percentage = (other_seconds as f32 / total_seconds as f32) * 100.0;
        top_apps.push(ScreenTimeApp {
            name: "Other".to_string(),
            seconds: other_seconds,
            percentage,
        });
    }

    let today = get_today_key();
    let hist_guard = DAILY_HISTORY.lock().unwrap();
    let hist_map = match &*hist_guard {
        Some(h) => h.clone(),
        None => std::collections::HashMap::new(),
    };

    let mut history_days = Vec::with_capacity(10);
    for offset in -9..=0 {
        let day_key = if offset < 0 {
            today.saturating_sub((-offset) as u32)
        } else {
            today
        };
        let seconds = hist_map.get(&day_key).copied().unwrap_or(0);
        history_days.push(DailyScreenTime {
            day_offset: offset,
            seconds,
        });
    }

    ScreenTimeData {
        total_seconds,
        top_apps,
        history_days,
    }
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
            get_media_status,
            toggle_media_playback,
            next_media_track,
            previous_media_track,
            seek_media,
            get_screen_time,
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
                start_media_monitor();
                start_screentime_tracker();
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
