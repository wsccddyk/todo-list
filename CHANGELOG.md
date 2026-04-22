# 更新日志 (Changelog)

所有 notable changes 都会记录在此。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [9.9.9] - 2026-04-20

### 🐛 Bug 修复

- **启动速度恢复秒开** — 旧自启条目清理（注册表 `reg query/delete`）从同步阻塞改为 `setImmediate` 异步执行，不再阻塞主线程和窗口创建
- **首次检查更新不再秒返回** — 修复竞态条件：启动自动检查（3s后）的残留事件（`update-not-available`/`error`）被错误当作手动检查结果弹出。手动检查期间屏蔽 `handleUpdateEvent` 终态事件，由 IPC 回调自行处理
- **GitHub 更新源无代理时立即提示** — 国内直连 GitHub（ping 通但 HTTPS 被干扰），之前会等 15-20 秒超时才报错。现在检测到 GitHub + 无代理时直接返回明确提示建议切换 Gitee 或开启代理
- **连通性预检匹配所选源** — 预检 URL 现在根据当前选中的更新源（Gitee/GitHub）动态选择，而非固定检测 Gitee
- **缩短总超时时间** — 预检 5s + electron-updater 检查 12s = 最长约 17s（原 5s+20~30s）

### ⚙️ 改进

- 新增 `_currentUpdateSource` 变量跟踪当前选中源，新增 `_manualCheckStartTime` 辅助调试

---

## [9.9.8] - 2026-04-20

### 🐛 Bug 修复

- **init() 崩溃修复** — `getVersionSync()` 函数定义在 `checkAndShowChangelog()` 内部（嵌套作用域），但在 `init()` 中调用导致 `ReferenceError`，整个初始化中断、日历无法渲染
- **修复**：将 `getVersionSync()` 提升到**顶层函数作用域**，`init()` 调用时增加 try-catch 保护
- **教训**：Electron preload API 在 DOMContentLoaded 前可能未完全就绪，任何同步调用都必须 try-catch

---

## [9.9.7] - 2026-04-20

### 🐛 Bug 修复

- **版本号显示 "unknown" 修复** — 上次修复移除硬编码后，异步 IPC 时序问题导致 fallback 变成 "unknown"
- **新增同步版本获取** — 添加 `getVersionSync()` + `get-app-version-sync` IPC，在 `init()` 启动时**立即**同步获取版本号，不再依赖异步时序
- **版本获取优先级**：sync IPC → 异步 IPC → 缓存值 → null（不会显示 unknown）

---

## [9.9.6] - 2026-04-19

### 🐛 Bug 修复

- **版本号硬编码修复** — `app.js` 中 `getCurrentVersion()` 默认值从硬编码 `'9.9.3'` 改为动态读取；`index.html` 中"关于"面板版本号改为动态渲染（`<span id="about-version-value">`），确保版本号跟随程序包走，不再出现更新后仍显示旧版本的问题

---

## [9.9.5] - 2026-04-19

### 🐛 Bug 修复

- **版本对比弹窗逻辑修复** — 当服务器版本高于本地版本时，正确显示"🆕 发现新版本"并提供"立即更新"按钮，而非错误地显示"已是最新版本"
- **应用名称中英文适配** — 根据语言设置自动切换：中文界面显示为"任务清单"，英文界面显示为"TodoList"；切换语言时同步更新注册表自启条目

### ✨ 改进

- 新增 `compareVersions()` 版本号比较函数，支持语义化版本号对比
- 语言切换时同步更新主进程应用名称和自启动注册表

---

## [9.9.4] - 2026-04-19

### 🐛 Bug 修复

- **更新检查弹窗** — 废弃旧的"暂时没有找到更新的版本"提示，改为**版本对比弹窗**（显示本地版本 vs 服务器版本），更清晰地告知用户当前状态
- **开机自启动修复** — 修复注册表写入失败的问题：
  - 指定 `name` 参数，确保注册表键名为"任务清单"而非默认的 `electron.app.Electron`
  - 启动时自动清理历史遗留的错误注册表条目
  - 增加注册表二次验证日志
- **404/403 错误处理优化** — 服务器返回 404/403 时视为"无新版本"而非错误，避免误导性提示

---

## [9.9.3] - 2026-04-19

### ✨ 新功能

- **更新检查优化**：切换更新源时自动中断上一次检查，防止响应错乱；新增倒计时状态显示"已等待 Xs"

### 🐛 Bug 修复

- 修复更新检查变量未正式声明的问题（`_checkingForUpdate`、`_currentUpdateCheckId`、`_updateTimer`）

---
