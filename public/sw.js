// Service worker mínimo, só pra notificações push (Fase 4, itens 27-30).
// De propósito NÃO faz cache/offline — isso é responsabilidade de outra
// camada, se um dia o projeto quiser um PWA completo. Aqui é só o mínimo
// que o navegador exige pra permitir `pushManager.subscribe()` e mostrar
// as notificações quando chegam.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Nova notificação', body: '' };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // payload não veio em JSON — mostra algo genérico em vez de quebrar
    payload = { title: 'Nova notificação', body: event.data ? event.data.text() : '' };
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    image: payload.image || undefined,
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'Nova notificação', options));
});

// Clique na notificação: foca uma aba já aberta da loja, ou abre uma nova.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
