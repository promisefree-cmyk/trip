// =============================================================================
// sw.js — Service Worker（大量同時アクセス負荷軽減 ＆ 2回目以降通信ゼロ化）
// =============================================================================

const CACHE_NAME = 'fascia-3d-v20261118a';

const EXCLUDED_PATHS = ['/studio.html', '/VideoMasterStudio.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(['./favicon.svg', './manifest.json']).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((oldKey) => caches.delete(oldKey)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isExcluded(url) {
  const lowerPath = url.pathname.toLowerCase();
  return EXCLUDED_PATHS.some((p) => lowerPath.endsWith(p.toLowerCase()));
}

function isImmutableOrModelAsset(url, isSameOrigin) {
  if (!isSameOrigin) {
    return (
      url.hostname === 'cdn.jsdelivr.net' &&
      url.pathname.startsWith('/npm/three@0.170.0/')
    );
  }
  if (/\/models\/[^/]+\.(glb|json)$/i.test(url.pathname)) {
    return true;
  }
  if (url.searchParams.has('v') && /\.(js|mjs|css|svg)$/i.test(url.pathname)) {
    return true;
  }
  return false;
}

function isRevalidateAsset(url, isSameOrigin) {
  if (!isSameOrigin) return false;
  return /\.(js|mjs|css|svg|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith('/manifest.json');
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.status === 200) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = (await cache.match(request)) || (await cache.match('./index.html'));
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  if (request.cache !== 'reload') {
    const cached = await cache.match(request);
    if (cached) return cached;
  }
  const response = await fetch(request);
  if (response && response.ok && response.status === 200 && !request.headers.has('range')) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok && response.status === 200 && !request.headers.has('range')) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }
  const fresh = await networkPromise;
  if (fresh) return fresh;
  return fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const isSameOrigin = url.origin === self.location.origin;

  // 制作・管理用ページと Service Worker 自身はキャッシュ対象外
  if (isSameOrigin && (isExcluded(url) || url.pathname.endsWith('/sw.js'))) {
    return;
  }

  // HTML ナビゲーション: Network-First（更新即時反映 ＋ オフライン時キャッシュフォールバック）
  if (
    request.mode === 'navigate' ||
    (isSameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')))
  ) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // 3Dモデル・メタデータ・Three.js CDN・?v= 付きアセット: Cache-First（2回目以降通信ゼロ）
  if (isImmutableOrModelAsset(url, isSameOrigin)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // favicon.svg / manifest.json 等の補助アセット: Stale-While-Revalidate
  if (isRevalidateAsset(url, isSameOrigin)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
