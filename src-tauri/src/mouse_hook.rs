use std::sync::atomic::{AtomicI32, AtomicIsize, AtomicU32, Ordering};
use std::sync::{Mutex, OnceLock};

use serde::Serialize;
use tauri::Emitter;
use windows::core::w;
use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Gdi::ScreenToClient;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::{
    GetRawInputData, RegisterRawInputDevices, HRAWINPUT, RAWINPUT, RAWINPUTDEVICE, RAWINPUTHEADER,
    RIDEV_INPUTSINK, RID_INPUT,
};
use windows::Win32::UI::WindowsAndMessaging::*;

static WEBVIEW_HWND: AtomicIsize = AtomicIsize::new(0);
static HOOK_HANDLE: AtomicIsize = AtomicIsize::new(0);

/// Widget regions in webview-client physical pixels, parallel to WIDGET_IDS.
static WIDGET_RECTS: Mutex<Vec<[i32; 4]>> = Mutex::new(Vec::new());
static WIDGET_IDS: Mutex<Vec<String>> = Mutex::new(Vec::new());

/// Gesture lifecycle, driven from two threads (hook = press/release/abort,
/// raw-input sink = threshold escalation): 0 idle, 1 press swallowed below
/// the drag threshold, 2 drag in progress.
///
/// This is deliberately ONE atomic state machine instead of two independent
/// flags: escalation is compare_exchange(PENDING -> DRAG), so a release
/// landing between the sink thread's state read and its escalation store
/// makes the CAS fail and the event is dropped. With separate booleans that
/// same interleaving leaked a stuck "dragging" state that swallowed all
/// mouse motion and right-clicks system-wide until focus changed away from
/// the desktop. SeqCst on every access: the press handler writes anchor and
/// delta bookkeeping before publishing PENDING, and weak orderings would
/// let the sink thread observe them out of order on ARM64 Windows.
static DRAG_STATE: AtomicU32 = AtomicU32::new(STATE_IDLE);

const STATE_IDLE: u32 = 0;
const STATE_PENDING: u32 = 1;
const STATE_DRAG: u32 = 2;

static DRAG_SEQ: AtomicU32 = AtomicU32::new(0);
static DRAG_CURSOR_X: AtomicI32 = AtomicI32::new(0);
static DRAG_CURSOR_Y: AtomicI32 = AtomicI32::new(0);
static DRAG_ANCHOR_X: AtomicI32 = AtomicI32::new(0);
static DRAG_ANCHOR_Y: AtomicI32 = AtomicI32::new(0);
static DRAG_REGION_ID: Mutex<Option<String>> = Mutex::new(None);

/// Handle of the raw-input sink window (message target for shutdown).
static RAW_SINK_HWND: AtomicIsize = AtomicIsize::new(0);
/// System pointer-speed multiplier in hundredths (100 = default 10/20).
static MOUSE_SPEED_MILLI: AtomicI32 = AtomicI32::new(100);
static MOUSE_THRESHOLD_1: AtomicI32 = AtomicI32::new(0);
static MOUSE_THRESHOLD_2: AtomicI32 = AtomicI32::new(0);
static MOUSE_ACCELERATION: AtomicI32 = AtomicI32::new(0);

/// App handle used to stream drag coordinates to the UI as they happen.
static EMITTER: OnceLock<tauri::AppHandle> = OnceLock::new();

pub fn set_emitter(handle: tauri::AppHandle) {
    let _ = EMITTER.set(handle);
}

#[derive(Serialize, Clone)]
struct CursorPush {
    seq: u32,
    x: i32,
    y: i32,
}

/// True cursor motion accumulated from raw input since the current press,
/// expressed in hundredths of physical screen pixels. Keeping the fractional
/// portion prevents slow pointer-speed settings from dropping small deltas.
static RAW_DELTA_X: AtomicI32 = AtomicI32::new(0);
static RAW_DELTA_Y: AtomicI32 = AtomicI32::new(0);
/// Last absolute-mode raw position (sentinel = unknown; absolute devices only).
static RAW_PREV_ABS_X: AtomicI32 = AtomicI32::new(i32::MIN);
static RAW_PREV_ABS_Y: AtomicI32 = AtomicI32::new(i32::MIN);

