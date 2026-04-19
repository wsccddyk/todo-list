# 日历清单 - 单机版 v2

一款仿「日历清单」桌面软件的本地日历与任务管理工具。

## 功能特性

- **月视图日历** — 7列网格布局，支持周一/周日起始切换
- **农历/节气/节假日** — 农历日期自动计算，支持 2024-2027 年法定节假日
- **轻量浮窗编辑** — 点击日期弹出小浮窗，带标题栏、任务列表、颜色选择
- **任务管理** — 添加、完成、编辑、删除任务
- **日期颜色** — 7种背景色标记重要日期
- **本地存储** — 所有数据存入 localStorage，无需账号
- **深色主题** — 5种主题（深蓝夜空/纯黑/深林绿/紫色魅惑/深海蓝）

### 窗口控制（新增）
- **窗口大小可调** — 拖拽右下角调整大小
- **透明度调节** — 设置面板中滑块调整背景透明度（30%-100%）
- **背景颜色自定义** — 颜色选择器自定义背景
- **字体颜色自定义** — 颜色选择器自定义字体颜色

### 快捷操作
- `←` `→` 翻月，`ESC` 关闭浮窗，`Enter` 添加任务
- 鼠标滚轮滑动翻月
- 右键菜单快速编辑、颜色、清空任务

## API 接口

暴露在 `window.CalendarApp` 对象上，可供外部读写数据：

```javascript
// 获取所有任务
CalendarApp.getTasks()

// 获取某天任务
CalendarApp.getTasksForDate(2026, 4, 16)

// 添加任务（返回 true/false）
CalendarApp.addTask(2026, 4, 16, '开会讨论')

// 删除任务（返回 true/false）
CalendarApp.removeTask(2026, 4, 16, taskId)

// 切换完成状态（返回完成状态）
CalendarApp.toggleTask(2026, 4, 16, taskId)

// 获取日期颜色
CalendarApp.getDayColor(2026, 4, 16)  // null 或 rgba 字符串

// 设置日期颜色
CalendarApp.setDayColor(2026, 4, 16, 'rgba(74,158,255,0.15)')
CalendarApp.setDayColor(2026, 4, 16, null)  // 清除颜色

// 获取/更新设置
CalendarApp.getSettings()
CalendarApp.setSettings({ opacity: 70, fontSize: 13 })

// 导出/导入所有数据
CalendarApp.exportAll()
CalendarApp.importAll(data)

// 清除所有数据
CalendarApp.clearAll()

// 导航
CalendarApp.goTo(2026, 3)  // 跳转年月（月份0-11）
CalendarApp.goToday()

// 监听数据变化事件
window.addEventListener('CalendarApp:dataChanged', (e) => {
  console.log('任务数据已更新', e.detail.tasks)
})
window.addEventListener('CalendarApp:settingsChanged', (e) => {
  console.log('设置已更新', e.detail)
})
```

## 数据存储

所有数据存储于浏览器 `localStorage`，键值：
- `calendar_tasks_v3` — 任务数据
- `calendar_day_colors_v3` — 日期颜色
- `calendar_settings_v3` — 用户设置

## 文件结构

```
calendar-app/
├── index.html    # 主页面
├── style.css     # 样式表
├── app.js        # 主应用逻辑
├── lunar.js      # 农历算法库
├── holidays.js   # 节假日数据库（2024-2027）
└── README.md     # 本文件
```

## 使用方法

直接在浏览器中打开 `index.html` 即可使用。

### 打包为桌面 App（可选）

推荐用 **Nativefier** 打包为 Windows exe：

```bash
npx nativefier "http://localhost:7788" -n "日历清单" --single-instance
```

打包后会生成一个独立的 `.exe`，直接双击运行。

## 操作指南

| 操作 | 方法 |
|------|------|
| 添加任务 | 单击日期格 → 输入框填入 → 按 Enter |
| 标记完成 | 勾选任务前的复选框 |
| 编辑任务 | 点击任务文字直接编辑 |
| 删除任务 | 悬停任务行 → 点击 ✕ |
| 设置日期颜色 | 浮窗底部颜色圆点 |
| 调整窗口大小 | 拖拽右下角 ↘ |
| 调节透明度 | ⚙ → 背景透明度滑块 |
| 更改背景/字体颜色 | ⚙ → 颜色选择器 |
| 翻月 | 点击 ◀ ▶ 或滚轮滑动 |
| 回到今天 | 点击「今」按钮 |
| 打开设置 | 点击右上角 ⚙ |
| 右键菜单 | 右键点击任意日期格 |
| 导出数据 | ⚙ → 导出 JSON |
| 导入数据 | ⚙ → 导入 JSON |
