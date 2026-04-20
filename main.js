/**
 * 日历清单 - Electron 主进程
 * 无边框窗口，支持桌面挂件模式
 */
const { app, BrowserWindow, ipcMain, screen, clipboard, Tray, Menu, dialog, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// ====== 开发模式调试：强制 isPackaged 让 electron-updater 正常工作 ======
// 生产环境打包后这段代码无效，因为 app.isPackaged 本身就是 true
if (!app.isPackaged) {
  Object.defineProperty(app, 'isPackaged', {
    get: function() { return true; }
  });
  console.log('[开发调试] 已强制设置 app.isPackaged = true，允许 electron-updater 在开发模式运行');
}

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
const cloudSyncConfigFile = path.join(userDataPath, 'cloud-sync-config.json');

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
      var exePath = app.isPackaged ? process.execPath : app.getPath('exe');
      logInfo('AUTO_START', 'exe路径: ' + exePath);
      logInfo('AUTO_START', 'isPackaged: ' + app.isPackaged);

      // 关键修复：必须指定 name 参数，否则 Electron 使用默认名 "Electron"
      // 导致注册表键名为 "electron.app.Electron" 而非中文应用名
      app.setLoginItemSettings({
        openAtLogin: !!enabled,
        name: app.name || '任务清单',  // 注册表中的条目名称
        path: exePath,
        args: []
      });

      // 验证是否设置成功
      var loginSettings = app.getLoginItemSettings();
      logInfo('AUTO_START', enabled ? '已启用开机自启动' : '已关闭开机自启动');
      logInfo('AUTO_START', '验证 - openAtLogin: ' + loginSettings.openAtLogin + ', executableWillLaunchAtLogin: ' + loginSettings.executableWillLaunchAtLogin);

      // 二次验证：直接检查注册表值是否正确写入（异步，不阻塞）
      var regValue = null;
      try {
        require('child_process').exec(
          'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "' + (app.name || '任务清单') + '"',
          { encoding: 'utf8', timeout: 3000 },
          function(err, stdout) {
            if (stdout) {
              logInfo('AUTO_START', '注册表验证:\n' + stdout.trim());
            }
          }
        );
      } catch(e2) {}

      return { success: true, verified: loginSettings.openAtLogin === !!enabled };
    } catch(e) {
      logError('AUTO_START', '设置开机自启动失败: ' + e.message);
      return { success: false, error: e.message };
    }
  });

  // 语言切换时同步更新应用名称和注册表
  ipcMain.handle('update-app-language', async (event, lang) => {
    try {
      var newName = (lang === 'en-US') ? 'TodoList' : '任务清单';
      var oldName = app.name || '';

      // 更新应用名称
      app.name = newName;
      logInfo('APP', '语言切换，应用名称: ' + oldName + ' → ' + newName);

      // 如果自启已开启，需要用新名称重新写入注册表
      var loginSettings = app.getLoginItemSettings();
      if (loginSettings.openAtLogin) {
        var exePath = process.execPath;
        // 用新名称写入
        app.setLoginItemSettings({
          openAtLogin: true,
          name: newName,
          path: exePath,
          args: []
        });
        // 清除旧名称的注册表条目（如果名称变了）
        if (oldName && oldName !== newName) {
          try {
            require('child_process').exec(
              'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "' + oldName.replace(/"/g, '') + '" /f',
              { encoding: 'utf8', timeout: 5000 },
              function(ignored) {}
            );
          } catch(ignored) {}
        }
        logInfo('AUTO_START', '自启注册表已更新为: ' + newName);
      }

      return { success: true, name: newName };
    } catch(e) {
      logError('APP', '更新应用语言失败: ' + e.message);
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
  // 设置应用名称（用于注册表自启条目名、窗口标题等系统级功能）
  // 根据用户语言设置选择名称：中文=任务清单，英文=TodoList
  var userLang = (settingsData && settingsData.language) || 'zh-CN';
  app.name = (userLang === 'en-US') ? 'TodoList' : '任务清单';
  logInfo('APP', '应用名称设置为: ' + app.name + ' (语言: ' + userLang + ')');

  // 【v9.9.10】完全异步清理旧的错误自启条目（零阻塞主线程）
  // 历史遗留：键名为 "electron.app.Electron" 而非 "任务清单"
  // 注意：必须用 exec/execFile 异步方法，不能用 execSync（即使放 setImmediate 里也会阻塞事件循环）
  setImmediate(function() {
    try {
      var { exec } = require('child_process');
      exec(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "electron.app.Electron"',
        { encoding: 'utf8', timeout: 5000 },
        function(err, stdout, stderr) {
          if (err || !stdout) return; // 不存在或超时 → 无需处理
          logInfo('AUTO_START', '发现旧自启条目 "electron.app.Electron"，正在清理...');
          exec(
            'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "electron.app.Electron" /f',
            { encoding: 'utf8', timeout: 5000 },
            function(e2) {
              if (e2) logError('AUTO_START', '清理旧条目失败: ' + e2.message);
              else logInfo('AUTO_START', '旧自启条目已清理');
            }
          );
        }
      );
    } catch(e) {
      // exec 调用异常（理论上不会发生）
    }
  });

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

/**
 * 云同步/代理配置文件管理
 */
function getCloudSyncConfig() {
  try {
    if (fs.existsSync(cloudSyncConfigFile)) {
      return JSON.parse(fs.readFileSync(cloudSyncConfigFile, 'utf8'));
    }
  } catch(e) {}
  return {};
}

function saveCloudSyncConfig(config) {
  try {
    fs.writeFileSync(cloudSyncConfigFile, JSON.stringify(config, null, 2), 'utf8');
  } catch(e) {}
}

/**
 * 【v9.8.6 核心修复】智能代理检测策略
 * 
 * 新策略（按优先级）：
 *   1. 用户手动设置的代理地址（最可靠）
 *   2. Windows 系统代理（mode:'system' — Clash/VPN 大多会设这个）
 *   3. 环境变量（部分代理软件会设）
 *   4. 常见端口扫描（手动检查时才启用，探测 7890/10809 等常见端口）
 */
/**
 * 【v9.9.12】异步读取 Windows 注册表代理设置（零阻塞）
 * 返回 Promise<proxyServer string | null>
 */
function getWindowsSystemProxy() {
  return new Promise(function(resolve) {
    try {
      require('child_process').exec(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
        { encoding: 'utf8', timeout: 3000 },
        function(err, stdout) {
          if (err || !stdout) { resolve(null); return; }
          var match = stdout.match(/ProxyServer\s+REG_SZ\s+(.+)/);
          if (match && match[1] && match[1].trim()) {
            var proxyStr = match[1].trim();
            logInfo('PROXY', '[注册表] 发现系统代理: ' + proxyStr);
            resolve(proxyStr);
          } else {
            resolve(null);
          }
        }
      );
    } catch(e) {
      logInfo('PROXY', '[注册表] 无法读取（可能无代理或权限不足）');
      resolve(null);
    }
  });
}

/**
 * 【v9.9.12】异步检测注册表中代理是否启用（零阻塞）
 * 返回 Promise<boolean>
 */
function isWindowsProxyEnabled() {
  return new Promise(function(resolve) {
    try {
      require('child_process').exec(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable',
        { encoding: 'utf8', timeout: 3000 },
        function(err, stdout) {
          if (err || !stdout) { resolve(false); return; }
          var match = stdout.match(/ProxyEnable\s+REG_DWORD\s+0x(\d+)/);
          resolve(match ? match[1] === '1' : false);
        }
      );
    } catch(e) {
      resolve(false);
    }
  });
}

/**
 * 获取当前可用的代理 URL（供 IP 检测等需要走代理的请求使用）
 * 返回 Promise<'http://host:port' | null>（无代理时直连）
 * 【v9.9.12】改为异步版本，避免 execSync 阻塞
 */
function getProxyUrl() {
  // 优先级1: 用户手动配置（同步读文件，很快）
  var config = getCloudSyncConfig();
  if (config.manualProxy && config.manualProxy.trim()) {
    return Promise.resolve(normalizeProxyUrl(config.manualProxy));
  }
  
  // 优先级2: 系统注册表代理（异步）
  return getWindowsSystemProxy().then(function(sysProxy) {
    return isWindowsProxyEnabled().then(function(proxyEnabled) {
      if (sysProxy && proxyEnabled) {
        return normalizeProxyUrl(sysProxy);
      }
      
      // 优先级3: 环境变量
      var envProxy = process.env.HTTPS_PROXY || process.env.https_proxy ||
                     process.env.HTTP_PROXY || process.env.http_proxy ||
                     process.env.ALL_PROXY || process.env.all_proxy;
      if (envProxy) {
        return normalizeProxyUrl(envProxy);
      }
      
      return null;
    });
  });
}

function detectAndApplyProxy(forceProbe) {
  forceProbe = !!forceProbe;
  var config = getCloudSyncConfig();
  var sess = session.defaultSession;
  if (!sess) return Promise.resolve('no-session');

  // ====== 优先级1：用户手动配置的代理 ======
  if (config.manualProxy && config.manualProxy.trim()) {
    var manualUrl = normalizeProxyUrl(config.manualProxy);
    logInfo('PROXY', '[P1-手动] 使用用户配置的代理: ' + manualUrl);
    return sess.setProxy({
      mode: 'fixed_servers',
      proxyRules: extractHostAndPort(manualUrl)
    }).then(function() {
      logInfo('PROXY', '[生效] 手动代理已设置');
      return 'manual';
    });
  }

  // ====== 优先级2：Windows注册表/系统代理（异步，零阻塞）======
  return isWindowsProxyEnabled().then(function(proxyEnabled) {
    if (proxyEnabled) {
      return getWindowsSystemProxy().then(function(registryProxy) {
        if (registryProxy) {
          var sysProxyUrl = normalizeProxyUrl(registryProxy);
          logInfo('PROXY', '[P2-注册表] 使用系统注册表代理: ' + sysProxyUrl);
          return sess.setProxy({
            mode: 'fixed_servers',
            proxyRules: extractHostAndPort(sysProxyUrl)
          }).then(function() {
            logInfo('PROXY', '[生效] 注册表代理已设置');
            return 'registry';
          });
        }
        // 有 ProxyEnable 但无 ProxyServer → 继续 system 模式
        return applySystemOrDirect(forceProbe, sess, 'P2-system (有enable无server)');
      });
    }
    
    // 注册表没启用代理
    return applySystemOrDirect(forceProbe, sess, 'P2-system');
  });
}

/** 共享逻辑：system模式 或 direct */
function applySystemOrDirect(forceProbe, sess, logPrefix) {
  logInfo('PROXY', '[' + logPrefix + '] 未从注册表检测到代理，尝试 system 模式...');

  // 注册表没找到 → 尝试 system 模式（让 Electron 自己处理）
  // 不再用 resolveProxySync 验证（当前 Electron 版本不支持）
  return sess.setProxy({ mode: 'system' }).then(function() {
    return new Promise(function(resolve) {
      setTimeout(function() {
        // ====== 优先级3：环境变量 ======
        var envProxy = process.env.HTTPS_PROXY || process.env.https_proxy ||
                       process.env.HTTP_PROXY || process.env.http_proxy ||
                       process.env.ALL_PROXY || process.env.all_proxy;

        if (envProxy) {
          var envUrl = normalizeProxyUrl(envProxy);
          logInfo('PROXY', '[P3-环境变量] 检测到: ' + envUrl);
          return sess.setProxy({
            mode: 'fixed_servers',
            proxyRules: extractHostAndPort(envUrl)
          }).then(function() {
            logInfo('PROXY', '[生效] 环境变量代理已设置');
            resolve('env');
          });
        }

        // ====== 优先级4：常见端口探测（仅手动检查时）======
        if (forceProbe) {
          logInfo('PROXY', '[P4-探测] 扫描本地常见代理端口...');
          return probeCommonPorts(sess).then(function(found) {
            if (found) {
              resolve('probed');
            } else {
              logInfo('PROXY', '[最终] 未检测到任何代理，使用直连模式');
              return sess.setProxy({ mode: 'direct' }).then(function() { resolve('direct'); });
            }
          });
        }

        logInfo('PROXY', '[最终] 未检测到任何代理，使用直连模式');
        return sess.setProxy({ mode: 'direct' }).then(function() { resolve('direct'); });
      }, 300);
    });
  });
}

/** 探测本地常见代理端口（串行扫描，找到一个即停） */
function probeCommonPorts(sess) {
  var ports = [7890, 10809, 10808, 1080, 8080, 7891, 2080];
  var net = require('net');

  function tryConnect(host, port) {
    return new Promise(function(resolve) {
      var socket = new net.Socket();
      var timer = setTimeout(function() {
        try { socket.destroy(); } catch(ex) {}
        resolve(false);
      }, 800);
      socket.connect(port, host, function() {
        clearTimeout(timer);
        try { socket.destroy(); } catch(ex) {}
        resolve(true);
      });
      socket.on('error', function() {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  return ports.reduce(function(chain, port) {
    return chain.then(function(found) {
      if (found) return true;
      logInfo('PROXY', '[探测] 尝试 127.0.0.1:' + port);
      return tryConnect('127.0.0.1', port).then(function(ok) {
        if (ok) {
          var addr = 'http://127.0.0.1:' + port;
          logInfo('PROXY', '[探测成功! ] 发现可用代理: ' + addr);
          return sess.setProxy({
            mode: 'fixed_servers',
            proxyRules: '127.0.0.1:' + port
          }).then(function() { return true; });
        }
        return false;
      });
    });
  }, Promise.resolve(false));
}

/** 标准化代理URL格式 */
function normalizeProxyUrl(url) {
  url = String(url).trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }
  return url.replace(/\/$/, '');
}

/** 从完整代理URL中提取 host:port 格式 */
function extractHostAndPort(proxyUrl) {
  try {
    var u = new URL(proxyUrl);
    return u.hostname + ':' + (u.port || (u.protocol === 'https:' ? '443' : '7890'));
  } catch(e) {
    return proxyUrl;
  }
}

function checkForUpdates() {
  // 如果用户关闭了自动检测，跳过
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (!settings.autoCheckUpdate) return;
    }
  } catch(e) {}

  // 更新源配置
  // gitee：国内直连，无需代理；github：需代理访问（保留作为备选）
  const UPDATE_SOURCES = {
    gitee: {
      // generic provider，指向 Gitee 仓库中存储的 latest.yml 文件
      // 构建时需要将 latest.yml 上传到 Gitee 仓库根目录
      getFeedUrl: function() {
        return 'https://gitee.com/yansusu999/todo-list/raw/master/latest.yml';
      },
      apiUrl: 'https://gitee.com/api/v5/repos/yansusu999/todo-list/releases/latest'
    },
    github: null  // 备选，保持原有逻辑兼容
  };

  /** 根据更新源配置 autoUpdater 的 feed URL */
  function configureFeed(source) {
    if (source === 'gitee' && UPDATE_SOURCES.gitee) {
      var feedUrl = UPDATE_SOURCES.gitee.getFeedUrl();
      logInfo('UPDATE', '使用 Gitee 更新源, URL: ' + feedUrl);
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: feedUrl,
        requestHeaders: {
          'User-Agent': 'TodoList-Updater/1.0'
        }
      });
    } else {
      // github 兼容模式（备用）
      logInfo('UPDATE', '使用 GitHub 官方源');
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'wsccddyk',
        repo: 'todo-list'
      });
    }
  }

  logInfo('UPDATE', '开始初始化自动更新...');

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.forceDevUpdate = true; // 强制在开发模式也检查更新（开发调试用）

  autoUpdater.requestHeaders = {
    'User-Agent': 'TodoList-Updater/1.0',
    'Accept': 'application/json'
  };

  // ====== 智能代理检测并应用 ======
  detectAndApplyProxy(false).then(function(mode) {
    logInfo('PROXY', '[初始化完成] 代理模式: ' + mode);
  });

  configureFeed('gitee');

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

  autoUpdater.on('update-not-available', (info) => {
    logInfo('UPDATE', '当前已是最新版本');
    if (win) win.webContents.send('update-status', {
      state: 'not-available',
      version: info ? info.version : null
    });
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

  /**
   * 将 Electron/网络错误码翻译为中文用户友好提示
   */
  function translateNetError(rawMsg) {
    var msg = String(rawMsg || '');

    // 403/404 等服务端拒绝访问 → 当作"没有更新"处理（不暴露仓库私有等细节）
    if (/403|404|forbidden|not found|Not Found|拒绝访问|访问被拒绝/i.test(msg)) {
      return 'NO_UPDATE_AVAILABLE'; // 特殊标记，让调用方转为 not-available
    }

    // 超时类
    if (/ETIMEDOUT|TIMEDOUT|timeout|超时/i.test(msg)) {
      return '网络连接超时。\n\n服务器响应时间过长，可能原因：\n• 网络不稳定或带宽不足\n• 服务器暂时繁忙\n\n请稍后重试。';
    }
    // 连接被拒/被重置
    if (/ECONNREFUSED|CONNREFUSED|connection refused|连接被拒绝/i.test(msg)) {
      return '连接被拒绝。\n\n目标服务器拒绝连接，可能原因：\n• 防火墙拦截了请求\n• 服务器暂时不可用\n\n请稍后重试。';
    }
    if (/ECONNRESET|CONNECTION_RESET|connection reset|连接被重置/i.test(msg)) {
      return '连接被中断。\n\n网络连接在传输过程中被强制关闭。\n\n建议稍后重新尝试。';
    }
    // DNS 解析失败
    if (/ENOTFOUND|NOT_FOUND|getaddrinfo|Could not resolve|DNS|找不到主机/i.test(msg)) {
      return 'DNS 解析失败。\n\n无法解析域名，可能原因：\n• 网络连接断开\n• DNS 设置异常\n\n请检查网络连接后重试。';
    }
    // 所有 net::ERR_* 错误
    if (/net::ERR_/i.test(msg)) {
      var errCode = (msg.match(/net::(ERR_\S*)/i) || [])[1] || 'UNKNOWN';
      return '网络错误（' + errCode + '）\n\n访问更新服务器时发生网络异常。\n\n请检查网络后重试。';
    }
    // socket 错误
    if (/socket hang|EPIPE|broken pipe/i.test(msg)) {
      return '网络连接意外断开。\n\n请检查网络稳定性后重试。';
    }
    // 主机不可达
    if (/EHOSTUNREACH|HOST_UNREACH|unreachable/i.test(msg)) {
      return '目标主机不可达。\n\n当前网络环境无法到达服务器。\n\n请检查网络连接。';
    }

    // 未匹配到的原始消息（返回原文）
    return msg;
  }

  autoUpdater.on('error', (err) => {
    var errMsg = err ? (err.message || String(err)) : 'Unknown error';
    logError('UPDATE', '更新检查失败', errMsg);

    // 统一翻译为中文友好提示
    var translated = translateNetError(errMsg);

    // 特殊标记：403/404 视为"无新版本"而非错误
    if (translated === 'NO_UPDATE_AVAILABLE') {
      logInfo('UPDATE', '服务器返回 403/404，视为无新版本');
      if (win) win.webContents.send('update-status', { state: 'not-available', version: app.getVersion() });
      return;
    }

    if (win) win.webContents.send('update-status', { state: 'error', message: translated });
  });

  /**
   * 带超时的安全包装器
   * 注意：electron-updater 的 checkForUpdates 在网络不通时可能永远不 resolve/reject
   * 所以必须用超时兜底
   */
  function checkWithTimeout(timeoutMs) {
    timeoutMs = timeoutMs || 20000;

    return new Promise(function(resolve, reject) {
      var settled = false;
      var timer = setTimeout(function() {
        if (!settled) {
          settled = true;
          logError('UPDATE', '检查更新超时（' + (timeoutMs / 1000) + 's）');
          reject(new Error('TIMEOUT'));
        }
      }, timeoutMs);

      autoUpdater.checkForUpdates().then(function(result) {
        if (!settled) { settled = true; clearTimeout(timer); resolve(result); }
      }).catch(function(err) {
        if (!settled) { settled = true; clearTimeout(timer); reject(err); }
      });
    });
  }

  /**
   * 检测公网 IP 和归属地（通过代理）
   * 注意：必须使用 Electron 的 net 模块或带代理的请求，否则不走系统代理/VPN
   * 方案：先获取当前代理配置，然后通过代理发请求；无代理则直连
   */
  ipcMain.handle('get-public-ip', async () => {
    var https = require('https');
    var http = require('http');
    var { URL } = require('url');

    // 整个 handler 包一层 try-catch，防止 reply was never sent
    try {
      // 【v9.9.12】异步获取代理配置，不阻塞
      var proxyUrl = await getProxyUrl();
      
    function fetchIP(apiUrl, parseFn) {
      return new Promise(function(resolve, reject) {
        if (proxyUrl) {
          fetchViaProxy(apiUrl, proxyUrl).then(function(data) {
            logInfo('NET', '[DEBUG] ' + apiUrl + ' via proxy 返回(前100字符):', String(data).substring(0, 100));
            resolve(parseFn(data));
          }).catch(reject);
        } else {
          fetchDirect(apiUrl).then(function(rawData) {
            logInfo('NET', '[DEBUG] ' + apiUrl + ' 直连返回(前100字符):', String(rawData).substring(0, 100));
            resolve(parseFn(rawData));
          }).catch(reject);
        }
      });
    }

      /**
       * 通过代理发起 HTTP 请求
       */
      function fetchViaProxy(targetUrl, proxyAddr) {
      return new Promise(function(resolve, reject) {
        try {
          var target = new URL(targetUrl);
          var proxy = new URL(proxyAddr);
          
          var options = {
            host: proxy.hostname,
            port: parseInt(proxy.port) || (proxy.protocol === 'https:' ? 443 : 80),
            method: 'GET',
            path: targetUrl,
            headers: {
              'User-Agent': 'TodoList/1.0',
              'Host': target.host
            },
            timeout: 8000
          };
          
          var mod = (proxy.protocol === 'https:' ? https : http);
          var req = mod.request(options, function(res) {
            var data = '';
            res.on('data', function(chunk) { data += chunk; });
            res.on('end', function() { resolve(data); });
          });
          req.on('error', reject);
          req.on('timeout', function() { req.destroy(); reject(new Error('timeout')); });
          req.end();
        } catch(e) {
          reject(e);
        }
      });
    }

    /**
     * 直连请求（返回原始字符串）
     */
    function fetchDirect(apiUrl) {
      return new Promise(function(resolve, reject) {
        var isHttps = apiUrl.startsWith('https');
        var mod = isHttps ? https : http;
        
        var req = mod.get(apiUrl, {
          headers: { 'User-Agent': 'TodoList/1.0' },
          timeout: 8000
        }, function(res) {
          var data = '';
          res.on('data', function(chunk) { data += chunk; });
          res.on('end', function() { resolve(data); });
        });
        req.on('error', reject);
        req.on('timeout', function() { req.destroy(); reject(new Error('timeout')); });
      });
    }

    /**
     * 检测到指定服务器的连接延迟（ms）
     * 超过 2000ms 显示 "2000ms+"，超时显示"超时"
     * @param {string} targetUrl - 目标URL
     * @param {number} timeoutMs - 超时毫秒数（默认 3000ms）
     */
    function measureLatency(targetUrl, timeoutMs) {
      timeoutMs = timeoutMs || 3000;
      return new Promise(function(resolve) {
        var start = Date.now();
        
        if (proxyUrl) {
          // 有代理：通过代理检测延迟
          try {
            var target = new URL(targetUrl);
            var proxy = new URL(proxyUrl);
            
            var options = {
              host: proxy.hostname,
              port: parseInt(proxy.port) || (proxy.protocol === 'https:' ? 443 : 80),
              method: 'GET',
              path: targetUrl,
              headers: { 'User-Agent': 'TodoList/1.0', 'Host': target.host },
              timeout: timeoutMs
            };
            
            var pmod = (proxy.protocol === 'https:' ? https : http);
            var req = pmod.request(options, function(res) {
              var latency = Date.now() - start;
              res.resume();
              resolve({ latency: latency > 2000 ? 2001 : latency, ok: true });
            });
            req.on('error', function() { resolve({ latency: -1, ok: false }); });
            req.on('timeout', function() { req.destroy(); resolve({ latency: -1, ok: false }); });
            req.end();
          } catch(e) {
            resolve({ latency: -1, ok: false });
          }
        } else {
          // 无代理：直连
          var isHttps = targetUrl.startsWith('https');
          var dmod = isHttps ? https : http;
          
          var dreq = dmod.get(targetUrl, {
            headers: { 'User-Agent': 'TodoList/1.0' },
            timeout: timeoutMs
          }, function(res) {
            var latency = Date.now() - start;
            res.resume();
            resolve({ latency: latency > 2000 ? 2001 : latency, ok: true });
          });
          dreq.on('error', function() { resolve({ latency: -1, ok: false }); });
          dreq.on('timeout', function() { dreq.destroy(); resolve({ latency: -1, ok: false }); });
        }
      });
    }

    // ===== 并行检测 IP + 延迟（3秒超时） =====
    
    // 检测 Gitee 和 GitHub 的延迟（并行，各 3s 超时）
    var giteeLatencyPromise = measureLatency('https://gitee.com/api/v5/repos/yansusu999/todo-list', 3000);
    var githubLatencyPromise = measureLatency('https://api.github.com/repos/yansusu999/todo-list/releases/latest', 3000);

    // ===== IP 检测（按可靠性排序：国内友好优先） =====
    
    logInfo('NET', '开始检测公网 IP，代理配置:', proxyUrl || '(无代理/直连)');

    // API1: ip-api.com (HTTP) — 国内首选，速度快
    try {
      var info = await fetchIP('http://ip-api.com/json?lang=zh-CN', function(data) { return JSON.parse(data); });
      logInfo('NET', '[DEBUG] ip-api.com 原始返回:', JSON.stringify(info));
      if (info && info.status === 'success') {
        logInfo('NET', 'IP检测成功(ip-api): ' + info.query);
        var [gL1, ghL1] = await Promise.all([giteeLatencyPromise, githubLatencyPromise]);
        logInfo('NET', 'Gitee 延迟:', gL1.ok ? gL1.latency + 'ms' : '超时', 
                '| GitHub 延迟:', ghL1.ok ? ghL1.latency + 'ms' : '超时');
        
        return {
          success: true,
          ip: info.query,
          city: info.city || '',
          region: info.regionName || '',
          country: info.countryCode || '',
          org: info.isp || '',
          isChina: (info.countryCode === 'CN'),
          latency: {
            gitee: gL1.ok ? gL1.latency : -1,
            github: ghL1.ok ? ghL1.latency : -1
          }
        };
      }
    } catch(e) {
      logInfo('NET', 'ip-api.com 失败:', e.message);
    }

    // API2: ipinfo.io (HTTPS) — 备选
    try {
      var info2 = await fetchIP('https://ipinfo.io/json', function(data) { return JSON.parse(data); });
      if (info2 && info2.ip) {
        logInfo('NET', 'IP检测成功(ipinfo): ' + info2.ip);
        var [gL2, ghL2] = await Promise.all([giteeLatencyPromise, githubLatencyPromise]);
        return {
          success: true,
          ip: info2.ip,
          city: info2.city || '',
          region: info2.region || '',
          country: info2.country || '',
          org: info2.org || '',
          isChina: (info2.country === 'CN'),
          latency: { gitee: gL2.ok ? gL2.latency : -1, github: ghL2.ok ? ghL2.latency : -1 }
        };
      }
    } catch(e) {
      logInfo('NET', 'ipinfo.io 失败:', e.message);
    }

    // API3: ifconfig.me (纯文本，最简单可靠)
    try {
      var rawIp = await fetchIP('https://ifconfig.me/ip', function(data) { return data.trim(); });
      if (rawIp && rawIp.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        logInfo('NET', 'IP检测成功(ifconfig): ' + rawIp);
        var [gL3, ghL3] = await Promise.all([giteeLatencyPromise, githubLatencyPromise]);
        return {
          success: true,
          ip: rawIp,
          city: '', region: '', country: '', org: '', isChina: false,
          latency: { gitee: gL3.ok ? gL3.latency : -1, github: ghL3.ok ? ghL3.latency : -1 }
        };
      }
    } catch(e) {
      logInfo('NET', 'ifconfig.me 也失败:', e.message);
    }


    // 全部失败 — 但仍返回延迟信息
    try {
      var [giteeLf, githubLf] = await Promise.all([giteeLatencyPromise, githubLatencyPromise]);
      logInfo('NET', '(IP失败) Gitee 延迟:', giteeLf.ok ? giteeLf.latency + 'ms' : '超时', 
              '| GitHub 延迟:', githubLf.ok ? githubLf.latency + 'ms' : '超时');
      return { 
        success: false, 
        error: '无法获取IP信息（3个API均不可达），请检查网络',
        latency: {
          gitee: giteeLf.ok ? giteeLf.latency : -1,
          github: githubLf.ok ? githubLf.latency : -1
        }
      };
    } catch(latErr) {
      return { success: false, error: '无法获取IP信息，请检查网络连接' };
    }
    } catch(handlerErr) {
      logError('NET', 'get-public-ip handler 异常:', handlerErr.message || handlerErr);
      return { success: false, error: '检测异常: ' + (handlerErr.message || String(handlerErr)) };
    }
  });

  // IPC handlers

  // 当前选中的更新源（由 set-updater-source 设置，供 updater-check 读取）
  var _currentUpdateSource = 'gitee';

  /** 
   * 更新检查 —— 重写为两阶段：
   * 阶段1：根据所选源做连通性预检（5秒内出结果），失败立即返回错误给渲染进程弹窗
   * 阶段2：连通性OK后再调 electron-updater 检查更新版本
   */
  ipcMain.handle('updater-check', async () => {
    // ===== 阶段0：源选择感知 =====
    // 如果是 GitHub 且无代理 → 直接提示需要代理（国内直连必然超时/被墙）
    if (_currentUpdateSource === 'github') {
      var proxyUrl = await getProxyUrl(); // 【v9.9.12】异步获取，不阻塞
      if (!proxyUrl) {
        logInfo('UPDATE', 'GitHub源无代理，直接返回提示');
        return { 
          error: true, 
          message: '⚠️ 使用 GitHub 更新源需要代理。\n\n检测到当前网络环境未配置代理（直连模式）。\n\nGitHub 在中国大陆访问不稳定，请：\n• 切换到「Gitee」更新源（推荐，国内直连秒开）\n• 或开启 VPN/代理后重试\n\n提示：ping 通 TCP 不代表 HTTPS 能完成完整请求'
        };
      }
      logInfo('UPDATE', 'GitHub源 + 有代理(' + proxyUrl + ')，继续检查...');
    }

    // ===== 阶段1：连通性预检（匹配所选源）=====
    var precheckUrl = (_currentUpdateSource === 'github')
      ? 'https://api.github.com/repos/yansusu999/todo-list/releases/latest'
      : 'https://gitee.com/api/v5/repos/yansusu999/todo-list/releases/latest';
    
    logInfo('UPDATE', '开始连通性预检... (' + _currentUpdateSource + ')');
    var netOk = await new Promise(function(resolve) {
      var https = require('https');
      var settled = false;
      var timer = setTimeout(function() {
        if (!settled) {
          settled = true;
          logInfo('UPDATE', '连通性预检超时（5秒），认为网络不可达');
          resolve(false);
        }
      }, 5000);

      try {
        var req = https.get(precheckUrl, {
          headers: { 'User-Agent': 'TodoList-Updater/1.0' },
          timeout: 5000  // 缩短预检超时
        }, function(res) {
          clearTimeout(timer);
          if (!settled) { settled = true; resolve(res.statusCode < 500); }
          req.abort();
        });
        req.on('error', function(e) {
          clearTimeout(timer);
          if (!settled) { settled = true; resolve(false); }
        });
        req.on('timeout', function() {
          clearTimeout(timer);
          req.destroy();
          if (!settled) { settled = true; resolve(false); }
        });
      } catch(e) {
        clearTimeout(timer);
        resolve(false);
      }
    });

    if (!netOk) {
      var srcName = _currentUpdateSource === 'github' ? 'GitHub' : 'Gitee';
      logError('UPDATE', '连通性预检失败：' + srcName + '不可达');
      return { error: true, message: '无法连接到更新服务器。\n\n当前网络无法访问 ' + srcName + '。' + 
        (_currentUpdateSource === 'github' ? '\n\n建议切换到「Gitee」更新源（国内直连）。' : '\n\n请检查网络连接后重试。') };
    }

    logInfo('UPDATE', '连通性预检通过，开始检查更新版本...');

    // ===== 阶段2：正式检查更新（缩短超时至12秒）=====
    try {
      var result = await checkWithTimeout(12000);
      logInfo('UPDATE', '检查结果:', JSON.stringify(result));
      
      // 返回统一格式的结果给渲染进程处理弹窗
      if (result && result.updateInfo) {
        return {
          hasUpdate: !!result.updateInfo.version,
          localVersion: app.getVersion(),
          serverVersion: result.updateInfo.version || null,
          releaseNotes: result.updateInfo.releaseNotes || ''
        };
      }
      // 没有新版本
      return {
        hasUpdate: false,
        localVersion: app.getVersion(),
        serverVersion: (result && result.updateInfo && result.updateInfo.version) || null,
        releaseNotes: ''
      };
    } catch(e) {
      // 超时或其他异常 — 统一翻译
      var errMsg = (e && e.message) ? String(e.message) : '';
      if (errMsg === 'TIMEOUT') {
        errMsg = '⏱ 更新检查超时（等待超过 12 秒无响应）。\n\n可能原因：\n• 服务器响应时间过长\n• 网络不稳定\n• 当前更新源在国内访问慢\n\n建议：切换到 Gitee 更新源（国内直连更快），或稍后再试';
      } else {
        // 403/404 不再当作"没有找到更新"，而是作为网络错误提示
        if (/403|forbidden/i.test(errMsg)) {
          errMsg = '无法访问更新服务器（权限被拒绝）。\n\n可能原因：\n• Gitee 仓库可能设为私有\n• 网络环境受限\n\n建议：检查网络设置或稍后重试';
        } else if (/404|not found/i.test(errMsg)) {
          errMsg = '更新文件不存在。\n\n服务器上找不到 latest.yml 文件。\n\n请确认更新源配置正确。';
        } else {
          errMsg = translateNetError(errMsg);
        }
      }
      return { error: true, message: errMsg || '更新检查失败，请稍后重试。' };
    }
  });

  ipcMain.handle('updater-download', async () => {
    return autoUpdater.downloadUpdate();
  });

  ipcMain.handle('updater-install', async () => {
    autoUpdater.quitAndInstall(true, true);
  });

  ipcMain.handle('get-app-version', async () => {
    return { version: app.getVersion() };
  });

  // 同步获取版本号（渲染进程启动时立即需要，不能等异步）
  ipcMain.on('get-app-version-sync', (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.handle('set-updater-source', async (event, source) => {
    _currentUpdateSource = source || 'gitee'; // 记录当前源，供 updater-check 使用
    await detectAndApplyProxy(false);
    configureFeed(source);
    return { success: true, source: source };
  });

  // 云同步/代理配置 IPC
  ipcMain.handle('get-cloud-sync-config', async () => {
    return getCloudSyncConfig();
  });

  ipcMain.handle('save-cloud-sync-config', async (event, config) => {
    saveCloudSyncConfig(config);
    if (config.manualProxy !== undefined) {
      await detectAndApplyProxy(false);
    }
    return { success: true };
  });

  // 测试网络连接（检测 Gitee 可达性）
  ipcMain.handle('test-proxy-connection', async () => {
    return new Promise(function(resolve) {
      var https = require('https');
      var req = https.get('https://gitee.com/api/v5/', {
        headers: { 'User-Agent': 'TodoList-Test/1.0' },
        timeout: 10000
      }, function(res) {
        res.resume();
        resolve({ success: true, status: res.statusCode, message: '网络连接正常!' });
      });
      req.on('error', function(e) {
        resolve({ success: false, error: e.message, message: '连接失败: ' + e.message });
      });
      req.on('timeout', function() {
        req.destroy();
        resolve({ success: false, error: 'TIMEOUT', message: '连接超时(10秒)' });
      });
    });
  });

  /**
   * 读取本地所有数据文件，打包为一个对象上传云端
   * 包含 version 字段用于区分新旧格式
   */
  function readAllLocalData() {
    var fs = require('fs');
    var result = { version: 2, timestamp: new Date().toISOString() };

    // 读取任务数据
    try {
      var tasksPath = path.join(userDataPath, 'calendar-tasks.json');
      if (fs.existsSync(tasksPath)) {
        result.tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
      } else {
        result.tasks = {};
      }
    } catch(e) { result.tasks = {}; }

    // 读取设置数据
    try {
      var settingsPath = path.join(userDataPath, 'calendar-settings.json');
      if (fs.existsSync(settingsPath)) {
        result.settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } else {
        result.settings = {};
      }
    } catch(e) { result.settings = {}; }

    // 读取日期颜色数据
    try {
      var colorsPath = path.join(userDataPath, 'calendar-day-colors.json');
      if (fs.existsSync(colorsPath)) {
        result.dayColors = JSON.parse(fs.readFileSync(colorsPath, 'utf8'));
      } else {
        result.dayColors = {};
      }
    } catch(e) { result.dayColors = {}; }

    // 读取云同步配置（包含 Token）
    try {
      if (fs.existsSync(cloudSyncConfigFile)) {
        result.cloudConfig = JSON.parse(fs.readFileSync(cloudSyncConfigFile, 'utf8'));
      } else {
        result.cloudConfig = {};
      }
    } catch(e) { result.cloudConfig = {}; }

    return result;
  }

  /**
   * 将云端下载的数据写回各本地文件，并刷新内存状态
   * @param {object} data - 云端数据（v1 仅含 tasks，v2 含 tasks/settings/dayColors/cloudConfig）
   * @returns {boolean}
   */
  function writeAllLocalData(data) {
    var fs = require('fs');

    if (data.version === 2) {
      // v2 格式：完整备份，写回所有文件
      try {
        if (data.tasks !== undefined) {
          fs.writeFileSync(path.join(userDataPath, 'calendar-tasks.json'),
            JSON.stringify(data.tasks, null, 2), 'utf8');
        }
        if (data.settings !== undefined) {
          fs.writeFileSync(path.join(userDataPath, 'calendar-settings.json'),
            JSON.stringify(data.settings, null, 2), 'utf8');
        }
        if (data.dayColors !== undefined) {
          fs.writeFileSync(path.join(userDataPath, 'calendar-day-colors.json'),
            JSON.stringify(data.dayColors, null, 2), 'utf8');
        }
        if (data.cloudConfig !== undefined) {
          fs.writeFileSync(cloudSyncConfigFile,
            JSON.stringify(data.cloudConfig, null, 2), 'utf8');
        }
      } catch(e) {
        logError('CLOUD', '写入本地数据文件失败', e.message);
        return false;
      }
    } else {
      // v1 旧格式（仅含 tasks），只写回任务文件，保留其他文件不变
      try {
        fs.writeFileSync(path.join(userDataPath, 'calendar-tasks.json'),
          JSON.stringify(data, null, 2), 'utf8');
      } catch(e) {
        logError('CLOUD', '写入任务文件失败（v1兼容）', e.message);
        return false;
      }
    }

    // 刷新内存中的数据（供渲染进程使用）
    loadDataFromFiles();
    return true;
  }

  // ====== 坚果云 WebDAV 实现 ======
  function jianguoyunUpload(config) {
    return new Promise(function(resolve, reject) {
      var https = require('https');
      var auth = Buffer.from(config.jianguoyun_username + ':' + config.jianguoyun_password).toString('base64');
      var data = readAllLocalData();
      if (!data) { reject(new Error('无法读取本地数据文件')); return; }

      var body = JSON.stringify(data);
      var urlObj = new URL('https://dav.jianguoyun.com/dav/calendar-tasks.json');

      var options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + auth,
          'Content-Type': 'application/json;charset=utf-8',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 30000
      };

      logInfo('CLOUD', '[坚果云] 开始上传... 文件大小: ' + Math.round(body.length / 1024) + 'KB');
      
      var req = https.request(options, function(res) {
        // 坚果云 WebDAV 可能返回重定向
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          logInfo('CLOUD', '[坚果云] 跟随重定向到: ' + res.headers.location);
          // 简单处理：直接返回成功（坚果云 PUT 后常 301/302）
          resolve({ success: true, message: '✅ 上传成功！数据已同步到坚果云' });
          return;
        }
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
          resolve({ success: true, message: '✅ 上传成功！数据已同步到坚果云' });
        } else {
          var errBody = '';
          res.on('data', function(c) { errBody += c; });
          res.on('end', function() {
            reject(new Error('上传失败(HTTP ' + res.statusCode + ')：' + (errBody || '未知错误')));
          });
        }
      });

      req.on('error', function(e) {
        logError('CLOUD', '[坚果云] 上传请求失败', e.message);
        reject(new Error('网络错误：' + e.message + '\n\n请检查：\n• 用户名和应用密码是否正确\n• 是否开启了 WebDAV 服务'));
      });
      req.on('timeout', function() { req.destroy(); reject(new Error('上传超时（>30秒）。检查网络或尝试更换DNS。')); });
      req.write(body);
      req.end();
    });
  }

  function jianguoyunDownload(config) {
    return new Promise(function(resolve, reject) {
      var https = require('https');
      var auth = Buffer.from(config.jianguoyun_username + ':' + config.jianguoyun_password).toString('base64');
      var urlObj = new URL('https://dav.jianguoyun.com/dav/calendar-tasks.json');

      var options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + auth,
          'Accept': '*/*'
        },
        timeout: 30000
      };

      logInfo('CLOUD', '[坚果云] 开始下载...');
      
      var req = https.request(options, function(res) {
        if (res.statusCode === 404) {
          reject(new Error('云端没有找到备份数据。\n\n请先在另一台设备上执行「上传」操作。'));
          return;
        }
        if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error('认证失败！用户名或应用密码不正确。\n\n请在坚果云 → 设置 → 安全选项 中重新生成密码。'));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error('下载失败(HTTP ' + res.statusCode + ')。'));
          return;
        }

        var chunks = [];
        res.on('data', function(chunk) { chunks.push(chunk); });
        res.on('end', function() {
          var raw = Buffer.concat(chunks).toString('utf8');
          try {
            var cloudData = JSON.parse(raw);
            
            // 写入本地文件（writeAllLocalData 会自动识别 v1/v2 格式并写回各文件）
            if (writeAllLocalData(cloudData)) {
              // 通知渲染进程刷新数据
              if (win) win.webContents.send('data-sync', {
                tasks: tasksData,
                settings: settingsData,
                dayColors: dayColorsData
              });
              resolve({ success: true, message: '✅ 下载成功！云端数据已恢复到本地，即将自动刷新界面。' });
            } else {
              reject(new Error('写入本地文件失败，可能权限不足或文件被占用。'));
            }
          } catch(parseErr) {
            reject(new Error('云端数据格式异常（不是有效的JSON）。\n\n可能是旧版本或不兼容的数据。'));
          }
        });
      });

      req.on('error', function(e) {
        reject(new Error('网络错误：' + e.message));
      });
      req.on('timeout', function() { req.destroy(); reject(new Error('下载超时（>30秒）。')); });
      req.end();
    });
  }

  // ====== Gitee API 实现 ======

  /**
   * 用 Token 查出 Gitee 真实用户名（解决用户填邮箱而非登录名的问题）
   */
  function resolveGiteeUsername(token) {
    return new Promise(function(resolve, reject) {
      var https = require('https');
      var urlObj = new URL('https://gitee.com/api/v5/user?access_token=' + encodeURIComponent(token));
      https.get({
        hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search,
        headers: { 'User-Agent': 'TodoList-CloudSync/1.0' }, timeout: 10000
      }, function(res) {
        var body = '';
        res.on('data', function(c) { body += c; });
        res.on('end', function() {
          try { var info = JSON.parse(body); resolve(info.login); }
          catch(e) { reject(new Error('无法获取Gitee用户信息: ' + (body || e.message))); }
        });
      }).on('error', function(e) { reject(new Error('查询用户名失败: ' + e.message)); })
        .on('timeout', function() { this.destroy(); reject(new Error('查询超时')); });
    });
  }

  /**
   * 获取 Gitee 上已有文件的 sha（用于 PUT 更新），若文件不存在返回 null
   */
  function giteeGetFileSha(token, realUsername, repo) {
    return new Promise(function(resolve) {
      var https = require('https');
      var apiPath = '/api/v5/repos/' + realUsername + '/' + repo + '/contents/calendar-tasks.json?access_token=' + encodeURIComponent(token);
      https.get({
        hostname: 'gitee.com', path: apiPath,
        headers: { 'User-Agent': 'TodoList-CloudSync/1.0' }, timeout: 15000
      }, function(res) {
        var body = '';
        res.on('data', function(c) { body += c; });
        res.on('end', function() {
          if (res.statusCode === 200) {
            try { var info = JSON.parse(body); resolve(info.sha || null); }
            catch(e) { resolve(null); }
          } else {
            resolve(null); // 404 = 文件不存在，其他错误也当作无 sha 处理
          }
        });
      }).on('error', function() { resolve(null); })
        .on('timeout', function() { this.destroy(); resolve(null); });
    });
  }

  function giteeUpload(config) {
    return new Promise(function(resolve, reject) {
      var https = require('https');
      var data = readAllLocalData();
      if (!data) { reject(new Error('无法读取本地数据文件')); return; }

      // 先解析真实登录名（用户可能填了邮箱），再执行上传
      resolveGiteeUsername(config.gitee_token).then(function(realUsername) {
        logInfo('CLOUD', '[Gitee] 解析到真实用户名: ' + realUsername + ' (输入: ' + config.gitee_username + ')');

        // 先查文件是否已存在（获取 sha），决定使用 POST 创建还是 PUT 更新
        return giteeGetFileSha(config.gitee_token, realUsername, config.gitee_repo).then(function(existingSha) {
          var content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
          var bodyObj = {
            access_token: config.gitee_token,
            content: content,
            message: '任务清单云备份 - ' + new Date().toLocaleString('zh-CN'),
            branch: 'main'
          };
          // 文件已存在时必须带 sha，使用 PUT；否则 POST 创建
          var method, logVerb;
          if (existingSha) {
            bodyObj.sha = existingSha;
            method = 'PUT';
            logVerb = '更新';
          } else {
            method = 'POST';
            logVerb = '创建';
          }
          var body = JSON.stringify(bodyObj);
          var apiPath = '/api/v5/repos/' + realUsername + '/' + config.gitee_repo + '/contents/calendar-tasks.json';

          var options = {
            hostname: 'gitee.com',
            port: 443,
            path: apiPath,
            method: method,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
              'User-Agent': 'TodoList-CloudSync/1.0'
            },
            timeout: 30000
          };

          logInfo('CLOUD', '[Gitee] 开始' + logVerb + '文件到: ' + realUsername + '/' + config.gitee_repo + ' (sha=' + (existingSha || 'none') + ')');

          return new Promise(function(res2, rej2) {
            var req = https.request(options, function(res) {
              var respBody = '';
              res.on('data', function(c) { respBody += c; });
              res.on('end', function() {
                logInfo('CLOUD', '[Gitee] 响应状态: ' + res.statusCode);
                if (res.statusCode === 200 || res.statusCode === 201) {
                  res2({ success: true, message: '✅ 上传成功！数据已推送到 Gitee 仓库' });
                } else if (res.statusCode === 404) {
                  rej2(new Error('仓库不存在或无访问权限。\n\n请确认：\n• 仓库名拼写正确\n• Token 有「projects」读写权限\n• 仓库是私有且你拥有访问权'));
                } else if (res.statusCode === 401 || res.statusCode === 403) {
                  rej2(new Error('Token 认证失败或无权限。\n\n请确认 Token 正确且有「projects」权限。'));
                } else {
                  try {
                    var errInfo = JSON.parse(respBody);
                    rej2(new Error('上传失败：' + (errInfo.message || respBody)));
                  } catch(e) {
                    rej2(new Error('上传失败(HTTP ' + res.statusCode + ')'));
                  }
                }
              });
            });
            req.on('error', function(e) {
              logError('CLOUD', '[Gitee] 上传失败', e.message);
              rej2(new Error('网络错误：' + e.message + '\n\nGitee API 需要能正常访问 gitee.com'));
            });
            req.on('timeout', function() { req.destroy(); rej2(new Error('上传超时（>30秒）。')); });
            req.write(body);
            req.end();
          });
        });
      }).then(resolve).catch(reject);
    });
  }

  function giteeDownload(config) {
    return new Promise(function(resolve, reject) {
      // 同样先解析真实用户名
      resolveGiteeUsername(config.gitee_token).then(function(realUsername) {
        var https = require('https');
        var tokenParam = '?access_token=' + encodeURIComponent(config.gitee_token);
        var apiPath = '/api/v5/repos/' + realUsername + '/' + config.gitee_repo + '/contents/calendar-tasks.json' + tokenParam;

      var options = {
        hostname: 'gitee.com',
        port: 443,
        path: apiPath,
        method: 'GET',
        headers: {
          'User-Agent': 'TodoList-CloudSync/1.0'
        },
        timeout: 30000
      };

      logInfo('CLOUD', '[Gitee] 开始下载...');

        var req = https.request(options, function(res) {
          var respBody = '';
          res.on('data', function(c) { respBody += c; });
          res.on('end', function() {
            if (res.statusCode === 404) {
              reject(new Error('云端没有找到备份数据。\n\n请先在另一台设备上执行「上传」操作。'));
              return;
            }
            if (res.statusCode === 401 || res.statusCode === 403) {
              reject(new Error('Token 认证失败或无权限。'));
              return;
            }
            if (res.statusCode !== 200) {
              reject(new Error('下载失败(HTTP ' + res.statusCode + ')。'));
              return;
            }

            try {
              var fileInfo = JSON.parse(respBody);
              var content = Buffer.from(fileInfo.content, 'base64').toString('utf8');
              var cloudData = JSON.parse(content);

              if (writeAllLocalData(cloudData)) {
                // 通知渲染进程刷新数据
                if (win) win.webContents.send('data-sync', {
                  tasks: tasksData,
                  settings: settingsData,
                  dayColors: dayColorsData
                });
                resolve({ success: true, message: '✅ 下载成功！云端数据已恢复到本地，界面将自动刷新。' });
              } else {
                reject(new Error('写入本地文件失败，可能权限不足或文件被占用。'));
              }
            } catch(parseErr) {
              reject(new Error('云端数据解析失败：' + parseErr.message));
            }
          });
        });

        req.on('error', function(e) {
          reject(new Error('网络错误：' + e.message));
        });
        req.on('timeout', function() { req.destroy(); reject(new Error('下载超时（>30秒）。')); });
        req.end();
      }).catch(function(err) {
        reject(err); // 用户名解析失败
      });
    });
  }

  // 云同步上传/下载 —— 完整实现
  ipcMain.handle('cloud-upload', async (event, provider) => {
    var config = getCloudSyncConfig();

    if (provider === 'jianguoyun') {
      if (!config.jianguoyun_username || !config.jianguoyun_password) {
        return { success: false, error: 'CONFIG_MISSING', message: '❌ 请先填写坚果云的邮箱和密码，点击「保存」后再上传。' };
      }
      logInfo('CLOUD', '开始上传 [坚果云 WebDAV]');
      try {
        return await jianguoyunUpload(config);
      } catch(e) {
        return { success: false, error: 'UPLOAD_FAIL', message: '⚠️ 上传失败：' + e.message };
      }
    } else if (provider === 'gitee') {
      if (!config.gitee_token || !config.gitee_repo) {
        return { success: false, error: 'CONFIG_MISSING', message: '❌ 请先填写 Gitee Token 和仓库名，点击「保存」后再上传。' };
      }
      logInfo('CLOUD', '开始上传 [Gitee]');
      try {
        return await giteeUpload(config);
      } catch(e) {
        return { success: false, error: 'UPLOAD_FAIL', message: '⚠️ 上传失败：' + e.message };
      }
    }

    return { success: false, error: 'UNKNOWN_PROVIDER', message: '未知的云服务提供商: ' + provider };
  });

  ipcMain.handle('cloud-download', async (event, provider) => {
    var config = getCloudSyncConfig();

    if (provider === 'jianguoyun') {
      if (!config.jianguoyun_username || !config.jianguoyun_password) {
        return { success: false, error: 'CONFIG_MISSING', message: '❌ 请先填写坚果云的邮箱和密码，点击「保存」后再下载。' };
      }
      logInfo('CLOUD', '开始下载 [坚果云 WebDAV]');
      try {
        return await jianguoyunDownload(config);
      } catch(e) {
        return { success: false, error: 'DOWNLOAD_FAIL', message: '⚠️ 下载失败：' + e.message };
      }
    } else if (provider === 'gitee') {
      if (!config.gitee_token || !config.gitee_repo) {
        return { success: false, error: 'CONFIG_MISSING', message: '❌ 请先填写 Gitee Token 和仓库名，点击「保存」后再下载。' };
      }
      logInfo('CLOUD', '开始下载 [Gitee]');
      try {
        return await giteeDownload(config);
      } catch(e) {
        return { success: false, error: 'DOWNLOAD_FAIL', message: '⚠️ 下载失败：' + e.message };
      }
    }

    return { success: false, error: 'UNKNOWN_PROVIDER', message: '未知的云服务提供商: ' + provider };
  });

  // 获取 Gitee 上 calendar-tasks.json 的历史提交列表
  ipcMain.handle('cloud-list-versions', async () => {
    var config = getCloudSyncConfig();
    if (!config.gitee_token || !config.gitee_repo) {
      return { success: false, message: '❌ 请先保存 Gitee 配置' };
    }
    try {
      var realUsername = await resolveGiteeUsername(config.gitee_token);
      var versions = await new Promise(function(resolve, reject) {
        var https = require('https');
        var apiPath = '/api/v5/repos/' + realUsername + '/' + config.gitee_repo
          + '/commits?access_token=' + encodeURIComponent(config.gitee_token)
          + '&path=calendar-tasks.json&limit=20';
        https.get({
          hostname: 'gitee.com', path: apiPath,
          headers: { 'User-Agent': 'TodoList-CloudSync/1.0' }, timeout: 15000
        }, function(res) {
          var body = '';
          res.on('data', function(c) { body += c; });
          res.on('end', function() {
            if (res.statusCode !== 200) {
              reject(new Error('获取历史失败(HTTP ' + res.statusCode + ')'));
              return;
            }
            try {
              var commits = JSON.parse(body);
              if (!Array.isArray(commits) || commits.length === 0) {
                resolve([]);
                return;
              }
              var list = commits.map(function(c) {
                return {
                  sha: c.sha,
                  message: c.commit.message,
                  date: c.commit.committer.date,
                  author: c.commit.committer.name
                };
              });
              resolve(list);
            } catch(e) {
              reject(new Error('解析历史数据失败: ' + e.message));
            }
          });
        }).on('error', function(e) { reject(e); })
          .on('timeout', function() { this.destroy(); reject(new Error('请求超时')); });
      });
      return { success: true, versions: versions };
    } catch(e) {
      return { success: false, message: '⚠️ ' + e.message };
    }
  });

  // 按指定 commit sha 下载某个历史版本
  ipcMain.handle('cloud-download-version', async (event, commitSha) => {
    var config = getCloudSyncConfig();
    if (!config.gitee_token || !config.gitee_repo) {
      return { success: false, message: '❌ 请先保存 Gitee 配置' };
    }
    try {
      var realUsername = await resolveGiteeUsername(config.gitee_token);
      var result = await new Promise(function(resolve, reject) {
        var https = require('https');
        // 用指定 ref（commit sha）获取文件内容
        var apiPath = '/api/v5/repos/' + realUsername + '/' + config.gitee_repo
          + '/contents/calendar-tasks.json?access_token=' + encodeURIComponent(config.gitee_token)
          + '&ref=' + encodeURIComponent(commitSha);
        https.get({
          hostname: 'gitee.com', path: apiPath,
          headers: { 'User-Agent': 'TodoList-CloudSync/1.0' }, timeout: 30000
        }, function(res) {
          var respBody = '';
          res.on('data', function(c) { respBody += c; });
          res.on('end', function() {
            if (res.statusCode !== 200) {
              reject(new Error('下载失败(HTTP ' + res.statusCode + ')'));
              return;
            }
            try {
              var fileInfo = JSON.parse(respBody);
              var content = Buffer.from(fileInfo.content, 'base64').toString('utf8');
              var cloudData = JSON.parse(content);
              if (writeAllLocalData(cloudData)) {
                if (win) win.webContents.send('data-sync', {
                  tasks: tasksData,
                  settings: settingsData,
                  dayColors: dayColorsData
                });
                resolve({ success: true, message: '✅ 历史版本已恢复！界面将自动刷新。' });
              } else {
                reject(new Error('写入本地文件失败'));
              }
            } catch(e) {
              reject(new Error('解析数据失败: ' + e.message));
            }
          });
        }).on('error', function(e) { reject(e); })
          .on('timeout', function() { this.destroy(); reject(new Error('下载超时')); });
      });
      return result;
    } catch(e) {
      return { success: false, message: '⚠️ ' + e.message };
    }
  });

  // 【v9.9.12】移除启动自动检查！原因：
  // 1. 它在 checkForUpdates() 内部立即执行，与手动检查冲突（两个同时跑）
  // 2. detectAndApplyProxy 现在是异步的，但这里调用时还没完成代理检测
  // 3. 用户反馈"点了检查更新没反应"——双检查事件互相覆盖
  // 正确做法：只在用户主动点击时才检查，或延迟到窗口完全就绪后单独触发
  // logInfo('UPDATE', '启动自动检查已禁用（避免与手动检查冲突）');
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