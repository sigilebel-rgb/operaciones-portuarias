// Sistema Naval — Service Worker
// Estrategia: RED PRIMERO, caché solo como respaldo sin conexión.
// Así nunca se sirve una versión vieja del sistema (el caché no manda).
const CACHE = 'vms-cache-v1';
const PRECACHE = ['./', './index.html', './chartering.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(PRECACHE).catch(function(){}); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  const url = new URL(e.request.url);
  // Solo GET del mismo origen: NUNCA interceptar Supabase, GitHub API ni otros dominios
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(function(res){
      // Guardar copia fresca en caché para uso sin conexión
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
      }
      return res;
    }).catch(function(){
      // Sin red: servir la última copia conocida
      return caches.match(e.request).then(function(hit){
        return hit || caches.match('./index.html');
      });
    })
  );
});
