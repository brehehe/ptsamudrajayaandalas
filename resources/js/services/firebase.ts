/**
 * Firebase Cloud Messaging Service Integration for SJA Ship Agency
 */
import { playSjaChime } from '../Components/feedback/AudioNotification';

export interface SjaNotificationPayload {
    id: string;
    title: string;
    message: string;
    type: 'request_submitted' | 'director_approval' | 'invoice_ready' | 'general';
    timestamp: string;
    read: boolean;
    url?: string;
}

// Default dummy config for web client; will be overridden by window.FIREBASE_CONFIG or .env if set
export const defaultFirebaseConfig = {
    apiKey: "AIzaSyDummyApiKeyForSjaMaritimeAgency2026",
    authDomain: "sja-keagenan.firebaseapp.com",
    projectId: "sja-keagenan",
    storageBucket: "sja-keagenan.appspot.com",
    messagingSenderId: "109823485721",
    appId: "1:109823485721:web:a1b2c3d4e5f6g7h8i9j0"
};

/**
 * Register service worker and request notification permission
 */
export async function registerFirebasePush(onMessageReceived?: (notification: SjaNotificationPayload) => void): Promise<string | null> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('[SJA Push] Push notifications are not supported in this browser.');
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[SJA Push] Notification permission denied or dismissed.');
            return null;
        }

        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('[SJA Push] FCM Service Worker registered:', registration);
        }

        // Setup BroadcastChannel for inter-tab / server event propagation
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel('sja-notifications');
            channel.onmessage = (event) => {
                const data = event.data as SjaNotificationPayload;
                if (data) {
                    playSjaChime('chime');
                    if (onMessageReceived) {
                        onMessageReceived(data);
                    }
                }
            };
        }

        return 'FCM-TOKEN-ACTIVE-SJA-2026';
    } catch (error) {
        console.warn('[SJA Push] Error initializing push notifications:', error);
        return null;
    }
}

/**
 * Broadcast notification locally and across tabs with maritime chime
 */
export function broadcastSjaNotification(payload: Omit<SjaNotificationPayload, 'id' | 'timestamp' | 'read'>): SjaNotificationPayload {
    const fullPayload: SjaNotificationPayload = {
        ...payload,
        id: 'notif-' + Date.now(),
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        read: false,
    };

    // Play chime sound
    playSjaChime(payload.type === 'director_approval' ? 'success' : 'chime');

    // Broadcast across tabs
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
            const channel = new BroadcastChannel('sja-notifications');
            channel.postMessage(fullPayload);
        } catch {
            // ignore
        }
    }

    return fullPayload;
}
