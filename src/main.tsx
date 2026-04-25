import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// 防缩放拦截：禁用双指缩放及双击缩放
document.addEventListener('gesturestart', function(event) {
  event.preventDefault();
});

let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(reg => {
      console.log('SW registered:', reg);
      
      // 监听更新
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                const reloadKey = 'sw_reloaded';
                if (!sessionStorage.getItem(reloadKey)) {
                  sessionStorage.setItem(reloadKey, '1');
                  console.log('New content is available; refreshing.');
                  window.location.reload();
                } else {
                  sessionStorage.removeItem(reloadKey);
                  console.log('New content available, skipping auto-reload to prevent loop.');
                }
              }
            }
          };
        }
      };
    }).catch(err => {
      console.log('SW registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
