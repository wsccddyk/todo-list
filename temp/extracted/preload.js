/**
 * 日历清单 - Preload 脚本
 * 安全桥接主进程和渲染进程的通信
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 桌面模式控制
  setDesktopMode: (enabled) => ipcRenderer.send('set-desktop-mode', enabled),
  onDesktopModeChanged: (callback) => {
    ipcRenderer.on('desktop-mode-changed', (event, enabled) => callback(enabled));
  },

  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.sendSync('window-is-maximized'),
  onWindowMaximized: (callback) => {
    ipcRenderer.on('window-maximized', (event, isMax) => callback(isMax));
  },

  // 数据同步
  onDataSync: (callback) => {
    ipcRenderer.on('data-sync', (event, data) => callback(data));
  },
  onDataUpdatedFromApi: (callback) => {
    ipcRenderer.on('data-updated-from-api', (event, data) => callback(data));
  },
  syncTasks: (tasks) => ipcRenderer.send('sync-tasks-from-renderer', tasks),
  syncSettings: (settings) => ipcRenderer.send('sync-settings-from-renderer', settings),
  syncDayColors: (colors) => ipcRenderer.send('sync-daycolors-from-renderer', colors),
  requestDataSync: () => ipcRenderer.send('request-data-sync'),
});
