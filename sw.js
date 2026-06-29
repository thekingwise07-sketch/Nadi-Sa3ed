const CACHE_NAME = 'nady-v3'; // تم رفع رقم النسخة لإجبار كل الأجهزة على تفريغ الكاش القديم بالكامل
const ASSETS = [
  './index.html',
  './admin.html',
  './parent.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap'
];

// Install: تخزين كل الملفات الأساسية + تفعيل فوري بدون انتظار إغلاق التبويبات القديمة
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: حذف كل نسخ الكاش القديمة + السيطرة الفورية على كل التبويبات المفتوحة
// + إعادة تحميل كل تبويب مفتوح حالياً تلقائياً، لحل مشكلة الأجهزة التي فتحت الموقع قبل التحديث وبقيت عالقة على نسخة قديمة
self.addEventListener('activate', e => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => client.navigate(client.url));
    })()
  );
});

// Fetch: network-first للـ HTML حتى يحصل الجميع دائماً على آخر نسخة
// cache: 'no-store' يمنع أي كاش وسيط (من المتصفح نفسه) من إعادة نسخة قديمة
// fallback على الكاش فقط لو انقطع الإنترنت فعلياً
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHTML) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // باقي الملفات (خطوط، صور، إلخ): كاش أولاً لتسريع التحميل
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
