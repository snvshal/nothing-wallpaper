# Music Widget

Nothing OS / Hi-Fi CD Deck-style interactive 19x9 widescreen media player widget with smooth spinning metallic CD disc, live album cover thumbnail display, track metadata, and full playback controls.

## DraggableWidget Config

| Property         | Value                             |
| ---------------- | --------------------------------- |
| Size             | 19x9 grid units (304px x 144px)   |
| Border radius    | Standard (`var(--radius-widget)`) |
| Padding          | Default (`p-4` / `16px`)          |
| Initial position | `{ x: 26, y: 11 }` (units)        |

## Layout

Two-column widescreen Hi-Fi deck layout:

```
+-------------------------------------------------------------------+
|  [ LEFT: SPINNING CD ]       |  [ RIGHT: ALBUM ART & CONTROLS ]   |
|                              |                                    |
|         /¯¯¯¯¯¯\             |    +----------+                    |
|        /   ()   \            |    |  ALBUM   |                    |
|       |  ( • )   |           |    |  COVER   | (Square Thumbnail) |
|        \        /            |    +----------+                    |
|         \______/             |                                    |
|                              |    Track Title (font-body)         |
|   (Smooth rotating CD disc   |    Artist / Channel (font-dot)     |
|    spins when playing)       |                                    |
|                              |    [ ⏮ ]    [ ⏯ ]    [ ⏭ ]         |
+-------------------------------------------------------------------+
```

## Elements

### Standalone Spinning CD with Stylus (Left Column)

| Property      | Value                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| Disc Graphic  | Theme-adaptive anisotropic metallic disc (`--theme-cd-disc`, `--theme-cd-border`)        |
| Spin Behavior | Smooth CSS continuous rotation (`animate-[spin_6s_linear_infinite]`)                     |
| Center Hub    | Theme-adaptive hub (`--theme-cd-hub`) with theme-aware center hole (`bg-widget-surface`) |
| Stylus Needle | Fixed Nothing Widget Red (`#D71920`) capsule needle angled at 30°                        |

### Stacked Deck & Playback Controls (Right Column)

| Property    | Value                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Album Cover | Real square album artwork stream with 0 radius (or Nothing NDot `(•)` fallback)                |
| Track Title | Song or video title in `font-body` (Google Sans Code)                                          |
| Artist Name | Artist / Channel name in `font-dot` (Doto)                                                     |
| Prev Button | Lightly merged double arrow seeking -5s (`invoke("seek_media", { deltaSeconds: -5 })`)         |
| Play/Pause  | Single-path vector morphing transition (`invoke("toggle_media_playback")`)                     |
| Next Button | Lightly merged double arrow seeking +5s (`invoke("seek_media", { deltaSeconds: 5 })`)          |
| Micro-UI    | Controls use theme tokens (`text-theme-primary hover:text-nothing-widget-red active:scale-90`) |

## Behaviour

| Property        | Value                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| Update interval | 800ms UI poll; 600ms dedicated background monitor thread                     |
| Data source     | Windows GSMTC Media Controls + WinRT Thumbnail Streams (100% safe Rust)      |
| Performance     | Non-blocking in-memory Mutex cache (`get_media_status` executes in 0.000ms)  |
| Supported Apps  | Spotify, YouTube (Chrome/Edge/Brave/Firefox), Apple Music, VLC, Media Player |
| Fallback        | Interactive mock state in plain-browser preview                              |
