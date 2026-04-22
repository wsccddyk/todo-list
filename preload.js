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

  // 剪贴板操作（Skill 包生成用）
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),

  // 获取应用路径信息（用于生成精准的 Skill 包）
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // 获取打赏图（base64，防篡改）
  getDonateImage: () => ipcRenderer.invoke('get-donate-image'),

  // 开机自启动
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),

  // 语言切换（同步更新主进程应用名称和自启注册表）
  updateAppLanguage: (lang) => ipcRenderer.invoke('update-app-language', lang),

  // 自动更新
  updaterCheck: () => ipcRenderer.invoke('updater-check'),
  updaterDownload: () => ipcRenderer.invoke('updater-download'),
  updaterInstall: () => ipcRenderer.invoke('updater-install'),
  setUpdaterSource: (source) => ipcRenderer.invoke('set-updater-source', source),

  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
  },

  // 云同步/代理配置
  getCloudSyncConfig: () => ipcRenderer.invoke('get-cloud-sync-config'),
  saveCloudSyncConfig: (config) => ipcRenderer.invoke('save-cloud-sync-config', config),
  testProxyConnection: () => ipcRenderer.invoke('test-proxy-connection'),
  cloudUpload: (provider) => ipcRenderer.invoke('cloud-upload', provider),
  cloudDownload: (provider) => ipcRenderer.invoke('cloud-download', provider),
  cloudListVersions: () => ipcRenderer.invoke('cloud-list-versions'),
  cloudDownloadVersion: (sha) => ipcRenderer.invoke('cloud-download-version', sha),

  // 网络状态 / 公网IP检测
  getPublicIp: () => ipcRenderer.invoke('get-public-ip'),
});