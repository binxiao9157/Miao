const CACHE_NAME = 'miao-v6';
// 预缓存列表：应用 shell 资源
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

      // 使用 Headers 构造函数正确复制原始 headers（展开操作符对 Headers 对象无效）
      const newHeaders = new Headers(cachedResponse.headers);
      newHeaders.set('Content-Range', `bytes ${start}-${end}/${blob.size}`);
      newHeaders.set('Content-Length', String(chunk.size));

      return new Response(chunk, {
        status: 206,
        statusText: 'Partial Content',
        headers: newHeaders
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
      // 限制缓存大小：跳过超过 50MB 的响应，避免耗尽用户存储配额
      const contentLength = networkResponse.headers.get('Content-Length');
      const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
      if (!contentLength || parseInt(contentLength, 10) <= MAX_CACHE_SIZE) {
        cache.put(request, networkResponse.clone()).catch(() => {});
      }
    }
    return networkResponse;
  } catch (error) {
    return new Response('Network error', { status: 408 });
  }
};

// 网络优先策略 (用于 GET API 数据；POST 请求已在 fetch handler 入口处放行)
const networkFirst = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // 限制缓存大小：跳过超过 50MB 的响应，避免耗尽用户存储配额
      const contentLength = networkResponse.headers.get('Content-Length');
      const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
      if (!contentLength || parseInt(contentLength, 10) <= MAX_CACHE_SIZE) {
        cache.put(request, networkResponse.clone()).catch(() => {});
      }
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

  // 非 GET 请求（POST/PUT/DELETE）一律不拦截，直接交给浏览器处理
  // 修复 Android Chrome 中 SW 转发 POST body 丢失导致登录失败的问题
  if (event.request.method !== 'GET') {
    return;
  }

  // 1. 视频和图片：缓存优先（限定为 CDN/外部资源，避免缓存内部同扩展名请求）
  const isMediaExt = url.pathname.match(/\.(mp4|png|jpg|jpeg|gif|webp)$/);
  const isVideoQuery = url.search.includes('video');
  const isExternalOrCDN = url.hostname !== self.location.hostname;
  if ((isMediaExt || isVideoQuery) && isExternalOrCDN) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 2. API 数据：网络优先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 3. Vite 哈希资源（/assets/xxx.hash.js|css）：缓存优先，首次访问后缓存
  if (url.pathname.startsWith('/assets/') && url.pathname.match(/\.[a-f0-9]{8}\.(js|css)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      })
    );
    return;
  }

  // 4. 其他 GET 资源：网络优先，失败回退缓存
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then(r => r || new Response('Offline', { status: 503 })))
  );
});
