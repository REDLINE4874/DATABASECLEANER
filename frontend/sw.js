const CACHE_NAME = 'datacleaner-v20';
const APP_FILES = [
  './', './index.html', './manifest.webmanifest',
  './css/styles.css', './css/table.css', './css/components.css',
  './lib/papaparse.min.js', './lib/xlsx.full.min.js', './lib/XLSX_LICENSE', './assets/icons/logo-icon.svg', './assets/icons/app-icon.svg',
  './assets/icons/logo-icon-192.png', './assets/icons/logo-icon-512.png',
  './assets/icons/ICON%20EXCEL.svg',
  './js/app.js', './js/auth/auth.js', './js/auth/config.js',
  './js/core/dataModel.js', './js/core/dataStore.js', './js/core/operationManager.js',
  './js/services/columnService.js', './js/services/csvExportService.js',
  './js/services/csvImportService.js', './js/services/excelImportWorker.js', './js/services/datasetWorker.js',
  './js/services/duplicateService.js',
  './js/services/filterService.js', './js/services/mergeService.js',
  './js/ui/customControls.js', './js/ui/mergeDialog.js', './js/ui/modalManager.js',
  './js/ui/notificationManager.js', './js/ui/tableView.js', './js/ui/tabManager.js',
  './js/ui/themeToggle.js', './js/ui/toolDialogs.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
