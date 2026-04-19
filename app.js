/**
 * 日历清单 - 主应用逻辑 v2
 * 单机版，数据存储于 localStorage
 * 暴露全局 API：window.CalendarApp
 */

(function() {
  'use strict';

  // =========================================
  //   配置 & 常量
  // =========================================
  const STORAGE_KEY = 'calendar_tasks_v3';
  const SETTINGS_KEY = 'calendar_settings_v3';
  const DAY_COLORS_KEY = 'calendar_day_colors_v3';

  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();

  let contextTargetDate = null;
  let _localVersion = ''; // 缓存当前本地版本号，供弹窗显示

  // 任务数据: { 'YYYY-M-D': [{ id, text, done, createdAt }] }
  let tasksData = {};
  // 日期颜色: { 'YYYY-M-D': 'rgba(...)' }
  let dayColors = {};

  // 设置（带默认值）
  let settings = {
    theme: 'dark',
    fontSize: 16,
    dateSize: 14,
    weekStart: 1,
    showLunar: true,
    showHoliday: true,
    opacity: 85,        // 背景透明度 30-100
    bgColor: '#0d1117',  // 背景颜色
    fontColor: '#e0e8f0', // 字体颜色
    customBgColor: false,
    customFontColor: false,
    desktopMode: false,  // 桌面挂件模式

    // === 日历 Tab 新增 ===
    displayWeeks: 5,       // 显示周数（窗口显示几行/几周的单元格）
    pastWeeks: 2,          // 已过星期数（今天上面显示几周，今天在第 pastWeeks+1 行）
    showShadow: false,   // 显示阴影
    showWeekNum: false,  // 显示周数
    showMonthGaps: true, // 显示月间隔
    showTodayMarker: true,// 显示今日标记栏
    showSolarterm: true, // 显示二十四节气
    showCalendar: true,  // 显示农历
    showLegalRest: true, // 显示法定休息日

    // === 单元格 Tab 新增 ===
    cellGap: 1,          // 单元格间隙
    autoNumber: 'none',  // 自动编号: none/dot/number
    taskLineClamp: 0,    // 任务显示行数：0=无限制，1/2/3=固定行数
    todayColor: '#ffd700',// 今日框颜色
    todayOutlineWidth: 3,   // 今日框粗细（px）
    taskFontColor: '#b8d4f0', // 任务字体颜色
    editAutoScroll: true,      // 编辑完成自动排到末尾
    undoWeekAutoDelete: false, // 未完成一周内自动驱赶
    editCompleteSound: true,   // 编辑完成提示音
    editReminderSound: true,   // 提醒通知提示音
    displayToastTip: false,    // 显示温馨提示

    // === 高级 Tab 新增 ===
    firstWeek: 1,        // 设置第一周
    restDays: [6, 0],    // 每周休息日 (0=周日, 6=周六)
    showRestDays: true,  // 显示休息日
    autoStartup: false,  // 开机自启动
    autoCheckUpdate: true,// 自动检查更新
    showShortcutKey: true,// 显示隐藏快捷键
    language: 'zh-CN',     // 界面语言：zh-CN / en-US
  };

  // =========================================
  //   国际化 (i18n)
  // =========================================
  const I18N = {
    'zh-CN': {
      appName: '任务清单',
      settings: '⚙ 任务清单 - 设置',
      calendar: '日历',
      cell: '单元格',
      advanced: '高级',
      about: '关于',
      localVersion: '本地版本：',
      updateCheck: '🔄 立即检查更新',
      updateChecking: '⏳ 检查中...',
      updateCheckTitle: '更新检查',
      latestVersion: '✅ 已经是最新版本',
      latestBody: '当前版本已是最新版本',
      newVersion: '🔄 发现新版本',
      downloadNow: '立即更新 ✨',
      later: '稍后再说',
      downloading: '下载中...',
      downloaded: '✅ 下载完成！点击下方按钮重启安装',
      installNow: '立即安装并重启 🚀',
      autoUpdate: '自动检查更新',
      followStartup: '跟随 Windows 启动',
      showShortcut: '显示隐藏日历快捷键',
      hideShowShortcut: '隐藏/显示快捷键',
      basicSettings: '基本设置',
      firstColWeekday: '首列星期',
      displayWeeks: '显示周数',
      language: '语言',
      weeklyRestDays: '每周休息日',
      showRestDays: '显示休息日',
      systemShortcut: '系统与快捷键',
      aiConnect: 'AI 对接',
      exportSkill: '导出 Skill',
      generateCmd: '生成一键指令',
      aiHint: '生成后可让 AI 直接操作日历任务',
      dataManage: '数据管理',
      exportData: '导出数据',
      importData: '导入数据',
      clearAllData: '清除所有数据',
      runLog: '运行日志',
      featureIntro: '功能介绍',
      faq: '常见问题',
      changelog: '更新日志',
      donateCaption: '微信打赏，感谢支持 ❤️',
      shortcutList: '快捷键一览',
      pageFlip: '翻页',
      dblClickEdit: '双击编辑任务',
      rightClickMenu: '右键上下文菜单',
      escClose: 'Esc 关闭弹窗',
      scrollPage: '滚轮翻页',
      toggleHideShow: '隐藏/显示窗口',
      copyright: 'Copyright © 2026 爆肝. All rights reserved.',
      confirm: '确定',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      done: '已完成',
      undo: '撤销',
      today: '今天',
      noTask: '暂无任务',
      addTask: '添加任务',
      searchPlaceholder: '搜索任务...',
      // ===== 设置页面 - 日历 Tab =====
      grpDisplay: '显示',
      monday: '星期一', sunday: '星期日',
      tuesday: '星期二', wednesday: '星期三',
      thursday: '星期四', friday: '星期五',
      saturday: '星期六',
      jan: '一月', feb: '二月', mar: '三月', apr: '四月',
      may: '五月', jun: '六月', jul: '七月', aug: '八月',
      sep: '九月', oct: '十月', nov: '十一月', dec: '十二月',
      yearSuffix: '年',
      weekLabel: '周',
      lunarFormat: '农历 {ganZhi}年（{zodiac}年）{month}',
      weeks3: '3周', weeks4: '4周', weeks5: '5周', weeks6: '6周', weeks8: '8周',
      pastWeeks: '已过星期数',
      num0: '0', num1: '1', num2: '2', num3: '3', num4: '4', num5: '5',
      grpAppearance: '外观',
      bgColor: '日历背景颜色',
      reset: '重置',
      fontColor: '字体颜色',
      grpDisplayOptions: '显示选项（复选框）',
      showShadow: '显示阴影',
      showWeekNum: '显示周数',
      showMonthGaps: '显示月间隔',
      showTodayMarker: '显示今日标记栏',
      showHolidays: '显示重要节日',
      showSolarTerms: '显示二十四节气',
      showLunarCalendar: '显示农历',
      showLegalRestDays: '显示法定休息日',
      grpTheme: '主题预设',
      themeColor: '主题颜色',
      restoreCalDefault: '恢复默认设置',
      // ===== 单元格 Tab =====
      grpSizeSpacing: '尺寸与间距',
      opacity: '透明度',
      cellGap: '单元格间隙',
      autoNumber: '自动编号',
      numberNone: '不编号',
      numberDot: '以点为标示',
      numberSeq: '数字序号',
      taskLines: '任务显示行数',
      unlimited: '无限制',
      lines1: '1 行', lines2: '2 行', lines3: '3 行',
      grpCellColor: '颜色',
      todayColor: '今日框颜色',
      todayOutline: '今日框粗细',
      outline1: '1px（细）', outline2: '2px', outline3: '3px（默认）',
      outline5: '5px（粗）', outline7: '7px（特粗）',
      taskFontColor: '字体大小颜色',
      grpFontSize: '字号',
      taskFontSize: '任务字号',
      dateFontSize: '日期字号',
      px12: '12px', px13: '13px', px14: '14px', px15: '15px', px16: '16px',
      px18: '18px', px20: '20px', px22: '22px', px24: '24px', px26: '26px', px28: '28px', px30: '30px',
      grpBehavior: '行为',
      editAutoScroll: '编辑完成自动排到末尾',
      undoWeekDelete: '未完成一周内自动驱赶',
      editCompleteSound: '编辑完成提示音',
      reminderSound: '提醒通知提示音',
      showWarmTip: '显示温馨提示',
      // ===== 高级 Tab =====
      startWeekday: '开始星期',
      setFirstWeek: '设置第一周',
      filterLabel: '过滤',
      filterAllLevels: '全部级别',
      filterEvent: '事件', filterInfo: '信息',
      filterWarn: '警告', filterError: '错误',
      filterAllCats: '全部分类',
      catInit: '初始化', catSetting: '设置', catRender: '渲染',
      catData: '数据', catSync: '同步', catUI: 'UI', catErr: '错误', catSys: '系统',
      logClear: '清空',
      logExpand: '展开 ▼',
      logEmpty: '（暂无日志或点击刷新）',
      restoreAdvDefault: '恢复默认设置',
      exportFormatTxt: 'txt',
      exportFormatXlsx: 'xlsx',
      exportFormatCtdb: 'ctdb',
      exportRangeAll: '全部',
      exportRange6m: '近6个月',
      exportRangeCustom: '自定义',
      exportBtn: '导出',
      importAuto: '自动识别',
      importDb: 'db 原版',
      importBtn: '选择文件',
      clearBtn: '清除',
      startDate: '开始',
      endDate: '结束',
      shortcutKeyLabel: '隐藏/显示快捷键',
      shortcutKeyValue: 'Ctrl+Alt+H',
      desktopModeTitle: '桌面模式',
      desktopModeText: '桌面模式',
      updateCheckGrp: '更新检查',
      updateSourceLabel: '更新服务器',
      sourceGitee: 'Gitee（国内直连）',
      sourceGithub: 'GitHub（需代理）',
      connectingServer: '正在连接更新服务器...',
      serverSlowTip: '网络连接较慢，请耐心等待...',
      serverTimeout: '连接超时，网络不通畅。请检查网络后重试。',
      updateFailed: '更新检查失败，可能是网络问题，可稍后重试或手动下载新版本',
      updateUnavailable: '已是最新版本',
      // ===== 动态内容（非DOM属性，用于JS拼接） =====
      logSummary: '{count} 条 | 保留 {days} 天',
      logNoMatch: '（无匹配日志）',
      changelogTitle: '更新日志',
      newVersionFound: '🔄 发现新版本',
      laterBtn: '稍后再说',
      downloadNowBtn: '立即更新 ✨',
      preparingDownload: '准备下载...',
      updateErrorPrefix: '更新检查失败：',
    },
    'en-US': {
      appName: 'Todo List',
      settings: '⚙ Todo List - Settings',
      calendar: 'Calendar',
      cell: 'Cell',
      advanced: 'Advanced',
      about: 'About',
      localVersion: 'Local Version: ',
      updateCheck: '🔄 Check for Updates',
      updateChecking: '⏳ Checking...',
      updateCheckTitle: 'Update Check',
      latestVersion: '✅ Up to Date',
      latestBody: 'You are running the latest version',
      newVersion: '🔄 New Version Available',
      downloadNow: 'Update Now ✨',
      later: 'Later',
      downloading: 'Downloading...',
      downloaded: '✅ Download complete! Click below to restart & install',
      installNow: 'Install & Restart 🚀',
      autoUpdate: 'Auto Check for Updates',
      followStartup: 'Start with Windows',
      showShortcut: 'Show Hide Shortcut',
      hideShowShortcut: 'Hide/Show Shortcut',
      basicSettings: 'Basic Settings',
      firstColWeekday: 'First Column',
      displayWeeks: 'Display Weeks',
      language: 'Language',
      weeklyRestDays: 'Weekly Rest Days',
      showRestDays: 'Show Rest Days',
      systemShortcut: 'System & Shortcuts',
      aiConnect: 'AI Integration',
      exportSkill: 'Export Skill',
      generateCmd: 'Generate Command',
      aiHint: 'Let AI operate calendar tasks directly after generation',
      dataManage: 'Data Management',
      exportData: 'Export Data',
      importData: 'Import Data',
      clearAllData: 'Clear All Data',
      runLog: 'Run Log',
      featureIntro: 'Features',
      faq: 'FAQ',
      changelog: 'Changelog',
      donateCaption: 'WeChat Tip, Thank You ❤️',
      shortcutList: 'Keyboard Shortcuts',
      pageFlip: 'Page Flip',
      dblClickEdit: 'Double-click to Edit',
      rightClickMenu: 'Right-click Menu',
      escClose: 'Esc Close Popup',
      scrollPage: 'Scroll Page',
      toggleHideShow: 'Toggle Hide/Show Window',
      copyright: 'Copyright © 2026 Baogan. All rights reserved.',
      confirm: 'OK',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      done: 'Done',
      undo: 'Undo',
      today: 'Today',
      noTask: 'No tasks yet',
      addTask: 'Add Task',
      searchPlaceholder: 'Search tasks...',
      // ===== Settings - Calendar Tab =====
      grpDisplay: 'Display',
      monday: 'Monday', sunday: 'Sunday',
      tuesday: 'Tuesday', wednesday: 'Wednesday',
      thursday: 'Thursday', friday: 'Friday',
      saturday: 'Saturday',
      jan: 'Jan.', feb: 'Feb.', mar: 'Mar.', apr: 'Apr.',
      may: 'May', jun: 'Jun.', jul: 'Jul.', aug: 'Aug.',
      sep: 'Sep.', oct: 'Oct.', nov: 'Nov.', dec: 'Dec.',
      yearSuffix: ' ',
      weekLabel: 'Wk',
      lunarFormat: 'Lunar {ganZhi} ({zodiac}) {month}',
      weeks3: '3 weeks', weeks4: '4 weeks', weeks5: '5 weeks', weeks6: '6 weeks', weeks8: '8 weeks',
      pastWeeks: 'Past Weeks',
      num0: '0', num1: '1', num2: '2', num3: '3', num4: '4', num5: '5',
      grpAppearance: 'Appearance',
      bgColor: 'Background Color',
      reset: 'Reset',
      fontColor: 'Font Color',
      grpDisplayOptions: 'Display Options (Checkbox)',
      showShadow: 'Show Shadow',
      showWeekNum: 'Show Week Numbers',
      showMonthGaps: 'Show Month Gaps',
      showTodayMarker: 'Show Today Marker',
      showHolidays: 'Show Holidays',
      showSolarTerms: 'Show Solar Terms',
      showLunarCalendar: 'Show Lunar Calendar',
      showLegalRestDays: 'Show Legal Holidays',
      grpTheme: 'Theme Presets',
      themeColor: 'Theme Color',
      restoreCalDefault: 'Restore Defaults',
      // ===== Cell Tab =====
      grpSizeSpacing: 'Size & Spacing',
      opacity: 'Opacity',
      cellGap: 'Cell Gap',
      autoNumber: 'Auto Numbering',
      numberNone: 'None', numberDot: 'Dots', numberSeq: 'Numbers',
      taskLines: 'Task Display Lines',
      unlimited: 'Unlimited',
      lines1: '1 line', lines2: '2 lines', lines3: '3 lines',
      grpCellColor: 'Colors',
      todayColor: 'Today Border Color',
      todayOutline: 'Today Border Width',
      outline1: '1px (Thin)', outline2: '2px', outline3: '3px (Default)',
      outline5: '5px (Thick)', outline7: '7px (Extra Thick)',
      taskFontColor: 'Task Font Color',
      grpFontSize: 'Font Size',
      taskFontSize: 'Task Font Size',
      dateFontSize: 'Date Font Size',
      px12: '12px', px13: '13px', px14: '14px', px15: '15px', px16: '16px',
      px18: '18px', px20: '20px', px22: '22px', px24: '24px', px26: '26px', px28: '28px', px30: '30px',
      grpBehavior: 'Behavior',
      editAutoScroll: 'Auto-scroll After Edit',
      undoWeekDelete: 'Auto-remove Incomplete After 1 Week',
      editCompleteSound: 'Edit Complete Sound',
      reminderSound: 'Reminder Notification Sound',
      showWarmTip: 'Show Warm Tips',
      // ===== Advanced Tab =====
      startWeekday: 'Start Week On',
      setFirstWeek: 'Set First Week',
      filterLabel: 'Filter',
      filterAllLevels: 'All Levels',
      filterEvent: 'Events', filterInfo: 'Info',
      filterWarn: 'Warnings', filterError: 'Errors',
      filterAllCats: 'All Categories',
      catInit: 'Init', catSetting: 'Settings', catRender: 'Render',
      catData: 'Data', catSync: 'Sync', catUI: 'UI', catErr: 'Errors', catSys: 'System',
      logClear: 'Clear',
      logExpand: 'Expand ▼',
      logEmpty: '(No logs or click to refresh)',
      restoreAdvDefault: 'Restore Defaults',
      exportFormatTxt: 'txt',
      exportFormatXlsx: 'xlsx',
      exportFormatCtdb: 'ctdb',
      exportRangeAll: 'All',
      exportRange6m: 'Last 6 Months',
      exportRangeCustom: 'Custom',
      exportBtn: 'Export',
      importAuto: 'Auto Detect',
      importDb: 'DB Original',
      importBtn: 'Select File',
      clearBtn: 'Clear',
      startDate: 'Start',
      endDate: 'End',
      shortcutKeyLabel: 'Toggle Shortcut',
      shortcutKeyValue: 'Ctrl+Alt+H',
      desktopModeTitle: 'Desktop Mode',
      desktopModeText: 'Desktop Mode',
      updateCheckGrp: 'Update Check',
      updateSourceLabel: 'Update Server',
      sourceGitee: 'Gitee (China Direct)',
      sourceGithub: 'GitHub (Requires Proxy)',
      connectingServer: 'Connecting to server...',
      serverSlowTip: 'Connection is slow, please wait...',
      serverTimeout: 'Connection timeout — network unreachable. Please check your network and try again.',
      updateFailed: 'Update check failed due to network issues. Try again later or download manually.',
      updateUnavailable: 'Already up to date',
      // ===== Dynamic content (used for JS string concatenation) =====
      logSummary: '{count} entries | Retain {days} days',
      logNoMatch: '(No matching logs)',
      changelogTitle: 'Changelog',
      newVersionFound: '🔄 New Version Available',
      laterBtn: 'Later',
      downloadNowBtn: 'Update Now ✨',
      preparingDownload: 'Preparing download...',
      updateErrorPrefix: 'Update failed: ',
    }
  };

  function t(key) {
    var lang = settings.language || 'zh-CN';
    return (I18N[lang] && I18N[lang][key]) || key;
  }

  // 中国特有节日相关复选框 ID 列表（英文模式下默认取消勾选）
  const CHINESE_HOLIDAY_CHECKBOXES = ['show-lunar', 'show-solarterm', 'show-calendar', 'show-legal-rest'];

  function applyLanguage() {
    var lang = settings.language || 'zh-CN';
    var isEn = lang === 'en-US';

    // 1) 标准 data-i18n 元素
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (I18N[lang] && I18N[lang][key]) {
        el.textContent = I18N[lang][key];
      }
    });

    // 2) placeholder 翻译
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-ph');
      if (I18N[lang] && I18N[lang][key]) {
        el.placeholder = I18N[lang][key];
      }
    });

    // 3) data-i18n-span: 复选框内 <span> 文本翻译（如"显示重要节日"）
    document.querySelectorAll('[data-i18n-span]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-span');
      if (I18N[lang] && I18N[lang][key]) {
        el.textContent = I18N[lang][key];
      }
    });

    // 4) data-i18n-opt: select 内 <option> 文本翻译
    document.querySelectorAll('[data-i18n-opt]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-opt');
      if (I18N[lang] && I18N[lang][key]) {
        el.textContent = I18N[lang][key];
      }
    });

    // 5) 语言切换时：中文→英文 取消中国节日；英文→中文 勾选中国节日
    CHINESE_HOLIDAY_CHECKBOXES.forEach(function(id) {
      var cb = document.getElementById(id);
      if (cb) {
        if (isEn) {
          // 英文模式：取消勾选
          cb.checked = false;
          // 同步设置对象
          if (id === 'show-lunar') settings.showLunar = false;
          else if (id === 'show-solarterm') settings.showSolarterm = false;
          else if (id === 'show-calendar') settings.showCalendar = false;
          else if (id === 'show-legal-rest') settings.showLegalRest = false;
        } else {
          // 中文模式：恢复勾选
          cb.checked = true;
          if (id === 'show-lunar') settings.showLunar = true;
          else if (id === 'show-solarterm') settings.showSolarTerm = true;
          else if (id === 'show-calendar') settings.showCalendar = true;
          else if (id === 'show-legal-rest') settings.showLegalRest = true;
        }
      }
    });
    if (CHINESE_HOLIDAY_CHECKBOXES.some(function(id) { return !!document.getElementById(id); })) {
      saveSettings();
    }

    // 6) 刷新动态文本（日志摘要、更新状态等非 data-i18n 元素）
    var _logBadge = document.getElementById('log-summary-badge');
    if (_logBadge && _logBadge.textContent.indexOf('条') !== -1 || _logBadge && _logBadge.textContent.indexOf('entries') !== -1) {
      var _summary = GetLogSummary();
      if (_summary && _summary.total !== undefined) {
        _logBadge.textContent = t('logSummary').replace('{count}', _summary.total).replace('{days}', LOG_MAX_DAYS);
      }
    }
    // 刷新关于页版本号前缀
    var _verLabel = document.getElementById('about-version-label');
    if (_verLabel) { _verLabel.textContent = t('localVersion'); }

    // 7) 刷新日历星期头（中英文切换后需要更新）
    updateWeekdayHeaders();
  }

  // 当前弹出的浮窗日期
  let popupDate = null;

  // 颜色选项
  const TASK_COLORS = [
    { label: '蓝', value: 'rgba(74,158,255,0.15)' },
    { label: '绿', value: 'rgba(74,222,128,0.15)' },
    { label: '黄', value: 'rgba(250,204,21,0.15)' },
    { label: '红', value: 'rgba(248,113,113,0.15)' },
    { label: '紫', value: 'rgba(192,132,252,0.15)' },
    { label: '橙', value: 'rgba(251,146,60,0.15)' },
    { label: '粉', value: 'rgba(244,114,182,0.15)' },
  ];

  const DOT_COLORS = [
    '#4a9eff','#4ade80','#facc15','#f87171','#c084fc','#fb923c','#f472b6'
  ];

  // 默认颜色
  const DEFAULT_BG_COLOR = '#0d1117';
  const DEFAULT_FONT_COLOR = '#e0e8f0';

  // =========================================
  //   内置日志系统
  // =========================================
  const LOG_KEY = 'calendar_logs_v3';
  const LOG_MAX_DAYS = 7;          // 保留最近 7 天
  const LOG_MAX_ENTRIES = 2000;    // 最大条目数，防爆内存
  var _logEntries = [];            // 内存日志数组

  function _logInit() {
    try {
      var raw = localStorage.getItem(LOG_KEY);
      if (raw) {
        _logEntries = JSON.parse(raw);
        _logPurge();
      }
    } catch(e) { _logEntries = []; }
  }

  function _logPurge() {
    var cutoff = Date.now() - LOG_MAX_DAYS * 24 * 3600 * 1000;
    _logEntries = _logEntries.filter(function(e) { return e.t >= cutoff; });
    if (_logEntries.length > LOG_MAX_ENTRIES) {
      _logEntries = _logEntries.slice(_logEntries.length - LOG_MAX_ENTRIES);
    }
  }

  function _logPersist() {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(_logEntries));
    } catch(e) {
      // localStorage 满了就再清理一次
      try { 
        _logEntries = _logEntries.slice(-500); 
        localStorage.setItem(LOG_KEY, JSON.stringify(_logEntries)); 
      } catch(e2) {}
    }
  }

  /**
   * 写入日志
   * @param {string} level - 'info'|'warn'|'error'|'event'
   * @param {string} category - 分类: 'init'|'setting'|'render'|'data'|'error'|'ui'|'sync'
   * @param {string} msg 日志消息
   * @param {object} [extra] 额外数据
   */
  function Log(level, category, msg, extra) {
    var entry = {
      t: Date.now(),
      lv: level,
      cat: category,
      m: msg
    };
    if (extra !== undefined && extra !== null) {
      entry.x = extra;
    }
    _logEntries.push(entry);

    // 控制台也输出一份
    var tag = '[日历:' + category + ']';
    if (level === 'error') console.error(tag, msg, extra || '');
    else if (level === 'warn') console.warn(tag, msg, extra || '');
    else console.log(tag, msg, extra || '');

    // 每 10 条或 error/warn 级别时持久化一次
    if (_logEntries.length % 10 === 0 || level === 'error' || level === 'warn') {
      _logPurge();
      _logPersist();
    }
  }

  // 快捷方法
  function LogInfo(cat, msg, extra) { return Log('info', cat, msg, extra); }
  function LogWarn(cat, msg, extra) { return Log('warn', cat, msg, extra); }
  function LogError(cat, msg, extra) { return Log('error', cat, msg, extra); }
  function LogEvent(cat, msg, extra) { return Log('event', cat, msg, extra); }

  /** 获取日志（支持过滤） */
  function GetLogs(opts) {
    opts = opts || {};
    _logPurge();
    var result = _logEntries;
    if (opts.level) result = result.filter(function(e) { return e.lv === opts.level; });
    if (opts.category) result = result.filter(function(e) { return e.cat === opts.category; });
    if (opts.since) result = result.filter(function(e) { return e.t >= opts.since; });
    if (opts.limit) result = result.slice(-opts.limit);
    return result.map(function(e) { 
      // 返回副本，避免外部篡改
      return { time: e.t, level: e.lv, category: e.cat, message: e.m, extra: e.x || null }; 
    });
  }

  /** 清空日志 */
  function ClearLogs() {
    _logEntries = [];
    try { localStorage.removeItem(LOG_KEY); } catch(e) {}
    LogInfo('system', '日志已清空');
  }

  /** 获取日志统计摘要 */
  function GetLogSummary() {
    _logPurge();
    var summary = { total: _logEntries.length, byLevel: {}, byCategory: {}, oldest: null, newest: null };
    for (var i = 0; i < _logEntries.length; i++) {
      var e = _logEntries[i];
      summary.byLevel[e.lv] = (summary.byLevel[e.lv] || 0) + 1;
      summary.byCategory[e.cat] = (summary.byCategory[e.cat] || 0) + 1;
      if (!summary.oldest || e.t < summary.oldest) summary.oldest = e.t;
      if (!summary.newest || e.t > summary.newest) summary.newest = e.t;
    }
    return summary;
  }

  // 启动时初始化日志
  _logInit();

  // =========================================
  //   存储读写（localStorage + 同步到主进程）
  // =========================================
  function loadData() {
    // 每次启动时清空 localStorage，强制从主进程文件重新加载
    // 这样外部修改 JSON 文件后不会因 localStorage 缓存而读到旧数据
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(DAY_COLORS_KEY);
    // 数据将在 onDataSync 回调中从主进程文件加载
    // 先设空值避免渲染报错
    tasksData = {};
  }
  
  // 数据迁移：统一日期键格式为无前导零
  function migrateDateKeys() {
    const migrated = {};
    let count = 0;
    for (const key in tasksData) {
      // 转换 "2026-01-05" -> "2026-1-5"
      const match = key.match(/^(\d{4})-0*(\d+)-0*(\d+)$/);
      if (match) {
        const newKey = match[1] + '-' + parseInt(match[2]) + '-' + parseInt(match[3]);
        if (newKey !== key) {
          migrated[newKey] = tasksData[key];
          count++;
        } else {
          migrated[key] = tasksData[key];
        }
      } else {
        migrated[key] = tasksData[key];
      }
    }
    if (count > 0) {
      tasksData = migrated;
      console.log('[日历清单] 数据迁移完成，转换了 ' + count + ' 个日期键');
    }
  }
  
  // 迁移日期颜色键
  function migrateDayColorsKeys() {
    const migrated = {};
    let count = 0;
    for (const key in dayColors) {
      const match = key.match(/^(\d{4})-0*(\d+)-0*(\d+)$/);
      if (match) {
        const newKey = match[1] + '-' + parseInt(match[2]) + '-' + parseInt(match[3]);
        if (newKey !== key) {
          migrated[newKey] = dayColors[key];
          count++;
        } else {
          migrated[key] = dayColors[key];
        }
      } else {
        migrated[key] = dayColors[key];
      }
    }
    if (count > 0) {
      dayColors = migrated;
      console.log('[日历清单] 颜色迁移完成，转换了 ' + count + ' 个日期键');
    }
  }

  function saveTasksData() {
    var taskCount = Object.keys(tasksData).reduce(function(s, k) { return s + tasksData[k].length; }, 0);
    LogEvent('data', '任务数据保存', { dateKeys: Object.keys(tasksData).length, totalTasks: taskCount });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksData));
    // 同步到主进程
    if (window.electronAPI && window.electronAPI.syncTasks) {
      window.electronAPI.syncTasks(tasksData);
    }
    // 触发外部事件
    window.dispatchEvent(new CustomEvent('CalendarApp:dataChanged', {
      detail: { tasks: tasksData, dayColors: dayColors }
    }));
  }

  function saveSettings() {
    LogEvent('setting', '设置保存', { displayWeeks: settings.displayWeeks, showWeekNum: settings.showWeekNum, showMonthGaps: settings.showMonthGaps });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // 同步到主进程
    if (window.electronAPI && window.electronAPI.syncSettings) {
      try { window.electronAPI.syncSettings(settings); } catch(e) { 
        LogError('setting', 'syncSettings 失败', { error: e.message }); 
        console.warn('[日历清单] syncSettings error:', e.message); 
      }
    }
    window.dispatchEvent(new CustomEvent('CalendarApp:settingsChanged', {
      detail: settings
    }));
  }

  function saveDayColors() {
    LogEvent('data', '日期颜色保存', { keys: Object.keys(dayColors).length });
    localStorage.setItem(DAY_COLORS_KEY, JSON.stringify(dayColors));
    // 同步到主进程
    if (window.electronAPI && window.electronAPI.syncDayColors) {
      window.electronAPI.syncDayColors(dayColors);
    }
  }

  // =========================================
  //   工具函数
  // =========================================
  function dateKey(y, m, d) {
    return `${y}-${m + 1}-${d}`;
  }

  function todayKey() {
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }

  function getTasksForDay(y, m, d) {
    return tasksData[dateKey(y, m, d)] || [];
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // 驱赶过期未完成任务（超过7天且未完成的自动清除）
  function sweepOverdueTasks() {
    const now = new Date();
    const todayKey = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
    let swept = false;
    for (const key in tasksData) {
      if (!tasksData[key]) continue;
      // 解析日期键
      const parts = key.split('-');
      if (parts.length !== 3) continue;
      const taskDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const diffMs = now.getTime() - taskDate.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      // 超过7天且不是今天或未来的日期，清除未完成任务
      if (diffDays > 7 && key !== todayKey) {
        const remaining = tasksData[key].filter(t => !t.done);
        if (remaining.length === 0) continue; // 全部已完成的不处理
        // 只保留已完成的
        const doneOnly = tasksData[key].filter(t => t.done);
        if (doneOnly.length > 0) {
          tasksData[key] = doneOnly;
          swept = true;
        } else {
          delete tasksData[key];
          swept = true;
        }
      }
    }
    if (swept) saveTasksData();
  }

  // 播放提示音（使用 Web Audio API）
  function playSound(type) {
    try {
      if (typeof window === 'undefined' || !window.AudioContext && !window.webkitAudioContext) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'complete') {
        // 完成音：短促的上升音调
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'reminder') {
        // 提醒音：双音
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch(e) {
      console.warn('播放声音失败:', e.message);
    }
  }

  function formatDateTitle(y, m, d) {
    const date = new Date(y, m, d);
    const lunar = LunarCalendar.solar2lunar(date);
    const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    return `${y}年${m + 1}月${d}日 星期${weekDay}`;
  }

  function formatLunarSub(y, m, d) {
    if (!settings.showLunar) return '';
    const date = new Date(y, m, d);
    const lunar = LunarCalendar.solar2lunar(date);
    if (!lunar) return '';
    return `农历${lunar.lunarMonthStr}${lunar.lunarDayStr}`;
  }

  // =========================================
  //   应用设置 & 外观
  // =========================================
  // =========================================
  //   桌面模式 UI 更新
  // =========================================
  function applyDesktopModeUI(enabled) {
    const btn = document.getElementById('desktop-toggle-btn');
    const icon = document.getElementById('desktop-toggle-icon');
    const text = document.getElementById('desktop-toggle-text');
    const badge = document.getElementById('desktop-mode-badge');
    const titlebar = document.getElementById('titlebar');
    const minBtn = document.getElementById('titlebar-minimize');
    const maxBtn = document.getElementById('titlebar-maximize');
    const closeBtn = document.getElementById('titlebar-close');
    const resizeHandle = document.getElementById('resize-handle');

    // 桌面模式时添加 class，移除高亮效果
    document.body.classList.toggle('desktop-mode-active', enabled);

    if (enabled) {
      btn.classList.add('active');
      icon.textContent = '🔓';
      text.textContent = '解除固定';
      badge.classList.remove('hidden');
      // 桌面模式下，标题栏变窄
      titlebar.style.background = 'rgba(0,0,0,0.3)';
      // 隐藏窗口控制按钮（最小化/最大化/关闭）
      if (minBtn) minBtn.style.display = 'none';
      if (maxBtn) maxBtn.style.display = 'none';
      if (closeBtn) closeBtn.style.display = 'none';
      // 隐藏拖拽调整大小手柄
      if (resizeHandle) resizeHandle.style.display = 'none';
      // 桌面模式不显示标题栏的桌面切换文字，只留图标
      text.style.display = 'none';
    } else {
      btn.classList.remove('active');
      icon.textContent = '📌';
      text.textContent = '桌面模式';
      badge.classList.add('hidden');
      titlebar.style.background = '';
      // 恢复窗口控制按钮
      if (minBtn) minBtn.style.display = '';
      if (maxBtn) maxBtn.style.display = '';
      if (closeBtn) closeBtn.style.display = '';
      // 恢复拖拽调整大小手柄
      if (resizeHandle) resizeHandle.style.display = '';
      text.style.display = '';
    }
  }

  // =========================================
  //   初始化标题栏（Electron 环境）
  // =========================================
  function initTitlebar() {
    if (window.electronAPI) {
      // 通知主进程获取当前桌面模式状态
      window.electronAPI.onDesktopModeChanged((enabled) => {
        settings.desktopMode = enabled;
        saveSettings();
        applyDesktopModeUI(enabled);
        const toggle = document.getElementById('desktop-mode-toggle');
        if (toggle) toggle.checked = enabled;
      });

      // 初始同步
      applyDesktopModeUI(settings.desktopMode);
    }
  }

  function applySettings() {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--font-size-task', settings.fontSize + 'px');
    document.documentElement.style.setProperty('--font-size-date', settings.dateSize + 'px');
    // 应用语言
    applyLanguage();
    document.documentElement.style.setProperty('--font-size-weekday', settings.dateSize + 'px');

    // 全局透明度（控制整个窗口的透明度，透出桌面壁纸）
    // 注意：transparent:true 窗口在 opacity=0 时会拦截鼠标事件导致桌面失控，所以最低5%
    const op = Math.max(5, settings.opacity) / 100;
    const bg = settings.customBgColor ? settings.bgColor : '#0d1117';
    document.documentElement.style.setProperty('--bg-opacity', op);
    // 根元素背景：直接用 rgba 设置全局透明度（transparent:true 窗口会透出桌面）
    const bgRgba = `rgba(${hexToRgb(bg)}, ${op})`;
    document.documentElement.style.background = bgRgba;
    document.body.style.background = 'transparent';

    // 字体颜色
    if (settings.customFontColor) {
      document.documentElement.style.setProperty('--text-primary', settings.fontColor);
      document.documentElement.style.setProperty('--text-task', settings.fontColor);
    } else {
      document.documentElement.style.setProperty('--text-primary', '');
      document.documentElement.style.setProperty('--text-task', '');
    }

    // 今日框颜色
    if (settings.todayColor) {
      document.documentElement.style.setProperty('--border-today', settings.todayColor);
      document.documentElement.style.setProperty('--bg-today', settings.todayColor.replace(')', ', 0.12)').replace('rgb', 'rgba'));
      document.documentElement.style.setProperty('--text-today', settings.todayColor);
    }

    // 今日框粗细
    if (settings.todayOutlineWidth) {
      document.documentElement.style.setProperty('--today-outline-width', settings.todayOutlineWidth + 'px');
    }

    // 任务字体颜色
    if (settings.taskFontColor && settings.taskFontColor !== '#b8d4f0') {
      document.documentElement.style.setProperty('--text-task', settings.taskFontColor);
    } else if (!settings.customFontColor) {
      document.documentElement.style.setProperty('--text-task', '');
    }

    // 单元格间隙
    const grid = document.getElementById('calendar-grid');
    if (grid) grid.style.gap = settings.cellGap + 'px';

    // 任务显示行数（0=无限制，1/2/3=固定行数）
    document.documentElement.style.setProperty('--task-line-clamp', settings.taskLineClamp > 0 ? settings.taskLineClamp : 'none');

    // 显示/隐藏阴影
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.classList.toggle('has-shadow', !!settings.showShadow);
    }
    if (settings.showShadow) {
      document.body.style.boxShadow = 'inset 0 0 30px rgba(0,0,0,0.3)';
    } else {
      document.body.style.boxShadow = '';
    }

    // 同步设置面板 - 日历 Tab
    const themeOptions = document.querySelectorAll('.theme-dot');
    themeOptions.forEach(dot => {
      dot.classList.toggle('active', dot.dataset.theme === settings.theme);
    });
    syncSelectValue('week-start-select', settings.weekStart);
    syncSelectValue('display-weeks-select', settings.displayWeeks);
    syncSelectValue('past-weeks-select', settings.pastWeeks);
    syncCheckbox('show-shadow', settings.showShadow);
    syncCheckbox('show-week-num', settings.showWeekNum);
    syncCheckbox('show-month-gaps', settings.showMonthGaps);
    syncCheckbox('show-today-marker', settings.showTodayMarker);
    syncCheckbox('show-lunar', settings.showLunar);
    syncCheckbox('show-solarterm', settings.showSolarterm);
    syncCheckbox('show-calendar', settings.showCalendar);
    syncCheckbox('show-legal-rest', settings.showLegalRest);

    // 同步设置面板 - 单元格 Tab
    // 透明度滑块（替代原来的 select）
    var _opSlider = document.getElementById('cell-opacity-slider');
    var _opValue = document.getElementById('cell-opacity-value');
    if (_opSlider) {
      _opSlider.value = settings.opacity;
      if (_opValue) _opValue.textContent = settings.opacity + '%';
      // 拖动时：只实时更新数字显示和背景色（不触发完整applySettings避免卡死）
      _opSlider.addEventListener('input', function() {
        const val = parseInt(this.value);
        settings.opacity = val;
        if (_opValue) _opValue.textContent = val + '%';
        // 只更新背景色，不做其他重绘操作
        const op = Math.max(5, val) / 100;
        const bg = settings.customBgColor ? settings.bgColor : '#0d1117';
        document.documentElement.style.setProperty('--bg-opacity', op);
        document.documentElement.style.background = 'rgba(' + hexToRgb(bg) + ', ' + op + ')';
      });
      // 松手时：才执行完整应用+保存
      _opSlider.addEventListener('change', function() {
        applySettings();
        saveSettings();
      });
    }
    syncSelectValue('cell-gap-select', settings.cellGap);
    syncSelectValue('auto-number-select', settings.autoNumber);
    syncSelectValue('font-size-select', settings.fontSize);
    syncSelectValue('date-size-select', settings.dateSize);
    syncColorPicker('today-color-picker', settings.todayColor);
    syncSelectValue('today-outline-select', settings.todayOutlineWidth || 3);
    syncColorPicker('task-font-color-picker', settings.taskFontColor);
    syncCheckbox('edit-auto-scroll', settings.editAutoScroll);
    syncCheckbox('undo-week-auto-delete', settings.undoWeekAutoDelete);
    syncCheckbox('edit-complete-sound', settings.editCompleteSound);
    syncCheckbox('edit-reminder-sound', settings.editReminderSound);
    syncCheckbox('display-toast-tip', settings.displayToastTip);

    // 同步设置面板 - 高级 Tab
    syncSelectValue('adv-week-start-select', settings.weekStart);
    syncSelectValue('first-week-select', settings.firstWeek);
    syncSelectValue('language-select', settings.language || 'zh-CN');
    syncCheckbox('auto-startup', settings.autoStartup);
    syncCheckbox('auto-check-update', settings.autoCheckUpdate);
    syncCheckbox('show-shortcut-key', settings.showShortcutKey);
    syncCheckbox('show-rest-days', settings.showRestDays);

    // 休息日复选框
    document.querySelectorAll('[name="rest-day"]').forEach(cb => {
      cb.checked = (settings.restDays || []).includes(parseInt(cb.dataset.day));
    });

    // 颜色选择器（旧字段）
    syncColorPicker('bg-color-picker', settings.bgColor);
    syncColorPicker('font-color-picker', settings.fontColor);
    const desktopToggle = document.getElementById('desktop-mode-toggle');
    if (desktopToggle) desktopToggle.checked = settings.desktopMode;
  }

  // 辅助函数：同步 select 值
  function syncSelectValue(id, val) {
    var el = document.getElementById(id);
    if (el && el.options) el.value = String(val);
  }

  // 辅助函数：同步 checkbox 值
  function syncCheckbox(id, checked) {
    var el = document.getElementById(id);
    if (el) el.checked = !!checked;
  }

  // 辅助函数：同步颜色选择器值
  function syncColorPicker(id, color) {
    var el = document.getElementById(id);
    if (el) el.value = color || '';
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `${r},${g},${b}`;
  }

  // =========================================
  //   渲染日历
  // =========================================
  function renderCalendar() {
    LogInfo('render', 'renderCalendar 被调用', { year: currentYear, month: currentMonth + 1 });
    var t0 = Date.now();
    renderHeader();
    renderGrid();
    var dt = Date.now() - t0;
    if (dt > 100) LogWarn('render', '渲染耗时较长: ' + dt + 'ms');
  }

  function renderHeader() {
    const monthNames = [t('jan'),t('feb'),t('mar'),t('apr'),t('may'),t('jun'),
                        t('jul'),t('aug'),t('sep'),t('oct'),t('nov'),t('dec')];
    document.getElementById('year-month').textContent =
      currentYear + t('yearSuffix') + monthNames[currentMonth];

    const lunarEl = document.getElementById('lunar-info');
    if (settings.showLunar) {
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lunar = LunarCalendar.solar2lunar(firstDay);
      if (lunar) {
        lunarEl.textContent = t('lunarFormat').replace('{ganZhi}', lunar.ganZhi).replace('{zodiac}', lunar.zodiac).replace('{month}', lunar.lunarMonthStr);
      }
    } else {
      lunarEl.textContent = '';
    }
  }

  function renderGrid() {
    LogInfo('render', 'renderGrid 开始', { year: currentYear, month: currentMonth + 1 });
    const grid = document.getElementById('calendar-grid');
    if (!grid) {
      LogError('render', 'calendar-grid 元素不存在');
      return;
    }
    grid.innerHTML = '';

    const weekStart = settings.weekStart;
    const displayWks = parseInt(settings.displayWeeks) || 5;   // 显示几周（行数）
    const pastWs = parseInt(settings.pastWeeks) || 2;           // 今天上面几周

    // 根据是否显示周数列调整网格列数
    const colCount = settings.showWeekNum ? 8 : 7;
    grid.style.gridTemplateColumns = 'repeat(' + colCount + ', 1fr)';

    // === 核心逻辑：判断是否在当前真实月份 ===
    const nowDate = new Date();
    const isCurrentRealMonth = (currentYear === nowDate.getFullYear() && currentMonth === nowDate.getMonth());

    const cells = [];
    let totalCells;

    if (isCurrentRealMonth) {
      // ===== 当前月份：以今天为锚点，往上推 pastWs 周，往下推剩余周数 =====
      const todayDow = nowDate.getDay();

      function getWeekStartDate(d) {
        const dow = d.getDay();
        let diff;
        if (weekStart === 1) {
          diff = dow === 0 ? -6 : -(dow - 1);
        } else {
          diff = -dow;
        }
        const result = new Date(d);
        result.setDate(result.getDate() + diff);
        return result;
      }

      const thisWeekStart = getWeekStartDate(nowDate);
      var startDate = new Date(thisWeekStart);
      startDate.setDate(startDate.getDate() - pastWs * 7);

      totalCells = displayWks * 7;

      for (let i = 0; i < totalCells; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const y = d.getFullYear();
        const m = d.getMonth();
        const day = d.getDate();
        cells.push({ year: y, month: m, day: day, otherMonth: (m !== currentMonth) });
      }
    } else {
      // ===== 非当前月份：传统月历模式，从该月1号所在的周一开始显示 =====
      var firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      var fdow = firstDayOfMonth.getDay();

      var leadDays;
      if (weekStart === 1) {
        leadDays = (fdow + 6) % 7;
      } else {
        leadDays = fdow;
      }

      var lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      var daysInMonth = lastDayOfMonth.getDate();

      // 固定6行42个格子（确保完整显示一个月）
      totalCells = 42;

      // 上月尾部日期
      var prevLastDay = new Date(currentYear, currentMonth, 0);
      for (var i = leadDays - 1; i >= 0; i--) {
        var pd = prevLastDay.getDate() - i;
        var pm = currentMonth - 1;
        var py = pm < 0 ? currentYear - 1 : currentYear;
        var pmm = pm < 0 ? 11 : pm;
        cells.push({ year: py, month: pmm, day: pd, otherMonth: true });
      }

      // 当月日期
      for (var d2 = 1; d2 <= daysInMonth; d2++) {
        cells.push({ year: currentYear, month: currentMonth, day: d2, otherMonth: false });
      }

      // 下月头部日期补齐到42格
      var remaining = totalCells - cells.length;
      for (var d3 = 1; d3 <= remaining; d3++) {
        var nm = currentMonth + 1;
        var ny = nm > 11 ? currentYear + 1 : currentYear;
        var nmm = nm > 11 ? 0 : nm;
        cells.push({ year: ny, month: nmm, day: d3, otherMonth: true });
      }
    }
    let weekNumCounter = 0;
    const firstWeekDay = new Date(currentYear, currentMonth, 1);
    // ISO 周数计算辅助
    function getISOWeekNumber(d) {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    cells.forEach((cell, idx) => {
      // 每行第一个位置插入周数（如果启用）
      if (settings.showWeekNum && idx % colCount === 0) {
        if (cells[idx]) {
          const wnDate = new Date(cells[idx].year, cells[idx].month, cells[idx].day);
          const wnEl = document.createElement('div');
          wnEl.className = 'week-number-cell';
          // 使用 ISO 周数，根据用户设置的第一周偏移
          const isoWn = getISOWeekNumber(wnDate);
          const displayWn = isoWn - (parseInt(settings.firstWeek) - 1);
          wnEl.textContent = displayWn > 0 ? String(displayWn) : String(isoWn);
          grid.appendChild(wnEl);
        }
      }

      let colIdx;
      if (weekStart === 1) {
        colIdx = idx % 7;
      } else {
        colIdx = idx % 7;
      }
      let isWeekendCol = false;
      if (weekStart === 1) {
        isWeekendCol = colIdx === 5 || colIdx === 6;
      } else {
        isWeekendCol = colIdx === 0 || colIdx === 6;
      }
      grid.appendChild(createDayCell(cell, isWeekendCol));
    });
    console.log('[日历清单] renderGrid() 完成, grid子元素数:', grid.children.length);
  }

  function createDayCell(cell, isWeekendCol) {
    const { year, month, day, otherMonth } = cell;
    const key = dateKey(year, month, day);
    const tasks = tasksData[key] || [];
    const isToday = (year === today.getFullYear() && month === today.getMonth() && day === today.getDate());

    const cellEl = document.createElement('div');
    cellEl.className = 'day-cell';
    // 存储日期数据，供浮窗定位等使用
    cellEl.dataset.year = year;
    cellEl.dataset.month = month;
    cellEl.dataset.day = day;
    if (otherMonth) cellEl.classList.add('other-month');
    // 月间隔：跨月格子添加额外边距
    if (settings.showMonthGaps && otherMonth) {
      cellEl.classList.add('month-gap');
    }
    if (isToday) cellEl.classList.add('today');
    if (isWeekendCol) cellEl.classList.add('weekend-col');

    // 自定义休息日高亮（独立于周末列判断）
    const dayOfWeek = new Date(year, month, day).getDay();
    if (settings.showRestDays && (settings.restDays || []).includes(dayOfWeek)) {
      cellEl.classList.add('rest-day-cell');
      // 如果不是周末列但被设为休息日，也加 weekend-col 样式
      if (!isWeekendCol) {
        cellEl.classList.add('custom-rest-day');
      }
    }

    // 已过星期数不再需要淡出效果，因为已经通过起始日期控制显示范围
    // 保留 other-month 样式来区分跨月日期

    const bgColor = dayColors[key];
    if (bgColor) {
      cellEl.style.background = bgColor;
      cellEl.classList.add('has-bg');
    }

    // 日期头部
    const header = document.createElement('div');
    header.className = 'day-header';

    const dayNum = document.createElement('span');
    dayNum.className = 'day-number';
    dayNum.textContent = day;
    header.appendChild(dayNum);

    let holidayBadgeShown = false;
    // 节日显示：受 showHoliday(原逻辑) + showLegalRest(法定休息日) 共同控制
    const shouldShowHoliday = settings.showHoliday && settings.showLegalRest;
    if (shouldShowHoliday && !otherMonth) {
      const hol = HolidayDB.getHoliday(year, month + 1, day);
      if (hol) {
        const badge = document.createElement('span');
        badge.className = 'holiday-badge';
        badge.style.color = hol.color;
        badge.textContent = hol.name;
        header.appendChild(badge);
        holidayBadgeShown = true;
        const dot = document.createElement('span');
        dot.className = 'holiday-dot';
        dot.style.background = hol.color;
        header.appendChild(dot);
      }
    }

    // 节气显示：独立控制 showSolarterm
    if (settings.showSolarterm && !holidayBadgeShown && !otherMonth) {
      const term = LunarCalendar.getSolarTerm(year, month + 1, day);
      if (term) {
        const badge = document.createElement('span');
        badge.className = 'solarterm-badge';
        badge.textContent = term;
        header.appendChild(badge);
      }
    }

    cellEl.appendChild(header);

    // 农历：独立控制 showCalendar
    if (settings.showCalendar && !otherMonth) {
      const date = new Date(year, month, day);
      const lunar = LunarCalendar.solar2lunar(date);
      if (lunar) {
        const lunarEl = document.createElement('div');
        lunarEl.className = 'lunar-day';
        if (lunar.lunarDay === 1) {
          lunarEl.textContent = (lunar.isLeap ? '闰' : '') + ['正','二','三','四','五','六','七','八','九','十','冬','腊'][lunar.lunarMonth - 1] + '月';
          lunarEl.style.color = 'var(--text-solarterm)';
        } else {
          lunarEl.textContent = lunar.lunarDayStr;
        }
        cellEl.insertBefore(lunarEl, header.nextSibling);
      }
    }

    // 任务列表
    const taskListEl = document.createElement('div');
    taskListEl.className = 'task-list';

    // 每格最多显示的任务数量（固定值，不再由设置控制）
    const maxShow = 10;
    const visibleTasks = tasks.slice(0, maxShow);
    visibleTasks.forEach((task, idx) => {
      const item = document.createElement('div');
      item.className = 'task-item-cell' + (task.done ? ' done' : '');
      // 根据 autoNumber 设置决定前缀（使用彩色圆点序号）
      if (settings.autoNumber === 'number') {
        var dotColor = DOT_COLORS[idx % DOT_COLORS.length];
        item.innerHTML = '<span class="auto-num" style="color:' + dotColor + ';">' + (idx + 1) + '</span><span class="task-text">' + escapeHtml(task.text) + '</span>';
      } else if (settings.autoNumber === 'dot') {
        var dotClr = DOT_COLORS[idx % DOT_COLORS.length];
        item.innerHTML = '<span class="auto-dot" style="color:' + dotClr + ';">●</span><span class="task-text">' + escapeHtml(task.text) + '</span>';
      } else {
        item.innerHTML = '<span class="task-text">' + escapeHtml(task.text) + '</span>';
      }
      taskListEl.appendChild(item);
    });

    if (tasks.length > maxShow) {
      const more = document.createElement('div');
      more.className = 'more-tasks';
      more.textContent = `还有 ${tasks.length - maxShow} 项...`;
      taskListEl.appendChild(more);
    }

    cellEl.appendChild(taskListEl);

    // 双击打开浮窗（所有模式都改为双击）
    cellEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openPopup(year, month, day);
    });

    // 右键菜单
    cellEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, year, month, day);
    });

    return cellEl;
  }

  // =========================================
  //   浮窗（纯文本编辑模式）
  // =========================================
  function openPopup(y, m, d) {
    popupDate = { y, m, d };

    const popup = document.getElementById('task-popup');
    popup.classList.remove('hidden');

    // 提醒提示音
    if (settings.editReminderSound) playSound('reminder');

    document.getElementById('popup-date-title').textContent = formatDateTitle(y, m, d);
    document.getElementById('popup-lunar').textContent = formatLunarSub(y, m, d);

    // 加载任务到文本区
    renderPopupTextarea();

    setTimeout(() => {
      const textarea = document.getElementById('popup-textarea');
      textarea.focus();
      // 光标移到末尾
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    }, 60);

    // 自动定位在点击位置附近
    positionPopupNearClick(y, m, d);
  }

  function positionPopupNearClick(y, m, d) {
    const popup = document.getElementById('task-popup');
    const grid = document.getElementById('calendar-grid');
    // 先显示（不占空间）以便获取实际尺寸
    popup.style.visibility = 'hidden';
    popup.classList.remove('hidden');

    // 找到对应的格子
    const cells = grid.querySelectorAll('.day-cell');
    let targetCell = null;
    cells.forEach(cell => {
      const cellY = parseInt(cell.dataset.year || -1);
      const cellM = parseInt(cell.dataset.month || -1);
      const cellD = parseInt(cell.dataset.day || -1);
      if (cellY === y && cellM === m && cellD === d) {
        targetCell = cell;
      }
    });

    if (targetCell) {
      const cellRect = targetCell.getBoundingClientRect();
      const popupW = popup.offsetWidth;
      const popupH = popup.offsetHeight;

      // 默认浮在格子上方居中
      let top = cellRect.top - popupH - 4;  // 格子上方留4px间距
      let left = cellRect.left + cellRect.width / 2 - popupW / 2;

      // 如果上方放不下，改放到格子下方
      if (top < 5) {
        top = cellRect.bottom + 4;
      }
      // 如果下方也放不下，就紧贴底部往上推
      if (top + popupH > window.innerHeight - 10) {
        top = window.innerHeight - popupH - 10;
      }
      // 确保顶部不越界
      if (top < 5) top = 5;

      // 左右防溢出
      if (left < 8) left = 8;
      if (left + popupW > window.innerWidth - 8) {
        left = window.innerWidth - popupW - 8;
      }

      popup.style.top = top + 'px';
      popup.style.left = left + 'px';
    } else {
      // 找不到格子则居中显示
      popup.style.top = (window.innerHeight / 2 - 150) + 'px';
      popup.style.left = (window.innerWidth / 2 - 180) + 'px';
    }

    // 恢复可见
    popup.style.visibility = '';
  }

  function closePopup() {
    document.getElementById('task-popup').classList.add('hidden');
    popupDate = null;
  }

  // 渲染文本编辑区
  function renderPopupTextarea() {
    if (!popupDate) return;
    const { y, m, d } = popupDate;
    const tasks = getTasksForDay(y, m, d);
    const textarea = document.getElementById('popup-textarea');

    // 每行一个任务，已完成的加 [x] 前缀
    const lines = tasks.map(task => {
      if (task.done) {
        return '[x] ' + task.text;
      }
      return task.text;
    });

    textarea.value = lines.join('\n');

    // 更新完成按钮状态
    updateDoneBtnState();
  }

  // 更新完成按钮状态
  function updateDoneBtnState() {
    const textarea = document.getElementById('popup-textarea');
    const btn = document.getElementById('popup-done-btn');
    if (!textarea || !btn) return;

    const value = textarea.value;
    const pos = textarea.selectionStart;
    const beforeLines = value.substring(0, pos).split('\n');
    const currentLineIdx = beforeLines.length - 1;
    const lines = value.split('\n');
    const line = lines[currentLineIdx] || '';

    const isDone = line.trim().startsWith('[x] ');

    const btnIcon = btn.querySelector('.btn-icon');
    const btnText = btn.querySelector('.btn-text');

    if (isDone) {
      btnIcon.textContent = '↩';
      btnText.textContent = '取消';
      btn.style.borderColor = 'rgba(255,200,0,0.4)';
      btn.style.color = '#ffd700';
    } else {
      btnIcon.textContent = '✓';
      btnText.textContent = '完成';
      btn.style.borderColor = '';
      btn.style.color = '';
    }
  }

  // 获取当前光标所在的行索引
  function getCurrentLineIndex(textarea) {
    const value = textarea.value;
    const pos = textarea.selectionStart;
    const beforeLines = value.substring(0, pos).split('\n');
    return beforeLines.length - 1;
  }

  // 保存文本编辑区的内容
  function savePopupTextarea() {
    if (!popupDate) return;
    const { y, m, d } = popupDate;
    const key = dateKey(y, m, d);
    const textarea = document.getElementById('popup-textarea');
    const lines = textarea.value.split('\n').filter(line => line.trim());

    // 解析任务列表
    const newTasks = [];
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const done = trimmed.startsWith('[x] ');
      const text = done ? trimmed.slice(4).trim() : trimmed;
      if (!text) return;

      newTasks.push({
        id: generateId(),
        text,
        done,
        createdAt: Date.now(),
      });
    });

    // editAutoScroll：将已完成的任务排到末尾
    if (settings.editAutoScroll && newTasks.some(t => t.done)) {
      const pending = newTasks.filter(t => !t.done);
      const completed = newTasks.filter(t => t.done);
      newTasks.length = 0;
      newTasks.push(...pending, ...completed);
    }

    tasksData[key] = newTasks;
    if (newTasks.length === 0) delete tasksData[key];
    saveTasksData();
    
    // undoWeekAutoDelete：驱赶过期未完成任务（超过N天且未完成的自动清除）
    if (settings.undoWeekAutoDelete) {
      sweepOverdueTasks();
    }
    
    renderCalendar();
  }

  // 浮窗拖拽
  function initPopupDrag() {
    const popup = document.getElementById('task-popup');
    const header = document.getElementById('popup-header');
    let dragging = false, startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.popup-close')) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(popup.style.left || '0');
      startTop = parseInt(popup.style.top || '0');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      popup.style.left = (startLeft + dx) + 'px';
      popup.style.top = (startTop + dy) + 'px';
    });

    document.addEventListener('mouseup', () => { dragging = false; });
  }

  // =========================================
  //   窗口大小拖拽
  // =========================================
  function initWindowResize() {
    const handle = document.getElementById('resize-handle');
    const app = document.getElementById('app');
    let resizing = false, startX, startY, startW, startH;

    handle.addEventListener('mousedown', (e) => {
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = app.offsetWidth;
      startH = app.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newW = Math.max(600, startW + dx);
      const newH = Math.max(500, startH + dy);
      app.style.width = newW + 'px';
      app.style.height = newH + 'px';
    });

    document.addEventListener('mouseup', () => { resizing = false; });
  }

  // =========================================
  //   右键菜单
  // =========================================
  function showContextMenu(x, y, cy, cm, cd) {
    contextTargetDate = { y: cy, m: cm, d: cd };
    const menu = document.getElementById('context-menu');
    menu.classList.remove('hidden');
    const mw = 150, mh = 120;
    const left = x + mw > window.innerWidth ? x - mw : x;
    const top = y + mh > window.innerHeight ? y - mh : y;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  function hideContextMenu() {
    document.getElementById('context-menu').classList.add('hidden');
    contextTargetDate = null;
  }

  // =========================================
  //   设置面板
  // =========================================
  function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    applySettings();
    // 切换到第一个Tab
    switchSettingsTab('calendar');
    // 温馨提示
    if (settings.displayToastTip) {
      _settingsOpenCount++;
      if (_settingsOpenCount <= 1 || _settingsOpenCount % 5 === 0) {
        showWarmTip();
      }
    }
  }
  function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  }
  
  // 切换设置Tab
  function switchSettingsTab(tabName) {
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.settings-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'panel-' + tabName);
    });
  }

  // =========================================
  //   事件绑定
  // =========================================
  function bindEvents() {
    // 月份导航
    document.getElementById('prevMonth').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderCalendar();
    });
    document.getElementById('todayBtn').addEventListener('click', () => {
      currentYear = today.getFullYear();
      currentMonth = today.getMonth();
      renderCalendar();
    });

    // 设置
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('settings-close').addEventListener('click', closeSettings);
    document.getElementById('settings-overlay').addEventListener('click', closeSettings);
    
    // 设置面板 Tab 切换
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        switchSettingsTab(tab.dataset.tab);
      });
    });

    // 浮窗关闭
    document.getElementById('popup-close').addEventListener('click', () => {
      savePopupTextarea();
      closePopup();
    });

    // 点击浮窗外区域关闭（并保存）
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('task-popup');
      if (!popup.classList.contains('hidden') && !popup.contains(e.target)) {
        savePopupTextarea();
        closePopup();
      }
    });

    // 文本框内点击阻止冒泡
    document.getElementById('popup-textarea').addEventListener('click', (e) => e.stopPropagation());
    document.getElementById('popup-header').addEventListener('click', (e) => {
      if (!e.target.closest('.popup-close')) e.stopPropagation();
    });

    // 完成按钮 - 切换当前行完成状态
    document.getElementById('popup-done-btn').addEventListener('click', () => {
      const textarea = document.getElementById('popup-textarea');
      const value = textarea.value;
      const pos = textarea.selectionStart;

      // 找到当前光标所在的行
      const before = value.substring(0, pos);
      const after = value.substring(pos);
      const beforeLines = before.split('\n');
      const currentLineIdx = beforeLines.length - 1;

      const lines = value.split('\n');
      const line = lines[currentLineIdx];
      if (!line || !line.trim()) {
        showToast('请先选中一行任务');
        return;
      }

      // 切换完成状态
      const isDone = line.trim().startsWith('[x] ');
      if (isDone) {
        // 取消完成：去掉 [x] 前缀
        lines[currentLineIdx] = line.replace(/^\[x\]\s*/, '');
      } else {
        // 标记完成：添加 [x] 前缀
        const trimmed = line.trim();
        lines[currentLineIdx] = '[x] ' + trimmed;
      }

      textarea.value = lines.join('\n');

      // 恢复光标位置
      const newBefore = lines.slice(0, currentLineIdx).join('\n');
      const newPos = newBefore.length + (newBefore ? 1 : 0);
      textarea.selectionStart = textarea.selectionEnd = newPos + lines[currentLineIdx].length;

      // 保存
      savePopupTextarea();

      // 完成提示音
      if (settings.editCompleteSound) playSound('complete');

      // 更新按钮文字
      updateDoneBtnState();
    });

    // 文本框选区变化时更新按钮状态
    document.getElementById('popup-textarea').addEventListener('keyup', updateDoneBtnState);
    document.getElementById('popup-textarea').addEventListener('click', updateDoneBtnState);

    // 设置 - 主题
    document.querySelectorAll('.theme-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        settings.theme = dot.dataset.theme;
        settings.customBgColor = false;
        settings.customFontColor = false;
        saveSettings();
        applySettings();
      });
    });


    // 设置 - 透明度（元素可能不存在于 HTML 中，加保护）
    var _opSlider = document.getElementById('opacity-slider');
    var _opValue = document.getElementById('opacity-value');
    if (_opSlider) {
      _opSlider.addEventListener('input', function(e) {
        settings.opacity = parseInt(e.target.value);
        if (_opValue) _opValue.textContent = settings.opacity + '%';
        saveSettings();
        applySettings();
      });
    } else {
      LogWarn('init', 'opacity-slider 元素不存在，跳过绑定');
    }

    // 设置 - 背景颜色
    var _bgPicker = document.getElementById('bg-color-picker');
    var _resetBg = document.getElementById('reset-bg-color');
    if (_bgPicker) {
      _bgPicker.addEventListener('input', function(e) {
        settings.bgColor = e.target.value;
        settings.customBgColor = true;
        saveSettings();
        applySettings();
      });
    }
    if (_resetBg) {
      _resetBg.addEventListener('click', function() {
        settings.customBgColor = false;
        if (_bgPicker) _bgPicker.value = DEFAULT_BG_COLOR;
        saveSettings();
        applySettings();
      });
    }

    // 设置 - 字体颜色
    var _fontPicker = document.getElementById('font-color-picker');
    var _resetFont = document.getElementById('reset-font-color');
    if (_fontPicker) {
      _fontPicker.addEventListener('input', function(e) {
        settings.fontColor = e.target.value;
        settings.customFontColor = true;
        saveSettings();
        applySettings();
      });
    }
    if (_resetFont) {
      _resetFont.addEventListener('click', function() {
        settings.customFontColor = false;
        if (_fontPicker) _fontPicker.value = DEFAULT_FONT_COLOR;
        saveSettings();
        applySettings();
      });
    }

    // 设置 - 字号
    var _fontSizeSel = document.getElementById('font-size-select');
    if (_fontSizeSel) {
      _fontSizeSel.addEventListener('change', function(e) {
        settings.fontSize = parseInt(e.target.value);
        saveSettings();
        applySettings();
      });
    }


    // 设置 - 日期字号（加 null 保护）
    var _dateSizeSel = document.getElementById('date-size-select');
    if (_dateSizeSel) {
      _dateSizeSel.addEventListener('change', function(e) {
        settings.dateSize = parseInt(e.target.value);
        saveSettings();
        applySettings();
      });
    }

    // 设置 - 周起始（加 null 保护）
    var _weekStartSel = document.getElementById('week-start-select');
    if (_weekStartSel) {
      _weekStartSel.addEventListener('change', function(e) {
        settings.weekStart = parseInt(e.target.value);
        saveSettings();
        renderCalendar();
        updateWeekdayHeaders();
      });
    }

    // 设置 - 显示农历（日历Tab复选框，加 null 保护）
    var _showLunarEl = document.getElementById('show-lunar');
    if (_showLunarEl) {
      _showLunarEl.addEventListener('change', function(e) {
        settings.showLunar = e.target.checked;
        saveSettings();
        renderCalendar();
      });
    }

    // 设置 - 桌面模式（加 null 保护）
    var _desktopToggle = document.getElementById('desktop-mode-toggle');
    if (_desktopToggle) {
      _desktopToggle.addEventListener('change', function(e) {
        settings.desktopMode = e.target.checked;
        saveSettings();
        applyDesktopModeUI(settings.desktopMode);
        // 通知 Electron 主进程
        if (window.electronAPI) {
          window.electronAPI.setDesktopMode(settings.desktopMode);
        }
      });
    }

    // =========================================
    //   设置事件 - 日历 Tab 新增
    // =========================================


    // 显示周数 — 改后需重绘日历（控制显示几周的单元格）
    bindSelectChange('display-weeks-select', 'displayWeeks', true);
    var _displayWeeksSel = document.getElementById('display-weeks-select');
    if (_displayWeeksSel) _displayWeeksSel.addEventListener('change', function() { renderCalendar(); });

    // 已过星期数 — 改后需重绘日历（控制起始日期）
    bindSelectChange('past-weeks-select', 'pastWeeks', true);
    var _pastWeeksSel = document.getElementById('past-weeks-select');
    if (_pastWeeksSel) _pastWeeksSel.addEventListener('change', function() { renderCalendar(); });


    // 显示阴影
    bindCheckboxChange('show-shadow', 'showShadow', renderCalendar);

    // 显示周数
    bindCheckboxChange('show-week-num', 'showWeekNum', renderCalendar);
    console.log('[日历清单] show-week-num 事件绑定完成, 当前值=' + settings.showWeekNum);

    // 显示月间隔
    bindCheckboxChange('show-month-gaps', 'showMonthGaps', renderCalendar);

    // 显示今日标记栏
    bindCheckboxChange('show-today-marker', 'showTodayMarker', renderCalendar);

    // 显示二十四节气
    bindCheckboxChange('show-solarterm', 'showSolarterm', renderCalendar);

    // 显示农历
    bindCheckboxChange('show-calendar', 'showCalendar', renderCalendar);

    // 显示法定休息日
    bindCheckboxChange('show-legal-rest', 'showLegalRest', renderCalendar);

    // 日历Tab恢复默认
    var calendarRestoreBtn = document.getElementById('calendar-restore-default');
    if (calendarRestoreBtn) {
      calendarRestoreBtn.addEventListener('click', function() {
        settings.displayWeeks = 5;
        settings.pastWeeks = 2;
        settings.showShadow = false;
        settings.showWeekNum = false;
        settings.showMonthGaps = true;
        settings.showTodayMarker = true;
        settings.showLunar = true;
        settings.showHoliday = true;
        settings.showSolarterm = true;
        settings.showCalendar = true;
        settings.showLegalRest = true;
        saveSettings();
        applySettings();
        showToast('日历设置已恢复默认');
      });
    }

    // =========================================
    //   设置事件 - 单元格 Tab 新增
    // =========================================

    // 透明度已改为滑块绑定（在 applySettings 中处理）

    // 单元格间隙
    bindSelectChange('cell-gap-select', 'cellGap', true);

    // 自动编号
    bindSelectChange('auto-number-select', 'autoNumber', true);
    // 自动编号改变后需要重绘日历（影响单元格内任务显示）
    var _autoNumSel = document.getElementById('auto-number-select');
    if (_autoNumSel) _autoNumSel.addEventListener('change', function() { renderCalendar(); });

    // 任务显示行数
    bindSelectChange('task-line-clamp-select', 'taskLineClamp', true);
    var _lineClampSel = document.getElementById('task-line-clamp-select');
    if (_lineClampSel) _lineClampSel.addEventListener('change', function() { applySettings(); renderCalendar(); });

    // 今日框颜色
    bindColorPickerChange('today-color-picker', 'todayColor');
    var resetTodayBtn = document.getElementById('reset-today-color');
    if (resetTodayBtn) {
      resetTodayBtn.addEventListener('click', function() {
        settings.todayColor = '#ffd700';
        document.getElementById('today-color-picker').value = '#ffd700';
        saveSettings();
        applySettings();
      });
    }

    // 今日框粗细
    var _todayOutlineSel = document.getElementById('today-outline-select');
    if (_todayOutlineSel) {
      _todayOutlineSel.addEventListener('change', function() {
        settings.todayOutlineWidth = parseInt(this.value, 10);
        saveSettings();
        applySettings();
      });
    }

    // 任务字体颜色
    bindColorPickerChange('task-font-color-picker', 'taskFontColor');
    var resetTaskFontBtn = document.getElementById('reset-task-font-color');
    if (resetTaskFontBtn) {
      resetTaskFontBtn.addEventListener('click', function() {
        settings.taskFontColor = '#b8d4f0';
        document.getElementById('task-font-color-picker').value = '#b8d4f0';
        document.getElementById('custom-task-font').checked = false;
        settings.customTaskFontColor = false;
        saveSettings();
        applySettings();
      });
    }

    // 编辑完成自动排到末尾
    bindCheckboxChange('edit-auto-scroll', 'editAutoScroll');

    // 未完成一周内自动驱赶
    bindCheckboxChange('undo-week-auto-delete', 'undoWeekAutoDelete');

    // 编辑完成提示音
    bindCheckboxChange('edit-complete-sound', 'editCompleteSound');

    // 提醒通知提示音
    bindCheckboxChange('edit-reminder-sound', 'editReminderSound');

    // 显示温馨提示
    bindCheckboxChange('display-toast-tip', 'displayToastTip');

    // =========================================
    //   设置事件 - 高级 Tab 新增
    // =========================================

    // 高级开始星期
    bindSelectChange('adv-week-start-select', 'weekStart', renderCalendar);

    // 设置第一周
    bindSelectChange('first-week-select', 'firstWeek');

    // 语言切换
    var langSelect = document.getElementById('language-select');
    if (langSelect) {
      langSelect.addEventListener('change', async function() {
        settings.language = this.value;
        saveSettings();
        applyLanguage();
        renderCalendar(); // 重新渲染日历以更新星期名等
        // 同步更新主进程应用名称和自启注册表
        if (window.electronAPI && window.electronAPI.updateAppLanguage) {
          try { await window.electronAPI.updateAppLanguage(this.value); } catch(e) { /* 静默 */ }
        }
        showToast(t('language') + ': ' + this.options[this.selectedIndex].text, 1500);
      });
    }

    // 休息日复选框
    document.querySelectorAll('[name="rest-day"]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var day = parseInt(this.dataset.day);
        var restDays = settings.restDays || [6, 0];
        if (this.checked) {
          if (!restDays.includes(day)) restDays.push(day);
        } else {
          restDays = restDays.filter(function(d) { return d !== day; });
        }
        settings.restDays = restDays;
        saveSettings();
        renderCalendar();
      });
    });

    // 显示休息日
    bindCheckboxChange('show-rest-days', 'showRestDays', renderCalendar);

    // 开机自启动
    bindCheckboxChange('auto-startup', 'autoStartup', function() {
      if (window.electronAPI && window.electronAPI.setAutoStart) {
        window.electronAPI.setAutoStart(settings.autoStartup);
      } else {
        showToast('开机启动功能需要 Electron 支持');
      }
    });

    // 自动检查更新
    bindCheckboxChange('auto-check-update', 'autoCheckUpdate');

    // 关于页 - 立即检查更新按钮
    var btnCheckUpdateAbout = document.getElementById('btn-check-update-about');
    if (btnCheckUpdateAbout) {
      btnCheckUpdateAbout.addEventListener('click', function() {
        var statusText = document.getElementById('update-status-text');
        var srcSelect = document.getElementById('update-source-select');
        var selectedSource = srcSelect ? srcSelect.value : 'gitee';
        if (!window.electronAPI || !window.electronAPI.updaterCheck) {
          showUpdateResultDialog(false, null, t('updateFailed'));
          return;
        }

        // === 切换服务器：中断之前的检查 ===
        // 1. 递增检查ID，旧检查的响应将被忽略
        _currentUpdateCheckId++;
        var thisCheckId = _currentUpdateCheckId;

        // 2. 停止之前的倒计时
        if (_updateTimer) {
          clearInterval(_updateTimer);
          _updateTimer = null;
        }

        // 3. 通知主进程切换更新源
        if (window.electronAPI && window.electronAPI.setUpdaterSource) {
          window.electronAPI.setUpdaterSource(selectedSource);
        }

        // 4. 更新UI状态
        btnCheckUpdateAbout.disabled = true;
        btnCheckUpdateAbout.textContent = t('updateChecking');
        var startTime = Date.now();
        var waitSeconds = 0;
        if (statusText) {
          statusText.textContent = t('connectingServer');
          statusText.style.animation = '';
        }
        _checkingForUpdate = true; // 标记手动检查状态

        // 5. 启动倒计时显示（每5秒更新一次，告知用户已等待时间）
        _updateTimer = setInterval(function() {
          // 检查是否被新的检查操作替代
          if (_currentUpdateCheckId !== thisCheckId) {
            clearInterval(_updateTimer);
            _updateTimer = null;
            return;
          }
          waitSeconds += 5;
          if (statusText) {
            statusText.textContent = t('connectingServer') + '（已等待 ' + waitSeconds + 's）';
          }
          // 强制超时：35秒后自动判定失败（兜底保护）
          if (waitSeconds >= 35) {
            clearInterval(_updateTimer);
            _updateTimer = null;
            _currentUpdateCheckId++; // 让旧检查的响应被忽略
            _checkingForUpdate = false;
            btnCheckUpdateAbout.disabled = false;
            btnCheckUpdateAbout.textContent = t('updateCheck');
            if (statusText) {
              statusText.textContent = '';
              statusText.style.animation = '';
            }
            showUpdateResultDialog(false, null, '连接超时（超过 35 秒无响应）。\n\n可能原因：\n• 网络连接不稳定\n• 服务器响应过慢\n\n建议：稍后重试');
          }
        }, 5000);

        window.electronAPI.updaterCheck().then(function(result) {
          // 检查是否被新的检查操作替代，如果是则忽略此结果
          if (_currentUpdateCheckId !== thisCheckId) return;
          
          logInfo('[DEBUG] updaterCheck 返回:', JSON.stringify(result));

          if (result && result.error) {
            // 错误情况
            _updateModal = null; // 强制清锁
            showUpdateResultDialog(false, null, result.message);
          } else if (result && !result.error) {
            // 正常结果 - 显示版本对比
            var isLatest = !result.hasUpdate;
            var serverVer = result.serverVersion || '未知';
            var localVer = result.localVersion || '未知';
            
            if (isLatest) {
              // 已是最新
              _updateModal = null;
              showVersionCompareDialog(localVer, serverVer, false);
            } else {
              // 有新版本
              _updateModal = null;
              showVersionCompareDialog(localVer, serverVer, true, result.releaseNotes || '');
            }
          }
        }, function(err) {
          // 兜底：万一还是抛异常（理论上不会了）
          // 检查是否被新的检查操作替代
          if (_currentUpdateCheckId !== thisCheckId) return;
          var msg = (err && err.message) ? String(err.message) : t('updateFailed');
          _updateModal = null;
          showUpdateResultDialog(false, null, msg);
        }).finally(function() {
          // 检查是否被新的检查操作替代
          if (_currentUpdateCheckId !== thisCheckId) return;

          clearInterval(_updateTimer);
          _updateTimer = null;
          btnCheckUpdateAbout.disabled = false;
          btnCheckUpdateAbout.textContent = t('updateCheck');
          if (statusText) {
            statusText.textContent = '';
            statusText.style.animation = '';
          }
          _checkingForUpdate = false;
        });
      });
    }

    // ====== 网络状态面板（关于页）======
    var btnDetectIp = document.getElementById('btn-detect-ip');
    var ipDisplayArea = document.getElementById('ip-display-area');

    function refreshPublicIp() {
      if (!btnDetectIp || !ipDisplayArea || !window.electronAPI || !window.electronAPI.getPublicIp) return;

      btnDetectIp.disabled = true;
      btnDetectIp.textContent = '...';
      ipDisplayArea.innerHTML = '<span style="color:#d29922;font-size:12px;">🔍 正在检测公网 IP 及服务器延迟...</span>';

      window.electronAPI.getPublicIp().then(function(result) {
        btnDetectIp.disabled = false;
        btnDetectIp.textContent = '🔄 检测 IP';

        if (result.success) {
          var flagEmoji = result.isChina ? '🇨🇳' : '🌐';
          var locationStr = [result.city, result.region, result.country].filter(function(s){return s;}).join(', ');
          var vpnStatus = result.isChina ? 
            '<span style="color:#f85149;">⚠️ 当前为国内 IP（未走代理/VPN）</span>' :
            '<span style="color:#3fb950;">✅ 已通过代理/VPN 出口</span>';

          // 延迟显示：0~2000ms 显示具体数值，>2000ms 显示 "2000ms+"，超时显示 "超时"
          function formatLatency(ms) {
            if (!ms || ms < 0) return '<span style="color:#f85149;">超时</span>';
            if (ms > 2000) return '<span style="color:#d29922;">2000ms+</span>';
            return '<span style="color:#3fb950;">' + ms + ' ms</span>';
          }
          
          var lat = result.latency || {};
          var giteeMs = formatLatency(lat.gitee);
          var githubMs = formatLatency(lat.github);
          var latencyHtml = ''
            + '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:11.5px;">'
            + '  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">'
            + '    <span style="color:#888;">🔗 <b>Gitee</b></span>'
            + '    <span>' + giteeMs + '</span>'
            + '  </div>'
            + '  <div style="display:flex;justify-content:space-between;">'
            + '    <span style="color:#888;">🐙 <b>GitHub</b></span>'
            + '    <span>' + githubMs + '</span>'
            + '  </div>'
            + '</div>';

          ipDisplayArea.innerHTML = ''
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'
            + '  <span style="font-family:Consolas,monospace;font-size:16px;font-weight:bold;color:var(--accent);">' + flagEmoji + ' ' + result.ip + '</span>'
            + '</div>'
            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:2px;">📍 ' + locationStr + (result.org ? ' · ' + result.org : '') + '</div>'
            + '<div style="font-size:11.5px;">' + vpnStatus + '</div>'
            + latencyHtml;
        } else {
          // 即使IP失败，也尝试显示延迟
          var failLat = result.latency || {};
          function fmtLat(ms) {
            if (!ms || ms < 0) return '<span style="color:#f85149;">超时</span>';
            if (ms > 2000) return '<span style="color:#d29922;">2000ms+</span>';
            return '<span style="color:#3fb950;">' + ms + ' ms</span>';
          }
          var fgiteeMs = fmtLat(failLat.gitee);
          var fgithubMs = fmtLat(failLat.github);
          
          ipDisplayArea.innerHTML = ''
            + '<span style="color:#f85149;font-size:12px;">❌ ' + (result.error || '检测失败') + '</span>'
            + '<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);font-size:11.5px;">'
            + '  <div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:#888;">🔗 Gitee</span><span>' + fgiteeMs + '</span></div>'
            + '  <div style="display:flex;justify-content:space-between;"><span style="color:#888;">🐙 GitHub</span><span>' + fgithubMs + '</span></div>'
            + '</div>';
        }
      }).catch(function(e) {
        btnDetectIp.disabled = false;
        btnDetectIp.textContent = '🔄 检测 IP';
        ipDisplayArea.innerHTML = '<span style="color:#f85149;font-size:12px;">❌ 检测异常: ' + String(e.message || e) + '</span>';
      });
    }

    if (btnDetectIp) {
      btnDetectIp.addEventListener('click', refreshPublicIp);
      // 面板展开时自动检测一次
      var toggleProxyBtn = document.getElementById('toggle-proxy-panel');
      if (toggleProxyBtn) {
        toggleProxyBtn.addEventListener('click', function() {
          setTimeout(refreshPublicIp, 100); // 延迟一点等面板展开动画完成
        });
      }
    }

    // 手动代理保存按钮（保留兼容性）
    var btnSaveProxy = document.getElementById('btn-save-proxy');
    if (btnSaveProxy) {
      btnSaveProxy.addEventListener('click', function() {
        var proxyInput = document.getElementById('manual-proxy-input');
        var proxyVal = proxyInput ? proxyInput.value.trim() : '';
        var resultEl = document.getElementById('proxy-test-result');
        if (!window.electronAPI || !window.electronAPI.saveCloudSyncConfig) return;
        window.electronAPI.saveCloudSyncConfig({ manualProxy: proxyVal }).then(function() {
          resultEl.innerHTML = '<span style="color:#3fb950;font-size:11.5px;">[✓] 已保存</span>';
          setTimeout(function() { resultEl.innerHTML = ''; }, 3000);
        });
      });
    }

    // ====== 主界面右上角 云同步按钮 ======
    var cloudSyncBtn = document.getElementById('cloudSyncBtn');
    if (cloudSyncBtn) {
      cloudSyncBtn.addEventListener('click', function() {
        showCloudSyncModal();
      });
    }

    /**
     * 云同步主弹窗（从主界面右上角☁按钮触发）
     * 使用 Gitee 私有仓库进行数据备份同步
     */
    function showCloudSyncModal() {
      if (_updateModal && _updateModal.id !== 'cloud-modal') return; // 防止覆盖其他弹窗

      var modal = document.createElement('div');
      modal.className = 'about-modal-overlay';
      modal.id = 'cloud-modal';

      modal.innerHTML = ''
        + '<div class="about-modal-box" style="max-width:460px;">'
        + '  <div class="about-modal-header"><span>☁️ 云同步</span><button class="about-modal-close" id="cloud-close">✕</button></div>'
        + '  <div class="about-modal-body" style="padding:20px 24px;">'

        // 服务商标题（固定为Gitee，无需选择）
        + '    <div style="margin-bottom:16px;display:flex;align-items:center;gap:8px;">'
        + '      <span style="font-size:20px;">🦊</span>'
        + '      <div>'
        + '        <span style="font-size:15px;font-weight:600;color:var(--text-primary);">Gitee 私有仓库</span><br>'
        + '        <span style="font-size:11.5px;color:var(--text-secondary);">数据加密存储于你的 Gitee 仓库中</span>'
        + '      </div>'
        + '    </div>'

        // Gitee 配置区域（直接显示）
        + '    <div id="cloud-config-area" style="margin-bottom:18px;"></div>'

        // 操作按钮
        + '    <div style="display:flex;gap:10px;margin-bottom:8px;">'
        + '      <button class="action-btn primary-btn" id="cloud-upload-btn" style="flex:1;padding:10px;font-size:14px;" disabled>⬆ 上传到云端</button>'
        + '      <button class="action-btn secondary-btn" id="cloud-download-btn" style="flex:1;padding:10px;font-size:14px;" disabled>⬇ 下载最新</button>'
        + '    </div>'
        + '    <div style="margin-bottom:14px;">'
        + '      <button class="action-btn secondary-btn" id="cloud-history-btn" style="width:100%;padding:7px;font-size:12.5px;" disabled>🕐 查看 / 恢复历史版本</button>'
        + '    </div>'

        // 状态提示区
        + '    <div id="cloud-status" class="settings-hint-row" style="min-height:40px;text-align:center;font-size:13px;"></div>'

        // 新手引导链接
        + '    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);">'
        + '      <a href="#" id="cloud-guide-link" style="font-size:12.5px;color:#58a6ff;text-decoration:none;">📖 第一次使用？查看配置教程</a>'
        + '    </div>'

        + '  </div></div>';

      document.body.appendChild(modal);

      // 关闭事件
      modal.querySelector('#cloud-close').addEventListener('click', closeCloudModal);
      modal.addEventListener('click', function(e) { if (e.target === modal) closeCloudModal(); });

      var configArea = modal.querySelector('#cloud-config-area');

      // ====== 直接渲染 Gitee 表单（无选择器）======
      function renderGiteeForm() {
        var html = '';
        html += '<label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">私人令牌 Token</label>';
        html += '<input type="password" id="gitee-token" placeholder="Gitee → 设置→私人令牌 → 生成新令牌" style="width:100%;padding:7px 10px;border:1px solid var(--border-color);border-radius:6px;background:var(--input-bg);color:var(--text-primary);font-size:13px;margin-bottom:8px;" />';
        html += '<label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">仓库名称</label>';
        html += '<input type="text" id="gitee-repo" value="calendar-backup" placeholder="例如：calendar-backup" style="width:100%;padding:7px 10px;border:1px solid var(--border-color);border-radius:6px;background:var(--input-bg);color:var(--text-primary);font-size:13px;margin-bottom:10px;" />';
        // 保存按钮
        html += '<button class="action-btn secondary-btn" id="cloud-save-config-btn" style="width:100%;padding:7px;font-size:12.5px;margin-bottom:4px;">💾 保存配置</button>';
        html += '<div id="cloud-save-status" style="text-align:center;font-size:11.5px;min-height:18px;"></div>';
        configArea.innerHTML = html;

        // 绑定保存按钮事件
        configArea.querySelector('#cloud-save-config-btn').addEventListener('click', function() {
          var saveStatusEl = configArea.querySelector('#cloud-save-status');
          this.disabled = true;
          saveStatusEl.innerHTML = '<span style="color:#d29922;">正在保存...</span>';
          collectAndSaveConfig(function() {
            saveStatusEl.innerHTML = '<span style="color:#3fb950;">✅ 配置已保存</span>';
            configArea.querySelector('#cloud-save-config-btn').disabled = false;
            setTimeout(function() { saveStatusEl.innerHTML = ''; }, 3000);
          });
        });

        loadAndFillCloudConfig();

        // 启用操作按钮
        checkFormReady();
      }

      /** 加载已有配置并填入表单 */
      function loadAndFillCloudConfig() {
        if (!window.electronAPI || !window.electronAPI.getCloudSyncConfig) return;
        window.electronAPI.getCloudSyncConfig().then(function(cfg) {
          var tokenEl = modal.querySelector('#gitee-token');
          var repoEl = modal.querySelector('#gitee-repo');
          if (tokenEl && cfg.gitee_token) tokenEl.value = cfg.gitee_token;
          if (repoEl && cfg.gitee_repo) repoEl.value = cfg.gitee_repo;
          checkFormReady();
        });
      }

      /** 检查表单是否已填好，控制按钮状态 */
      function checkFormReady() {
        var tokenEl = modal.querySelector('#gitee-token');
        var uploadBtn = modal.querySelector('#cloud-upload-btn');
        var downloadBtn = modal.querySelector('#cloud-download-btn');
        var historyBtn = modal.querySelector('#cloud-history-btn');
        var ready = tokenEl && tokenEl.value.trim().length > 0;
        if (uploadBtn) uploadBtn.disabled = !ready;
        if (downloadBtn) downloadBtn.disabled = !ready;
        if (historyBtn) historyBtn.disabled = !ready;

        // 监听输入变化
        if (tokenEl && !tokenEl._boundCheck) {
          tokenEl._boundCheck = true;
          tokenEl.addEventListener('input', function() { checkFormReady(); });
        }
      }

      /** 收集当前表单数据并保存 */
      function collectAndSaveConfig(callback) {
        if (!window.electronAPI || !window.electronAPI.saveCloudSyncConfig) return;
        if (!window.electronAPI.getCloudSyncConfig) return;

        window.electronAPI.getCloudSyncConfig().then(function(cfg) {
          cfg.gitee_provider = 'gitee';
          cfg.gitee_token = (modal.querySelector('#gitee-token') || {}).value || '';
          cfg.gitee_repo = (modal.querySelector('#gitee-repo') || {}).value || '';
          return window.electronAPI.saveCloudSyncConfig(cfg);
        }).then(callback);
      }

      // 渲染 Gitee 表单
      renderGiteeForm();

      // 上传按钮
      modal.querySelector('#cloud-upload-btn').addEventListener('click', function() {
        var statusEl = modal.querySelector('#cloud-status');
        this.disabled = true;
        statusEl.innerHTML = '<span style="color:#d29922;">正在准备上传...</span>';

        collectAndSaveConfig(function() {
          if (window.electronAPI && window.electronAPI.cloudUpload) {
            window.electronAPI.cloudUpload('gitee').then(function(result) {
              if (result.success) {
                statusEl.innerHTML = '<span style="color:#3fb950;">' + result.message + '</span>';
              } else {
                statusEl.innerHTML = '<span style="color:#f85149;">' + (result.message || result.error || '上传失败') + '</span>';
              }
            }).catch(function(err) {
              statusEl.innerHTML = '<span style="color:#f85149;">⚠️ 上传异常：' + String(err.message || err) + '</span>';
            }).finally(function() {
              modal.querySelector('#cloud-upload-btn').disabled = false;
            });
          } else {
            statusEl.innerHTML = '<span style="color:#f85149;">❌ 云同步接口不可用，请重启应用后重试</span>';
            modal.querySelector('#cloud-upload-btn').disabled = false;
          }
        });
      });

      // 下载按钮
      modal.querySelector('#cloud-download-btn').addEventListener('click', function() {
        var statusEl = modal.querySelector('#cloud-status');
        this.disabled = true;
        statusEl.innerHTML = '<span style="color:#d29922;">正在准备下载...</span>';

        collectAndSaveConfig(function() {
          if (window.electronAPI && window.electronAPI.cloudDownload) {
            window.electronAPI.cloudDownload('gitee').then(function(result) {
              if (result.success) {
                statusEl.innerHTML = '<span style="color:#3fb950;">' + result.message + '</span>';
                // 下载成功后延迟关闭弹窗
                setTimeout(closeCloudModal, 2000);
              } else {
                statusEl.innerHTML = '<span style="color:#f85149;">' + (result.message || result.error || '下载失败') + '</span>';
              }
            }).catch(function(err) {
              statusEl.innerHTML = '<span style="color:#f85149;">⚠️ 下载异常：' + String(err.message || err) + '</span>';
            }).finally(function() {
              modal.querySelector('#cloud-download-btn').disabled = false;
            });
          } else {
            statusEl.innerHTML = '<span style="color:#f85149;">❌ 云同步接口不可用，请重启应用后重试</span>';
            modal.querySelector('#cloud-download-btn').disabled = false;
          }
        });
      });

      // 历史版本按钮
      modal.querySelector('#cloud-history-btn').addEventListener('click', function() {
        showCloudVersionsModal(modal);
      });

      // 新手教程链接
      modal.querySelector('#cloud-guide-link').addEventListener('click', function(e) {
        e.preventDefault();
        showCloudGuideModal(modal);
      });
    }

    function closeCloudModal() {
      var m = document.getElementById('cloud-modal');
      if (m) { m.remove(); _updateModal = null; }
    }

    /**
     * 历史版本选择弹窗：列出所有 Gitee commits，用户选择后恢复
     */
    function showCloudVersionsModal(parentModal) {
      if (parentModal) parentModal.style.visibility = 'hidden';

      var overlay = document.createElement('div');
      overlay.className = 'about-modal-overlay';
      overlay.id = 'cloud-versions-modal';

      overlay.innerHTML = ''
        + '<div class="about-modal-box" style="max-width:500px;">'
        + '  <div class="about-modal-header"><span>🕐 历史云备份版本</span><button class="about-modal-close" id="cv-close">✕</button></div>'
        + '  <div class="about-modal-body" style="padding:16px 20px;">'
        + '    <div id="cv-list" style="min-height:80px;display:flex;align-items:center;justify-content:center;">'
        + '      <span style="color:var(--text-secondary);font-size:13px;">正在加载历史版本...</span>'
        + '    </div>'
        + '    <div id="cv-status" style="margin-top:10px;text-align:center;font-size:12.5px;min-height:22px;"></div>'
        + '  </div>'
        + '</div>';

      document.body.appendChild(overlay);

      function closeVersionsModal() {
        overlay.remove();
        if (parentModal) parentModal.style.visibility = '';
      }

      overlay.querySelector('#cv-close').addEventListener('click', closeVersionsModal);
      overlay.addEventListener('click', function(e) { if (e.target === overlay) closeVersionsModal(); });

      var listEl = overlay.querySelector('#cv-list');
      var statusEl = overlay.querySelector('#cv-status');

      // 加载历史版本列表
      if (!window.electronAPI || !window.electronAPI.cloudListVersions) {
        listEl.innerHTML = '<span style="color:#f85149;">云同步接口不可用，请重启应用</span>';
        return;
      }

      window.electronAPI.cloudListVersions().then(function(result) {
        if (!result.success) {
          listEl.innerHTML = '<span style="color:#f85149;">' + (result.message || '获取失败') + '</span>';
          return;
        }
        var versions = result.versions || [];
        if (versions.length === 0) {
          listEl.innerHTML = '<span style="color:var(--text-secondary);">暂无历史备份记录</span>';
          return;
        }

        // 渲染版本列表
        var html = '<div style="max-height:340px;overflow-y:auto;">';
        versions.forEach(function(v, idx) {
          var d = new Date(v.date);
          var dateStr = d.getFullYear() + '-'
            + String(d.getMonth()+1).padStart(2,'0') + '-'
            + String(d.getDate()).padStart(2,'0') + ' '
            + String(d.getHours()).padStart(2,'0') + ':'
            + String(d.getMinutes()).padStart(2,'0');
          var msg = v.message.replace(/</g,'&lt;').replace(/>/g,'&gt;');
          html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border-color);">'
            + '  <div style="flex:1;min-width:0;">'
            + '    <div style="font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + msg + '">' + msg + '</div>'
            + '    <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">📅 ' + dateStr + (idx === 0 ? ' &nbsp;<span style="color:#3fb950;font-size:11px;">最新</span>' : '') + '</div>'
            + '  </div>'
            + '  <button class="action-btn secondary-btn cv-restore-btn" data-sha="' + v.sha + '" style="flex-shrink:0;padding:5px 12px;font-size:12px;">'
            + (idx === 0 ? '⬇ 下载' : '↩ 恢复')
            + '  </button>'
            + '</div>';
        });
        html += '</div>';
        listEl.innerHTML = html;

        // 绑定每个恢复按钮
        listEl.querySelectorAll('.cv-restore-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var sha = this.getAttribute('data-sha');
            var isLatest = this.textContent.trim().indexOf('下载') !== -1;
            var confirmMsg = isLatest
              ? '确定要下载并恢复最新云端备份吗？本地数据将被覆盖。'
              : '确定要恢复该历史版本吗？本地数据将被覆盖，此操作不可撤销！';
            if (!confirm(confirmMsg)) return;

            var allBtns = listEl.querySelectorAll('.cv-restore-btn');
            allBtns.forEach(function(b) { b.disabled = true; });
            statusEl.innerHTML = '<span style="color:#d29922;">正在恢复，请稍候...</span>';

            window.electronAPI.cloudDownloadVersion(sha).then(function(res) {
              if (res.success) {
                statusEl.innerHTML = '<span style="color:#3fb950;">' + res.message + '</span>';
                setTimeout(closeVersionsModal, 2000);
              } else {
                statusEl.innerHTML = '<span style="color:#f85149;">' + (res.message || '恢复失败') + '</span>';
                allBtns.forEach(function(b) { b.disabled = false; });
              }
            }).catch(function(err) {
              statusEl.innerHTML = '<span style="color:#f85149;">⚠️ ' + String(err.message || err) + '</span>';
              allBtns.forEach(function(b) { b.disabled = false; });
            });
          });
        });
      }).catch(function(err) {
        listEl.innerHTML = '<span style="color:#f85149;">⚠️ ' + String(err.message || err) + '</span>';
      });
    }

    /**
     * 新手教程模态框（分步骤指导用户如何配置）
     */
    function showCloudGuideModal(parentModal) {
      if (parentModal) parentModal.style.visibility = 'hidden';

      var guide = document.createElement('div');
      guide.className = 'about-modal-overlay';
      guide.id = 'cloud-guide-modal';

      guide.innerHTML = ''
        + '<div class="about-modal-box" style="max-width:500px;">'
        + '  <div class="about-modal-header"><span>📖 云同步新手教程</span><button class="about-modal-close" id="guide-close">✕</button></div>'
        + '  <div class="about-modal-body" style="padding:20px 24px;">'

        // Gitee 教程（直接显示，无需选择）
        + '  <div style="margin-bottom:12px;display:flex;align-items:center;gap:8px;">'
        + '    <span style="font-size:20px;">🦊</span>'
        + '    <span style="font-size:15px;font-weight:600;color:var(--text-primary);">Gitee 私有仓库</span>'
        + '  </div>'
        + '  <ol style="line-height:2;padding-left:18px;font-size:13.5px;">'
        + '    <li><b>注册/登录 Gitee</b><br><a target="_blank" href="https://gitee.com/" style="color:#58a6ff;">https://gitee.com/</a></li>'
        + '    <li><b>创建私有仓库</b><br>点击右上角 "+" → 新建仓库 → 名称填 "calendar-backup" → 设为<strong>私有</strong> → 创建</li>'
        + '    <li><b>生成私人令牌</b><br>头像 → 设置 → 私人令牌 → 生成新令牌 → 勾选 <b>projects</b> 权限 → 提交，复制 Token<br><span style="color:var(--text-tertiary);font-size:12px;">⚠ Token 只显示一次，请立即保存！</span></li>'
        + '    <li><b>填写到本软件</b><br>回到云同步窗口 → 填入 Token 和仓库名（如 calendar-backup）→ 保存</li>'
        + '  </ol>'
        + '  <div class="settings-hint-row" style="background:#1a3a5c;padding:10px 14px;border-radius:6px;margin-top:12px;line-height:1.7;font-size:12px;">'
        + '    💡 免费账户可创建私有仓库，数据完全在你自己的控制下'
        + '  </div>'

        + '    <div style="text-align:center;margin-top:18px;">'
        + '      <button class="action-btn primary-btn" id="guide-done-btn" style="padding:8px 32px;font-size:14px;">我知道了，去配置</button>'
        + '    </div>'
        + '  </div></div>';

      document.body.appendChild(guide);

      guide.querySelector('#guide-close').addEventListener('click', function() {
        if (parentModal) parentModal.style.visibility = '';
        guide.remove();
      });

      guide.querySelector('#guide-done-btn').addEventListener('click', function() {
        if (parentModal) parentModal.style.visibility = '';
        guide.remove();
        if (!document.getElementById('cloud-modal')) showCloudSyncModal();
      });

      guide.addEventListener('click', function(e) {
        if (e.target === guide) { if (parentModal) parentModal.style.visibility = ''; guide.remove(); }
      });
    }

    // 显示隐藏快捷键
    bindCheckboxChange('show-shortcut-key', 'showShortcutKey');
    var shortcutKeyRow = document.getElementById('shortcut-key-display-row');
    if (shortcutKeyRow) {
      shortcutKeyRow.style.display = settings.showShortcutKey ? '' : 'none';
    }

    // 高级Tab恢复默认
    var advancedRestoreBtn = document.getElementById('advanced-restore-default');
    if (advancedRestoreBtn) {
      advancedRestoreBtn.addEventListener('click', function() {
        settings.weekStart = 1;
        settings.firstWeek = 1;
        settings.restDays = [6, 0];
        settings.showRestDays = true;
        settings.autoStartup = false;
        settings.autoCheckUpdate = true;
        settings.showShortcutKey = true;
        saveSettings();
        applySettings();
        renderCalendar();
        showToast('高级设置已恢复默认');
      });
    }

    // =========================================
    //   辅助函数：通用事件绑定
    // =========================================
  function bindSelectChange(id, settingKey, reApply) {
    var el = document.getElementById(id);
    if (!el) { LogWarn('setting', '绑定失败: 元素不存在 ' + id); return; }
    el.addEventListener('change', function(e) {
      var oldVal = settings[settingKey];
      settings[settingKey] = e.target.value === 'true' ? true : e.target.value === 'false' ? false : !isNaN(parseInt(e.target.value)) ? parseInt(e.target.value) : e.target.value;
      LogEvent('setting', '下拉框变更', { id: id, key: settingKey, from: oldVal, to: settings[settingKey], reApply: reApply });
      try { saveSettings(); } catch(err) { LogError('setting', 'saveSettings 异常', { error: err.message }); }
      try { if (reApply) applySettings(); } catch(err) { LogError('setting', 'applySettings 异常', { error: err.message }); }
    });
  }

  function bindCheckboxChange(id, settingKey, callback) {
    var el = document.getElementById(id);
    if (!el) { LogWarn('setting', '绑定失败: 元素不存在 ' + id); return; }
    el.addEventListener('change', function(e) {
      var oldVal = settings[settingKey];
      settings[settingKey] = e.target.checked;
      LogEvent('setting', '复选框变更', { id: id, key: settingKey, from: oldVal, to: e.target.checked });
      try { saveSettings(); } catch(err) { LogError('setting', 'saveSettings 异常', { error: err.message }); }
      try { if (typeof callback === 'function') callback(); } catch(err) { LogError('setting', 'callback 异常', { error: err.message }); }
    });
  }

    function bindColorPickerChange(id, settingKey) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function(e) {
        LogEvent('setting', '颜色变更', { id: id, key: settingKey, value: e.target.value });
        settings[settingKey] = e.target.value;
        saveSettings();
        applySettings();
      });
    }

    // 标题栏 - 桌面模式切换按钮
    document.getElementById('desktop-toggle-btn').addEventListener('click', () => {
      settings.desktopMode = !settings.desktopMode;
      saveSettings();
      applyDesktopModeUI(settings.desktopMode);
      // 同步设置面板
      const toggle = document.getElementById('desktop-mode-toggle');
      if (toggle) toggle.checked = settings.desktopMode;
      // 通知 Electron 主进程
      if (window.electronAPI) {
        window.electronAPI.setDesktopMode(settings.desktopMode);
      }
    });

    // 标题栏 - 窗口控制
    if (window.electronAPI) {
      document.getElementById('titlebar-minimize').addEventListener('click', () => {
        window.electronAPI.minimize();
      });
      document.getElementById('titlebar-maximize').addEventListener('click', () => {
        window.electronAPI.maximize();
      });
      document.getElementById('titlebar-close').addEventListener('click', () => {
        window.electronAPI.close();
      });
      // 监听最大化状态变化
      window.electronAPI.onWindowMaximized((isMax) => {
        const btn = document.getElementById('titlebar-maximize');
        if (btn) btn.textContent = isMax ? '❐' : '□';
      });
    }

