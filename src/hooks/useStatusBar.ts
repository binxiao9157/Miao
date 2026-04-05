import { useEffect } from 'react';

export type StatusBarTheme = 'light' | 'dark' | 'immersive';

export function useStatusBar(theme: StatusBarTheme) {
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');

    if (theme === 'immersive') {
      // 首页沉浸式：透明状态栏，白色图标 (iOS black-translucent)
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#000000');
      if (metaAppleStatus) metaAppleStatus.setAttribute('content', 'black-translucent');
    } else {
      // 浅色主题 (默认)：浅橘色背景，深色图标 (iOS default)
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#FFF9F5');
      if (metaAppleStatus) metaAppleStatus.setAttribute('content', 'default');
    }

    return () => {
      // 恢复默认
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#FFF9F5');
      if (metaAppleStatus) metaAppleStatus.setAttribute('content', 'default');
    };
  }, [theme]);
}
