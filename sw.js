// Ümraniye Acil Nöbet Takibi — Service Worker
// Strateji: NETWORK-FIRST. Her istekte önce ağdan TAZE sürüm çekilir (HTTP önbelleği
// bypass edilir → GitHub Pages'in 10 dk'lık max-age'i güncellemeyi geciktirmez).
// İnternet yoksa en son başarılı yanıt önbellekten sunulur (çevrimdışı çalışır).

const CACHE = 'nobet-cache-v1';

self.addEventListener('install', (e) => {
  // Yeni SW'yi beklemeden aktifleştir
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Eski cache'leri temizle
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith((async () => {
    try {
      // Ağdan taze çek, tarayıcı HTTP önbelleğini atla
      const fresh = await fetch(req, { cache: 'no-store' });
      // Başarılıysa çevrimdışı için sakla (sadece aynı origin)
      if (fresh && fresh.ok && new URL(req.url).origin === self.location.origin) {
        const copy = fresh.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return fresh;
    } catch (err) {
      // Ağ yoksa önbellekten sun
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});
