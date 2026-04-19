---
name: calendar-task
description: 日历任务管理 - 添加/查看/完成/删除日历任务。触发词：日历、任务、日程、查看任务、添加任务
---

# 日历清单任务管理

本 Skill 用于操作「日历清单」桌面应用的任务数据。

## 数据文件位置

数据文件位于用户目录的 AppData 目录下：
- **Windows**: `%APPDATA%\calendar-list\calendar-tasks.json`
- **Mac**: `~/Library/Application Support/calendar-list/calendar-tasks.json`

## 任务数据结构

```json
{
  "2026-4-16": [
    {
      "id": "l1234567890abc",
      "text": "任务内容",
      "done": false,
      "createdAt": 1744780800000
    }
  ]
}
```

- key 格式：`YYYY-M-D`（月份和日期不加前导零）
- id 格式：`Date.now().toString(36) + random`

## 操作步骤

### 1. 读取数据

首先读取任务数据文件：
```
读取文件: {数据文件路径}
```

### 2. 根据需求操作数据

**添加任务**：
```
读取数据 → 解析 JSON → 在对应日期添加任务 → 保存文件
```

新任务格式：
```javascript
{
  id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
  text: "任务内容",
  done: false,
  createdAt: Date.now()
}
```

**删除任务**：
```
读取数据 → 解析 JSON → 根据 taskId 删除 → 保存文件
```

**完成任务**：
```
读取数据 → 解析 JSON → 找到任务 toggle done 状态 → 保存文件
```

### 3. 保存文件

```
写入文件: {数据文件路径}
内容: (更新后的 JSON)
```

## 示例对话

用户：「明天提醒我开会」
→ 读取数据 → 计算明天日期 → 添加任务 → 保存

用户：「看看今天有什么任务」
→ 读取数据 → 找到今天日期 → 显示任务列表

用户：「删除刚才那个任务」
→ 读取数据 → 删除指定任务 → 保存

## 注意事项

- 月份和日期不要前导零（如 "2026-4-16" 而不是 "2026-04-16"）
- 如果数据文件不存在，创建一个空对象 `{}`
- 每次修改后都要完整保存整个 JSON 文件
- 任务 id 是唯一标识，用于删除和修改