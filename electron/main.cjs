const { app, BrowserWindow, Menu, Tray, ipcMain, screen, shell, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const isDev = process.env.NODE_ENV !== 'production';
const appUrl = process.env.MIAO_APP_URL || 'http://localhost:3000';
const devUrl = process.env.MIAO_DESKTOP_DEV_URL || `${appUrl}/desktop-pet`;
let petWindow = null;
let tray = null;
let currentSettings = {
  alwaysOnTop: true,
  clickThrough: false,
};
let trayCats = [];
let activeCatId = '';
let moveSaveTimer = null;
let snappingWindow = false;
let clickThroughTimer = null;

function getStatePath() {
  return path.join(app.getPath('userData'), 'desktop-pet-window.json');
}

function readWindowState() {
  try {
    const state = JSON.parse(fs.readFileSync(getStatePath(), 'utf8'));
    if (typeof state.x === 'number' && typeof state.y === 'number') {
      return state;
    }
  } catch {}
  return { width: 320, height: 430 };
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds();
  fs.mkdirSync(path.dirname(getStatePath()), { recursive: true });
  fs.writeFileSync(getStatePath(), JSON.stringify(bounds, null, 2));
}

function getDefaultBounds() {
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  return {
    width: 320,
    height: 430,
    x: Math.round(area.x + area.width - 356),
    y: Math.round(area.y + area.height - 470),
  };
}

function resetWindowPosition() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const bounds = getDefaultBounds();
  petWindow.setBounds(bounds);
  saveWindowState(petWindow);
}

function snapWindowToEdge() {
  if (!petWindow || petWindow.isDestroyed() || snappingWindow) return;
  const bounds = petWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const threshold = 24;
  let nextX = bounds.x;
  let nextY = bounds.y;

  if (Math.abs(bounds.x - area.x) <= threshold) nextX = area.x;
  if (Math.abs(bounds.y - area.y) <= threshold) nextY = area.y;
  if (Math.abs(bounds.x + bounds.width - (area.x + area.width)) <= threshold) {
    nextX = area.x + area.width - bounds.width;
  }
  if (Math.abs(bounds.y + bounds.height - (area.y + area.height)) <= threshold) {
    nextY = area.y + area.height - bounds.height;
  }

  if (nextX !== bounds.x || nextY !== bounds.y) {
    snappingWindow = true;
    petWindow.setBounds({ ...bounds, x: nextX, y: nextY }, true);
    snappingWindow = false;
  }
  saveWindowState(petWindow);
}

function updateAlwaysOnTop(enabled) {
  currentSettings.alwaysOnTop = Boolean(enabled);
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.setAlwaysOnTop(currentSettings.alwaysOnTop, 'floating');
  }
  createTray();
  sendSettingsChanged();
}

function updateClickThrough(enabled) {
  if (clickThroughTimer) {
    clearTimeout(clickThroughTimer);
    clickThroughTimer = null;
  }
  currentSettings.clickThrough = Boolean(enabled);
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.setIgnoreMouseEvents(currentSettings.clickThrough, { forward: true });
  }
  createTray();
  sendSettingsChanged();
}

function enableTemporaryClickThrough(durationMs = 10000) {
  if (clickThroughTimer) {
    clearTimeout(clickThroughTimer);
    clickThroughTimer = null;
  }
  currentSettings.clickThrough = true;
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.setIgnoreMouseEvents(true, { forward: true });
  }
  createTray();
  sendSettingsChanged();
  clickThroughTimer = setTimeout(() => {
    clickThroughTimer = null;
    updateClickThrough(false);
  }, Math.min(Math.max(Number(durationMs) || 10000, 3000), 30000));
  return getDesktopSettings();
}

function setLaunchAtLogin(enabled) {
  app.setLoginItemSettings({
    openAtLogin: Boolean(enabled),
    openAsHidden: false,
  });
  createTray();
  sendSettingsChanged();
}

function getDesktopSettings() {
  return {
    ...currentSettings,
    launchAtLogin: app.getLoginItemSettings().openAtLogin,
    appUrl,
    desktopUsername: process.env.MIAO_DESKTOP_USERNAME || process.env.MIAO_DESKTOP_USER || '',
    desktopTokenConfigured: Boolean(process.env.MIAO_DESKTOP_TOKEN || process.env.MIAO_DESKTOP_ACCESS_TOKEN),
  };
}

function getDesktopRequestHeaders() {
  const token = process.env.MIAO_DESKTOP_TOKEN || process.env.MIAO_DESKTOP_ACCESS_TOKEN || '';
  return token ? { 'X-Miao-Desktop-Token': token } : {};
}

function sendSettingsChanged() {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('desktop-pet:settings-changed', getDesktopSettings());
  }
}

function createPetWindow() {
  const state = readWindowState();
  petWindow = new BrowserWindow({
    width: state.width || 320,
    height: state.height || 430,
    x: state.x,
    y: state.y,
    minWidth: 220,
    minHeight: 300,
    transparent: true,
    frame: false,
    resizable: true,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: false,
    fullscreenable: false,
    acceptFirstMouse: true,
    backgroundColor: '#00000000',
    title: 'Miao Desktop Pet',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.setAlwaysOnTop(currentSettings.alwaysOnTop, 'floating');
  petWindow.setIgnoreMouseEvents(currentSettings.clickThrough, { forward: true });

  if (isDev) {
    petWindow.loadURL(devUrl);
  } else {
    petWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      query: { desktopPet: '1' },
    });
  }

  petWindow.once('ready-to-show', () => {
    if (!petWindow || petWindow.isDestroyed()) return;
    petWindow.show();
  });

  petWindow.on('move', () => {
    clearTimeout(moveSaveTimer);
    moveSaveTimer = setTimeout(snapWindowToEdge, 180);
  });
  petWindow.on('resize', () => {
    clearTimeout(moveSaveTimer);
    moveSaveTimer = setTimeout(() => saveWindowState(petWindow), 180);
  });
  petWindow.on('close', () => saveWindowState(petWindow));
}

