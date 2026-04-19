/**
 * 日历清单 - Electron 主进程
 * 无边框窗口，支持桌面挂件模式
 * 内置 HTTP API 服务器，供其他程序/AI 调用
 */
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let win;
let isDesktopMode = false;
let apiServer = null;
let apiPort = 7789;

// 数据存储路径
const userDataPath = app.getPath('userData');
const tasksFile = path.join(userDataPath, 'calendar-tasks.json');
const settingsFile = path.join(userDataPath, 'calendar-settings.json');
const dayColorsFile = path.join(userDataPath, 'calendar-day-colors.json');
const desktopModeFile = path.join(userDataPath, 'desktop-mode.json');

// ============ 数据存储（文件方式）============
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
    // 通知渲染进程数据已更新
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

// ============ HTTP API 服务器 ============
function startApiServer() {
  if (apiServer) return;
  
  // 初始化数据
  loadDataFromFiles();

  apiServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${apiPort}`);
    const pathname = url.pathname;
    const method = req.method;

    let body = '';
    req.on('data', chunk => body += chunk);
    
    req.on('end', () => {
      let response = { success: false, error: 'Unknown endpoint' };
      let statusCode = 404;

      try {
        // 路由处理
        if (pathname === '/api/health' && method === 'GET') {
          response = { success: true, message: '日历清单 API 服务运行中', port: apiPort };
          statusCode = 200;

        } else if (pathname === '/api/tasks' && method === 'GET') {
          response = { success: true, data: tasksData };
          statusCode = 200;

        } else if (pathname === '/api/tasks' && method === 'POST') {
          const data = JSON.parse(body || '{}');
          if (!data.year || !data.month || !data.day || !data.text) {
            response = { success: false, error: '缺少参数: year, month, day, text' };
            statusCode = 400;
          } else {
            const key = `${data.year}-${data.month}-${data.day}`;
            if (!tasksData[key]) tasksData[key] = [];
            tasksData[key].push({
              id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
              text: String(data.text),
              done: false,
              createdAt: Date.now(),
            });
            saveTasksToFile();
            response = { success: true, data: { key, task: tasksData[key][tasksData[key].length - 1] } };
            statusCode = 200;
          }

        } else if (pathname.match(/^\/api\/tasks\/(\w+)$/) && method === 'DELETE') {
          const taskId = pathname.match(/^\/api\/tasks\/(\w+)$/)[1];
          let found = false;
          for (const key in tasksData) {
            const idx = tasksData[key].findIndex(t => t.id === taskId);
            if (idx !== -1) {
              tasksData[key].splice(idx, 1);
              if (tasksData[key].length === 0) delete tasksData[key];
              saveTasksToFile();
              found = true;
              break;
            }
          }
          response = found ? { success: true } : { success: false, error: '任务不存在' };
          statusCode = 200;

        } else if (pathname.match(/^\/api\/tasks\/(\d{4})-(\d+)-(\d+)$/) && method === 'GET') {
          const match = pathname.match(/^\/api\/tasks\/(\d{4})-(\d+)-(\d+)$/);
          const key = `${match[1]}-${match[2]}-${match[3]}`;
          response = { success: true, data: tasksData[key] || [] };
          statusCode = 200;

        } else if (pathname === '/api/settings' && method === 'GET') {
          response = { success: true, data: settingsData };
          statusCode = 200;

        } else if (pathname === '/api/settings' && method === 'PUT') {
          const data = JSON.parse(body || '{}');
          settingsData = { ...settingsData, ...data };
          saveSettingsToFile();
          response = { success: true };
          statusCode = 200;

        } else if (pathname === '/api/export' && method === 'GET') {
          response = { success: true, data: { tasks: tasksData, dayColors: dayColorsData, settings: settingsData } };
          statusCode = 200;

        } else if (pathname === '/api/today' && method === 'GET') {
          const today = new Date();
          response = { success: true, year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
          statusCode = 200;

        } else if (pathname === '/api/port' && method === 'GET') {
          response = { success: true, port: apiPort };
          statusCode = 200;

        } else {
          response = {
            success: false,
            error: '未知端点',
            available_endpoints: [
              'GET  /api/health             - 健康检查',
              'GET  /api/tasks              - 获取所有任务',
              'GET  /api/tasks/:date        - 获取某天任务 (格式: YYYY-M-D)',
              'POST /api/tasks              - 添加任务 {year, month, day, text}',
              'DELETE /api/tasks/:id        - 删除任务 (taskId)',
              'GET  /api/settings           - 获取设置',
              'PUT  /api/settings           - 更新设置',
              'GET  /api/export             - 导出所有数据',
              'GET  /api/today              - 获取今天日期'
            ]
          };
          statusCode = 200;
        }
      } catch(e) {
        response = { success: false, error: e.message };
        statusCode = 500;
      }

      res.writeHead(statusCode);
      res.end(JSON.stringify(response, null, 2));
    });
  });

  apiServer.listen(apiPort, () => {
    console.log(`[日历清单] HTTP API 服务器已启动: http://localhost:${apiPort}`);
  });

  apiServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[日历清单] 端口 ${apiPort} 已被占用，尝试 ${apiPort + 1}`);
      apiPort++;
      apiServer.listen(apiPort);
    }
  });
}

function stopApiServer() {
  if (apiServer) {
    apiServer.close();
    apiServer = null;
    console.log('[日历清单] HTTP API 服务器已停止');
  }
}

// ============ 窗口相关 ============
function applyDesktopMode(enabled) {
  if (!win) return;

  if (enabled) {
    const bounds = win.getBounds();
    win.setMovable(false);
    if (win.isMaximized()) {
      win.unmaximize();
    }
    win.setPosition(bounds.x, bounds.y);
    win.setMinimumSize(500, 400);
  } else {
    win.setMovable(true);
    win.setMinimumSize(600, 500);
  }

  win.webContents.send('desktop-mode-changed', enabled);
}

function createWindow() {
  isDesktopMode = loadDesktopMode();

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    skipTaskbar: false,
    center: true,
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  win.once('ready-to-show', () => {
    win.show();
    if (isDesktopMode) {
      applyDesktopMode(true);
    }
    // 窗口就绪后启动 API 服务器
    startApiServer();
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  win.on('closed', () => {
    win = null;
    stopApiServer();
  });

  // IPC 处理程序
  ipcMain.on('set-desktop-mode', (event, enabled) => {
    isDesktopMode = !!enabled;
    saveDesktopMode(isDesktopMode);
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
});

app.on('window-all-closed', () => {
  stopApiServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
