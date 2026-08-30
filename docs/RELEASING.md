# Releasing Guide

Step-by-step guide for cutting new releases of XN Wallpaper for Windows.

## 1. Version Synchronization (Strict Requirement)

Before tagging a new release, **the version number must match across all three configuration files**:

| File                        | Field       | Example   |
| :-------------------------- | :---------- | :-------- |
| `package.json`              | `"version"` | `"0.1.1"` |
| `src-tauri/Cargo.toml`      | `version`   | `"0.1.1"` |
| `src-tauri/tauri.conf.json` | `"version"` | `"0.1.1"` |

> [!IMPORTANT]
> **Why this is strictly required:**
>
> 1. **GitHub Release Collision**: In `.github/workflows/release.yml`, `tauri-action` reads `__VERSION__` directly from `src-tauri/tauri.conf.json`. If you push tag `v0.1.2` but `tauri.conf.json` still says `0.1.1`, the workflow will attempt to publish over the old release and fail.
> 2. **Updater Infinite Loop**: The Tauri in-app updater compares the version compiled into the running binary against `latest.json`. If the binary still reports the older version, users will be caught in an endless loop of update prompts.
> 3. **Windows Installer Upgrade**: Windows NSIS/MSI installers use the embedded product version to perform in-place upgrades. Identical version numbers will cause Windows to reject the update.

## 2. Release Checklist

1. **Verify code quality**:
   ```sh
   bun run fmt && bun run check && bun run build
   bun run fmt:rs && bun run check:rs
   ```
2. **Bump version in all 3 files** (`package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`).
3. **Commit the bump**:
   ```sh
   git add package.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json
   git commit -m "chore(release): bump version to X.Y.Z"
   git push origin main
   ```
4. **Create an annotated tag and push**:
   ```sh
   git tag -a vX.Y.Z -m "vX.Y.Z: release summary"
   git push origin vX.Y.Z
   ```

## 3. Semantic Versioning Rules

- **Patch release (`0.1.1` -> `0.1.2`)**: Bug fixes, styling tweaks, minor optimizations.
- **Minor release (`0.1.1` -> `0.2.0`)**: New widgets, layout changes, major new features.
- **Major release (`0.1.1` -> `1.0.0`)**: Stable production baseline.

## 4. Post-Release Verification

After pushing the tag:

1. Check **GitHub Actions** (`.github/workflows/release.yml`) until the build succeeds.
2. Verify the new release and installer assets appear under GitHub **Releases**.
3. Verify the Cloudflare Worker endpoints:
   - Installer redirect: `https://nothing-wallpaper.snvshal.workers.dev/download`
   - Tauri update manifest: `https://nothing-wallpaper.snvshal.workers.dev/latest.json`
