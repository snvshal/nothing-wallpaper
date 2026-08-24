/**
 * True when the frontend runs inside the Tauri WebView (desktop app).
 * False in a plain browser (`bun run dev`), where every @tauri-apps API
 * call throws because `window.__TAURI_INTERNALS__` does not exist —
 * guard all IPC/event/store access with this.
 */
export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
