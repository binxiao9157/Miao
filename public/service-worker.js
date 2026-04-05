const CACHE_NAME = 'miao-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 处理 Range 请求的辅助函数 (关键：解决视频播放问题)
const handleRangeRequest = async (request, cache) => {
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      const blob = await cachedResponse.blob();
      const bytes = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(bytes[0], 10);
      const end = bytes[1] ? parseInt(bytes[1], 10) : blob.size - 1;
      const chunk = blob.slice(start, end + 1);
      
      return new Response(chunk, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
          ...cachedResponse.headers,
          'Content-Range': `bytes ${start}-${end}/${blob.size}`,
          'Content-Length': chunk.size,
        }
      });
    }
    return cachedResponse;
  }
  return fetch(request);
};

// 缓存优先策略 (用于视频和图片)
const cacheFirst = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  
  // 如果是 Range 请求，特殊处理
  if (request.headers.has('Range')) {
    return handleRangeRequest(request, cache);
  }

  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Network error', { status: 408 });
  }
};

// 网络优先策略 (用于 API 数据)
const networkFirst = async (request) => {
  // 关键修复：仅对 GET 请求尝试缓存，POST 等请求直接走网络
  if (request.method !== 'GET') {
    return fetch(request);
  }

  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. 视频和图片：缓存优先
  if (url.pathname.match(/\.(mp4|png|jpg|jpeg|gif|webp)$/) || url.search.includes('video')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 2. API 数据：网络优先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 3. 其他资源：网络优先，失败回退缓存
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
