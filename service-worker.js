// Service Worker do BEUA14 — necessário para receber notificações push
// mesmo quando o site não está aberto no navegador.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Recebe a notificação enviada pelo servidor (Edge Function do Supabase)
self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (e) {
    dados = { title: 'BEUA14', body: event.data ? event.data.text() : 'Nova novidade disponível.' };
  }

  const titulo = dados.title || 'BEUA14 🚀';
  const opcoes = {
    body: dados.body || 'Novo conteúdo publicado no BEUA14.',
    icon: dados.icon || 'https://beua14.github.io/logo-servico.png',
    badge: dados.icon || 'https://beua14.github.io/logo-servico.png',
    data: { url: dados.url || '/' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

// Ao clicar na notificação, abre (ou foca) o site na página do conteúdo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
