/**
 * 日历清单 - Electron 主进程
 * 无边框窗口，支持桌面挂件模式
 */
const { app, BrowserWindow, ipcMain, screen, clipboard, Tray, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// 日志配置
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const LOG_MAX_DAYS = 30;

// 初始化日志目录
function initLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch(e) {
    console.error('[日志] 创建日志目录失败:', e);
  }
}

// 写入日志
function writeLog(level, category, message, data = null) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, category, message, data };
    const logFile = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFile, logLine, 'utf8');
    
    const consoleMsg = `[${timestamp}] [${level}] [${category}] ${message}`;
    if (level === 'ERROR') {
      console.error(consoleMsg, data || '');
    } else {
      console.log(consoleMsg, data || '');
    }
    
    cleanOldLogs();
  } catch(e) {
    console.error('[日志] 写入日志失败:', e);
  }
}

// 清理超过30天的日志
function cleanOldLogs() {
  try {
    const now = Date.now();
    const maxAge = LOG_MAX_DAYS * 24 * 60 * 60 * 1000;
    if (!fs.existsSync(LOG_DIR)) return;
    
    const files = fs.readdirSync(LOG_DIR);
    for (const file of files) {
      if (file.endsWith('.log')) {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch(e) {}
}

function logInfo(category, message, data) { writeLog('INFO', category, message, data); }
function logError(category, message, data) { writeLog('ERROR', category, message, data); }

let win;
let isDesktopMode = false;
let tray = null;

// 数据存储路径
const userDataPath = app.getPath('userData');
const tasksFile = path.join(userDataPath, 'calendar-tasks.json');
const settingsFile = path.join(userDataPath, 'calendar-settings.json');
const dayColorsFile = path.join(userDataPath, 'calendar-day-colors.json');
const windowStateFile = path.join(userDataPath, 'window-state.json');
const desktopModeFile = path.join(userDataPath, 'desktop-mode.json');

// ============ 数据存储 ============
let tasksData = {};
let settingsData = {};
let dayColorsData = {};

function loadDataFromFiles() {
  try {
    if (fs.existsSync(tasksFile)) {
      tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    }
  } catch(e) { tasksData = {}; }
  try {
    if (fs.existsSync(settingsFile)) {
      settingsData = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    }
  } catch(e) { settingsData = {}; }
  try {
    if (fs.existsSync(dayColorsFile)) {
      dayColorsData = JSON.parse(fs.readFileSync(dayColorsFile, 'utf8'));
    }
  } catch(e) { dayColorsData = {}; }
}

function saveTasksToFile() {
  try {
    fs.writeFileSync(tasksFile, JSON.stringify(tasksData, null, 2), 'utf8');
    if (win && win.webContents) {
      win.webContents.send('data-updated-from-api', { tasks: tasksData });
    }
  } catch(e) { console.error('保存任务失败:', e); }
}

function saveSettingsToFile() {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(settingsData, null, 2), 'utf8');
  } catch(e) { console.error('保存设置失败:', e); }
}

function saveDayColorsToFile() {
  try {
    fs.writeFileSync(dayColorsFile, JSON.stringify(dayColorsData, null, 2), 'utf8');
  } catch(e) { console.error('保存颜色失败:', e); }
}

// ============ 窗口状态持久化 ============
const defaultWindowState = { x: undefined, y: undefined, width: 900, height: 700, isDesktopMode: false };

function loadWindowState() {
  try {
    if (fs.existsSync(windowStateFile)) {
      const data = JSON.parse(fs.readFileSync(windowStateFile, 'utf8'));
      return { ...defaultWindowState, ...data };
    }
  } catch(e) {}
  return { ...defaultWindowState };
}

function saveWindowState() {
  try {
    if (!win) return;
    // 非最大化/最小化时才保存位置和大小
    if (!win.isMaximized() && !win.isMinimized()) {
      const bounds = win.getBounds();
      // 用 getDisplayMatching 精确找到窗口所在显示器
      const winDisplay = screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay();

      // 强制用相对于工作区的比例保存（彻底避免多分辨率/DPI问题）
      // 副屏5K(200%) vs 主屏4K(150%)下，同一物理尺寸的窗口逻辑像素值差异巨大
      const wa = winDisplay.workArea;
      const allDisplays = screen.getAllDisplays();
      fs.writeFileSync(windowStateFile, JSON.stringify({
        // 记录所在显示器的索引（用于恢复时精确定位）
        displayIndex: allDisplays.indexOf(winDisplay),
        // 宽高占该屏幕工作区的百分比（0~1）
        widthPct: bounds.width / wa.width,
        heightPct: bounds.height / wa.height,
        // 位置距该屏幕工作区左上角的百分比偏移
        xPct: (bounds.x - wa.x) / wa.width,
        yPct: (bounds.y - wa.y) / wa.height,
        // 保留绝对值作为 fallback（仅当找不到对应显示器时）
        x: bounds.x,
        y: bounds.y,
        scaleFactor: winDisplay.scaleFactor,
        isDesktopMode: isDesktopMode
      }), 'utf8');
    }
  } catch(e) {
    logError('WINDOW', 'saveWindowState失败', e.message);
  }
}

// ============ 桌面模式相关 ============
function loadDesktopMode() {
  try {
    if (fs.existsSync(desktopModeFile)) {
      const data = JSON.parse(fs.readFileSync(desktopModeFile, 'utf8'));
      return data.isDesktopMode || false;
    }
  } catch(e) {}
  return false;
}

function saveDesktopMode(val) {
  try {
    fs.writeFileSync(desktopModeFile, JSON.stringify({ isDesktopMode: val }), 'utf8');
  } catch(e) {}
}

// 递归验证窗口位置是否正确（最多重试3次，每次间隔递增）
function verifyPosition(expected, retryCount) {
  if (!win) return;
  const actual = win.getBounds();
  
  // 允许 ±2 像素的误差（Windows坐标精度问题）
  const xOk = Math.abs(actual.x - expected.x) <= 2;
  const yOk = Math.abs(actual.y - expected.y) <= 2;
  
  if (xOk && yOk) {
    logInfo('WINDOW', '副屏定位成功！', { actual, expected, retryCount });
    return;
  }
  
  if (retryCount >= 3) {
    logError('WINDOW', '定位失败已达最大重试次数', { actual, expected, retryCount });
    return;
  }
  
  logInfo('WINDOW', `位置不匹配，第${retryCount + 1}次重试...`, { 
    actual: { x: actual.x, y: actual.y }, 
    expected: { x: expected.x, y: expected.y } 
  });
  
  setTimeout(() => {
    win.setPosition(expected.x, expected.y);
    win.setSize(expected.width, expected.height);
    verifyPosition(expected, retryCount + 1);
  }, (retryCount + 1) * 200); // 延迟递增：200ms, 400ms, 600ms
}

// ============ 窗口相关 ============
// 桌面模式前保存的正常窗口状态（用于退出桌面模式时恢复）
let preDesktopBounds = null;

// 创建/获取系统托盘图标
function getOrCreateTray() {
  if (tray) return tray;
  
  const iconPath = path.join(__dirname, 'icon.ico');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '📅 显示窗口', click: () => { if (win) { win.show(); win.focus(); } } },
    { type: 'separator' },
    { label: '🚪 退出桌面模式', click: () => { if (win) { ipcMain.emit('set-desktop-mode', {}, false); } } },
    { type: 'separator' },
    { label: '✕ 退出程序', click: () => app.quit() }
  ]);
  
  tray.setToolTip('任务清单 - 桌面日历');
  tray.setContextMenu(contextMenu);
  
  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    if (win) {
      win.show();
      win.focus();
    }
  });
  
  logInfo('TRAY', '系统托盘已创建');
  return tray;
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
    logInfo('TRAY', '系统托盘已销毁');
  }
}

