# 📅 任务清单 (TodoList)

> 轻量级桌面日历与任务管理工具，基于 Electron 构建。农历节气、云同步、MCP 对接、Excel 导出，开箱即用。

[![Release](https://img.shields.io/github/v/release/wsccddyk/todo-list)](https://github.com/wsccddyk/todo-list/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/wsccddyk/todo-list/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

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
- **月视图日历** — 7 列网格，支持周一 / 周日起始切换
- **农历 & 节气 & 节假日** — 全月显示（含跨月日期），法定节假日标注含调休
- **年月快速选择** — 双击顶部年月标题，滚动快速跳转任意年月
- **滚轮按周翻页** — 鼠标滚轮逐周滚动，精准定位
- **每月1号月份标识** — 跨月日期自动标注月份
- **3~8 周自定义行数** — 根据窗口大小灵活调整
- **周数列** — 可选显示 ISO 周数

### ✅ 任务管理
- **添加 / 完成 / 编辑 / 删除** — 双击日期格即可操作
- **浮窗编辑** — 点击日期弹出编辑浮窗，支持标题、任务列表、颜色选择
- **日期颜色标记** — 7 种预设背景色标记重要日期
- **右键菜单** — 快速编辑、颜色设置、清空任务

### 🎨 外观定制
- **5 种深色主题** — 深蓝夜空 / 纯黑 / 深林绿 / 紫色魅惑 / 深海蓝
- **透明度调节** — 30% ~ 100% 背景透明度滑块
- **自定义颜色** — 背景色、字体色独立可调
- **字体大小** — 10px ~ 18px 可调

### 🖥️ 窗口模式
- **桌面挂件模式** — 固定窗口不可拖动，像桌面小部件常驻前台
- **窗口大小可调** — 拖拽右下角调整尺寸
- **置顶显示** — 可选始终在最前
- **开机自启** — 支持系统启动时自动运行，路径变更自动同步

### ☁️ 云同步
- **WebDAV / 自建服务器** — 支持云端同步任务数据
- **一键同步** — 右上角 ☁ 按钮快速操作

### 🤖 MCP Server（AI 对接）
- 内置 MCP Server，AI 助手可直接读写任务清单
- 支持工具：`list_tasks` / `add_task` / `complete_task` / `delete_task` / `export_all_tasks` / `batch_add_tasks`
- 设置 → 高级 → 配置 MCP，一键生成连接器配置代码

### 📊 数据管理
- **JSON 导出 / 导入** — 备份与恢复
- **Excel 导出** — 支持 xlsx 格式导出任务数据
- **旧版数据库导入** — 兼容 v3 SQLite 数据格式

### 🌍 国际化
- **中文 / 英文** 双语切换（设置 → Language）
- 全界面翻译：菜单、弹窗、提示、日志等均适配

### 📦 自动更新
- 启动后自动检查 GitHub 新版本
- 设置中可开关自动检查

---

## ⌨️ 快捷操作

| 快捷键 | 功能 |
|--------|------|
| `←` `→` | 翻月 |
| 鼠标滚轮 | 按周翻页 |
| 双击年月标题 | 打开年月快速选择器 |
| `ESC` | 关闭浮窗 / 关闭弹窗 |
| `Enter` | 添加任务 |

---

## 🤖 MCP Server 配置

任务清单内置 MCP Server，可让 AI 助手（如 WorkBuddy）直接操作你的任务数据。

**配置方法：** 设置 → 高级 → 配置 MCP → 复制 JSON 配置

**可用工具：**

| 工具 | 说明 |
|------|------|
| `list_tasks` | 查看指定日期的任务列表 |
| `add_task` | 给指定日期添加任务 |
| `complete_task` | 标记任务为已完成 |
| `delete_task` | 删除指定日期的任务 |
| `export_all_tasks` | 导出全部任务数据（JSON） |
| `batch_add_tasks` | 批量添加任务 |

---

## 📁 文件结构

```
todolist/
├── index.html          # 主页面
├── style.css           # 样式表
├── app.js              # 应用主逻辑（渲染、i18n、事件处理）
├── main.js             # Electron 主进程（窗口管理、云同步、自启动）
├── preload.js          # Electron 预加载脚本（安全桥接）
├── mcp-server/         # MCP Server（AI 对接）
│   ├── index.js        # MCP Server 入口
│   └── package.json
├── package.json        # 项目配置 & 构建脚本
└── icon.ico            # 应用图标
```

## 💾 数据存储

任务数据存储在 `%AppData%/calendar-list/calendar-tasks.json`（JSON 格式），无需数据库。

---

## 🚀 安装使用

### 下载安装包

从 [GitHub Releases](https://github.com/wsccddyk/todo-list/releases) 下载最新版。**解压即用，无需安装。**

### 从源码构建

```bash
git clone https://github.com/wsccddyk/todo-list.git
cd todo-list
npm install
npm start          # 开发模式
npm run build      # 构建打包
```

---

## 📋 操作指南

| 操作 | 方法 |
|------|------|
| 添加任务 | **双击**日期格 → 输入文字 → 按 Enter |
| 标记完成 | 勾选任务前的复选框 |
| 编辑任务 | 直接点击任务文字 |
| 删除任务 | 鼠标悬停 → 点击 ✕ |
| 跳转年月 | **双击**顶部年月标题 |
| 设日期颜色 | 浮窗底部颜色圆点选择 |
| 桌面挂件 | 右上角「📌 桌面模式」按钮 |
| 云同步 | 右上角 ☁ 按钮 |
| 翻月 | 点击 ◀ ▶ 或鼠标滚轮 |
| 回到今天 | 点击导航栏「今」字 |

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Electron](https://www.electronjs.org/) v33.x | 桌面应用框架 |
| Vanilla JS | 前端逻辑（无框架依赖） |
| CSS3 | 样式 & 动画 |
| XLSX.js | Excel 导出 |
| sql.js | 旧版数据导入兼容 |

---

## 📝 最近更新

查看完整更新日志：应用内 **⚙️ → 关于 → Changelog** 或 [Releases](https://github.com/wsccddyk/todo-list/releases)。

### v9.9.9 (2026-04-29)
- 🌙 农历/节日/节气全月显示（非当月日期也显示）
- 📅 年月快速选择器（双击标题弹出）
- 🔧 开机自启路径自动同步

### v9.9.8 (2026-04-29)
- 🔗 新增「配置 MCP」功能，一键生成 MCP 连接器配置代码
- 📦 内置 MCP Server，支持 AI 直接读写任务清单

### v9.9.7 (2026-04-29)
- 🔄 滚轮按周翻页
- 🏷️ 每月1号月份标识

---

## 📄 License

[MIT](./LICENSE)

---

<div align="center">

Made with ❤️ by <a href="https://github.com/wsccddyk">爆肝</a>

</div>