const WM_LBUTTONDOWN: u32 = 0x0201;
const WM_LBUTTONUP: u32 = 0x0202;
const MK_LBUTTON: usize = 0x0001;
const DRAG_THRESHOLD_SQ: i32 = 36;
const POINTER_UNITS: i32 = 100;

pub struct WidgetRegion {
    pub id: String,
    pub rect: [i32; 4],
}

pub fn set_regions(regions: Vec<WidgetRegion>) {
    if let Ok(mut rects) = WIDGET_RECTS.lock() {
        if let Ok(mut ids) = WIDGET_IDS.lock() {
            rects.clear();
            ids.clear();
            for r in regions {
                rects.push(r.rect);
                ids.push(r.id);
            }
        }
    }
}

/// Phase transition pushed to the main webview: a gesture begins ("pending",
/// press swallowed below the drag threshold), escalates past the threshold
/// ("drag"), or ends/aborts ("idle"). Replaces any form of UI polling.
#[derive(Serialize, Clone)]
pub struct DragState {
    pub seq: u32,
    /// "idle" | "pending" | "drag"
    pub phase: String,
    pub id: Option<String>,
    /// Cursor in webview-client physical pixels.
    pub x: i32,
    pub y: i32,
}

// UTF-16 literals compared without allocation: the low-level hook runs this
// check for every mouse event on the whole system, so no String is allowed.
const PROGMAN_CLASS: [u16; 7] = [80, 114, 111, 103, 109, 97, 110]; // Progman
const WORKERW_CLASS: [u16; 7] = [87, 111, 114, 107, 101, 114, 87]; // WorkerW

fn is_desktop_window(hwnd: HWND) -> bool {
    if hwnd.is_invalid() || hwnd.0.is_null() {
        return false;
    }
    let mut buf = [0u16; 32];
    let len = unsafe { GetClassNameW(hwnd, &mut buf) };
    if len <= 0 {
        return false;
    }
    let name = &buf[..len as usize];
    name == PROGMAN_CLASS || name == WORKERW_CLASS
}

fn fg_is_desktop() -> bool {
    is_desktop_window(unsafe { GetForegroundWindow() })
}

fn point_is_on_desktop(screen_pt: POINT) -> bool {
    // Both the active foreground window and the window physically under the cursor
    // must belong to the desktop shell or our pinned wallpaper webview.
    if !fg_is_desktop() {
        return false;
    }

    unsafe {
        let hwnd_under = WindowFromPoint(screen_pt);
        if hwnd_under.is_invalid() || hwnd_under.0.is_null() {
            return false;
        }

        let root = GetAncestor(hwnd_under, GA_ROOT);
        let target = if root.is_invalid() || root.0.is_null() {
            hwnd_under
        } else {
            root
        };

        if is_desktop_window(target) || is_desktop_window(hwnd_under) {
            return true;
        }

        let webview_hwnd = WEBVIEW_HWND.load(Ordering::Relaxed);
        if webview_hwnd != 0
            && (target.0 as isize == webview_hwnd || hwnd_under.0 as isize == webview_hwnd)
        {
            return true;
        }

        false
    }
}

/// Convert a physical screen point to webview-client physical pixels.
fn to_client(screen_pt: POINT) -> POINT {
    let target = HWND(WEBVIEW_HWND.load(Ordering::Relaxed) as *mut _);
    if target.is_invalid() {
        return screen_pt;
    }
    let mut pt = screen_pt;
    unsafe {
        let _ = ScreenToClient(target, &mut pt);
    }
    pt
}

fn region_id() -> Option<String> {
    DRAG_REGION_ID.lock().ok().and_then(|g| g.clone())
}

fn take_region_id() -> Option<String> {
    DRAG_REGION_ID.lock().ok().and_then(|mut g| g.take())
}

/// Push one phase transition straight to the main window's event stream.
fn emit_phase(phase: &str, client_pt: POINT) {
    if let Some(app) = EMITTER.get() {
        let _ = app.emit_to(
            "main",
            "drag-phase",
            DragState {
                seq: DRAG_SEQ.load(Ordering::Relaxed),
                phase: phase.to_string(),
                id: region_id(),
                x: client_pt.x,
                y: client_pt.y,
            },
        );
    }
}

