// SafeRiderQR - Service Worker
// Versión: 1.0.0

const CACHE_NAME = 'saferiderqr-cache-v1';
const urlsToCache = [
  '/saferiderqr/',
  '/saferiderqr/index.html',
  '/saferiderqr/admin.html',
  '/saferiderqr/perfil.html',
  '/saferiderqr/Logo.png',
  '/saferiderqr/RiderHero.png',
  '/saferiderqr/CascoRider.jpg',
  '/saferiderqr/TemplateNegroSafeRiderQR.png',
  '/saferiderqr/TemplateVerdeSafeRiderQR.png',
  '/saferiderqr/TemplateNegroSafeRiderQRCuadrado.png',
  '/saferiderqr/TemplateVerdeSafeRiderQRCuadrado.png',
  '/saferiderqr/favicon.ico',
  '/saferiderqr/apple-touch-icon.png',
  '/saferiderqr/icons/icon-72x72.png',
  '/saferiderqr/icons/icon-96x96.png',
  '/saferiderqr/icons/icon-128x128.png',
  '/saferiderqr/icons/icon-144x144.png',
  '/saferiderqr/icons/icon-152x152.png',
  '/saferiderqr/icons/icon-192x192.png',
  '/saferiderqr/icons/icon-384x384.png',
  '/saferiderqr/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/qrcodejs2-fix/qrcode.min.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('[SafeRiderQR] Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SafeRiderQR] Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[SafeRiderQR] Error al cachear archivos:', error);
      })
  );
  self.skipWaiting();
});

// Activación y limpieza de cachés antiguos
self.addEventListener('activate', event => {
  console.log('[SafeRiderQR] Service Worker activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SafeRiderQR] Eliminando caché antiguo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Network First con fallback a caché
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Excluir Firebase y EmailJS de la caché
  if (url.includes('firebase') || 
      url.includes('googleapis') || 
      url.includes('gstatic.com') ||
      url.includes('emailjs') ||
      url.includes('analytics')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Para imágenes, usar caché primero
  if (url.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            return response;
          });
        })
        .catch(() => {
          return new Response('Imagen no disponible', {
            status: 404,
            statusText: 'Not Found'
          });
        })
    );
    return;
  }
  
  // Para HTML y otros: Network First
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (event.request.mode === 'navigate') {
              return caches.match('/saferiderqr/index.html');
            }
            return new Response('Offline - Revisa tu conexión a internet', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Manejo de notificaciones push (opcional)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Alerta de emergencia SafeRiderQR',
      icon: '/saferiderqr/icons/icon-192x192.png',
      badge: '/saferiderqr/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/saferiderqr/'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'SafeRiderQR', options)
    );
  }
});

// Manejo de clic en notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/saferiderqr/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});