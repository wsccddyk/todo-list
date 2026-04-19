# 📅 TodoList - Desktop Calendar & Task Manager

> A lightweight desktop calendar and task management tool built on Electron. Supports bilingual (Chinese/English) UI, dark themes, lunar calendar display, public IP detection, server latency monitoring, cloud sync, and more.

[![Release](https://img.shields.io/github/v/release/wsccddyk/todo-list)](https://github.com/wsccddyk/todo-list/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/wsccddyk/todo-list/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

![TodoList Screenshot](docs/screenshot.png)

---

## ✨ Features

### 🗓️ Calendar View
- **Monthly View** — 7-column grid layout with **Monday / Sunday** start options
- **Lunar Calendar & Solar Terms & Holidays** — Auto-calculated lunar dates with official holiday annotations (including workday adjustments)
- **Week Numbers** — Optional ISO week number column
- **3~8 Customizable Rows** — Flexible row count based on window size

### ✅ Task Management
- **Add/Complete/Edit/Delete Tasks** — Single-click on any date cell
- **Floating Editor Popup** — Lightweight popup editor for title, task list, and color selection
- **Date Color Tags** — 7 preset background colors to mark important dates
- **Right-Click Context Menu** — Quick edit, color setting, clear tasks

### 🌐 Network Tools
- **Public IP Detection** — One-click to get public IP address and geo-location info (city, ISP)
- **Server Latency Monitor** — Real-time connection latency to **Gitee** and **GitHub** (millisecond precision)
  - 🟢 **< 2000ms** — Green, shows exact ms value
  - 🟡 **≥ 2000ms** — Yellow, shows "2000ms+"
  - 🔴 **Timeout / Unreachable** — Red, shows "Timeout"
- **Multi-API Fallback** — ip-api.com → ipinfo.io → ifconfig.me, domestic-friendly priority
- **Proxy Aware** — Auto-detects system proxy, supports VPN/TUN environments

### 🎨 Appearance Customization
- **5 Dark Themes** — Midnight Blue / Pure Black / Forest Green / Purple Charm / Deep Ocean Blue
- **Opacity Control** — 30% ~ 100% background transparency slider
- **Custom Colors** — Independent background and font color pickers
- **Font Size** — Adjustable from 10px to 18px

### 🖥️ Window Modes
- **Desktop Widget Mode** — Fixed non-draggable window, stays always-on-top like a desktop gadget
- **Resizable Window** — Drag bottom-right corner to resize
- **Always on Top** — Optional pin-to-top behavior
- **Auto Start on Boot** — System startup launch support

### 🔄 Cloud Sync & Auto Update
- **Gitee Cloud Sync** — Data backup to Gitee repository for cross-device sync
- **Auto Updates** — Based on Gitee Releases, direct connection from China without VPN
- **Update Source Switching** — Multiple mirror sources available
- **Auto Timeout Disconnect** — 25-second timeout mechanism prevents infinite waiting
- **Connectivity Pre-check** — Tests network reachability before update download
- **Real-time Status Feedback** — Shows "Waiting X seconds" instead of silent waiting

### 🌍 Internationalization (i18n)
- **Chinese / English** bilingual toggle (Settings → Language)
- Full UI translation: menus, dialogs, update prompts, log system, etc.

### 📊 Logs & Data
- **Built-in Log System** — Records all operations with search & date filtering
- **Data Export/Import** — JSON format backup and restore
- **Excel Export** — xlsx format export for task data

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `←` `→` | Previous / Next month |
| Mouse Scroll | Previous / Next month |
| `ESC` | Close floating popup |
| `Enter` | Add task |

---

## 🔧 HTTP API

Built-in HTTP API server (port `7789`) for external programs or AI agents to read/write data.

### Endpoints

| Method | Path | Description | Body |
|--------|------|-------------|------|
| GET | `/api/health` | Health check | - |
| GET | `/api/tasks` | Get all tasks | - |
| GET | `/api/tasks/:date` | Get tasks for a date | - |
| POST | `/api/tasks` | Add a task | `{year, month, day, text}` |
| DELETE | `/api/tasks/:id` | Delete a task | - |
| GET | `/api/settings` | Get settings | - |
| PUT | `/api/settings` | Update settings | `{...}` |
| GET | `/api/export` | Export all data | - |
| GET | `/api/today` | Get today's date | - |

### Usage Examples

```bash
# Health check
curl http://localhost:7789/api/health

# Add a task
curl -X POST http://localhost:7789/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"month":4,"day":19,"text":"Team meeting"}'

# Get tasks for a specific date
curl http://localhost:7789/api/tasks/2026-4-19

# Export all data
curl http://localhost:7789/api/export
```

### JavaScript API (Browser Console / DevTools)

```javascript
// Get all tasks
CalendarApp.getTasks()

// Get / Add / Remove tasks
CalendarApp.getTasksForDate(2026, 4, 19)
CalendarApp.addTask(2026, 4, 19, 'Team meeting')
CalendarApp.removeTask(2026, 4, 19, taskId)

// Date colors
CalendarApp.getDayColor(2026, 4, 19)
CalendarApp.setDayColor(2026, 4, 19, 'rgba(74,158,255,0.15)')

// Settings
CalendarApp.getSettings()
CalendarApp.setSettings({ opacity: 70 })

// Navigation
CalendarApp.goTo(2026, 3)   // Jump to year-month (month 0-11)
CalendarApp.goToday()
```

---

## 📁 Project Structure

```
calendar-app/
├── index.html      # Main page
├── style.css       # Stylesheet
├── app.js          # App logic (rendering, i18n, event handling)
├── main.js         # Electron main process (window mgmt, auto-update, API, network tools)
├── preload.js      # Electron preload script (secure bridge)
├── package.json    # Project config & build scripts
└── icon.ico        # Application icon
```

## 💾 Data Storage

Data is stored at `%AppData%/calendar-list/calendar-tasks.json` in JSON format. No database required.

---

## 🚀 Installation

### Option 1: Download Installer

Download the latest installer from [GitHub Releases](https://github.com/wsccddyk/todo-list/releases) or [Gitee Releases](https://gitee.com/yansusu999/todo-list/releases). **Ready to use out-of-the-box.**

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/wsccddyk/todo-list.git
cd todo-list

# Install dependencies
npm install

# Run in dev mode
npm start

# Build for production
npm run build
```

---

## 📋 User Guide

| Operation | How To |
|-----------|--------|
| Add Task | Click date cell → Type text → Press Enter |
| Mark Complete | Check the checkbox before the task |
| Edit Task | Click directly on the task text |
| Delete Task | Hover → Click ✕ |
| Set Date Color | Pick a color dot at the bottom of floating popup |
| Desktop Widget | Click 「📌 Desktop Mode」button (top-right) |
| Resize Window | Drag bottom-right corner ↘ |
| Opacity | ⚙️ → Display → Background Opacity slider |
| Change Colors | ⚙️ → Appearance → Color Pickers |
| Change Month | Click ◀ ▶ or use mouse scroll |
| Go to Today | Click 「今」(Today) in nav bar |
| Open Settings | Click ⚙️ button (top-right) |
| Right-Click Menu | Right-click any date cell |
| Export/Import Data | ⚙️ → Data → Export JSON / Import JSON |
| Switch Language | ⚙️ → Language → 中文 / English |
| Check for Updates | ⚙️ → About → 「🔄 Check for Updates」 |
| Detect IP | Click 「🌐 Detect IP」in Settings panel |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Electron](https://www.electronjs.org/) | Desktop framework (v33.x) |
| [electron-updater](https://github.com/nicedoc/electron-updater) | Auto-updater |
| Vanilla JS | Frontend logic (zero framework dependency) |
| CSS3 | Styling & animations |
| Node.js HTTP Server | Built-in API server |
| sql.js | Local database |

---

## 📝 Changelog

Full changelog: **⚙️ → About → Changelog** or visit [Releases](https://github.com/wsccddyk/todo-list/releases).

### v9.9.3 (2026-04-19)
- ✅ New: One-click public IP detection (multi-API fallback, China-friendly)
- ✅ New: Real-time Gitee / GitHub server latency display
- ✅ Fixed: IP detection failure without VPN
- ✅ Improved: Update check UX — show wait time, server switching doesn't interrupt operation

### v9.8.1 (2026-04-18)
- ✅ Fixed: Calendar weekday/month headers showing Chinese in English mode
- ✅ New: Update source selector (GitHub / ghproxy / ghfast mirrors)
- ✅ New: System proxy support for VPN/TUN access to GitHub
- ✅ New: 25-second auto timeout disconnect mechanism

---

## 📄 License

[MIT](./LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/wsccddyk">Baogan</a> · 
  <a href="https://gitee.com/yansusu999">Gitee</a>
</p>

---

<div align="center">

## English | [中文](README.md)

</div>
