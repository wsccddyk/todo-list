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

  // 任务数据: { 'YYYY-M-D': [{ id, text, done, createdAt }] }
  let tasksData = {};
  // 日期颜色: { 'YYYY-M-D': 'rgba(...)' }
  let dayColors = {};

  // 设置（带默认值）
  let settings = {
    theme: 'dark',
    fontSize: 12,
    weekStart: 1,
    showLunar: true,
    showHoliday: true,
    opacity: 85,        // 背景透明度 30-100
    bgColor: '#0d1117',  // 背景颜色
    fontColor: '#e0e8f0', // 字体颜色
    customBgColor: false,
    customFontColor: false,
    desktopMode: false,  // 桌面挂件模式
  };

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
  //   存储读写（localStorage + 同步到主进程）
  // =========================================
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) tasksData = JSON.parse(raw);
    } catch(e) { tasksData = {}; }
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = Object.assign(settings, JSON.parse(raw));
    } catch(e) {}
    try {
      const raw = localStorage.getItem(DAY_COLORS_KEY);
      if (raw) dayColors = JSON.parse(raw);
    } catch(e) { dayColors = {}; }
  }

  function saveTasksData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksData));
    // 同步到主进程
    if (window.electronAPI && window.electronAPI.syncTasks) {
      window.electronAPI.syncTasks(tasksData);
    }
    // 触发外部事件
    window.dispatchEvent(new CustomEvent('CalendarApp:dataChanged', {
      detail: { tasks: tasksData, dayColors }
    }));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // 同步到主进程
    if (window.electronAPI && window.electronAPI.syncSettings) {
      window.electronAPI.syncSettings(settings);
    }
    window.dispatchEvent(new CustomEvent('CalendarApp:settingsChanged', {
      detail: settings
    }));
  }

  function saveDayColors() {
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

    if (enabled) {
      btn.classList.add('active');
      icon.textContent = '🔓';
      text.textContent = '解除固定';
      badge.classList.remove('hidden');
      // 桌面模式下，标题栏变窄
      titlebar.style.background = 'rgba(0,0,0,0.3)';
    } else {
      btn.classList.remove('active');
      icon.textContent = '📌';
      text.textContent = '桌面模式';
      badge.classList.add('hidden');
      titlebar.style.background = '';
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

    // 透明度
    const op = settings.opacity / 100;
    const bg = settings.customBgColor ? settings.bgColor : getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim() || '#0d1117';
    const alpha = settings.customBgColor ? op : 0.85;
    document.documentElement.style.setProperty('--bg-opacity', alpha);
    document.documentElement.style.background = settings.customBgColor
      ? `rgba(${hexToRgb(settings.bgColor)}, ${alpha})`
      : settings.customBgColor
        ? settings.bgColor
        : '';

    // 字体颜色
    if (settings.customFontColor) {
      document.documentElement.style.setProperty('--text-primary', settings.fontColor);
      document.documentElement.style.setProperty('--text-task', settings.fontColor);
    } else {
      document.documentElement.style.setProperty('--text-primary', '');
      document.documentElement.style.setProperty('--text-task', '');
    }

    // 同步设置面板
    const themeOptions = document.querySelectorAll('.theme-dot');
    themeOptions.forEach(dot => {
      dot.classList.toggle('active', dot.dataset.theme === settings.theme);
    });

    const fontSel = document.getElementById('font-size-select');
    if (fontSel) fontSel.value = settings.fontSize;
    const weekSel = document.getElementById('week-start-select');
    if (weekSel) weekSel.value = settings.weekStart;
    const lunarCb = document.getElementById('show-lunar');
    if (lunarCb) lunarCb.checked = settings.showLunar;
    const holidayCb = document.getElementById('show-holiday');
    if (holidayCb) holidayCb.checked = settings.showHoliday;
    const opacitySlider = document.getElementById('opacity-slider');
    if (opacitySlider) opacitySlider.value = settings.opacity;
    const opacityVal = document.getElementById('opacity-value');
    if (opacityVal) opacityVal.textContent = settings.opacity + '%';
    const bgColorPicker = document.getElementById('bg-color-picker');
    if (bgColorPicker) bgColorPicker.value = settings.bgColor;
    const fontColorPicker = document.getElementById('font-color-picker');
    if (fontColorPicker) fontColorPicker.value = settings.fontColor;
    const desktopToggle = document.getElementById('desktop-mode-toggle');
    if (desktopToggle) desktopToggle.checked = settings.desktopMode;
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
    renderHeader();
    renderGrid();
  }

  function renderHeader() {
    const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    document.getElementById('year-month').textContent =
      `${currentYear}年${monthNames[currentMonth]}`;

    const lunarEl = document.getElementById('lunar-info');
    if (settings.showLunar) {
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lunar = LunarCalendar.solar2lunar(firstDay);
      if (lunar) {
        lunarEl.textContent = `农历 ${lunar.ganZhi}年（${lunar.zodiac}年） ${lunar.lunarMonthStr}`;
      }
    } else {
      lunarEl.textContent = '';
    }
  }

  function renderGrid() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const weekStart = settings.weekStart;
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDow = firstDay.getDay();
    let leadDays;
    if (weekStart === 1) {
      leadDays = (startDow + 6) % 7;
    } else {
      leadDays = startDow;
    }

    const totalCells = 42;
    const cells = [];

    const prevLastDay = new Date(currentYear, currentMonth, 0);
    for (let i = leadDays - 1; i >= 0; i--) {
      const d = prevLastDay.getDate() - i;
      const m = currentMonth - 1;
      const y = m < 0 ? currentYear - 1 : currentYear;
      const mm = m < 0 ? 11 : m;
      cells.push({ year: y, month: mm, day: d, otherMonth: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ year: currentYear, month: currentMonth, day: d, otherMonth: false });
    }

    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth + 1;
      const y = m > 11 ? currentYear + 1 : currentYear;
      const mm = m > 11 ? 0 : m;
      cells.push({ year: y, month: mm, day: d, otherMonth: true });
    }

    cells.forEach((cell, idx) => {
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
  }

  function createDayCell(cell, isWeekendCol) {
    const { year, month, day, otherMonth } = cell;
    const key = dateKey(year, month, day);
    const tasks = tasksData[key] || [];
    const isToday = (year === today.getFullYear() && month === today.getMonth() && day === today.getDate());

    const cellEl = document.createElement('div');
    cellEl.className = 'day-cell';
    if (otherMonth) cellEl.classList.add('other-month');
    if (isToday) cellEl.classList.add('today');
    if (isWeekendCol) cellEl.classList.add('weekend-col');

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
    if (settings.showHoliday && !otherMonth) {
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

    if (!holidayBadgeShown && settings.showLunar && !otherMonth) {
      const term = LunarCalendar.getSolarTerm(year, month + 1, day);
      if (term) {
        const badge = document.createElement('span');
        badge.className = 'solarterm-badge';
        badge.textContent = term;
        header.appendChild(badge);
      }
    }

    cellEl.appendChild(header);

    // 农历
    if (settings.showLunar && !otherMonth) {
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

    const maxShow = 5;
    const visibleTasks = tasks.slice(0, maxShow);
    visibleTasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'task-item-cell' + (task.done ? ' done' : '');
      item.innerHTML = `<span class="bullet">●</span><span class="task-text">${escapeHtml(task.text)}</span>`;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        openPopup(year, month, day);
      });
      taskListEl.appendChild(item);
    });

    if (tasks.length > maxShow) {
      const more = document.createElement('div');
      more.className = 'more-tasks';
      more.textContent = `还有 ${tasks.length - maxShow} 项...`;
      taskListEl.appendChild(more);
    }

    cellEl.appendChild(taskListEl);

    // 双击或单击打开浮窗
    cellEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openPopup(year, month, day);
    });
    cellEl.addEventListener('click', (e) => {
      if (!e.target.closest('.task-item-cell')) {
        openPopup(year, month, day);
      }
    });

    // 右键菜单
    cellEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, year, month, day);
    });

    return cellEl;
  }

  // =========================================
  //   浮窗（轻量小浮层）
  // =========================================
  function openPopup(y, m, d) {
    popupDate = { y, m, d };

    const popup = document.getElementById('task-popup');
    popup.classList.remove('hidden');

    document.getElementById('popup-date-title').textContent = formatDateTitle(y, m, d);
    document.getElementById('popup-lunar').textContent = formatLunarSub(y, m, d);

    renderPopupTasks();
    renderPopupColorPicker();

    const input = document.getElementById('popup-task-input');
    input.value = '';
    setTimeout(() => input.focus(), 60);

    // 自动定位在点击位置附近
    positionPopupNearClick(y, m, d);
  }

  function positionPopupNearClick(y, m, d) {
    const popup = document.getElementById('task-popup');
    const grid = document.getElementById('calendar-grid');
    const gridRect = grid.getBoundingClientRect();

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

    // 临时设属性以便查询
    cells.forEach(cell => {
      const inner = cell.querySelector('.day-number');
      if (inner && inner.textContent == d && !cell.classList.contains('other-month')) {
        const cellRect = cell.getBoundingClientRect();
        // 浮窗位置：格子上方或下方
        let top = cellRect.top;
        let left = cellRect.left + cellRect.width / 2 - 160;
        if (top + 380 > window.innerHeight) {
          top = cellRect.bottom - 380;
        }
        if (top < 0) top = 10;
        if (left < 10) left = 10;
        if (left + 320 > window.innerWidth) left = window.innerWidth - 330;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
        return;
      }
    });

    // 默认居中
    if (!popup.style.top) {
      popup.style.top = (window.innerHeight / 2 - 200) + 'px';
      popup.style.left = (window.innerWidth / 2 - 160) + 'px';
    }
  }

  function closePopup() {
    document.getElementById('task-popup').classList.add('hidden');
    popupDate = null;
  }

  function renderPopupTasks() {
    if (!popupDate) return;
    const { y, m, d } = popupDate;
    const tasks = getTasksForDay(y, m, d);
    const ul = document.getElementById('popup-task-list');
    ul.innerHTML = '';

    if (tasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'popup-empty';
      empty.textContent = '暂无任务，添加第一条吧～';
      ul.appendChild(empty);
      return;
    }

    tasks.forEach((task, idx) => {
      const li = document.createElement('li');
      li.className = 'popup-task-item' + (task.done ? ' done' : '');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = task.done;
      cb.addEventListener('change', () => {
        task.done = cb.checked;
        saveTasksData();
        renderCalendar();
        li.classList.toggle('done', task.done);
        li.querySelector('.task-label').style.textDecoration = task.done ? 'line-through' : '';
      });

      const label = document.createElement('span');
      label.className = 'task-label';
      label.textContent = task.text;
      label.contentEditable = true;
      label.spellcheck = false;
      label.addEventListener('blur', () => {
        const newText = label.textContent.trim();
        if (newText && newText !== task.text) {
          task.text = newText;
          saveTasksData();
          renderCalendar();
        } else if (!newText) {
          label.textContent = task.text;
        }
      });
      label.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); label.blur(); }
        if (e.key === 'Escape') { label.textContent = task.text; label.blur(); }
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'del-btn';
      delBtn.textContent = '✕';
      delBtn.title = '删除';
      delBtn.addEventListener('click', () => deletePopupTask(idx));

      li.appendChild(cb);
      li.appendChild(label);
      li.appendChild(delBtn);
      ul.appendChild(li);
    });
  }

  function addPopupTask() {
    if (!popupDate) return;
    const input = document.getElementById('popup-task-input');
    const text = input.value.trim();
    if (!text) return;

    const { y, m, d } = popupDate;
    const key = dateKey(y, m, d);
    if (!tasksData[key]) tasksData[key] = [];
    tasksData[key].push({
      id: generateId(),
      text,
      done: false,
      createdAt: Date.now(),
    });

    saveTasksData();
    input.value = '';
    renderPopupTasks();
    renderCalendar();
    input.focus();
  }

  function deletePopupTask(idx) {
    if (!popupDate) return;
    const { y, m, d } = popupDate;
    const key = dateKey(y, m, d);
    if (tasksData[key]) {
      tasksData[key].splice(idx, 1);
      if (tasksData[key].length === 0) delete tasksData[key];
      saveTasksData();
      renderPopupTasks();
      renderCalendar();
    }
  }

  function renderPopupColorPicker() {
    const picker = document.getElementById('popup-color-picker');
    picker.innerHTML = '';
    if (!popupDate) return;
    const key = dateKey(popupDate.y, popupDate.m, popupDate.d);
    const currentBg = dayColors[key];

    DOT_COLORS.forEach((color, i) => {
      const dot = document.createElement('div');
      dot.className = 'popup-color-dot';
      dot.style.background = color;
      const bgVal = TASK_COLORS[i].value;
      if (currentBg === bgVal) dot.classList.add('active');
      dot.addEventListener('click', () => {
        const k = dateKey(popupDate.y, popupDate.m, popupDate.d);
        if (dayColors[k] === bgVal) {
          delete dayColors[k];
        } else {
          dayColors[k] = bgVal;
        }
        saveDayColors();
        renderPopupColorPicker();
        renderCalendar();
      });
      picker.appendChild(dot);
    });
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
  }
  function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
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

    // 浮窗关闭
    document.getElementById('popup-close').addEventListener('click', closePopup);
    // 点击空白关闭浮窗
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('task-popup');
      if (!popup.classList.contains('hidden') && !popup.contains(e.target)) {
        const grid = document.getElementById('calendar-grid');
        if (!grid.contains(e.target)) {
          closePopup();
        }
      }
    });

    // 添加任务
    document.getElementById('popup-task-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addPopupTask();
      if (e.key === 'Escape') closePopup();
    });
    document.getElementById('popup-task-input').addEventListener('click', (e) => e.stopPropagation());
    document.getElementById('popup-body').addEventListener('click', (e) => e.stopPropagation());

    // 清除浮窗颜色
    document.getElementById('popup-clear-color').addEventListener('click', () => {
      if (!popupDate) return;
      const key = dateKey(popupDate.y, popupDate.m, popupDate.d);
      delete dayColors[key];
      saveDayColors();
      renderPopupColorPicker();
      renderCalendar();
    });

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

    // 设置 - 透明度
    document.getElementById('opacity-slider').addEventListener('input', (e) => {
      settings.opacity = parseInt(e.target.value);
      document.getElementById('opacity-value').textContent = settings.opacity + '%';
      saveSettings();
      applySettings();
    });

    // 设置 - 背景颜色
    document.getElementById('bg-color-picker').addEventListener('input', (e) => {
      settings.bgColor = e.target.value;
      settings.customBgColor = true;
      saveSettings();
      applySettings();
    });
    document.getElementById('reset-bg-color').addEventListener('click', () => {
      settings.customBgColor = false;
      document.getElementById('bg-color-picker').value = DEFAULT_BG_COLOR;
      saveSettings();
      applySettings();
    });

    // 设置 - 字体颜色
    document.getElementById('font-color-picker').addEventListener('input', (e) => {
      settings.fontColor = e.target.value;
      settings.customFontColor = true;
      saveSettings();
      applySettings();
    });
    document.getElementById('reset-font-color').addEventListener('click', () => {
      settings.customFontColor = false;
      document.getElementById('font-color-picker').value = DEFAULT_FONT_COLOR;
      saveSettings();
      applySettings();
    });

    // 设置 - 字号
    document.getElementById('font-size-select').addEventListener('change', (e) => {
      settings.fontSize = parseInt(e.target.value);
      saveSettings();
      applySettings();
    });

    // 设置 - 周起始
    document.getElementById('week-start-select').addEventListener('change', (e) => {
      settings.weekStart = parseInt(e.target.value);
      saveSettings();
      renderCalendar();
      updateWeekdayHeaders();
    });

    // 设置 - 显示农历
    document.getElementById('show-lunar').addEventListener('change', (e) => {
      settings.showLunar = e.target.checked;
      saveSettings();
      renderCalendar();
    });

    // 设置 - 显示节假日
    document.getElementById('show-holiday').addEventListener('change', (e) => {
      settings.showHoliday = e.target.checked;
      saveSettings();
      renderCalendar();
    });

    // 设置 - 桌面模式
    document.getElementById('desktop-mode-toggle').addEventListener('change', (e) => {
      settings.desktopMode = e.target.checked;
      saveSettings();
      applyDesktopModeUI(settings.desktopMode);
      // 通知 Electron 主进程
      if (window.electronAPI) {
        window.electronAPI.setDesktopMode(settings.desktopMode);
      }
    });

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
      const data = {
        tasks: tasksData,
        dayColors: dayColors,
        settings: settings,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `日历清单_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // 设置 - 导入数据
    const importInput = document.getElementById('import-file-input');
    document.getElementById('import-data-btn').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
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
          alert('数据导入成功！');
        } catch(err) {
          alert('导入失败：文件格式错误');
        }
      };
      reader.readAsText(file);
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
      ? ['星期一','星期二','星期三','星期四','星期五','星期六','星期日']
      : ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    const weekendCols = settings.weekStart === 1 ? [5, 6] : [0, 6];
    weekdays.forEach((el, i) => {
      el.textContent = labels[i];
      el.classList.toggle('weekend', weekendCols.includes(i));
    });
  }

  // =========================================
  //   初始化
  // =========================================
  function init() {
    loadData();
    applySettings();
    updateWeekdayHeaders();
    renderCalendar();
    bindEvents();
    initPopupDrag();
    initWindowResize();
    initTitlebar();

    // 暴露全局 API
    exposeGlobalAPI();

    // 设置数据同步监听
    if (window.electronAPI) {
      // 请求从主进程同步数据（如果有的话）
      window.electronAPI.requestDataSync();
      
      // 监听主进程发来的数据同步
      window.electronAPI.onDataSync((data) => {
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
        if (data.tasks) {
          tasksData = data.tasks;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksData));
          renderCalendar();
        }
      });
      
      console.log('[日历清单] 数据同步已就绪');
    }
  }

  // =========================================
  //   全局 API（供外部读写数据）
  // =========================================
  function exposeGlobalAPI() {
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

  document.addEventListener('DOMContentLoaded', init);

})();