fn hit_region(screen_pt: POINT) -> Option<usize> {
    let Ok(rects) = WIDGET_RECTS.lock() else {
        return None;
    };
    if rects.is_empty() {
        return None;
    }
    let (x, y) = {
        let pt = to_client(screen_pt);
        (pt.x, pt.y)
    };
    rects
        .iter()
        .position(|r| x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3])
}

unsafe fn find_webview_child(parent: HWND) -> Option<HWND> {
    let mut child = FindWindowExW(Some(parent), None, None, None).ok();

    while let Some(c) = child {
        let mut cls = [0u16; 256];
        let len = GetClassNameW(c, &mut cls);
        let cls_name = String::from_utf16_lossy(&cls[..len as usize]);

        if cls_name.contains("Chrome_RenderWidgetHostHWND") {
            return Some(c);
        }

        if let Some(deeper) = find_webview_child(c) {
            return Some(deeper);
        }

        child = FindWindowExW(Some(parent), Some(c), None, None).ok();
    }

    None
}

pub fn install(hwnd: isize) {
    let parent = HWND(hwnd as *mut _);
    unsafe {
        let target = find_webview_child(parent).unwrap_or(parent);
        WEBVIEW_HWND.store(target.0 as isize, Ordering::Relaxed);

        if let Ok(hook) = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), None, 0) {
            HOOK_HANDLE.store(hook.0 as isize, Ordering::Relaxed);
        }
    }

    // Raw-input sink: streams true cursor motion while a press/drag is
    // active, bypassing the pinned GetCursorPos pipeline entirely.
    std::thread::spawn(raw_input_loop);
}

fn raw_input_loop() {
    unsafe {
        let hmodule = GetModuleHandleW(None).unwrap_or_default();
        let hinstance = HINSTANCE(hmodule.0);
        let class_name = w!("NothingWPRawSink");
        let wc = WNDCLASSW {
            lpfnWndProc: Some(raw_wndproc),
            hInstance: hinstance,
            lpszClassName: class_name,
            ..Default::default()
        };
        if RegisterClassW(&wc) == 0 {
            eprintln!("mouse-hook: RegisterClassW failed, native drag streaming disabled");
            return;
        }
        let Ok(hwnd) = CreateWindowExW(
            WINDOW_EX_STYLE::default(),
            class_name,
            class_name,
            WINDOW_STYLE::default(),
            0,
            0,
            0,
            0,
            Some(HWND_MESSAGE),
            None,
            Some(hinstance),
            None,
        ) else {
            eprintln!(
                "mouse-hook: raw-input sink window creation failed, native drag streaming disabled"
            );
            return;
        };
        RAW_SINK_HWND.store(hwnd.0 as isize, Ordering::Relaxed);

        let rid = [RAWINPUTDEVICE {
            usUsagePage: 0x0001,
            usUsage: 0x0002, // generic mouse
            dwFlags: RIDEV_INPUTSINK,
            hwndTarget: hwnd,
        }];
        if RegisterRawInputDevices(
            &rid,
            (std::mem::size_of::<RAWINPUTDEVICE>() * rid.len()) as u32,
        )
        .is_err()
        {
            eprintln!("mouse-hook: RegisterRawInputDevices failed, native drag streaming disabled");
            return;
        }

        // Blocking pump: WM_INPUT is dispatched the instant it arrives, no
        // polling delay. Shutdown arrives as WM_APP -> PostQuitMessage.
        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}

unsafe extern "system" fn raw_wndproc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    if msg == WM_INPUT {
        // Contain any failure here; an FFI-thread unwind aborts the process.
        let _ = std::panic::catch_unwind(|| handle_raw_input(lparam));
    } else if msg == WM_APP {
        PostQuitMessage(0);
    }
    DefWindowProcW(hwnd, msg, wparam, lparam)
}

