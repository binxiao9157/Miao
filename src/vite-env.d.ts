/// <reference types="vite/client" />

interface Window {
  miaoDesktop?: {
    close: () => void;
    openMainApp: () => void;
    getAppUrl: () => Promise<string>;
    getRequestHeaders: () => Promise<Record<string, string>>;
    getSettings: () => Promise<{
      alwaysOnTop: boolean;
      clickThrough: boolean;
      launchAtLogin: boolean;
      appUrl: string;
      desktopUsername?: string;
      desktopTokenConfigured?: boolean;
    }>;
    setAlwaysOnTop: (enabled: boolean) => Promise<unknown>;
    setClickThrough: (enabled: boolean) => Promise<unknown>;
    setTemporaryClickThrough: (durationMs: number) => Promise<unknown>;
    setLaunchAtLogin: (enabled: boolean) => Promise<unknown>;
    moveWindowBy: (deltaX: number, deltaY: number) => Promise<unknown>;
    resetWindowPosition: () => Promise<unknown>;
    updateCatMenu: (cats: Array<{ id: string; name: string }>, activeCatId?: string) => Promise<unknown>;
    onRefresh: (callback: () => void) => () => void;
    onSwitchCat: (callback: (catId: string) => void) => () => void;
    onOpenSettings: (callback: () => void) => () => void;
    onSettingsChanged: (callback: (settings: {
      alwaysOnTop: boolean;
      clickThrough: boolean;
      launchAtLogin: boolean;
      appUrl: string;
      desktopUsername?: string;
      desktopTokenConfigured?: boolean;
    }) => void) => () => void;
  };
}