function applyDesktopMode(enabled) {
  if (!win) return;

  if (enabled) {
    // 保存当前正常窗口的bounds（用于恢复）
    const bounds = win.getBounds();
    if (win.isMaximized()) {
      preDesktopBounds = null; // 最大化状态不保存
    } else if (!preDesktopBounds) {
      preDesktopBounds = { ...bounds };
    }

    // 创建托盘图标（任务栏图标会从主区域消失，出现在托盘区）
    getOrCreateTray();
    
    // 关键：skipTaskbar=true → 任务栏不再显示此窗口的图标
    // 但窗口本身仍然可见、可操作！只是不在任务栏占位了
    win.setSkipTaskbar(true);
    
    logInfo('DESKTOP', '桌面模式已开启(图标移至托盘，窗口保持可用)', { savedBounds: preDesktopBounds });
  } else {
    // 退出桌面模式
    
    // 销毁托盘
    destroyTray();
    
    // 恢复任务栏图标
    win.setSkipTaskbar(false);
    
    if (preDesktopBounds) {
      win.setBounds({
        x: preDesktopBounds.x,
        y: preDesktopBounds.y,
        width: Math.max(preDesktopBounds.width, 600),
        height: Math.max(preDesktopBounds.height, 500)
      });
      logInfo('DESKTOP', '桌面模式已关闭，恢复原状态', preDesktopBounds);
      preDesktopBounds = null;
    }
    
    win.setMinimumSize(600, 500);
    win.setResizable(true);
    win.setMovable(true);
    win.focus();
  }

  win.webContents.send('desktop-mode-changed', enabled);
}

