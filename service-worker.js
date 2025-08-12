const CACHE = 'snake-neo-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/eat.wav',
  './assets/die.wav'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