// 设置 - 导出数据
    document.getElementById('export-data-btn').addEventListener('click', () => {
      const format = document.getElementById('export-format').value;
      const rangeType = document.getElementById('export-range').value;
      
      // 获取日期范围
      let startDate = null, endDate = null;
      if (rangeType === '6months') {
        endDate = new Date();
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
      } else if (rangeType === 'custom') {
        const startInput = document.getElementById('export-start-date').value;
        const endInput = document.getElementById('export-end-date').value;
        if (startInput) startDate = new Date(startInput);
        if (endInput) endDate = new Date(endInput);
      }
      
      // 过滤任务
      const filteredTasks = {};
      for (const dateKey in tasksData) {
        const d = new Date(dateKey);
        if (startDate && d < startDate) continue;
        if (endDate && d > endDate) continue;
        filteredTasks[dateKey] = tasksData[dateKey];
      }
      
      const today = new Date().toISOString().slice(0,10);
      let filename, content, mime;
      
      if (format === 'txt') {
        let lines = [];
        for (const dateKey of Object.keys(filteredTasks).sort()) {
          const tasks = filteredTasks[dateKey];
          for (const task of tasks) {
            if (task && task.trim()) {
              lines.push(dateKey + '|' + task);
            }
          }
        }
        content = lines.join('\n');
        filename = '日历清单_' + today + '.txt';
        mime = 'text/plain';
      } else if (format === 'calendartask') {
        const data = {
          tasks: filteredTasks,
          dayColors: dayColors,
          settings: settings,
          exportedAt: new Date().toISOString(),
        };
        content = JSON.stringify(data, null, 2);
        filename = '日历清单_' + today + '.ctdb';
        mime = 'application/json';
      } else {
        // xlsx格式
        if (typeof XLSX === 'undefined') {
          alert('Excel库未加载，请刷新页面重试');
          return;
        }
        const rows = [['日期', '任务内容']];
        for (const dateKey of Object.keys(filteredTasks).sort()) {
          const tasks = filteredTasks[dateKey];
          for (const task of tasks) {
            if (task && task.trim()) {
              rows.push([dateKey, task]);
            }
          }
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '任务');
        const xlsxContent = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([xlsxContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '日历清单_' + today + '.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        showToast('导出成功');
        return;
      }
      
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast('导出成功');
    });
    
    // 导出时间范围切换
    document.getElementById('export-range').addEventListener('change', (e) => {
      const customRange = document.getElementById('export-custom-range');
      customRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
    });

// 设置 - 导入数据
    const importInput = document.getElementById('import-file-input');
    document.getElementById('import-data-btn').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const format = document.getElementById('import-format').value;
      const ext = file.name.split('.').pop().toLowerCase();
      
      try {
        if (format === 'txt' || ext === 'txt') {
          // 文本格式：每行一个任务，格式：日期|任务内容 或 纯任务
          const text = await file.text();
          const lines = text.split(/[\r\n]+/).filter(l => l.trim());
          const imported = {};
          let count = 0;
          
          for (const line of lines) {
            const parts = line.split('|');
            if (parts.length >= 2) {
              const date = parts[0].trim();
              const task = parts.slice(1).join('|').trim();
              if (date && task) {
                if (!imported[date]) imported[date] = [];
                imported[date].push(task);
                count++;
              }
            } else {
              // 使用本地日期（无前导零）
              const now = new Date();
              const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
              const task = line.trim();
              if (task) {
                if (!imported[today]) imported[today] = [];
                imported[today].push(task);
                count++;
              }
            }
          }
          
          // 合并到现有数据
          for (const date in imported) {
            if (!tasksData[date]) tasksData[date] = [];
            const existing = new Set(tasksData[date].map(t => t.trim()));
            for (const t of imported[date]) {
              if (!existing.has(t.trim())) {
                tasksData[date].push(t);
                existing.add(t.trim());
              }
            }
          }
          
          saveTasksData();
          renderCalendar();
          showToast('导入成功：' + count + '条任务');

        } else if (format === 'calendartask' || ext === 'ctdb' || ext === 'json') {
          const text = await file.text();
          const data = JSON.parse(text);
          
          if (data.tasks) {
            for (const date in data.tasks) {
              if (!tasksData[date]) tasksData[date] = [];
              const existing = new Set(tasksData[date].map(t => t.trim()));
              for (const t of data.tasks[date]) {
                if (t && t.trim() && !existing.has(t.trim())) {
                  tasksData[date].push(t);
                  existing.add(t.trim());
                }
              }
            }
            saveTasksData();
          }
          
          if (data.dayColors) {
            dayColors = Object.assign(dayColors || {}, data.dayColors);
            localStorage.setItem(DAY_COLORS_KEY, JSON.stringify(dayColors));
          }
          
          applySettings();
          renderCalendar();
          showToast('导入成功');

        } else if (format === 'xlsx' || ext === 'xlsx') {
          if (typeof XLSX === 'undefined') {
            alert('Excel库未加载，请刷新页面重试');
            return;
          }
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          const imported = {};
          let count = 0;
          
          // Excel日期转标准日期格式（无前导零，与dateKey保持一致）
          function excelToDate(n) {
            if (!n || isNaN(n)) return null;
            const d = new Date((n - 25569) * 86400 * 1000);
            // 使用本地时间获取年月日，避免时区导致差一天
            return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          }
          
          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            // row[0]可能是日期数字(如46157)或日期字符串
            let date = null;
            if (typeof row[0] === 'number') {
              date = excelToDate(row[0]);
            } else if (typeof row[0] === 'string' && row[0].match(/^\d{4}-\d{2}-\d{2}/)) {
              // 转换 "2026-01-05" -> "2026-1-5" (无前导零)
              const parts = row[0].slice(0, 10).split('-');
              date = parts[0] + '-' + parseInt(parts[1]) + '-' + parseInt(parts[2]);
            }
            const task = row[1] ? String(row[1]).trim() : null;
            
            if (date && task) {
              if (!imported[date]) imported[date] = [];
              imported[date].push(task);
              count++;
            }
          }
          
          for (const d in imported) {
            if (!tasksData[d]) tasksData[d] = [];
            const existing = new Set(tasksData[d].map(t => t.trim()));
            for (const t of imported[d]) {
              if (!existing.has(t.trim())) {
                tasksData[d].push(t);
                existing.add(t.trim());
              }
            }
          }
          
          saveTasksData();
          renderCalendar();
          showToast('导入成功：' + count + '条任务');
        } else if (format === 'db' || ext === 'db') {
          // 原版CalendarTask数据库(SQLite)导入
          if (typeof initSqlJs === 'undefined') {
            alert('数据库库未加载，请刷新页面重试');
            return;
          }
          
          const fileBuffer = await file.arrayBuffer();
          
          // 加载sql.js wasm文件
          const wasmResponse = await fetch('sql-wasm.wasm');
          const wasmBuffer = await wasmResponse.arrayBuffer();
          
          // 初始化sql.js
          const SQL = await initSqlJs({ wasmBinary: wasmBuffer });
          
          // 用用户文件创建数据库
          const db = new SQL.Database(new Uint8Array(fileBuffer));
          
          // 从item_table提取数据 (it_unique_id格式: dkcal_mdays_YYYYMMDD)
          const imported = {};
          let count = 0;
          
          try {
            const result = db.exec("SELECT it_unique_id, it_content FROM item_table");
            if (result[0]) {
              result[0].values.forEach(row => {
                const uniqueId = String(row[0] || '');
                const content = String(row[1] || '').trim();
                
                // 从unique_id提取日期 (dkcal_mdays_YYYYMMDD -> YYYY-M-D，无前导零)
                const match = uniqueId.match(/dkcal_mdays_(\d{4})(\d{2})(\d{2})/);
                if (match && content) {
                  const date = match[1] + '-' + parseInt(match[2]) + '-' + parseInt(match[3]);
                  if (!imported[date]) imported[date] = [];
                  imported[date].push(content);
                  count++;
                }
              });
            }
          } catch (e) {
            console.error('SQL error:', e);
          }
          
          db.close();
          
          if (count === 0) {
            alert('未找到有效数据，请确认是原版日历清单导出的.db文件');
            return;
          }
          
          for (const d in imported) {
            if (!tasksData[d]) tasksData[d] = [];
            const existing = new Set(tasksData[d].map(t => t.trim()));
            for (const t of imported[d]) {
              if (!existing.has(t.trim())) {
                tasksData[d].push(t);
                existing.add(t.trim());
              }
            }
          }
          
          saveTasksData();
          renderCalendar();
          showToast('导入成功：' + count + '条任务');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('导入失败：' + err.message);
      }
      
      importInput.value = '';
    });

    // 设置 - 清除所有数据
    document.getElementById('clear-all-btn').addEventListener('click', () => {
      if (confirm('确定要清除所有任务数据吗？此操作不可恢复！')) {
        tasksData = {};
        dayColors = {};
        saveTasksData();
        saveDayColors();
        renderCalendar();
        closeSettings();
      }
    });

    // Skill 包生成
    if (window.electronAPI) {
      // 生成 Skill 包内容
      async function generateSkillPackage() {
        const appInfo = await window.electronAPI.getAppInfo();

        // 从完整路径中提取环境变量格式的路径
        let displayPath = appInfo.dataFilePath;
        const homePath = appInfo.userDataPath.replace(/[/\\][^/\\]+$/, '');
        if (homePath.match(/^[A-Z]:$/)) {
          displayPath = appInfo.dataFilePath;
        } else if (homePath.includes('AppData')) {
          displayPath = '%APPDATA%\\' + appInfo.dataFilePath.split('AppData\\')[1];
        } else {
          displayPath = '~/' + appInfo.dataFilePath.split(homePath + '/')[1];
        }

        return `---
name: calendar-task
description: 日历任务管理 - 添加/查看/完成/删除日历任务。触发词：日历、任务、日程、查看任务、添加任务、任务清单、日历清单、待办事项、提醒、安排
---

# 任务清单 - 日历任务管理 Skill

本 Skill 用于操作「任务清单」桌面应用（原名"日历清单"）的任务数据。

## 应用信息

| 项目 | 值 |
|------|-----|
| **应用名称** | ${appInfo.appName} |
| **版本** | ${appInfo.version} |
| **程序路径** | ${appInfo.exePath} |

## 数据文件位置

\`${displayPath}\`

## 任务数据结构

\`\`\`json
{
  "2026-4-18": [
    {
      "id": "l1234567890abc",
      "text": "任务内容",
      "done": false,
      "createdAt": 1744924800000
    }
  ]
}
\`\`\`

**关键字段说明：**
- key 格式：\`YYYY-M-D\`（**月份和日期不加前导零**！如 \`2026-4-18\` 而非 \`2026-04-18\`）
- id 格式：\`Date.now().toString(36) + random\`，唯一标识
- done：布尔值，false=未完成，true=已完成
- createdAt：毫秒时间戳
- **已完成标记**：原文中带 \`(已完成)\` 的照抄保留，不要删除

## 核心功能一览

当前版本（v9+）支持以下功能：

### 视图与导航
- 📅 **月历视图**：以月历形式展示任务，支持翻月浏览、滚轮翻页、键盘←→翻页
- 📌 **桌面模式**：固定在桌面底层作为挂件使用，不被其他窗口遮挡
- 🔢 **周数显示**：左侧可选显示ISO周数
- 📏 **显示行数控制**：3~8周可调，适配不同窗口高度
- 📅 **已过星期数**：以今天为锚点，控制显示多少过去的星期

### 任务操作
- ✏️ **双击编辑**：双击任意日期格子弹出文本编辑窗口，每行一个任务
- ✓ **完成标记**：点击完成按钮或手动添加"(已完成)"标记
- 🗑️ **右键清空**：右键菜单可清空当天所有任务
- 🎨 **单元格颜色**：右键设置背景色标记重要日子
- 🔢 **自动编号**：支持圆点/数字序号前缀，彩色循环着色
- ↩️ **自动排末尾**：编辑完成后自动将任务排到列表末尾

### 外观与主题
- 🎨 **5套预设主题**：深蓝夜空 / 纯黑 / 深林绿 / 紫色魅惑 / 深海蓝
- 🖍️ **今日框样式**：颜色+粗细(1/2/3/5/7px)均可自定义
- 📝 **字号调节**：任务字体和日期字体独立可调
- 🔲 **单元格间距**：0~5px 可调
- 🌓 **透明度**：30%~100% 可调
- 🌙 **农历/节气/节日**：内置完整中国农历系统和法定节假日数据
- 🟨 **休息日高亮**：可自定义每周哪些天是休息日并高亮显示
- 📅 **月间隔线**：非当月的日期格子有视觉分隔

### 数据与系统
- 💾 **多格式导入导出**：txt / xlsx / ctdb(加密) / json / db原版
- 🔄 **自定义范围导出**：支持选择时间范围导出
- 🚀 **开机自启动**：Windows 系统级开机自启
- 📐 **窗口状态记忆**：记住窗口大小、位置、桌面模式
- ⌨️ **全局快捷键**：Ctrl+Alt+H 隐藏/显示窗口
- 🔔 **提示音**：编辑完成/通知提示音可开关
- 📋 **运行日志**：分级日志系统便于排查问题

## 操作步骤

### 方式一：直接读写 JSON 文件（推荐）

#### 1. 读取数据

直接读取任务数据文件并解析 JSON。文件路径见上方「数据文件位置」。

#### 2. 根据需求操作数据

**添加任务**：
1. 读取 JSON → 解析为对象
2. 在对应日期的数组中 push 新任务对象
3. 写回保存

**新任务标准格式**：
\`\`\`javascript
{
  id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
  text: "任务内容",
  done: false,
  createdAt: Date.now()
}
\`\`\`

**完成任务**：
1. 找到目标任务 → 将 \`done\` 设为 \`true\`
2. 写回保存

**删除任务**：
1. 找到目标任务的 index → 用 splice 删除
2. 写回保存

**批量查看某天任务**：
1. 读取 JSON → 找到对应日期的 key
2. 返回该数组（含每个任务的 id/text/done/createdAt）

#### 3. 保存文件

将修改后的完整 JSON 对象写回原文件路径。

### 示例对话流程

> 用户：「明天提醒我开会」
> → 读取数据 → 计算明天日期(key) → 构造新任务 → push 到数组 → 保存文件

> 用户：「看看今天有什么任务」
> → 读取数据 → 找到今天的 key → 返回任务列表（含完成状态）

> 用户：「把刚才那个任务标为完成」
> → 读取数据 → 找到最近添加的任务 → done=true → 保存

> 用户：「删除明天的所有任务」
> → 读取数据 → 将明天 key 对应的数组清空或 delete 整个 key → 保存

> 用户：「这周三到周五每天加一个'写日报'任务」
> → 读取数据 → 计算周三/周四/周五三个key → 各push一个新任务 → 保存

## ⚠️ 重要规则

1. **禁止使用数字 key**（如 Excel 日期序列号 "45948"），必须用 YYYY-M-D 字符串格式
2. **不要前导零**：用 \`2026-4-18\` 而不是 \`2026-04-18\`
3. **保留已完成标记**：原文含 \`(已完成)\` 的任务不要删除该文字
4. **原子操作**：每次修改都要「读→改→写」完整流程，不能只写不读
5. **文件不存在时**：创建空对象 \`{}\` 再操作
6. **任务 id 是唯一标识**：用于精确定位要删除/修改的任务
7. **日期计算要精确**：用编程语言的日期函数计算，不要手算天数偏移
8. **多任务场景**：同一日期可以有多个任务，注意追加而非覆盖
`;
      }

      // 生成 Skill 包按钮
      document.getElementById('skill-export-btn').addEventListener('click', async () => {
        try {
          const skillContent = await generateSkillPackage();
          const result = await window.electronAPI.copyToClipboard(skillContent);
          if (result.success) {
            showToast('Skill 包已复制到剪贴板！');
          } else {
            showToast('复制失败: ' + result.error);
          }
        } catch(e) {
          console.error('生成 Skill 包失败:', e);
          showToast('生成失败，请重试');
        }
      });

      // 监听 API 服务器就绪通知（保留用于加载状态）
      if (window.electronAPI && window.electronAPI.onApiServerReady) {
        window.electronAPI.onApiServerReady((data) => {
          if (data.ready) {
            LogInfo('system', 'API 服务器就绪');
          }
        });
      }

      // ===== 日志查看器 UI =====
      var _logFilterLevel = document.getElementById('log-filter-level');
      var _logFilterCategory = document.getElementById('log-filter-category');
      var _logContainer = document.getElementById('log-viewer-container');
      var _logSummaryBadge = document.getElementById('log-summary-badge');

      function _formatLogTime(ts) {
        var d = new Date(ts);
        var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
        return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '.' + ('00' + d.getMilliseconds()).slice(-3);
      }

      function _levelColor(lv) {
        switch (lv) {
          case 'error': return '#f87171';
          case 'warn': return '#facc15';
          case 'event': return '#4ade80';
          case 'info': return '#60a5fa';
          default: return '#9ca3af';
        }
      }

      function _renderLogViewer() {
        var opts = {};
        if (_logFilterLevel.value) opts.level = _logFilterLevel.value;
        if (_logFilterCategory.value) opts.category = _logFilterCategory.value;
        opts.limit = 200;
        var logs = GetLogs(opts);
        
        // 更新摘要
        var summary = GetLogSummary();
        _logSummaryBadge.textContent = t('logSummary').replace('{count}', summary.total).replace('{days}', LOG_MAX_DAYS);

        if (logs.length === 0) {
          _logContainer.innerHTML = '<span style="color:#666;">' + t('logNoMatch') + '</span>';
          return;
        }

        var html = '';
        for (var i = 0; i < logs.length; i++) {
          var l = logs[i];
          html += '<div style="border-bottom:1px solid rgba(255,255,255,0.04);padding:1px 0;">'
            + '<span style="color:#666;font-size:10.5px;">' + _formatLogTime(l.time) + '</span> '
            + '<span style="color:' + _levelColor(l.level) + ';font-weight:bold;font-size:10.5px;width:36px;display:inline-block;">[' + l.level.toUpperCase() + ']</span> '
            + '<span style="color:#c084fc;font-size:10.5px;">' + l.category + '</span>'
            + ' <span style="color:' + (l.level === 'error' ? '#f87171' : l.level === 'warn' ? '#facc15' : '#e0e8f0') + ';">' 
            + _escHtml(l.message) + '</span>';
          if (l.extra !== null && l.extra !== undefined) {
            try { html += ' <span style="color:#888;font-size:10.5px;">' + _escHtml(JSON.stringify(l.extra)) + '</span>'; } catch(e) {}
          }
          html += '</div>';
        }
        _logContainer.innerHTML = html;
        // 自动滚底
        _logContainer.scrollTop = _logContainer.scrollHeight;
      }

      function _escHtml(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      if (_logFilterLevel) _logFilterLevel.addEventListener('change', _renderLogViewer);
      if (_logFilterCategory) _logFilterCategory.addEventListener('change', _renderLogViewer);

      var _logClearBtn = document.getElementById('log-clear-btn');
      if (_logClearBtn) _logClearBtn.addEventListener('click', function() {
        ClearLogs();
        _renderLogViewer();
        showToast('!日志已清空');
      });

      // 日志展开/折叠按钮
      var _logToggleBtn = document.getElementById('log-toggle-btn');
      if (_logToggleBtn) {
        _logToggleBtn.addEventListener('click', function() {
          var container = document.getElementById('log-viewer-container');
          if (container.classList.contains('hidden')) {
            container.classList.remove('hidden');
            _logToggleBtn.textContent = '收起 ▲';
            _renderLogViewer();
          } else {
            container.classList.add('hidden');
            _logToggleBtn.textContent = '展开 ▼';
          }
        });
      }

      // 初始化渲染一次（不强制展开）
      setTimeout(function() { /* 默认折叠，不主动渲染 */ }, 500);

      // 设置面板打开时刷新
      var _settingsBtn = document.getElementById('settingsBtn') || document.getElementById('settings-btn');
      if (_settingsBtn) {
        _settingsBtn.addEventListener('click', function() {
          setTimeout(_renderLogViewer, 300);
        });
      }

      // ===== 打赏图加载 =====
      (function loadDonateImage() {
        if (!window.electronAPI || !window.electronAPI.getDonateImage) return;
        window.electronAPI.getDonateImage().then(function(result) {
          if (result && result.success) {
            var container = document.getElementById('donate-qr-img');
            if (container) {
              var img = document.createElement('img');
              img.src = result.data;
              img.alt = '打赏';
              img.style.cssText = 'width:140px;height:140px;display:block;';
              container.appendChild(img);
            }
          }
        }).catch(function() {});
      })();

      // ===== 关于页浮窗（功能介绍/常见问题）=====
      var aboutModalEl = null;

      // 浮窗内容
      var ABOUT_CONTENTS = {
        feature: {
          titleKey: 'featureIntro',
          title: '功能介绍',
          body: '<h4>核心功能</h4>'
            + '<ul style="padding-left:18px;line-height:1.8;">'
            + '  <li><b>日历视图</b>：以月历形式展示任务，直观清晰</li>'
            + '  <li><b>双击编辑</b>：双击任意日期格子，弹出编辑窗口</li>'
            + '  <li><b>右键菜单</b>：快速设置颜色、编辑、清空</li>'
            + '  <li><b>自动编号</b>：可选圆点/数字前缀，一目了然</li>'
            + '  <li><b>农历/节气/节日</b>：内置中国农历和法定节假日</li>'
            + '  <li><b>桌面模式</b>：固定在桌面作为挂件使用</li>'
            + '  <li><b>数据导入导出</b>：支持 txt/xlsx/ctdb/json 格式</li>'
            + '  <li><b>AI 对接</b>：生成 Skill 包让 AI 直接操作日历</li>'
            + '</ul>'
            + '<h4>显示控制</h4>'
            + '<ul style="padding-left:18px;line-height:1.8;">'
            + '  <li><b>显示周数</b>：控制窗口显示几周的日期</li>'
            + '  <li><b>已过星期数</b>：今天上面显示几周的历史日期</li>'
            + '  <li><b>主题切换</b>：深蓝夜空/纯黑/深林绿等多套主题</li>'
            + '</ul>'
        },
        faq: {
          titleKey: 'faq',
          title: '常见问题',
          body: '<h4>Q: 数据存储在哪里？</h4>'
            + '<p>A: 数据文件位于 %APPDATA%\\calendar-list\\ 目录下（calendar-tasks.json）。</p>'
            + '<h4>Q: 如何备份/恢复数据？</h4>'
            + '<p>A: 在 高级 → 数据管理 中选择「导出数据」(ctdb格式)，需要恢复时用「导入数据」即可。</p>'
            + '<h4>Q: 桌面模式是什么？</h4>'
            + '<p>A: 点击标题栏的「📌桌面模式」按钮后，窗口会固定在桌面底层，不会被其他窗口遮挡。</p>'
            + '<h4>Q: 任务太多格子放不下怎么办？</h4>'
            + '<p>A: 双击日期可以打开完整编辑器查看所有任务。也可以拖大窗口来显示更多内容。</p>'
            + '<h4>Q: 快捷键有哪些？</h4>'
            + '<p>A: ←→ 翻页 / Esc 关闭弹窗 / Ctrl+Alt+H 隐藏或显示窗口。</p>'
        },
        changelog: {
          titleKey: 'changelog',
          title: '更新日志',
          body: ''
            + '<div style="line-height:2;">'

            // v9.9.0 (2026-04-19) — Gitee 全线迁移
            + '<h4 style="color:#58a6ff;">✨ v9.9.0 — 2026年4月19日（Gitee全线迁移）</h4>'
            + '<ul style="line-height:1.8;padding-left:18px;font-size:12.5px;color:var(--text-secondary);">'
            + '  <li>🚀 自动更新切换到 Gitee Releases（国内直连，告别代理）</li>'
            + '  <li>🦊 云同步简化为纯Gitee模式，去掉服务商选择器</li>'
            + '  <li>⏳ 隐藏坚果云选项（待后续测试后再开放）</li>'
            + '  <li>🌐 网络检测改为检查Gitee可达性</li>'
            + '  <li>💬 所有错误提示改为通用中文，不再提及GitHub/代理</li>'
            + '</ul>'
            // v9.8.10 (2026-04-19) — 云同步体验大优化
            + '<h4 style="color:#58a6ff;">✨ v9.8.10 — 2026年4月19日（云同步优化）</h4>'
            + '<ul style="line-height:1.8;padding-left:18px;font-size:12.5px;color:var(--text-secondary);">'
            + '  <li>🗑️ 去掉Gitee用户名输入（Token自动解析登录名，填邮箱也能用）</li>'
            + '  <li>💾 记住上次选择的云服务商，打开弹窗自动选中，无需每次二选一</li>'
            + '  <li>🔄 修复下载后界面不刷新的严重bug（data-sync数据格式不匹配）</li>'
            + '</ul>'
            // v9.8.9 (2026-04-19) — Gitee 用户名自动解析
            + '<h4 style="color:#58a6ff;">✨ v9.8.9 — 2026年4月19日（Gitee修复）</h4>'
            + '<ul style="line-height:1.8;padding-left:18px;font-size:12.5px;color:var(--text-secondary);">'
            + '  <li>🐛 修复Gitee上传/下载404：用户名填邮箱时API路径错误</li>'
            + '  <li>🔧 上传前自动用Token查出真实登录名（支持填邮箱或手机号）</li>'
            + '  <li>💡 Gitee免费账户完全支持私有仓库和Contents API，无需付费</li>'
            + '</ul>'
            // v9.8.8 (2026-04-19) — 自动更新误弹窗修复
            + '<ul style="line-height:1.8;padding-left:18px;font-size:12.5px;color:var(--text-secondary);">'
            + '  <li>🐛 修复自动检查更新失败时弹出错误框的问题（启动时网络不通会莫名弹窗）</li>'
            + '  <li>🔇 现在只有手动点击"检查更新"才会显示错误提示，自动检查失败静默忽略</li>'
            + '</ul>'
            // v9.8.7 (2026-04-19) — 云同步体验优化
            + '<ul style="line-height:1.8;padding-left:18px;font-size:12.5px;color:var(--text-secondary);">'
            + '  <li>🐛 修复云同步错误提示显示英文代码（CONFIG_MISSING/UPLOAD_FAIL）</li>'
            + '  <li>💾 新增「保存配置」按钮，填写后可立即保存，下次打开自动填入</li>'
            + '  <li>✨ Gitee 仓库名默认预填「calendar-backup」，无需手动输入</li>'
            + '</ul>'
            // v9.8.6 (2026-04-19) — 智能代理检测+云同步设置
            + '<h4 style="color:#58a6ff;">✨ v9.8.6 — 2026年4月19日（核心修复）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🔧 <b>智能代理检测重写</b>：优先级1=用户手动配置 → 2=Windows系统代理(mode:system) → 3=环境变量 → 4=常见端口自动探测(7890/10809等)。解决Clash/VPN代理检测不到的问题</li>'
            + '  <li>⚙️ <b>云同步/代理设置入口</b>：新增设置页面，支持手动填写代理地址(如127.0.0.1:7890)，一键测试连接</li>'
            + '  <li>💥 <b>错误反馈升级</b>：更新检查失败时弹出醒目对话框（不再只是3秒消失的toast），详细列出排查步骤</li>'
            + '  <li>🌐 <b>手动检查更积极</b>：点击"检查更新"时启用端口扫描，自动探测本地代理端口</li>'
            + '</ul>'

            // v9.8.5 (2026-04-19) — VPN代理支持+超时机制
            + '<h4 style="color:#58a6ff;">✨ v9.8.5 — 2026年4月19日（核心修复）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🔧 <b>VPN/系统代理真正生效</b>：改用 session.setProxy() 设置代理（electron-updater 内部用 net 模块，不读环境变量！）。开启VPN后自动检测并走代理访问GitHub</li>'
            + '  <li>⏱️ <b>Promise 级超时保护</b>：主进程新增 checkWithTimeout()，即使 electron-updater 的 Promise 永远不 resolve，20~25秒后也会强制超时返回</li>'
            + '  <li>🎨 <b>UI 超时反馈优化</b>：等待8秒后提示"网络较慢"并添加呼吸动画；28秒强制判定超时</li>'
            + '  <li>📝 <b>错误提示更清晰</b>：区分网络超时、连接被拒等错误类型，给出具体建议</li>'
            + '</ul>'

            // v9.8.4 (2026-04-19) — Release补全+blockmap
            + '<h4 style="color:#58a6ff;">✨ v9.8.4 — 2026年4月19日（Release完善）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>📦 <b>GitHub Release补全</b>：上传latest.yml（含blockmap差量更新）和.blockmap文件到Release</li>'
            + '  <li>🚀 <b>Blockmap差量更新</b>：支持增量下载，小更新时只传输变化的块而非整个120MB包</li>'
            + '  <li>📝 <b>Release说明</b>：添加完整的版本更新说明（changelog）</li>'
            + '</ul>'

            // v9.8.3 (2026-04-18) — 星期头切换+更新逻辑修复
            + '<h4 style="color:#58a6ff;">✨ v9.8.3 — 2026年4月18日（Bug修复）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>英文模式星期头不切换</b>：applyLanguage()中遗漏调用updateWeekdayHeaders()，导致中英切换后周一~周日仍是中文</li>'
            + '  <li>🐛 <b>更新检查一直卡住</b>：setupSystemProxy使用异步resolveProxy但未await就发起请求，改为同步读取环境变量+resolveProxySync双保险</li>'
            + '  <li>🌐 <b>镜像源URL格式修正</b>：generic provider应指向releases/目录而非releases/latest，修正拼接方式</li>'
            + '  <li>🔧 <b>手动检查更新时重新检测代理</b>：updater-check IPC handler现在每次都会刷新代理设置</li>'
            + '</ul>'

            // v9.8.2 (2026-04-18) — 三个bug修复
            + '<h4 style="color:#58a6ff;">✨ v9.8.2 — 2026年4月18日（Bug修复）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>英文模式节气checkbox取消失败</b>：applyLanguage()中settings.showSolarTerm拼写错误(大写T应为小写t)，导致英文模式下取消勾选节气无效</li>'
            + '  <li>🐛 <b>开机自启动修复</b>：增加isPackaged判断+登录项验证日志，确保打包后路径正确</li>'
            + '  <li>🌐 <b>镜像源实装+VPN代理优化</b>：通过session.resolveProxy检测系统代理并设置环境变量，让更新请求走用户VPN/代理；镜像源切换现在真正生效</li>'
            + '  <li>📋 <b>更新后自动展示Changelog</b>：版本号变化时首次启动自动弹出更新日志窗口</li>'
            + '</ul>'

            // v9.8.1 (2026-04-18) — 国际化完善
            + '<h4 style="color:#58a6ff;">✨ v9.8.1 — 2026年4月18日（国际化完善）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🌍 <b>日历头国际化</b>：年月标题、星期名、周数列表头、"农历"信息全部走i18n</li>'
            + '  <li>🌍 <b>弹窗/对话框国际化</b>：更新对话框、错误toast、运行日志badge全面翻译</li>'
            + '  <li>⏱️ <b>25秒超时机制</b>：更新检查25秒无响应自动断开并报错</li>'
            + '  <li>🔀 <b>更新源选择器</b>：GitHub官方/ghproxy/ghfast三档可选</li>'
            + '</ul>'

            // v9.6.0 (2026-04-18) — 自动更新功能
            + '<h4 style="color:#58a6ff;">✨ v9.6.0 — 2026年4月18日（自动更新）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🔄 <b>自动检测更新</b>：启动后自动检查 GitHub Release 是否有新版本，发现后弹窗提示</li>'
            + '  <li>📦 <b>一键下载安装</b>：点击"立即更新"→显示下载进度条→完成后一键重启安装新版本</li>'
            + '  <li>⚙️ <b>可关闭自动检查</b>：高级设置中"自动检查更新"开关控制是否启动时检测</li>'
            + '  <li>💿 <b>打包格式升级</b>：从 portable 改为 NSIS 安装包，支持增量覆盖更新</li>'
            + '</ul>'

            // v9.5.4 (2026-04-18) — 透明度滑块拖动卡死修复
            + '<h4 style="color:#facc15;">🐛 v9.5.4 — 2026年4月18日（滑块卡死修复）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>透明度滑块拖动卡死修复</b>：input事件每帧调用applySettings()导致高频重绘窗口合成层卡死。改为：拖动时只更新数字和背景色（轻量），松手后才完整应用+保存</li>'
            + '</ul>'

            // v9.5.3 (2026-04-18) — 透明度=0桌面失控修复
            + '<h4 style="color:#facc15;">🐛 v9.5.3 — 2026年4月18日（透明度下限修复）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>透明度拉到0导致桌面失控修复</b>：transparent:true 窗口在完全透明时会拦截所有鼠标事件，用户看不到窗口但整块区域被"隐形玻璃"挡住。现已设置最低透明度5%</li>'
            + '</ul>'

            // v9.5.2 (2026-04-18) — 浮窗定位根因修复+UI优化
            + '<h4 style="color:#facc15;">🔧 v9.5.2 — 2026年4月18日（浮窗定位+UI优化）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>浮窗定位根因修复</b>：单元格创建时未设置 dataset.year/month/day 属性，导致 positionPopupNearClick 永远找不到目标格子，浮窗始终居中。现已修复，双击任意位置都能正确跟随格子定位</li>'
            + '  <li>📏 <b>字号范围扩大一倍</b>：任务字号/日期字号从原来的 ~6 个选项扩展到 12~30px 共 12 个选项可选</li>'
            + '  <li>🎚️ <b>透明度改为滑块</b>：0~100 连续可调（整数），替代原来只有 30/50/70/85/100 五个固定选项的下拉框</li>'
            + '</ul>'

            // v9.5.1 (2026-04-18) — 浮窗边界修复+任务行数可设置
            + '<h4 style="color:#facc15;">🔧 v9.5.1 — 2026年4月18日（浮窗修复+行数设置）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🔧 <b>浮窗边界智能防溢出</b>：双击底部/边缘格子时，编辑弹窗会根据实际尺寸自动调整位置，不再被窗口截断（上方放不下自动改到下方）</li>'
            + '  <li>📏 <b>任务显示行数可调</b>：单元格Tab新增"任务显示行数"选项——无限制/1行/2行/3行。默认"无限制"，单任务时完整展示不截断</li>'
            + '</ul>'

            // v9.5.0 (2026-04-18) — 全局透明度（透出桌面壁纸）
            + '<h4 style="color:#58a6ff;">✨ v9.5.0 — 2026年4月18日（全局透明度）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🪟 <b>全局透明窗口</b>：透明度设置现在控制整个窗口的透明度，可透过软件看到桌面壁纸</li>'
            + '  <li>🎨 <b>背景跟随透明度</b>：调整"单元格→透明度"滑块时，整个窗口实时变透明/不透明</li>'
            + '  <li>💡 <b>使用场景</b>：适合放在桌面上作为桌面挂件使用，与壁纸融合显示</li>'
            + '</ul>'

            // v9.4.5 (2026-04-18) — 桌面模式修正：窗口保持可用
            + '<h4 style="color:#facc15;">🔧 v9.4.5 — 2026年4月18日（桌面模式修正）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🔧 <b>桌面模式正确行为</b>：开启后窗口保持可见可用，只是任务栏图标从主区域移到右下角系统托盘区（skipTaskbar=true）</li>'
            + '  <li>🖱️ <b>托盘交互不变</b>：双击显示/聚焦窗口，右键菜单支持退出桌面模式和退出程序</li>'
            + '</ul>'

            // v9.4.4 (2026-04-18) — 桌面模式→系统托盘 + 自定义图标
            + '<h4 style="color:#58a6ff;">✨ v9.4.4 — 2026年4月18日（托盘模式+新图标）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🔔 <b>桌面模式=系统托盘</b>：开启后窗口隐藏，图标出现在右下角系统托盘区（通知区域），不占任务栏位置</li>'
            + '  <li>🖱️ <b>托盘交互</b>：双击托盘图标显示窗口；右键菜单支持"显示窗口/退出桌面模式/退出程序"</li>'
            + '  <li>🎨 <b>自定义应用图标</b>：全新设计的日历+勾选图标，替代Electron默认图标（exe/任务栏/托盘统一）</li>'
            + '  <li>🚪 <b>关闭按钮行为优化</b>：桌面模式下点×按钮隐藏到托盘而非退出程序</li>'
            + '</ul>'

            // v9.4.3 (2026-04-18) — 桌面模式右下角挂件
            + '<h4 style="color:#58a6ff;">✨ v9.4.3 — 2026年4月18日（桌面模式优化）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>📍 <b>桌面模式自动缩到右下角</b>：开启桌面模式后窗口缩小为340x380挂件尺寸，定位到系统托盘区域右下角（距右边20px，距底部10px）</li>'
            + '  <li>↩️ <b>退出桌面模式恢复原位</b>：关闭桌面模式时恢复到进入桌面模式前的窗口位置和大小，不再停留在挂件位置</li>'
            + '</ul>'

            // v9.4.2 (2026-04-18) — 窗口尺寸精度修复
            + '<h4 style="color:#facc15;">🔧 v9.4.2 — 2026年4月18日（精度修复）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>📐 <b>边缘智能吸附</b>：当窗口铺满左右/顶部时，重启后自动精确对齐工作区边缘（不再被硬编码padding吃掉像素）</li>'
            + '  <li>📐 <b>去掉硬编码边距</b>：之前强制留5/10/20/30px的padding，现在只在极端异常值时才做范围限制</li>'
            + '</ul>'

            // v9.4.1 (2026-04-18) — 修复workArea属性引用错误
            + '<h4 style="color:#facc15;">🐛 v9.4.1 — 2026年4月18日（热修）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>saveWindowState崩溃修复</b>：workArea是Rectangle对象(有x/y/width/height)，没有.bounds子属性。之前误用wa.bounds.x导致每次保存都报"Cannot read undefined x"，百分比数据永远写不进window-state.json！</li>'
            + '  <li>🔧 <b>恢复侧同步修复</b>：百分比还原代码中同样修正wa.bounds→wa，确保恢复逻辑与保存逻辑一致</li>'
            + '</ul>'

            // v9.4.0 (2026-04-18) — 多屏定位根因修复
            + '<h4 style="color:#58a6ff;">✨ v9.4.0 — 2026年4月18日（多屏定位重写）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🔧 <b>保存时机改为close事件</b>：在Windows回收窗口坐标之前立即保存（之前用closed事件太晚了，坐标已被钳回主屏）</li>'
            + '  <li>📌 <b>新增displayIndex追踪</b>：保存时记录所在显示器索引，恢复时直接定位到该屏幕，不再依赖绝对坐标找屏幕</li>'
            + '  <li>📐 <b>强制百分比格式</b>：宽高和位置全部用百分比存储/还原（xPct/yPct/widthPct/heightPct）</li>'
            + '  <li>🔄 <b>递归位置验证</b>：show后验证实际位置是否匹配目标，不匹配则自动递归重试最多3次（延迟200/400/600ms递增）</li>'
            + '  <li>🛡️ <b>before-quit双重保险</b>：应用退出前再次尝试保存状态，防止close事件被跳过</li>'
            + '</ul>'

            // v9.3.6 (2026-04-18) — 副屏诊断+双重定位
            + '<h4 style="color:#facc15;">🔧 v9.3.6 — 2026年4月18日（诊断版）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🔍 <b>多屏诊断日志</b>：启动时记录所有显示器信息(bounds/scaleFactor/isPrimary)，便于排查定位问题</li>'
            + '  <li>🔧 <b>setPosition+setSize分离</b>：show后用setPosition和setSize分开调用，并验证实际结果</li>'
            + '  <li>🔧 <b>失败自动重试</b>：首次定位不匹配时300ms后再次尝试</li>'
            + '</ul>'

            // v9.3.5 (2026-04-18) — 副屏定位show后延迟修复
            + '<h4 style="color:#facc15;">🐛 v9.3.5 — 2026年4月18日（热修）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>副屏定位终极方案</b>：Windows在show()时会重置窗口位置。改为show之后setTimeout(100ms)再执行setBounds，彻底绕过Windows的坐标钳制</li>'
            + '</ul>'

            // v9.3.4 (2026-04-18) — 副屏位置丢失终极修复
            + '<h4 style="color:#facc15;">🐛 v9.3.4 — 2026年4月18日（热修）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>副屏位置丢失根因修复</b>：Electron在Windows上构造BrowserWindow时会将坐标钳制到主屏范围（已知bug）。改为先创建窗口(不传x/y)，创建后立即用setBounds移到副屏正确位置</li>'
            + '</ul>'

            // v9.3.3 (2026-04-18) — 多分辨率DPI彻底重写

            + '<h4 style="color:#facc15;">🐛 v9.3.3 — 2026年4月18日（热修）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>多屏DPI修复重写</b>：窗口大小和位置改用占所在屏幕工作区的百分比存储（widthPct/heightPct/xPct/yPct），恢复时按当前屏幕实际尺寸计算像素值，彻底解决4K+5K等不同分辨率/DPI下重启后窗口变大问题</li>'
            + '</ul>'

            // v9.3.2 (2026-04-18) — 多分辨率DPI修复
            + '<h4 style="color:#facc15;">🐛 v9.3.2 — 2026年4月18日（热修）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>多屏DPI缩放修复</b>：主屏4K+副屏5K等不同分辨率/缩放下窗口重启后变大的问题已修复。保存时记录所在屏幕scaleFactor，恢复时自动按比例校正坐标和尺寸</li>'
            + '</ul>'

            // v9.3.1 (2026-04-18) — 桌面模式崩溃修复
            + '<h4 style="color:#facc15;">🐛 v9.3.1 — 2026年4月18日（热修）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>桌面模式解锁崩溃</b>：setMaximumSize(null,null)导致TypeError崩溃，改为(0,0)解除限制</li>'
            + '</ul>'

            // v9.3.0 (2026-04-18) — 自检修复+用户反馈修复
            + '<h4 style="color:#4ade80;">🔧 v9.3.0 — 2026年4月18日（自检+反馈修复）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>🐛 <b>今日框修复</b>：从 outline 改为 box-shadow 实现，修复全局CSS重置导致边框不可见的问题</li>'
            + '  <li>🐛 <b>今日框粗细生效</b>：1/2/3/5/7px 五档现在全部正常工作</li>'
            + '  <li>✨ <b>Skill模板全面重写</b>：覆盖v9全部功能（周数/字号/间距/透明度/休息日/日志等），新增更多示例对话和操作规则</li>'
            + '  <li>🐛 <b>多屏支持修复</b>：副屏位置不再丢失，窗口坐标校验改用 getAllDisplays() 匹配实际所在屏幕</li>'
            + '  <li>🐛 <b>桌面模式锁定</b>：进入后隐藏最小化/最大化/关闭按钮，禁止拖拽缩放（位置+大小完全锁死）</li>'
            + '  <li>🐛 <b>桌面模式切换尺寸修复</b>：修复退出桌面模式后窗口异常变大的问题（setResizable切换后需立即用setBounds纠正）</li>'
            + '</ul>'

            // v9.1.0 (2026-04-18) — 自检优化
            + '<h4 style="color:#facc15;">🎉 v9.1.0 — 2026年4月18日（自检优化）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>✨ <b>今日框粗细可调</b>：新增设置选项，支持 1/2/3/5/7px 五档边框粗细，默认3px更醒目</li>'
            + '  <li>✨ <b>今日框颜色提亮</b>：边框透明度从0.6提升至0.85，深色主题下更清晰</li>'
            + '  <li>🔧 <b>导出Skill全面重写</b>：模板内容与当前实际功能对齐，补充功能一览表和操作规则</li>'
            + '  <li>🔧 <b>语义化版本号</b>：采用「主版本.次版本.补丁」体系（9.1.0），替代简单序号</li>'
            + '  <li>🔧 <b>三处版本号统一</b>：package.json / HTML关于页 / 更新日志保持一致</li>'
            + '</ul>'

            // v9.0.0 (2026-04-18)
            + '<h4 style="color:#facc15;">v9.0.0 — 2026年4月18日（核心重构）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>✨ <b>已过星期数重做</b>：以今天为锚点，控制显示起始行，翻看其他月份自动切回传统月历模式</li>'
            + '  <li>✨ <b>显示周数</b>：原"最大行数"改名，控制窗口显示3~8周内容</li>'
            + '  <li>✨ <b>自动编号修复</b>：圆点和数字前缀正常工作，彩色循环着色</li>'
            + '  <li>🐛 <b>今日标记优化</b>：只保留边框轮廓，不再填充整格背景色</li>'
            + '  <li>🐛 <b>日志默认折叠</b>：运行日志区域默认隐藏，点击展开查看</li>'
            + '  <li>🔧 <b>关于页改造</b>：移除QQ群/邮箱/网址，新增功能介绍、常见问题、更新日志浮窗</li>'
            + '  <li>🔧 <b>打赏图嵌入</b>：通过IPC动态加载，防篡改</li>'
            + '  <li>🔧 <b>开机自启动</b>：真正实现系统级开机自启</li>'
            + '  <li>🔧 <b>记住窗口状态</b>：自动保存并恢复窗口大小、位置、桌面模式</li>'
            + '</ul>'

            // v8.0.0 (2026-04-17)
            + '<h4 style="color:#4ade80;">v8.0.0 — 2026年4月17日（全新UI）</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>✨ <b>全新UI设计</b>：深色透明桌面风格，无边框窗口</li>'
            + '  <li>✨ <b>桌面模式</b>：可固定在桌面上层作为常驻挂件</li>'
            + '  <li>✨ <b>农历/节气/节日</b>：内置完整中国农历系统</li>'
            + '  <li>✨ <b>多主题支持</b>：深蓝夜空、纯黑暗夜、深林绿等多套主题</li>'
            + '  <li>✨ <b>自定义休息日</b>：可设置任意星期为高亮休息日</li>'
            + '  <li>✨ <b>单元格背景色</b>：右键设置颜色标记重要日子</li>'
            + '  <li>✨ <b>内置日志系统</b>：分级日志便于排查问题</li>'
            + '  <li>✨ <b>数据管理</b>：导入导出 ctdb/txt/xlsx/json/db 格式</li>'
            + '</ul>'

            // v7.0.0 (基础版)
            + '<h4>v7.0.0 — 基础版本</h4>'
            + '<ul style="padding-left:16px;">'
            + '  <li>📅 月历视图展示任务</li>'
            + '  <li>✏️ 双击日期编辑任务文本</li>'
            + '  <li>🎯 任务完成标记与删除</li>'
            + '  <li>⌨️ 键盘快捷键翻页</li>'
            + '  <li>💾 本地JSON数据存储</li>'
            + '</ul>'

            + '</div>'
        }
      };

      function showAboutModal(key) {
        var content = ABOUT_CONTENTS[key];
        if (!content) return;
        
        // 标题使用i18n翻译（如果存在对应key）
        var translatedTitle = t(content.titleKey || content.title);
        
        // 如果已存在则先移除
        if (aboutModalEl) { aboutModalEl.remove(); }

        aboutModalEl = document.createElement('div');
        aboutModalEl.className = 'about-modal-overlay';
        aboutModalEl.innerHTML = ''
          + '<div class="about-modal-box">'
          + '  <div class="about-modal-header"><span>' + translatedTitle + '</span><button class="about-modal-close">✕</button></div>'
          + '  <div class="about-modal-body">' + content.body + '</div>'
          + '</div>';
        document.body.appendChild(aboutModalEl);

        // 关闭事件
        aboutModalEl.querySelector('.about-modal-close').addEventListener('click', function() {
          aboutModalEl.style.opacity = '0';
          setTimeout(function() { 
            if (aboutModalEl) { aboutModalEl.remove(); aboutModalEl = null; } 
          }, 200);
        });
        aboutModalEl.addEventListener('click', function(e) {
          if (e.target === aboutModalEl) {
            aboutModalEl.querySelector('.about-modal-close').click();
          }
        });
      }

      // 绑定关于页链接
      var featLink = document.getElementById('about-feature-intro');
      if (featLink) featLink.addEventListener('click', function(e) { e.preventDefault(); showAboutModal('feature'); });
      var faqLink = document.getElementById('about-faq');
      if (faqLink) faqLink.addEventListener('click', function(e) { e.preventDefault(); showAboutModal('faq'); });
      var changelogLink = document.getElementById('about-changelog');
      if (changelogLink) changelogLink.addEventListener('click', function(e) { e.preventDefault(); showAboutModal('changelog'); });

    }

    // Toast 提示
    function showToast(msg, duration = 2000) {
      // 如果关闭了温馨提示且不是重要提示（不含特定标记），则不显示
      if (!settings.displayToastTip && !msg.startsWith('!')) return;
      let toast = document.getElementById('toast-notification');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;z-index:99999;opacity:0;transition:opacity 0.3s;';
        document.body.appendChild(toast);
      }
      toast.textContent = msg.startsWith('!') ? msg.slice(1) : msg;
      toast.style.opacity = '1';
      setTimeout(() => { toast.style.opacity = '0'; }, duration);
    }

    // 温馨提示：在关键操作时显示
    function showWarmTip() {
      if (!settings.displayToastTip) return;
      const hour = new Date().getHours();
      let tip = '';
      if (hour < 6) tip = '夜深了，注意休息哦 🌙';
      else if (hour < 9) tip = '早上好！新的一天开始了 ☀️';
      else if (hour < 12) tip = '上午效率最高，加油！💪';
      else if (hour < 14) tip = '中午了，记得休息一下 🍵';
      else if (hour < 18) tip = '下午继续努力，你可以的 ✨';
      else if (hour < 22) tip = '晚上好，整理一下今天的任务吧 📋';
      else tip = '早点休息，明天见 😴';
      showToast(tip, 3000);
    }

    // 首次打开设置面板时显示温馨提示（仅 displayToastTip 开启时）
    var _settingsOpenCount = 0;

    // 右键菜单
    document.getElementById('ctx-edit').addEventListener('click', () => {
      if (contextTargetDate) openPopup(contextTargetDate.y, contextTargetDate.m, contextTargetDate.d);
      hideContextMenu();
    });
    document.getElementById('ctx-color').addEventListener('click', () => {
      if (contextTargetDate) openPopup(contextTargetDate.y, contextTargetDate.m, contextTargetDate.d);
      hideContextMenu();
    });
    document.getElementById('ctx-clear').addEventListener('click', () => {
      if (contextTargetDate) {
        const { y, m, d } = contextTargetDate;
        const key = dateKey(y, m, d);
        if (tasksData[key] && tasksData[key].length > 0) {
          if (confirm(`确定要清空 ${y}年${m+1}月${d}日 的所有任务吗？`)) {
            delete tasksData[key];
            saveTasksData();
            renderCalendar();
          }
        }
      }
      hideContextMenu();
    });

    // 点击空白关闭右键菜单
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#context-menu')) hideContextMenu();
    });

    // ESC / 键盘翻月
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePopup();
        closeSettings();
        hideContextMenu();
        // 关闭更新结果弹窗
        if (_updateModal) {
          _updateModal.remove();
          _updateModal = null;
        }
      }
      // 左右箭头翻月
      const popup = document.getElementById('task-popup');
      if (!popup.classList.contains('hidden')) return;
      if (e.key === 'ArrowLeft') {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
      }
      if (e.key === 'ArrowRight') {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
      }
    });

    // 鼠标滚轮翻月
    document.getElementById('calendar-grid').addEventListener('wheel', (e) => {
      const popup = document.getElementById('task-popup');
      if (!popup.classList.contains('hidden')) return;
      if (e.deltaY > 0) {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      } else {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      }
      renderCalendar();
    }, { passive: true });
  }

  function updateWeekdayHeaders() {
    const weekdays = document.querySelectorAll('#weekdays .weekday');
    const labels = settings.weekStart === 1
      ? [t('monday'),t('tuesday'),t('wednesday'),t('thursday'),t('friday'),t('saturday'),t('sunday')]
      : [t('sunday'),t('monday'),t('tuesday'),t('wednesday'),t('thursday'),t('friday'),t('saturday')];
    const weekendCols = settings.weekStart === 1 ? [5, 6] : [0, 6];
    
    // 周数列表头（动态插入/删除）
    const weekdaysEl = document.getElementById('weekdays');
    let wnHeader = document.getElementById('week-num-header');
    if (settings.showWeekNum && !wnHeader) {
      wnHeader = document.createElement('div');
      wnHeader.id = 'week-num-header';
      wnHeader.className = 'weekday week-num-header';
      wnHeader.textContent = t('weekLabel');
      weekdaysEl.insertBefore(wnHeader, weekdaysEl.firstChild);
      weekdaysEl.style.gridTemplateColumns = 'repeat(8, 1fr)';
    } else if (!settings.showWeekNum && wnHeader) {
      wnHeader.remove();
      weekdaysEl.style.gridTemplateColumns = 'repeat(7, 1fr)';
    }

    // 今日标记栏：在今天的列底部显示标记
    let todayMarkerRow = document.getElementById('today-marker-row');
    if (settings.showTodayMarker && !todayMarkerRow) {
      const grid = document.getElementById('calendar-grid');
      const colCount = settings.showWeekNum ? 8 : 7;
      todayMarkerRow = document.createElement('div');
      todayMarkerRow.id = 'today-marker-row';
      todayMarkerRow.style.cssText = 'display:grid;grid-template-columns:repeat(' + colCount + ',1fr);gap:1px;margin-top:-1px;';
      for (let i = 0; i < colCount; i++) {
        const cell = document.createElement('div');
        cell.style.cssText = 'height:3px;background:transparent;';
        cell.dataset.col = String(i);
        todayMarkerRow.appendChild(cell);
      }
      grid.parentNode.insertBefore(todayMarkerRow, grid.nextSibling);
    } else if (!settings.showTodayMarker && todayMarkerRow) {
      todayMarkerRow.remove();
    }
    // 更新今日标记位置
    if (settings.showTodayMarker && todayMarkerRow) {
      todayMarkerRow.querySelectorAll('[data-col]').forEach(c => { c.style.background = 'transparent'; });
      const todayDow = new Date().getDay();
      let targetCol;
      if (settings.weekStart === 1) {
        targetCol = todayDow === 0 ? 6 : todayDow - 1;
      } else {
        targetCol = todayDow;
      }
      if (settings.showWeekNum) targetCol += 1;
      const markerCell = todayMarkerRow.querySelector('[data-col="' + targetCol + '"]');
      if (markerCell) markerCell.style.background = 'var(--border-today)';
    }

    weekdays.forEach((el, i) => {
      el.textContent = labels[i];
      el.classList.toggle('weekend', weekendCols.includes(i));
    });
  }

  // =========================================
  //   初始化
  // =========================================
  function init() {
    LogInfo('init', '=== 应用启动 ===');
    // 全局错误捕获
    window.onerror = function(msg, url, line, col, error) {
      LogError('error', '未捕获异常', { message: msg, url: url, line: line, col: col });
      console.error('[日历清单] ERROR:', msg, 'at', url, ':', line);
      return false;
    };
    
    // Promise 未捕获
    if (window.addEventListener) {
      window.addEventListener('unhandledrejection', function(e) {
        LogError('error', 'Promise 未捕获拒绝', { reason: String(e.reason) });
      });
    }

    loadData();
    LogInfo('init', 'loadData() 完成');

    applySettings();
    LogInfo('init', 'applySettings() 完成', { theme: settings.theme, fontSize: settings.fontSize, displayWeeks: settings.displayWeeks });

    updateWeekdayHeaders();
    LogInfo('init', 'updateWeekdayHeaders() 完成');

    renderCalendar();
    LogInfo('init', 'renderCalendar() 完成');

    bindEvents();
    LogInfo('init', 'bindEvents() 完成');

    initPopupDrag();
    initWindowResize();
    initTitlebar();

    // 检测是否刚更新完成（版本号变化），自动展示更新日志
    checkAndShowChangelog();

    // 暴露全局 API
    exposeGlobalAPI();
    LogInfo('init', 'exposeGlobalAPI() 完成');

    // 设置数据同步监听
    if (window.electronAPI) {
      // 请求从主进程同步数据（如果有的话）
      window.electronAPI.requestDataSync();
      
      // 监听主进程发来的数据同步
      window.electronAPI.onDataSync((data) => {
        LogInfo('sync', '收到主进程数据同步', { hasTasks: !!data.tasks, hasSettings: !!data.settings, hasDayColors: !!data.dayColors });
        if (data.tasks) {
          tasksData = data.tasks;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksData));
        }
        if (data.settings) {
          settings = Object.assign(settings, data.settings);
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        }
        if (data.dayColors) {
          dayColors = data.dayColors;
          localStorage.setItem(DAY_COLORS_KEY, JSON.stringify(dayColors));
        }
        renderCalendar();
      });
      
      // 监听 API 更新（其他程序通过 HTTP API 修改了数据）
      window.electronAPI.onDataUpdatedFromApi((data) => {
        LogEvent('sync', '收到外部 API 数据更新', { hasTasks: !!data.tasks });
        if (data.tasks) {
          tasksData = data.tasks;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksData));
          renderCalendar();
        }
      });
      
      LogInfo('init', '数据同步已就绪');
    }
    
    LogInfo('init', '=== 启动完成 ===');
  }

  // =========================================
  //   全局 API（供外部读写数据）
  // =========================================
  function exposeGlobalAPI() {
    // 暴露关键函数用于调试
    window.__renderCalendar = renderCalendar;
    window.__settings = settings;

    // 日志系统
    window.__logs = {
      get: GetLogs,
      summary: GetLogSummary,
      clear: ClearLogs
    };
    LogInfo('system', '日志系统已就绪');

    window.CalendarApp = {
      // 获取所有任务
      getTasks: function() {
        return JSON.parse(JSON.stringify(tasksData));
      },

      // 获取某天任务（支持两种调用方式）
      getTasksForDate: function(y, m, d) {
        // 支持 getTasksForDate(2026, 3, 16) 或 getTasksForDate({year, month, day})
        if (typeof y === 'object') {
          const params = y;
          y = params.year; m = params.month; d = params.day;
        }
        return JSON.parse(JSON.stringify(getTasksForDay(y, m - 1, d)));
      },

      // 添加任务（支持两种调用方式）
      addTask: function(y, m, d, text) {
        // 支持 addTask(2026, 3, 16, '任务') 或 addTask({year, month, day, text})
        if (typeof y === 'object') {
          const params = y;
          y = params.year; m = params.month; d = params.day; text = params.text;
        }
        // 外部 API 传入 1-12 月，内部需要 0-11
        const monthIndex = m - 1;
        if (!text || !y || monthIndex < 0 || d < 1) return false;
        const key = dateKey(y, monthIndex, d);
        if (!tasksData[key]) tasksData[key] = [];
        tasksData[key].push({
          id: generateId(),
          text: String(text),
          done: false,
          createdAt: Date.now(),
        });
        saveTasksData();
        renderCalendar();
        return true;
      },

      // 删除任务
      removeTask: function(y, m, d, taskId) {
        // 支持 removeTask(y, m, d, id) 或 removeTask({year, month, day, taskId})
        if (typeof y === 'object') {
          const params = y;
          y = params.year; m = params.month; d = params.day; taskId = params.taskId;
        }
        const monthIndex = m - 1;
        const key = dateKey(y, monthIndex, d);
        if (tasksData[key]) {
          const idx = tasksData[key].findIndex(t => t.id === taskId);
          if (idx !== -1) {
            tasksData[key].splice(idx, 1);
            if (tasksData[key].length === 0) delete tasksData[key];
            saveTasksData();
            renderCalendar();
            return true;
          }
        }
        return false;
      },

      // 切换任务完成状态
      toggleTask: function(y, m, d, taskId) {
        // 支持 toggleTask(y, m, d, id) 或 toggleTask({year, month, day, taskId})
        if (typeof y === 'object') {
          const params = y;
          y = params.year; m = params.month; d = params.day; taskId = params.taskId;
        }
        const monthIndex = m - 1;
        const key = dateKey(y, monthIndex, d);
        if (tasksData[key]) {
          const task = tasksData[key].find(t => t.id === taskId);
          if (task) {
            task.done = !task.done;
            saveTasksData();
            renderCalendar();
            return task.done;
          }
        }
        return null;
      },

      // 获取日期颜色
      getDayColor: function(y, m, d) {
        if (typeof y === 'object') {
          const params = y;
          y = params.year; m = params.month; d = params.day;
        }
        return dayColors[dateKey(y, m - 1, d)] || null;
      },

      // 设置日期颜色
      setDayColor: function(y, m, d, colorValue) {
        if (typeof y === 'object') {
          const params = y;
          y = params.year; m = params.month; d = params.day; colorValue = params.color;
        }
        const key = dateKey(y, m - 1, d);
        if (colorValue) {
          dayColors[key] = colorValue;
        } else {
          delete dayColors[key];
        }
        saveDayColors();
        renderCalendar();
      },

      // 获取设置
      getSettings: function() {
        return Object.assign({}, settings);
      },

      // 更新设置
      setSettings: function(newSettings) {
        Object.assign(settings, newSettings);
        saveSettings();
        applySettings();
        renderCalendar();
      },

      // 获取/设置桌面模式
      getDesktopMode: function() {
        return !!settings.desktopMode;
      },
      setDesktopMode: function(enabled) {
        settings.desktopMode = !!enabled;
        saveSettings();
        applyDesktopModeUI(settings.desktopMode);
        const toggle = document.getElementById('desktop-mode-toggle');
        if (toggle) toggle.checked = settings.desktopMode;
        if (window.electronAPI) {
          window.electronAPI.setDesktopMode(settings.desktopMode);
        }
      },

      // 获取所有数据（用于备份）
      exportAll: function() {
        return {
          tasks: tasksData,
          dayColors: dayColors,
          settings: settings,
        };
      },

      // 导入数据
      importAll: function(data) {
        if (data.tasks) {
          tasksData = data.tasks;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksData));
        }
        if (data.dayColors) {
          dayColors = data.dayColors;
          localStorage.setItem(DAY_COLORS_KEY, JSON.stringify(dayColors));
        }
        if (data.settings) {
          settings = Object.assign(settings, data.settings);
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        }
        applySettings();
        renderCalendar();
      },

      // 清除所有数据
      clearAll: function() {
        tasksData = {};
        dayColors = {};
        saveTasksData();
        saveDayColors();
        renderCalendar();
      },

      // 跳转到指定月份
      goTo: function(y, m) {
        currentYear = y;
        currentMonth = m;
        renderCalendar();
      },

      // 回到今天
      goToday: function() {
        currentYear = today.getFullYear();
        currentMonth = today.getMonth();
        renderCalendar();
      },
    };
  }

  // ==========================================
  //   自动更新（监听主进程更新事件 + 显示UI）
  // ==========================================
  var _updateModal = null;
  var _updateState = null;
  var _checkingForUpdate = false; // 标记是否正在进行手动检查
  var _currentUpdateCheckId = 0; // 当前检查操作ID，用于忽略过期响应
  var _updateTimer = null; // 倒计时定时器

  function initAutoUpdate() {
    if (window.electronAPI && window.electronAPI.onUpdateStatus) {
      window.electronAPI.onUpdateStatus(function(data) {
        handleUpdateEvent(data);
      });
    }
  }

  function handleUpdateEvent(data) {
    switch (data.state) {
      case 'available':
        showUpdateDialog(data);
        break;
      case 'not-available':
        // 手动检查时使用版本对比弹窗，自动比较版本号判断是否有新版本
        if (_checkingForUpdate) {
          _checkingForUpdate = false;
          var sv = data.version || _localVersion || '?';
          var lv = _localVersion || '?';
          // 比较版本号：服务器版本 > 本地版本 → 有更新
          var isNewer = compareVersions(sv, lv) > 0;
          showVersionCompareDialog(lv, sv, isNewer);
        }
        break;
      case 'downloading':
        if (_updateModal) updateDownloadProgress(data.percent);
        break;
      case 'downloaded':
        if (_updateModal) updateDownloadComplete(data.version);
        break;
      case 'error':
        // 只有用户主动点击"检查更新"时才弹窗报错，自动检查失败静默忽略
        if (_checkingForUpdate) {
          _checkingForUpdate = false;
          if (data.message) {
            showUpdateResultDialog(false, null, data.message);
          }
          // 重置按钮状态
          var btn = document.getElementById('btn-check-update-about');
          var st = document.getElementById('update-status-text');
          if (btn) { btn.disabled = false; btn.textContent = t('updateCheck'); }
          if (st) { st.textContent = ''; st.style.animation = ''; }
        }
        break;
    }
  }

  // 显示更新结果弹窗（已是最新 / 出错）
  // isLatest: true=已是最新, false=出错或无需更新
  // serverVersion: 服务器上的版本号（如果有）
  function showUpdateResultDialog(isLatest, serverVersion, customMsg) {
    console.log('[DEBUG] showUpdateResultDialog 调用', {
      _updateModal: _updateModal,
      isLatest: isLatest,
      serverVersion: serverVersion,
      customMsg: customMsg,
      stack: new Error().stack
    });
    if (_updateModal) {
      console.log('[DEBUG] 弹窗已存在，跳过');
      return; // 防止重复弹窗
    }
    _updateModal = true; // 先加锁

    var title, bodyText;
    if (isLatest) {
      title = t('latestVersion');
      bodyText = '✅ 已是最新版本\n\n📱 本地版本：v' + (_localVersion || '?') + '\n☁️ 服务器版本：v' + (serverVersion || '?');
    } else {
      title = customMsg ? customMsg.split('\n')[0] : t('updateFailed');
      bodyText = customMsg || '';
    }

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-secondary,#1a1a2e);border:1px solid var(--border,#333);border-radius:12px;padding:24px 28px;max-width:360px;width:90%;text-align:center;';

    var header = document.createElement('div');
    header.style.cssText = 'font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:16px;';
    header.textContent = title;

    var body = document.createElement('p');
    body.style.cssText = 'font-size:14px;color:var(--text-secondary);line-height:1.8;margin:0 0 20px 0;white-space:pre-line;text-align:left;';
    body.textContent = bodyText;

    var btn = document.createElement('button');
    btn.style.cssText = 'background:var(--accent,#4a9eff);color:#fff;border:none;border-radius:6px;padding:8px 32px;font-size:14px;cursor:pointer;';
    btn.textContent = t('confirm');
    btn.addEventListener('click', closeResultModal);

    box.appendChild(header);
    box.appendChild(body);
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    _updateModal = overlay;

    function closeResultModal() {
      overlay.remove();
      _updateModal = null;
    }

    // 点击遮罩层关闭
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeResultModal();
    });
  }

  /**
   * 比较两个语义化版本号
   * @param {string} v1 - 版本号1
   * @param {string} v2 - 版本号2
   * @returns {number} v1>v2 返回正数, v1<v2 返回负数, 相等返回0
   */
  function compareVersions(v1, v2) {
    var p1 = (v1 || '0').replace(/^v/i, '').split('.');
    var p2 = (v2 || '0').replace(/^v/i, '').split('.');
    var len = Math.max(p1.length, p2.length);
    for (var i = 0; i < len; i++) {
      var n1 = parseInt(p1[i] || '0', 10) || 0;
      var n2 = parseInt(p2[i] || '0', 10) || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }

  /**
   * 版本对比弹窗 - 显示本地版本 vs 服务器版本
   * @param {string} localVer - 本地版本号
   * @param {string} serverVer - 服务器版本号  
   * @param {boolean} hasNewVersion - 是否有新版本可更新
   * @param {string} releaseNotes - 更新说明（可选）
   */
  function showVersionCompareDialog(localVer, serverVer, hasNewVersion, releaseNotes) {
    if (_updateModal) return;
    
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-secondary,#1a1a2e);border:1px solid var(--border,#333);border-radius:12px;padding:24px 28px;max-width:400px;width:90%;text-align:center;';

    // 标题
    var header = document.createElement('div');
    header.style.cssText = 'font-size:18px;font-weight:600;color:var(--text-primary);margin-bottom:20px;';
    header.textContent = hasNewVersion ? '🆕 发现新版本' : '✅ 已是最新版本';
    box.appendChild(header);

    // 版本信息区域
    var versionBox = document.createElement('div');
    versionBox.style.cssText = 'background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;margin-bottom:16px;text-align:left;';

    versionBox.innerHTML = ''
      + '<div style="display:flex;justify-content:space-between;margin-bottom:10px;">'
      + '<span style="color:#888;font-size:13px;">📱 本地版本</span>'
      + '<span style="color:var(--text-primary);font-weight:600;font-size:14px;">v' + escapeHtml(localVer || '?') + '</span>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;">'
      + '<span style="color:#888;font-size:13px;">☁️ 服务器版本</span>'
      + '<span style="color:' + (hasNewVersion ? '#4a9eff;' : '#3fb950;') + 'font-weight:600;font-size:14px;">v' + escapeHtml(serverVer || '?') + '</span>'
      + '</div>';
    
    box.appendChild(versionBox);

    // 更新说明
    if (hasNewVersion && releaseNotes) {
      var notesEl = document.createElement('p');
      notesEl.style.cssText = 'font-size:13px;color:var(--text-secondary);line-height:1.6;margin:0 0 20px 0;text-align:left;';
      notesEl.innerHTML = '<b>更新内容：</b><br>' + escapeHtml(releaseNotes).replace(/\n/g, '<br>');
      box.appendChild(notesEl);
    }

    // 状态提示文字
    if (!hasNewVersion) {
      var tipEl = document.createElement('p');
      tipEl.style.cssText = 'font-size:13px;color:#3fb950;margin:0 0 20px 0;';
      tipEl.textContent = '当前已是最新版本，无需更新。';
      box.appendChild(tipEl);
    }

    // 按钮区
    var btnArea = document.createElement('div');
    btnArea.style.cssText = 'display:flex;gap:10px;justify-content:center;';
    
    if (hasNewVersion) {
      // 有更新：显示"稍后"和"立即更新"
      var laterBtn = document.createElement('button');
      laterBtn.style.cssText = 'background:rgba(255,255,255,0.1);color:var(--text-primary);border:none;border-radius:6px;padding:8px 24px;font-size:14px;cursor:pointer;';
      laterBtn.textContent = '稍后';
      
      var updateBtn = document.createElement('button');
      updateBtn.style.cssText = 'background:var(--accent,#4a9eff);color:#fff;border:none;border-radius:6px;padding:8px 28px;font-size:14px;cursor:pointer;font-weight:600;';
      updateBtn.textContent = '🔄 立即更新';
      
      btnArea.appendChild(laterBtn);
      btnArea.appendChild(updateBtn);

      laterBtn.addEventListener('click', function() {
        overlay.remove();
        _updateModal = null;
      });
      updateBtn.addEventListener('click', function() {
        overlay.remove();
        _updateModal = null;
        // 触发下载更新
        if (window.electronAPI && window.electronAPI.updaterDownload) {
          window.electronAPI.updaterDownload();
        }
      });
    } else {
      // 已是最新：只显示确定按钮
      var confirmBtn = document.createElement('button');
      confirmBtn.style.cssText = 'background:var(--accent,#4a9eff);color:#fff;border:none;border-radius:6px;padding:8px 40px;font-size:14px;cursor:pointer;';
      confirmBtn.textContent = '确定';
      
      btnArea.appendChild(confirmBtn);
      confirmBtn.addEventListener('click', function() {
        overlay.remove();
        _updateModal = null;
      });
    }
    
    box.appendChild(btnArea);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    
    _updateModal = overlay;

    // 点击遮罩层关闭
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { overlay.remove(); _updateModal = null; }
    });
  }

  function showUpdateDialog(info) {
    if (_updateModal) return;
    _updateState = info;

    _updateModal = document.createElement('div');
    _updateModal.className = 'about-modal-overlay';
    _updateModal.innerHTML = ''
      + '<div class="about-modal-box" style="max-width:400px;">'
      + '  <div class="about-modal-header"><span>' + t('newVersionFound') + '</span><button class="about-modal-close" id="update-close-btn">✕</button></div>'
      + '  <div class="about-modal-body" style="line-height:1.8;">'
      + '    <p style="font-size:15px;margin-bottom:8px;"><b>v' + (info.version || '?') + '</b></p>'
      + (info.releaseNotes ? '<p style="color:var(--text-secondary);font-size:13px;">' + escapeHtml(info.releaseNotes.replace(/\n/g,'<br/>')) + '</p>' : '')
      + '    <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">'
      + '      <button class="action-btn" id="update-later-btn" style="padding:6px 16px;">' + t('laterBtn') + '</button>'
      + '      <button class="action-btn primary-btn" id="update-download-btn" style="padding:6px 20px;background:var(--accent);">' + t('downloadNowBtn') + '</button>'
      + '    </div>'
      + '    <div id="update-progress-wrap" style="display:none;margin-top:12px;">'
      + '      <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:20px;overflow:hidden;">'
      + '        <div id="update-progress-bar" style="height:100%;width:0%;background:var(--accent);transition:width 0.3s;border-radius:4px;"></div>'
      + '      </div>'
      + '      <div id="update-progress-text" style="text-align:center;font-size:12px;color:var(--text-secondary);margin-top:4px;">' + t('preparingDownload') + '</div>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(_updateModal);

    _updateModal.querySelector('#update-close-btn').addEventListener('click', closeUpdateModal);
    _updateModal.querySelector('#update-later-btn').addEventListener('click', closeUpdateModal);
    _updateModal.querySelector('#update-download-btn').addEventListener('click', function() {
      this.disabled = true;
      this.textContent = '下载中...';
      document.getElementById('update-progress-wrap').style.display = '';
      if (window.electronAPI && window.electronAPI.updaterDownload) {
        window.electronAPI.updaterDownload();
      }
    });

    // 点击背景关闭
    _updateModal.addEventListener('click', function(e) {
      if (e.target === _updateModal) closeUpdateModal();
    });
  }

  function closeUpdateModal() {
    if (_updateModal) { _updateModal.remove(); _updateModal = null; }
    _updateState = null;
  }

  function updateDownloadProgress(percent) {
    var bar = document.getElementById('update-progress-bar');
    var text = document.getElementById('update-progress-text');
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = '下载中... ' + percent + '%';
  }

  function updateDownloadComplete(version) {
    var text = document.getElementById('update-progress-text');
    var btn = document.querySelector('#update-download-btn');
    if (text) text.textContent = '✅ 下载完成！点击下方按钮重启安装';
    if (btn) {
      btn.disabled = false;
      btn.textContent = '立即安装并重启 🚀';
      btn.onclick = function() {
        if (window.electronAPI && window.electronAPI.updaterInstall) {
          window.electronAPI.updaterInstall();
        }
      };
    }
  }

  initAutoUpdate();

  // ==========================================
  //   检测更新后首次启动，自动展示更新日志
  // ==========================================
  function checkAndShowChangelog() {
    try {
      var LAST_VERSION_KEY = 'todoListLastVersion';
      
      // 异步获取当前版本号
      function getCurrentVersion() {
        return new Promise(function(resolve) {
          // 默认值从 package.json 动态读取（不再硬编码版本号）
          var currentVersion = null;
          
          if (window.electronAPI && window.electronAPI.getAppVersion) {
            window.electronAPI.getAppVersion().then(function(verInfo) {
              if (verInfo && verInfo.version) {
                currentVersion = verInfo.version;
              }
              resolve(currentVersion || 'unknown');
            }).catch(function() {
              resolve(currentVersion || 'unknown');
            });
          } else {
            resolve(currentVersion || 'unknown');
          }
        });
      }
      
      getCurrentVersion().then(function(currentVersion) {
        var lastVersion = localStorage.getItem(LAST_VERSION_KEY);
        _localVersion = currentVersion; // 缓存供弹窗使用
        LogInfo('changelog', '当前版本: ' + currentVersion + ', 上次版本: ' + (lastVersion || '(无)'));

        // 动态更新界面中的版本号显示（不再依赖硬编码）
        var verEl = document.getElementById('about-version-value');
        if (verEl) {
          var now = new Date();
          var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
          verEl.textContent = 'v' + currentVersion + ' (' + dateStr + ')';
        }

        // 版本号变化说明刚完成更新（首次安装或更新后）
        if (lastVersion && lastVersion !== currentVersion) {
          LogInfo('changelog', '检测到版本变化 (' + lastVersion + ' → ' + currentVersion + ')，将展示更新日志');
          // 延迟展示，等界面渲染完毕后弹出
          setTimeout(function() {
            showAboutModal('changelog');
          }, 1500);
        }
        // 更新版本记录
        localStorage.setItem(LAST_VERSION_KEY, currentVersion);
      }); // 结束 getCurrentVersion().then()
    } catch(e) {
      LogError('changelog', '检查版本变化失败', e.message);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

})();

