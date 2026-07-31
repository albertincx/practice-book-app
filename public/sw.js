self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

let sharedFile = null;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/') {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        sharedFile = formData.get('pdf_file');
      } catch (e) {
        console.error('Error handling share target POST:', e);
      }
      return Response.redirect('/?shared=1', 303);
    })());
    return;
  }

  event.respondWith(fetch(event.request));
});

self.addEventListener('message', (event) => {
  if (event.data === 'get-shared-file') {
    if (sharedFile) {
      event.source.postMessage({
        file: sharedFile,
        action: 'load-pdf'
      });
      sharedFile = null;
    }
  }
});