function createWindow() {
  // 初始化日志系统
  initLogDir();
  logInfo('APP', '日历清单启动', { version: '1.0.0' });
  
  // 加载数据
  const winState = loadWindowState();
  isDesktopMode = !!winState.isDesktopMode;
  loadDataFromFiles();

  const allDisplays = screen.getAllDisplays();
  
  // 调试：记录所有显示器信息（排查多屏定位问题）
  const displayInfo = allDisplays.map((d, i) => ({
    index: i,
    isPrimary: d.isPrimary,
    scaleFactor: d.scaleFactor,
    bounds: d.bounds,
    workArea: d.workArea,
    size: d.size,
  }));
  logInfo('DISPLAY', '所有显示器信息', displayInfo);
  
  // 计算目标位置和大小（核心：用 displayIndex + 百分比精确定位到对应屏幕）
  let targetBounds = null;
  
  if (winState.xPct !== undefined && winState.yPct !== undefined) {
    // 有百分比数据 → 精确还原
    let targetDisplay = screen.getPrimaryDisplay(); // 默认主屏
    
    // 优先用 displayIndex 找到保存时所在的屏幕
    if (winState.displayIndex !== undefined && winState.displayIndex >= 0 && winState.displayIndex < allDisplays.length) {
      targetDisplay = allDisplays[winState.displayIndex];
      logInfo('WINDOW', '使用displayIndex定位', { index: winState.displayIndex });
    } else if (winState.x !== undefined && winState.y !== undefined) {
      // fallback：用绝对坐标找屏幕
      const centerX = winState.x + (winState.width || 900) / 2;
      const centerY = winState.y + (winState.height || 700) / 2;
      targetDisplay = allDisplays.find(d =>
        centerX >= d.bounds.x && centerX <= d.bounds.x + d.bounds.width &&
        centerY >= d.bounds.y && centerY <= d.bounds.y + d.bounds.height
      ) || targetDisplay;
      logInfo('WINDOW', 'fallback用绝对坐标找屏');
    }
    
    const wa = targetDisplay.workArea;
    
    // 百分比还原实际坐标（用floor定位、ceil取整，确保不溢出且不缩水）
    const startWidth = Math.round(wa.width * winState.widthPct);
    const startHeight = Math.round(wa.height * winState.heightPct);
    
    // 计算位置（基于百分比）
    let calcX = wa.x + wa.width * winState.xPct;
    let calcY = wa.y + wa.height * winState.yPct;
    
    // 智能边缘吸附：如果百分比接近0或接近满宽，精确对齐工作区边缘
    // 这解决"铺满后重启短一截"的问题——浮点精度损失导致无法精确贴合边缘
    const SNAP_THRESHOLD = 0.02; // 2%以内的偏差视为"贴边"
    let startX, startY;
    
    // X方向：左侧贴边检测
    if (winState.xPct < SNAP_THRESHOLD) {
      startX = wa.x; // 精确对齐左边缘
    } else {
      startX = Math.round(calcX);
    }
    
    // Y方向：顶部贴边检测  
    if (winState.yPct < SNAP_THRESHOLD) {
      startY = wa.y; // 精确对齐顶部边缘
    } else {
      startY = Math.round(calcY);
    }
    
    // 宽度：右侧贴边检测（窗口右边缘是否接近工作区右边缘）
    let finalWidth = startWidth;
    if (winState.xPct + winState.widthPct > 1 - SNAP_THRESHOLD) {
      // 右侧也贴边了 → 宽度精确等于工作区宽度
      finalWidth = wa.width;
    }
    
    // 高度：底部贴边检测
    let finalHeight = startHeight;
    if (winState.yPct + winState.heightPct > 1 - SNAP_THRESHOLD) {
      finalHeight = wa.height;
    }
    
    // 仅做安全范围限制（不加额外padding），防止极端异常值
    startX = Math.max(wa.x, Math.min(startX, wa.x + wa.width - Math.min(finalWidth, wa.width)));
    startY = Math.max(wa.y, Math.min(startY, wa.y + wa.height - Math.min(finalHeight, wa.height)));
    finalWidth = Math.min(Math.max(finalWidth, 400), wa.width);
    finalHeight = Math.min(Math.max(finalHeight, 300), wa.height);
    
    targetBounds = { x: startX, y: startY, width: finalWidth, height: finalHeight };
    logInfo('WINDOW', '目标位置(百分比还原)', { 
      ...targetBounds, 
      displayIndex: allDisplays.indexOf(targetDisplay),
      source: { xPct: winState.xPct, yPct: winState.yPct, wPct: winState.widthPct, hPct: winState.heightPct }
    });
    
  } else if (winState.x !== undefined && winState.y !== undefined) {
    // 旧格式（只有绝对坐标），兼容处理
    const centerX = winState.x + (winState.width || 900) / 2;
    const centerY = winState.y + (winState.height || 700) / 2;
    const targetDisplay = allDisplays.find(d =>
      centerX >= d.bounds.x && centerX <= d.bounds.x + d.bounds.width &&
      centerY >= d.bounds.y && centerY <= d.bounds.y + d.bounds.height
    ) || screen.getPrimaryDisplay();
    
    const wa = targetDisplay.workArea;
    targetBounds = { 
      x: Math.max(wa.x + 10, winState.x), 
      y: Math.max(wa.y + 10, winState.y), 
      width: Math.min(winState.width || 900, wa.width - 20), 
      height: Math.min(winState.height || 700, wa.height - 40)
    };
    logInfo('WINDOW', '目标位置(旧格式fallback)', { ...targetBounds, screenIdx: allDisplays.indexOf(targetDisplay) });
  }

  // 关键修复：Electron在Windows上构造BrowserWindow时会将坐标钳制到主屏范围
  // 解决方案：先不传x/y（默认居中），创建后再移到正确位置
  win = new BrowserWindow({
    width: targetBounds ? targetBounds.width : 900,
    height: targetBounds ? targetBounds.height : 700,
    minWidth: isDesktopMode ? 500 : 600,
    minHeight: isDesktopMode ? 400 : 500,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: false,
    center: !targetBounds,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 创建后立即设置位置（在show之前）
  if (targetBounds) {
    win.setBounds(targetBounds);
  }

  // 加载前检查文件
  const indexPath = path.join(__dirname, 'index.html');
  const preloadPath = path.join(__dirname, 'preload.js');
  logInfo('STARTUP', '应用启动中...');
  logInfo('STARTUP', 'app.getAppPath: ' + app.getAppPath());
  logInfo('STARTUP', '__dirname: ' + __dirname);
  logInfo('STARTUP', 'index.html 路径: ' + indexPath);
  logInfo('STARTUP', 'preload.js 路径: ' + preloadPath);

  win.once('ready-to-show', () => {
    // 桌面模式：正常显示窗口，只是任务栏图标进托盘
    if (isDesktopMode) {
      getOrCreateTray();
      win.setSkipTaskbar(true);
      logInfo('DESKTOP', '启动时已是桌面模式，图标在托盘区');
    }
    
    win.show();
    
    if (targetBounds) {
      // show之后再次强制设置位置和大小（Windows有时会在show时重置）
      win.setPosition(targetBounds.x, targetBounds.y);
      win.setSize(targetBounds.width, targetBounds.height);
      
      const finalBounds = win.getBounds();
      logInfo('WINDOW', 'show后setPosition结果', finalBounds);
      
      // 验证是否真的到了目标位置，如果不对则延迟重试（最多3次）
      verifyPosition(targetBounds, 0);
    }
  });

  // 加载失败时显示错误页面
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logError('LOAD', '加载失败: ' + errorCode + ' - ' + errorDescription);
    win.loadURL('data:text/html,<html><body style="background:#0d1117;color:#fff;font-family:sans-serif;padding:40px;"><h2>加载失败</h2><p>错误: ' + errorDescription + '</p><p>代码: ' + errorCode + '</p></body></html>');
  });

  win.loadFile(indexPath);

  // 【关键】窗口关闭时立即同步保存状态（此时坐标还没被Windows回收！）
  win.on('close', () => {
    saveWindowState();
  });
  
  // closed事件保留用于清空引用
  win.on('closed', () => {
    win = null;
  });

  // 窗口大小/位置改变时保存状态（防抖）
  let resizeTimer = null;
  win.on('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(saveWindowState, 500);
  });
  win.on('move', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(saveWindowState, 500);
  });

  // IPC 处理程序
  ipcMain.on('set-desktop-mode', (event, enabled) => {
    isDesktopMode = !!enabled;
    saveDesktopMode(isDesktopMode);
    saveWindowState();
    applyDesktopMode(isDesktopMode);
  });

  ipcMain.on('get-desktop-mode', (event) => {
    event.sender.send('desktop-mode-changed', isDesktopMode);
  });

  ipcMain.on('window-minimize', () => {
    if (win) win.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    if (win) win.close();
  });

  ipcMain.on('window-is-maximized', (event) => {
    event.returnValue = win ? win.isMaximized() : false;
  });

  // 从文件加载数据到渲染进程
  ipcMain.on('request-data-sync', (event) => {
    event.sender.send('data-sync', {
      tasks: tasksData,
      settings: settingsData,
      dayColors: dayColorsData
    });
  });

  // 剪贴板操作
  ipcMain.handle('copy-to-clipboard', async (event, text) => {
    try {
      clipboard.writeText(text);
      logInfo('CLIPBOARD', '复制成功', { textLength: text ? text.length : 0 });
      return { success: true };
    } catch(e) {
      logError('CLIPBOARD', '复制失败', e.message);
      return { success: false, error: e.message };
    }
  });

  // 获取应用路径信息（用于生成精准的 Skill 包）
  ipcMain.handle('get-app-info', async () => {
    return {
      exePath: app.getPath('exe'),           // exe 所在路径
      userDataPath: app.getPath('userData'), // 数据目录
      dataFilePath: tasksFile,               // 任务数据文件完整路径
      appName: app.getName(),                // 应用名称
      version: app.getVersion()               // 版本号
    };
  });

  // 获取打赏图（base64，防篡改）
  ipcMain.handle('get-donate-image', async () => {
    try {
      const donatePath = path.join(__dirname, 'ds.png');
      if (fs.existsSync(donatePath)) {
        const imgBuffer = fs.readFileSync(donatePath);
        const b64 = imgBuffer.toString('base64');
        return { success: true, data: 'data:image/png;base64,' + b64 };
      }
      return { success: false, error: '打赏图不存在' };
    } catch(e) {
      return { success: false, error: e.message };
    }
  });

  // 开机自启动
  ipcMain.handle('set-auto-start', async (event, enabled) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: !!enabled,
        path: process.execPath
      });
      logInfo('AUTO_START', enabled ? '已启用开机自启动' : '已关闭开机自启动');
      return { success: true };
    } catch(e) {
      logError('AUTO_START', '设置开机自启动失败: ' + e.message);
      return { success: false, error: e.message };
    }
  });

  // 渲染进程数据更新时同步到文件
  ipcMain.on('sync-tasks-from-renderer', (event, tasks) => {
    tasksData = tasks || {};
    saveTasksToFile();
  });

  ipcMain.on('sync-settings-from-renderer', (event, settings) => {
    settingsData = settings || {};
    saveSettingsToFile();
  });

  ipcMain.on('sync-daycolors-from-renderer', (event, colors) => {
    dayColorsData = colors || {};
    saveDayColorsToFile();
  });

  win.on('maximize', () => {
    win.webContents.send('window-maximized', true);
  });
  win.on('unmaximize', () => {
    win.webContents.send('window-maximized', false);
  });
}

