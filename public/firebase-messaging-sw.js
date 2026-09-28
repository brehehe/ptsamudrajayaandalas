// Firebase Cloud Messaging Service Worker for PT Samudra Jaya Andalas (SJA)
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
const firebaseConfig = {
    apiKey: "AIzaSyDummyApiKeyForSjaMaritimeAgency2026",
    authDomain: "sja-keagenan.firebaseapp.com",
    projectId: "sja-keagenan",
    storageBucket: "sja-keagenan.appspot.com",
    messagingSenderId: "109823485721",
    appId: "1:109823485721:web:a1b2c3d4e5f6g7h8i9j0"
};

try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        console.log('[SJA FCM Service Worker] Received background message: ', payload);
        const notificationTitle = payload.notification?.title || payload.data?.title || 'SJA Keagenan Kapal';
        const notificationOptions = {
            body: payload.notification?.body || payload.data?.message || 'Ada pembaruan status operasional kapal.',
            icon: '/images/sja-icon.png',
            badge: '/images/sja-icon.png',
            data: {
                url: payload.data?.url || '/requests',
            },
            tag: 'sja-notification',
            renotify: true,
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
} catch (e) {
    console.log('[SJA FCM SW] Firebase initialized in standalone mode:', e);
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/requests';
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