function createTray() {
  if (!app.isReady()) return;
  if (tray) tray.destroy();
  const iconPath = path.join(__dirname, '..', 'public', 'icon-32.png');
  let trayIcon = nativeImage.createFromPath(iconPath);
  if (!trayIcon.isEmpty()) {
    trayIcon = trayIcon.resize({ width: 18, height: 18 });
    if (process.platform === 'darwin') trayIcon.setTemplateImage(true);
  }
  const catMenuItems = trayCats.map((cat) => ({
    label: cat.name || '未命名猫咪',
    type: 'radio',
    checked: cat.id === activeCatId,
    click: () => {
      activeCatId = cat.id;
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('desktop-pet:switch-cat', cat.id);
      }
      createTray();
    },
  }));
  tray = new Tray(trayIcon.isEmpty() ? iconPath : trayIcon);
  tray.setToolTip('Miao Desktop Pet');
  if (process.platform === 'darwin') {
    tray.setTitle('Miao');
  }
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: petWindow && !petWindow.isDestroyed() && petWindow.isVisible() ? '隐藏桌面宠物' : '显示桌面宠物',
      click: () => {
        if (!petWindow || petWindow.isDestroyed()) createPetWindow();
        if (petWindow.isVisible()) {
          petWindow.hide();
        } else {
          petWindow.show();
        }
        createTray();
      },
    },
    {
      label: '刷新猫咪',
      click: () => {
        if (petWindow && !petWindow.isDestroyed()) {
          petWindow.webContents.send('desktop-pet:refresh');
        }
      },
    },
    {
      label: '切换猫咪',
      enabled: catMenuItems.length > 0,
      submenu: catMenuItems.length > 0 ? catMenuItems : [{ label: '暂无猫咪', enabled: false }],
    },
    {
      label: '打开设置',
      click: () => {
        if (petWindow && !petWindow.isDestroyed()) {
          petWindow.show();
          petWindow.webContents.send('desktop-pet:open-settings');
        }
      },
    },
    {
      label: '重置窗口位置',
      click: resetWindowPosition,
    },
    {
      label: '打开主应用',
      click: () => shell.openExternal(appUrl),
    },
    { type: 'separator' },
    {
      label: '保持置顶',
      type: 'checkbox',
      checked: currentSettings.alwaysOnTop,
      click: (item) => updateAlwaysOnTop(item.checked),
    },
    {
      label: '点击穿透',
      type: 'checkbox',
      checked: currentSettings.clickThrough,
      click: (item) => updateClickThrough(item.checked),
    },
    {
      label: '开机启动',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => setLaunchAtLogin(item.checked),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ]));
  tray.on('click', () => tray.popUpContextMenu());
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock?.hide();
  }
  createPetWindow();
  createTray();

  app.on('activate', () => {
    if (!petWindow || petWindow.isDestroyed()) {
      createPetWindow();
      return;
    }
    petWindow.show();
  });
});

app.on('window-all-closed', (event) => {
  if (process.platform === 'darwin') {
    event.preventDefault();
  }
});

ipcMain.handle('desktop-pet:close', () => {
  if (petWindow && !petWindow.isDestroyed()) petWindow.hide();
});

ipcMain.handle('desktop-pet:open-main-app', () => {
  shell.openExternal(appUrl);
});

ipcMain.handle('desktop-pet:get-app-url', () => appUrl);

ipcMain.handle('desktop-pet:set-always-on-top', (_event, enabled) => {
  updateAlwaysOnTop(Boolean(enabled));
  return getDesktopSettings();
});

ipcMain.handle('desktop-pet:set-click-through', (_event, enabled) => {
  updateClickThrough(Boolean(enabled));
  return getDesktopSettings();
});

ipcMain.handle('desktop-pet:set-temporary-click-through', (_event, durationMs) => {
  return enableTemporaryClickThrough(durationMs);
});

ipcMain.handle('desktop-pet:get-settings', () => getDesktopSettings());

ipcMain.handle('desktop-pet:get-request-headers', () => getDesktopRequestHeaders());

ipcMain.handle('desktop-pet:set-launch-at-login', (_event, enabled) => {
  setLaunchAtLogin(Boolean(enabled));
  return getDesktopSettings();
});

ipcMain.handle('desktop-pet:move-window-by', (_event, deltaX, deltaY) => {
  if (!petWindow || petWindow.isDestroyed()) return null;
  const dx = Number(deltaX);
  const dy = Number(deltaY);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return petWindow.getBounds();
  const bounds = petWindow.getBounds();
  petWindow.setBounds({
    ...bounds,
    x: Math.round(bounds.x + dx),
    y: Math.round(bounds.y + dy),
  }, false);
  saveWindowState(petWindow);
  return petWindow.getBounds();
});

ipcMain.handle('desktop-pet:reset-window-position', () => {
  resetWindowPosition();
  return getDesktopSettings();
});

ipcMain.handle('desktop-pet:update-cat-menu', (_event, cats, nextActiveCatId) => {
  trayCats = Array.isArray(cats)
    ? cats
        .filter((cat) => cat && typeof cat.id === 'string')
        .slice(0, 12)
        .map((cat) => ({ id: cat.id, name: String(cat.name || '未命名猫咪') }))
    : [];
  activeCatId = typeof nextActiveCatId === 'string' ? nextActiveCatId : '';
  createTray();
});
