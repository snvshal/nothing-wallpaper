use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};

use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Gdi::ScreenToClient;
use windows::Win32::UI::WindowsAndMessaging::*;

static WEBVIEW_HWND: AtomicIsize = AtomicIsize::new(0);
static HOOK_HANDLE: AtomicIsize = AtomicIsize::new(0);
static DRAGGING: AtomicBool = AtomicBool::new(false);

const WM_LBUTTONDOWN: u32 = 0x0201;
const WM_LBUTTONUP: u32 = 0x0202;

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
}

pub fn uninstall() {
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

            if msg == WM_LBUTTONDOWN {
                let fg = GetForegroundWindow();
                let mut cls = [0u16; 256];
                let len = GetClassNameW(fg, &mut cls);
                let cls_name = String::from_utf16_lossy(&cls[..len as usize]);

                if cls_name == "Progman" || cls_name == "WorkerW" {
                    DRAGGING.store(true, Ordering::Relaxed);
                    forward_event(screen_pt, msg, wparam);
                }
            } else if msg == WM_LBUTTONUP {
                DRAGGING.store(false, Ordering::Relaxed);
                forward_event(screen_pt, msg, wparam);
            } else if DRAGGING.load(Ordering::Relaxed) {
                forward_event(screen_pt, msg, wparam);
            } else {
                let fg = GetForegroundWindow();
                let mut cls = [0u16; 256];
                let len = GetClassNameW(fg, &mut cls);
                let cls_name = String::from_utf16_lossy(&cls[..len as usize]);

                if cls_name == "Progman" || cls_name == "WorkerW" {
                    forward_event(screen_pt, msg, wparam);
                }
            }
        }
    }
    CallNextHookEx(None, ncode, wparam, lparam)
}
