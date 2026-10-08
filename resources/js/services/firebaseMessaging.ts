import type { Messaging } from 'firebase/messaging';

export type FirebasePushStatus =
    | 'checking'
    | 'available'
    | 'enabling'
    | 'enabled'
    | 'blocked'
    | 'unsupported'
    | 'unconfigured'
    | 'error';

const TOKEN_STORAGE_KEY = 'sja-firebase-device-token';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
let messagingPromise: Promise<Messaging> | null = null;
let syncPromise: Promise<FirebasePushStatus> | null = null;

const hasClientConfiguration = (): boolean =>
    Boolean(
        firebaseConfig.apiKey
        && firebaseConfig.authDomain
        && firebaseConfig.projectId
        && firebaseConfig.messagingSenderId
        && firebaseConfig.appId
        && vapidKey,
    );

const supportsPushNotifications = async (): Promise<boolean> => {
    if (typeof window === 'undefined'
        || !window.isSecureContext
        || !('Notification' in window)
        || !('serviceWorker' in navigator)) {
        return false;
    }

    const { isSupported } = await import('firebase/messaging');

    return isSupported();
};

const messagingClient = async (): Promise<Messaging> => {
    if (!messagingPromise) {
        messagingPromise = (async () => {
            const [{ getApp, getApps, initializeApp }, { getMessaging }] = await Promise.all([
                import('firebase/app'),
                import('firebase/messaging'),
            ]);
            const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

            return getMessaging(app);
        })();
    }

    return messagingPromise;
};

const deviceName = (): string => {
    const formFactor = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';

    return `${formFactor} · ${navigator.platform || 'Browser'}`;
};

const saveSubscription = async (token: string): Promise<void> => {
    const previousToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

    if (previousToken && previousToken !== token) {
        await window.axios.delete('/push-subscriptions', {
            data: { token: previousToken },
        }).catch(() => undefined);
    }

    await window.axios.post('/push-subscriptions', {
        token,
        device_name: deviceName(),
    });
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const syncFirebasePush = async (requestPermission = false): Promise<FirebasePushStatus> => {
    if (!hasClientConfiguration()) {
        return 'unconfigured';
    }

    if (!await supportsPushNotifications()) {
        return 'unsupported';
    }

    let permission = window.Notification.permission;
    if (permission === 'default' && requestPermission) {
        permission = await window.Notification.requestPermission();
    }

    if (permission === 'denied') {
        return 'blocked';
    }

    if (permission !== 'granted') {
        return 'available';
    }

    if (!syncPromise) {
        syncPromise = (async () => {
            try {
                const [{ getToken }, messaging, registration] = await Promise.all([
                    import('firebase/messaging'),
                    messagingClient(),
                    navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' }),
                ]);
                const token = await getToken(messaging, {
                    vapidKey,
                    serviceWorkerRegistration: registration,
                });

                if (!token) {
                    return 'error';
                }

                await saveSubscription(token);

                return 'enabled';
            } catch {
                return 'error';
            } finally {
                syncPromise = null;
            }
        })();
    }

    return syncPromise;
};

export const disableFirebasePush = async (): Promise<void> => {
    if (typeof window === 'undefined') {
        return;
    }

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
        return;
    }

    try {
        await window.axios.delete('/push-subscriptions', {
            data: { token },
        }).catch(() => undefined);

        if (hasClientConfiguration() && await supportsPushNotifications()) {
            const [{ deleteToken }, messaging] = await Promise.all([
                import('firebase/messaging'),
                messagingClient(),
            ]);
            await deleteToken(messaging);
        }
    } catch {
        // The server record is already removed when possible; local cleanup is best-effort.
    } finally {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
};
