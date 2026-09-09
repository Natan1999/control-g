/* Remove only the legacy shared HTTP cache, never IndexedDB captures or media. */
self.addEventListener('activate', event => {
  event.waitUntil(caches.delete('control-g-supabase-read-cache'))
})
