const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('miaoDesktop', {
  close: () => ipcRenderer.invoke('desktop-pet:close'),
  openMainApp: () => ipcRenderer.invoke('desktop-pet:open-main-app'),
  getAppUrl: () => ipcRenderer.invoke('desktop-pet:get-app-url'),
  getSettings: () => ipcRenderer.invoke('desktop-pet:get-settings'),
  getRequestHeaders: () => ipcRenderer.invoke('desktop-pet:get-request-headers'),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('desktop-pet:set-always-on-top', Boolean(enabled)),
  setClickThrough: (enabled) => ipcRenderer.invoke('desktop-pet:set-click-through', Boolean(enabled)),
  setTemporaryClickThrough: (durationMs) => ipcRenderer.invoke('desktop-pet:set-temporary-click-through', Number(durationMs)),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke('desktop-pet:set-launch-at-login', Boolean(enabled)),
  moveWindowBy: (deltaX, deltaY) => ipcRenderer.invoke('desktop-pet:move-window-by', Number(deltaX), Number(deltaY)),
  resetWindowPosition: () => ipcRenderer.invoke('desktop-pet:reset-window-position'),
  updateCatMenu: (cats, activeCatId) => ipcRenderer.invoke('desktop-pet:update-cat-menu', cats, activeCatId),
  onRefresh: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('desktop-pet:refresh', listener);
    return () => ipcRenderer.removeListener('desktop-pet:refresh', listener);
  },
  onSwitchCat: (callback) => {
    const listener = (_event, catId) => callback(catId);
    ipcRenderer.on('desktop-pet:switch-cat', listener);
    return () => ipcRenderer.removeListener('desktop-pet:switch-cat', listener);
  },
  onOpenSettings: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('desktop-pet:open-settings', listener);
    return () => ipcRenderer.removeListener('desktop-pet:open-settings', listener);
  },
  onSettingsChanged: (callback) => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on('desktop-pet:settings-changed', listener);
    return () => ipcRenderer.removeListener('desktop-pet:settings-changed', listener);
  },
});