/// Accumulate true motion from one WM_INPUT event into the virtual cursor.
unsafe fn handle_raw_input(lparam: LPARAM) {
    let state = DRAG_STATE.load(Ordering::SeqCst);
    if state == STATE_IDLE {
        RAW_PREV_ABS_X.store(i32::MIN, Ordering::Relaxed);
        RAW_PREV_ABS_Y.store(i32::MIN, Ordering::Relaxed);
        return;
    }

    // u64 keeps the buffer 8-byte aligned; RAWINPUT requires it.
    let mut buf = [0u64; 12];
    let mut size: u32 = (buf.len() * std::mem::size_of::<u64>()) as u32;
    let got = GetRawInputData(
        HRAWINPUT(lparam.0 as *mut core::ffi::c_void),
        RID_INPUT,
        Some(buf.as_mut_ptr().cast()),
        &mut size,
        std::mem::size_of::<RAWINPUTHEADER>() as u32,
    );
    if got == u32::MAX {
        return;
    }
    let raw = &*(buf.as_ptr() as *const RAWINPUT);
    if raw.header.dwType != 0 {
        // 0 == RIM_TYPEMOUSE; ignore keyboard/other HID devices.
        return;
    }
    let mouse = &raw.data.mouse;

    const MOUSE_MOVE_ABSOLUTE: u16 = 0x0001;
    const MOUSE_VIRTUAL_DESKTOP: u16 = 0x0002;
    let (dx, dy) = if mouse.usFlags.0 & MOUSE_MOVE_ABSOLUTE != 0 {
        // Absolute device (e.g. precision touchpad): derive delta from the
        // previous normalized (0..65535) sample instead of trusting
        // lLastX/Y. Raw absolute input is not measured in screen pixels.
        let px = RAW_PREV_ABS_X.swap(mouse.lLastX, Ordering::Relaxed);
        let py = RAW_PREV_ABS_Y.swap(mouse.lLastY, Ordering::Relaxed);
        if px == i32::MIN || py == i32::MIN {
            (0, 0)
        } else {
            let virtual_desktop = mouse.usFlags.0 & MOUSE_VIRTUAL_DESKTOP != 0;
            let width = if virtual_desktop {
                GetSystemMetrics(SM_CXVIRTUALSCREEN)
            } else {
                GetSystemMetrics(SM_CXSCREEN)
            };
            let height = if virtual_desktop {
                GetSystemMetrics(SM_CYVIRTUALSCREEN)
            } else {
                GetSystemMetrics(SM_CYSCREEN)
            };
            (
                normalized_absolute_delta(mouse.lLastX - px, width),
                normalized_absolute_delta(mouse.lLastY - py, height),
            )
        }
    } else {
        // RAWINPUT deliberately bypasses Control Panel mouse settings. Apply
        // the same documented thresholds, acceleration and speed scaling that
        // Windows applies to regular relative pointer movement.
        let milli = MOUSE_SPEED_MILLI.load(Ordering::Relaxed);
        (
            accelerated_delta(mouse.lLastX) * milli,
            accelerated_delta(mouse.lLastY) * milli,
        )
    };
    if dx == 0 && dy == 0 {
        return;
    }

    RAW_DELTA_X.fetch_add(dx, Ordering::Relaxed);
    RAW_DELTA_Y.fetch_add(dy, Ordering::Relaxed);

    // Virtual cursor position in physical screen coordinates.
    let ax = DRAG_ANCHOR_X.load(Ordering::Relaxed);
    let ay = DRAG_ANCHOR_Y.load(Ordering::Relaxed);
    let tx = ax + RAW_DELTA_X.load(Ordering::Relaxed) / POINTER_UNITS;
    let ty = ay + RAW_DELTA_Y.load(Ordering::Relaxed) / POINTER_UNITS;

    let target = HWND(WEBVIEW_HWND.load(Ordering::Relaxed) as *mut _);
    if target.is_invalid() {
        return;
    }
    let mut client_pt = POINT { x: tx, y: ty };
    let _ = ScreenToClient(target, &mut client_pt);

    // Escalate past the drag threshold. The CAS fails if the button was
    // released concurrently (state left PENDING): drop the event entirely
    // so no phase push or cursor echo can outlive the gesture.
    if state == STATE_PENDING {
        let ddx = tx - ax;
        let ddy = ty - ay;
        if ddx * ddx + ddy * ddy > DRAG_THRESHOLD_SQ {
            match DRAG_STATE.compare_exchange(
                STATE_PENDING,
                STATE_DRAG,
                Ordering::SeqCst,
                Ordering::SeqCst,
            ) {
                Ok(_) => emit_phase("drag", client_pt),
                Err(_) => return,
            }
        }
    }

    // Gesture ended while this event was in flight: stop before touching
    // cursor state, the release already announced "idle" to the UI.
    if DRAG_STATE.load(Ordering::SeqCst) == STATE_IDLE {
        return;
    }

    DRAG_CURSOR_X.store(client_pt.x, Ordering::Relaxed);
    DRAG_CURSOR_Y.store(client_pt.y, Ordering::Relaxed);

    // Stream to the UI and echo the visible arrow at ~140 Hz max; raw mice
    // can fire 1000+ events/s and neither IPC nor syscalls need that rate.
    thread_local! {
        static LAST_PUSH: std::cell::Cell<Option<std::time::Instant>> =
            const { std::cell::Cell::new(None) };
    }
    let now = std::time::Instant::now();
    let due = LAST_PUSH.with(|cell| match cell.get() {
        Some(t) if now.duration_since(t).as_millis() < 7 => false,
        _ => {
            cell.set(Some(now));
            true
        }
    });
    if !due {
        return;
    }

    // Targeted at the main window only; the settings window must not pay
    // for drag traffic it never reads.
    if let Some(app) = EMITTER.get() {
        let _ = app.emit_to(
            "main",
            "drag-cursor",
            CursorPush {
                seq: DRAG_SEQ.load(Ordering::Relaxed),
                x: client_pt.x,
                y: client_pt.y,
            },
        );
    }

    // Cosmetic echo so the visible arrow follows instead of sitting pinned.
    // SetCursorPos feeds neither WH_MOUSE_LL nor raw input: no recursion.
    // Re-checked at the last possible instant so an LBUTTONUP landing
    // mid-event never yanks the real cursor after the gesture ended; the
    // residual instruction-sized window is cosmetic at worst.
    if DRAG_STATE.load(Ordering::SeqCst) == STATE_DRAG {
        let _ = SetCursorPos(tx, ty);
    }
}

