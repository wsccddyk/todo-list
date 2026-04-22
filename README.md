# 📅 任务清单 (TodoList)

> 一款轻量级桌面日历与任务管理工具，基于 Electron 构建。支持中英文双语、深色主题、农历显示、公网 IP 检测、服务器延迟监控、云同步等丰富功能。

[![Release](https://img.shields.io/github/v/release/wsccddyk/todo-list)](https://github.com/wsccddyk/todo-list/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/wsccddyk/todo-list/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## 📋 更新日志

查看各版本更新内容 → [CHANGELOG.md](./CHANGELOG.md) | [Changelog (EN)](./CHANGELOG_EN.md)

## 🖼️ 界面预览

<table>
<tr>
<td><img src="docs/preview-calendar.png" alt="主界面 - 日历视图" width="100%"/><br/><b>📅 主界面</b> — 月视图日历 + 任务管理 + 农历显示</td>
<td><img src="docs/preview-settings.png" alt="设置面板" width="100%"/><br/><b>⚙️ 设置面板</b> — 主题 / 外观 / 显示选项全面可调</td>
</tr>
</table>

---

## ✨ 功能特性

### 🗓️ 日历视图
- **月视图日历** — 7 列网格布局，支持 **周一 / 周日** 起始切换
- **农历 & 节气 & 节假日** — 自动计算农历日期，支持法定节假日标注（含调休）
- **周数列** — 可选显示 ISO 周数
- **3~8 周自定义行数** — 根据窗口大小灵活调整

### ✅ 任务管理
- **添加/完成/编辑/删除** 任务 — 单击日期格即可操作
- **浮窗编辑** — 点击日期弹出轻量编辑浮窗，支持标题、任务列表、颜色选择
- **日期颜色标记** — 7 种预设背景色标记重要日期
- **右键菜单** — 快速编辑、颜色设置、清空任务

### 🌐 网络工具
- **公网 IP 检测** — 一键获取当前公网 IP 地址及地理位置信息（城市、运营商）
- **服务器延迟监控** — 实时检测 **Gitee** 和 **GitHub** 的连接延迟（毫秒级）
  - 🟢 **< 2000ms** — 绿色显示具体延迟
  - 🟡 **≥ 2000ms** — 黄色显示 "2000ms+"
  - 🔴 **超时/不可达** — 红色显示 "超时"
- **多 API 自动切换** — ip-api.com → ipinfo.io → ifconfig.me，国内直连优先
- **代理感知** — 自动检测系统代理，支持 VPN/TUN 环境

### 🎨 外观定制
- **5 种深色主题** — 深蓝夜空 / 纯黑 / 深林绿 / 紫色魅惑 / 深海蓝
- **透明度调节** — 30% ~ 100% 背景透明度滑块
- **自定义颜色** — 背景色、字体色独立可调
- **字体大小** — 10px ~ 18px 可调

### 🖥️ 窗口模式
- **桌面挂件模式** — 固定窗口不可拖动，像桌面小部件一样常驻前台
- **窗口大小可调** — 拖拽右下角调整尺寸
- **置顶显示** — 可选始终在最前
- **开机自启** — 支持系统启动时自动运行

### 🔄 云同步 & 自动更新
- **Gitee 云同步** — 数据备份到 Gitee 仓库，跨设备同步
- **自动更新** — 基于 Gitee Release，国内直连无需翻墙
- **更新源切换** — 支持多个更新镜像源
- **超时自动断开** — 25 秒超时机制，避免无限等待
- **连通性预检** — 更新前先检测网络是否可达
- **实时状态反馈** — 显示"已等待 X 秒"，不再盲目等待

### 🌍 国际化
- **中文 / 英文** 双语切换（设置 → Language）
- 全界面翻译：菜单、弹窗、更新提示、日志等均适配

### 📊 运行日志 & 数据
- **内置日志系统** — 记录所有操作，支持搜索和日期筛选
- **数据导出/导入** — JSON 格式备份与恢复
- **Excel 导出** — 支持 xlsx 格式导出任务数据

---

## ⌨️ 快捷操作

| 快捷键 | 功能 |
|--------|------|
| `←` `→` | 翻月 |
| 鼠标滚轮 | 翻月 |
| `ESC` | 关闭浮窗 |
| `Enter` | 添加任务 |

---

## 🔧 HTTP API 接口

内置 HTTP API 服务器（端口 `7789`），可供外部程序或 AI 读写数据。

### API 端点

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| GET | `/api/health` | 健康检查 | - |
| GET | `/api/tasks` | 获取所有任务 | - |
| GET | `/api/tasks/:date` | 获取某天任务 | - |
| POST | `/api/tasks` | 添加任务 | `{year, month, day, text}` |
| DELETE | `/api/tasks/:id` | 删除任务 | - |
| GET | `/api/settings` | 获取设置 | - |
| PUT | `/api/settings` | 更新设置 | `{...}` |
| GET | `/api/export` | 导出全部数据 | - |
| GET | `/api/today` | 获取今天日期 | - |

### 使用示例

```bash
# 健康检查
curl http://localhost:7789/api/health

# 添加任务
curl -X POST http://localhost:7789/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"month":4,"day":19,"text":"下午开会"}'

# 获取某天任务
curl http://localhost:7789/api/tasks/2026-4-19

# 导出所有数据
curl http://localhost:7789/api/export
```

### JavaScript API（浏览器控制台）

```javascript
// 获取所有任务
CalendarApp.getTasks()

// 获取/添加/删除任务
CalendarApp.getTasksForDate(2026, 4, 19)
CalendarApp.addTask(2026, 4, 19, '开会讨论')
CalendarApp.removeTask(2026, 4, 19, taskId)

// 日期颜色
CalendarApp.getDayColor(2026, 4, 19)
CalendarApp.setDayColor(2026, 4, 19, 'rgba(74,158,255,0.15)')

// 设置操作
CalendarApp.getSettings()
CalendarApp.setSettings({ opacity: 70 })

// 导航
CalendarApp.goTo(2026, 3)   // 跳转年月（月份 0-11）
CalendarApp.goToday()
```

---

## 📁 文件结构

```
calendar-app/
├── index.html      # 主页面
├── style.css       # 样式表
├── app.js          # 应用主逻辑（渲染、i18n、事件处理）
├── main.js         # Electron 主进程（窗口管理、自动更新、API 服务、网络检测）
├── preload.js      # Electron 预加载脚本（安全桥接）
├── package.json    # 项目配置 & 构建脚本
└── icon.ico        # 应用图标
```

## 💾 数据存储

桌面版数据存储在 `%AppData%/calendar-list/calendar-tasks.json`（JSON 格式），无需数据库。

---

## 🚀 安装使用

### 方式一：下载安装包

从 [GitHub Releases](https://github.com/wsccddyk/todo-list/releases) 或 [Gitee Releases](https://gitee.com/yansusu999/todo-list/releases) 下载最新版安装包。**即开即用。**

### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/wsccddyk/todo-list.git
cd todo-list

# 安装依赖
npm install

# 开发模式运行
npm start

# 构建打包
npm run build
```

---

## 📋 操作指南

| 操作 | 方法 |
|------|------|
| 添加任务 | 单击日期格 → 输入文字 → 按 Enter |
| 标记完成 | 勾选任务前的复选框 |
| 编辑任务 | 直接点击任务文字 |
| 删除任务 | 鼠标悬停 → 点击 ✕ |
| 设日期颜色 | 浮窗底部颜色圆点选择 |
| 桌面挂件 | 右上角「📌 桌面模式」按钮 |
| 调整大小 | 拖拽窗口右下角 ↘ |
| 透明度 | ⚙️ → 显示 → 背景透明度滑块 |
| 更改颜色 | ⚙️ → 外观 → 颜色选择器 |
| 翻月 | 点击 ◀ ▶ 或鼠标滚轮 |
| 回到今天 | 点击导航栏「今」字 |
| 打开设置 | 右上角 ⚙️ 按钮 |
| 右键菜单 | 右键点击任意日期格 |
| 导出/导入 | ⚙️ → 数据 → 导出 JSON / 导入 JSON |
| 切换语言 | ⚙️ → Language → 中文 / English |
| 检查更新 | ⚙️ → 关于 → 「🔄 立即检查更新」 |
| 检测 IP | 设置面板中点击「🌐 检测 IP」按钮 |

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Electron](https://www.electronjs.org/) | 桌面应用框架 (v33.x) |
| [electron-updater](https://github.com/nicedoc/electron-updater) | 自动更新 |
| Vanilla JS | 前端逻辑（无框架依赖） |
| CSS3 | 样式 & 动画 |
| Node.js HTTP Server | 内置 API 服务 |
| sql.js | 本地数据库 |

---

## 📝 更新日志

查看完整更新日志：应用内 **⚙️ → 关于 → Changelog** 或访问 [Releases](https://github.com/wsccddyk/todo-list/releases)。

### v9.9.3 (2026-04-19)
- ✅ 新增公网 IP 一键检测功能（多 API 自动切换，国内友好）
- ✅ 新增 Gitee / GitHub 服务器延迟实时显示
- ✅ 修复无 VPN 时 IP 检测失败的问题
- ✅ 优化更新检查体验：显示等待时间、切换服务器不中断操作

### v9.8.1 (2026-04-18)
- ✅ 修复英文模式下日历头星期名和月份仍显示中文的问题
- ✅ 新增更新源选择器（GitHub 官方 / ghproxy 镜像 / ghfast 镜像）
- ✅ 主进程启用系统代理模式，支持 VPN/TUN 访问 GitHub
- ✅ 新增 25 秒超时自动断开机制

---

## 📄 License

[MIT](./LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/wsccddyk">爆肝</a> · 
  <a href="https://gitee.com/yansusu999">Gitee</a>
</p>

---

<div align="center">

## [English](README_EN.md) | 中文

</div>
