// 100PANIK - Service Worker
// Cache First (assets) + Network First (API)
var VERSION = 'panik-v1791991632';
var STATIC_CACHE = VERSION + '-static';
var DYNAMIC_CACHE = VERSION + '-dynamic';
var IMAGE_CACHE = VERSION + '-images';

var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/collection.html',
  '/product.html',
  '/cart.html',
  '/checkout.html',
  '/track.html',
  '/account.html',
  '/login.html',
  '/register.html',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/cart.js',
  '/js/pwa.js',
  '/js/customer.js',
  '/js/install-pwa.js',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return Promise.all(STATIC_ASSETS.map(function(url) {
        return cache.add(url).catch(function() { return null; });
      }));
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) {
        return k.indexOf(VERSION) !== 0;
      }).map(function(k) {
        return caches.delete(k);
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Pa entèfere ak admin
  if (url.pathname.indexOf('/api/admin') === 0) return;
  if (url.pathname.indexOf('/admin-100panik') === 0) return;

  // API = Network First
  if (url.pathname.indexOf('/api/') === 0) {
    event.respondWith(networkFirst(req, DYNAMIC_CACHE));
    return;
  }

  // Imaj = Cache First
  if (req.destination === 'image' || url.pathname.indexOf('/uploads/') === 0) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
    return;
  }

  // Navigasyon (HTML)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function() {
        return caches.match('/offline.html').then(function(r) {
          return r || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // Rès = Cache First
  event.respondWith(cacheFirst(req, STATIC_CACHE));
});

function cacheFirst(request, cacheName) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(cacheName).then(function(cache) {
          cache.put(request, copy);
        });
      }
      return res;
    }).catch(function() {
      return new Response('', { status: 408, statusText: 'Offline' });
    });
  });
}

function networkFirst(request, cacheName) {
  return fetch(request).then(function(res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(cacheName).then(function(cache) {
        cache.put(request, copy);
      });
    }
    return res;
  }).catch(function() {
    return caches.match(request).then(function(cached) {
      if (cached) return cached;
      return new Response(JSON.stringify({ error: 'Ou offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });
}

self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || '100PANIK', {
    body: data.body || 'Nouvo update',
    icon: '/images/icons/icon-192.png',
    badge: '/images/icons/icon-96.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  }));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
