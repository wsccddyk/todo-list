# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [9.9.8] - 2026-04-20

### Bug Fixes

- **init() Crash Fix** — `getVersionSync()` was defined inside `checkAndShowChangelog()` (nested scope), calling it from `init()` caused `ReferenceError`, breaking entire initialization and preventing calendar rendering
- **Fix**: Moved `getVersionSync()` to **top-level function scope**, added try-catch protection around the call in `init()`
- **Lesson**: Electron preload API may not be fully ready before DOMContentLoaded, all sync calls must be wrapped in try-catch

---

## [9.9.7] - 2026-04-20

### Bug Fixes

- **"unknown" Version Display Fix** — Previous fix removed hardcoded version but async IPC timing caused fallback to show "unknown"
- **Added Sync Version Retrieval** — New `getVersionSync()` + `get-app-version-sync` IPC for immediate synchronous version read at `init()` startup
- **Version fetch priority**: sync IPC → async IPC → cached value → never shows "unknown"

---

## [9.9.6] - 2026-04-19

### Bug Fixes

- **Hardcoded Version Fix** — `getCurrentVersion()` default value changed from hardcoded `'9.9.3'` to dynamic read; "About" panel version in `index.html` now renders dynamically via `<span id="about-version-value">`. Version number now follows the package, no longer showing old version after updates.

---

## [9.9.5] - 2026-04-19

### Bug Fixes

- **Version Compare Dialog Logic Fix** — When server version is newer than local version, correctly shows "🆕 New Version Available" with update button instead of incorrectly showing "Already Up to Date"
- **App Name Localization** — App name automatically switches based on language: "任务清单" for Chinese, "TodoList" for English; registry startup entry updates on language change

### Improvements

- Added `compareVersions()` function for semantic version comparison
- Language switching now syncs app name and startup registry entry to main process

---

## [9.9.4] - 2026-04-19

### Bug Fixes

- **Update Check Dialog** — Replaced the outdated "No update found" dialog with a **version comparison dialog** (showing local vs server version) for clearer status communication
- **Auto Start Fix** — Fixed the registry write failure issue:
  - Added `name` parameter so registry key is "任务清单" instead of default `electron.app.Electron`
  - Auto-cleanup of legacy incorrect registry entries at startup
  - Added registry verification logging after writing
- **404/403 Error Handling** — Server 404/403 responses now treated as "no update available" instead of error, avoiding misleading messages

---

## [9.9.3] - 2026-04-19

### Features

- **Update Check Optimization**: Switching update servers now aborts previous check automatically; added countdown display showing "waiting Xs"

### Bug Fixes

- Fixed undeclared variables in update check (`_checkingForUpdate`, `_currentUpdateCheckId`, `__updateTimer`)

---
