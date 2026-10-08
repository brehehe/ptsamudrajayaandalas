/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: 'AIzaSyDx7DxCdREpnFV28MvKcy7P1gd5OL71kjU',
    authDomain: 'gride-notification.firebaseapp.com',
    projectId: 'gride-notification',
    storageBucket: 'gride-notification.firebasestorage.app',
    messagingSenderId: '386739036017',
    appId: '1:386739036017:web:0562ee92df3d064c7720d0',
    measurementId: 'G-9ZVCXDDD14',
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        const notificationTitle = payload.notification?.title || payload.data?.title || 'SJA Keagenan Kapal';
        const notificationOptions = {
            body: payload.notification?.body || payload.data?.body || 'Ada pembaruan status operasional kapal.',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            data: {
                url: payload.data?.url || '/dashboard',
            },
            tag: payload.data?.notification_id || `${payload.data?.entity_type || 'sja'}-${payload.data?.entity_id || 'workflow'}`,
            renotify: true,
        };

        return self.registration.showNotification(notificationTitle, notificationOptions);
    });
} catch {
    // Initialization errors remain isolated to push messaging.
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const requestedUrl = event.notification.data?.url || '/dashboard';
    const parsedUrl = new URL(requestedUrl, self.location.origin);
    const targetUrl = parsedUrl.origin === self.location.origin
        ? `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
        : '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
