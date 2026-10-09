self.addEventListener('push', function(event) {
  // Grab the message data sent by Supabase
  const data = event.data ? event.data.json() : {};
  
  // Design how the pop-up looks on the phone
  const options = {
    body: data.body || 'You have a new media duty assignment.',
    icon: '/icon-192x192.png', // This should be your app logo in the public folder
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' } // Where to take them when they tap it
  };

  // Show the notification!
  event.waitUntil(
    self.registration.showNotification(data.title || 'AKWC Media', options)
  );
});

// When they click the notification, open the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