// 应用启动
app.whenReady().then(() => {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  createWindow();

  // 自动更新：窗口就绪后延迟检查（避免影响启动速度）
  setTimeout(() => { checkForUpdates(); }, 3000);
});

// ==========================================
//   自动更新（electron-updater + GitHub Release）
// ==========================================
function checkForUpdates() {
  // 如果用户关闭了自动检测，跳过
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (!settings.autoCheckUpdate) return;
    }
  } catch(e) {}

  logInfo('UPDATE', '开始检查更新...');

  autoUpdater.autoDownload = false; // 先不自动下载，让用户确认
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    logInfo('UPDATE', '正在检查新版本...');
    if (win) win.webContents.send('update-status', { state: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    logInfo('UPDATE', '发现新版本', info);
    if (win) {
      win.webContents.send('update-status', {
        state: 'available',
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    logInfo('UPDATE', '当前已是最新版本');
    if (win) win.webContents.send('update-status', { state: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    logInfo('UPDATE', '下载进度', Math.round(progress.percent) + '%');
    if (win) win.webContents.send('update-status', {
      state: 'downloading',
      percent: Math.round(progress.percent),
      speed: progress.bytesPerSecond
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logInfo('UPDATE', '下载完成，准备安装', info);
    if (win) {
      win.webContents.send('update-status', { state: 'downloaded', version: info.version });
    }
  });

  autoUpdater.on('error', (err) => {
    logError('UPDATE', '更新检查失败', err.message);
    if (win) win.webContents.send('update-status', { state: 'error', message: err.message });
  });

  // IPC：渲染进程请求手动检查/下载/安装
  ipcMain.handle('updater-check', async () => {
    return autoUpdater.checkForUpdates();
  });
  ipcMain.handle('updater-download', async () => {
    return autoUpdater.downloadUpdate();
  });
  ipcMain.handle('updater-install', async () => {
    autoUpdater.quitAndInstall(true, true);
  });

  autoUpdater.checkForUpdates()
    .catch(err => logError('UPDATE', 'checkForUpdates异常', err.message));
}

// 双重保险：应用退出前再保存一次（防止close事件被跳过）
app.on('before-quit', () => {
  if (win) saveWindowState();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});