fn accelerated_delta(delta: i32) -> i32 {
    let distance = delta.abs();
    let threshold_1 = MOUSE_THRESHOLD_1.load(Ordering::Relaxed);
    let threshold_2 = MOUSE_THRESHOLD_2.load(Ordering::Relaxed);
    let acceleration = MOUSE_ACCELERATION.load(Ordering::Relaxed);

    let mut multiplier = 1;
    if acceleration > 0 && distance > threshold_1 {
        multiplier = 2;
    }
    if acceleration == 2 && distance > threshold_2 {
        multiplier *= 2;
    }
    delta * multiplier
}

fn normalized_absolute_delta(delta: i32, screen_span: i32) -> i32 {
    ((delta as i64 * screen_span as i64 * POINTER_UNITS as i64) / 65_535) as i32
}

pub fn uninstall() {
    // Wake the blocking raw-input pump so its thread exits promptly.
    let sink = RAW_SINK_HWND.swap(0, Ordering::Relaxed);
    if sink != 0 {
        unsafe {
            let _ = PostMessageW(Some(HWND(sink as *mut _)), WM_APP, WPARAM(0), LPARAM(0));
        }
    }
    let h = HOOK_HANDLE.swap(0, Ordering::Relaxed);
    if h != 0 {
        unsafe {
            let _ = UnhookWindowsHookEx(HHOOK(h as *mut _));
        }
    }
}

unsafe fn forward_event(screen_pt: POINT, msg: u32, wparam: WPARAM) {
    let target = HWND(WEBVIEW_HWND.load(Ordering::Relaxed) as *mut _);
    if target.is_invalid() {
        return;
    }
    let mut client_pt = screen_pt;
    let _ = ScreenToClient(target, &mut client_pt);
    let lp =
        LPARAM(((client_pt.y as u32 as u64) << 16 | (client_pt.x as u32 as u64 & 0xFFFF)) as isize);
    let _ = PostMessageW(Some(target), msg, wparam, lp);
}

unsafe extern "system" fn mouse_proc(ncode: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if ncode >= 0 {
        if let Some(&info) = (lparam.0 as *const MSLLHOOKSTRUCT).as_ref() {
            let screen_pt = info.pt;
            let msg = wparam.0 as u32;

            // Widgets are only interactive while the desktop shell is the
            // active surface and no top-level window sits between cursor and desktop.
            if !point_is_on_desktop(screen_pt) {
                // Focus moved elsewhere mid-gesture: drop our state instead
                // of swallowing system input for a dead gesture.
                let prev = DRAG_STATE.swap(STATE_IDLE, Ordering::SeqCst);
                if prev != STATE_IDLE {
                    emit_phase(
                        "idle",
                        POINT {
                            x: DRAG_CURSOR_X.load(Ordering::Relaxed),
                            y: DRAG_CURSOR_Y.load(Ordering::Relaxed),
                        },
                    );
                    take_region_id();
                }
                return CallNextHookEx(None, ncode, wparam, lparam);
            }

            if msg == WM_LBUTTONDOWN {
                if let Some(idx) = hit_region(screen_pt) {
                    DRAG_SEQ.fetch_add(1, Ordering::Relaxed);
                    // Sample Windows' complete pointer configuration once per
                    // gesture. RAWINPUT omits these transformations.
                    unsafe {
                        let mut speed = 10u32;
                        if SystemParametersInfoW(
                            SPI_GETMOUSESPEED,
                            0,
                            Some(&mut speed as *mut u32 as *mut core::ffi::c_void),
                            SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
                        )
                        .is_ok()
                        {
                            MOUSE_SPEED_MILLI
                                .store(speed.clamp(1, 20) as i32 * 10, Ordering::Relaxed);
                        }
                        let mut mouse = [0i32; 3];
                        if SystemParametersInfoW(
                            SPI_GETMOUSE,
                            0,
                            Some(mouse.as_mut_ptr().cast()),
                            SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
                        )
                        .is_ok()
                        {
                            MOUSE_THRESHOLD_1.store(mouse[0].max(0), Ordering::Relaxed);
                            MOUSE_THRESHOLD_2.store(mouse[1].max(0), Ordering::Relaxed);
                            MOUSE_ACCELERATION.store(mouse[2].clamp(0, 2), Ordering::Relaxed);
                        }
                    }
                    RAW_DELTA_X.store(0, Ordering::Relaxed);
                    RAW_DELTA_Y.store(0, Ordering::Relaxed);
                    RAW_PREV_ABS_X.store(i32::MIN, Ordering::Relaxed);
                    RAW_PREV_ABS_Y.store(i32::MIN, Ordering::Relaxed);
                    let widget_id = WIDGET_IDS.lock().ok().and_then(|ids| ids.get(idx).cloned());
                    if let Ok(mut slot) = DRAG_REGION_ID.lock() {
                        *slot = widget_id;
                    }
                    DRAG_ANCHOR_X.store(screen_pt.x, Ordering::Relaxed);
                    DRAG_ANCHOR_Y.store(screen_pt.y, Ordering::Relaxed);
                    let cpt = to_client(screen_pt);
                    DRAG_CURSOR_X.store(cpt.x, Ordering::Relaxed);
                    DRAG_CURSOR_Y.store(cpt.y, Ordering::Relaxed);
                    // Published last: Release-style visibility of every value
                    // above is what the sink thread's acquire relies on.
                    DRAG_STATE.store(STATE_PENDING, Ordering::SeqCst);
                    // Announce the press so the UI starts tracking instantly,
                    // no polling involved.
                    emit_phase("pending", cpt);
                    // Swallowed: if Chromium sees this press its input
                    // machinery pins the physical cursor for the whole hold.
                    return LRESULT(1);
                }
            } else if msg == WM_LBUTTONUP {
                match DRAG_STATE.swap(STATE_IDLE, Ordering::SeqCst) {
                    STATE_PENDING => {
                        // Quick tap: deliver as an instant pair so buttons
                        // inside widgets still work.
                        forward_event(screen_pt, WM_LBUTTONDOWN, WPARAM(MK_LBUTTON));
                        forward_event(screen_pt, WM_LBUTTONUP, WPARAM(0));
                        emit_phase("idle", to_client(screen_pt));
                        take_region_id();
                        return LRESULT(1);
                    }
                    STATE_DRAG => {
                        emit_phase("idle", to_client(screen_pt));
                        take_region_id();
                        return LRESULT(1);
                    }
                    _ => {}
                }
                forward_event(screen_pt, msg, wparam);
            } else if DRAG_STATE.load(Ordering::SeqCst) != STATE_IDLE {
                return LRESULT(1);
            } else if msg == WM_MOUSEMOVE {
                forward_event(screen_pt, msg, wparam);
            }
        }
    }
    CallNextHookEx(None, ncode, wparam, lparam)
}
