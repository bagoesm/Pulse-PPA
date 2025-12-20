import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UsePushNotificationsProps {
  userId: string | null;
}

// VAPID public key
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register service worker
async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export const usePushNotifications = ({ userId }: UsePushNotificationsProps) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      // Register SW on load
      registerSW();
    }
  }, []);

  // Check subscription status and show prompt
  useEffect(() => {
    if (!isSupported || !userId) return;

    const checkAndShowPrompt = async () => {
      // Check if user already granted permission
      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
        setShowPrompt(false);
        return;
      }

      // Show prompt if not denied and not dismissed before
      if (Notification.permission !== 'denied') {
        const dismissed = localStorage.getItem(`push_prompt_dismissed_${userId}`);
        if (!dismissed) {
          setTimeout(() => setShowPrompt(true), 2000);
        }
      }
    };

    checkAndShowPrompt();
  }, [isSupported, userId]);

  // Subscribe - just request notification permission
  const subscribe = useCallback(async () => {
    if (!isSupported || !userId) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      // Register service worker
      const registration = await registerSW();
      if (!registration) {
        console.warn('Service worker not registered');
      }

      // Try to subscribe to push if VAPID key exists
      if (VAPID_PUBLIC_KEY && registration && 'PushManager' in window) {
        try {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
          });

          const subscriptionJson = subscription.toJSON();

          await supabase.from('push_subscriptions').upsert(
            {
              user_id: userId,
              endpoint: subscriptionJson.endpoint,
              p256dh: subscriptionJson.keys?.p256dh,
              auth: subscriptionJson.keys?.auth,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,endpoint' }
          );
          
          console.log('Push subscription saved');
        } catch (pushError) {
          // Push subscription failed, but notification permission is granted
          // User can still receive in-app notifications
          console.warn('Push subscription failed, using in-app notifications only:', pushError);
        }
      }

      setIsSubscribed(true);
      setShowPrompt(false);
      
      // Show a test notification
      if (registration) {
        registration.showNotification('Notifikasi Aktif! 🎉', {
          body: 'Anda akan menerima notifikasi untuk task baru, deadline, dan komentar.',
          icon: '/Logo.svg',
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error subscribing:', error);
      return false;
    }
  }, [isSupported, userId]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    if (!userId) return false;

    try {
      if ('PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', subscription.endpoint);
        }
      }

      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  }, [userId]);

  // Dismiss prompt
  const dismissPrompt = useCallback(() => {
    if (userId) {
      localStorage.setItem(`push_prompt_dismissed_${userId}`, 'true');
    }
    setShowPrompt(false);
  }, [userId]);

  // Show local notification
  const showLocalNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') return;

      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/Logo.svg',
          badge: '/Logo.svg',
          ...options,
        });
      } catch (error) {
        // Fallback to basic Notification API
        new Notification(title, {
          icon: '/Logo.svg',
          ...options,
        });
      }
    },
    [permission]
  );

  return {
    isSupported,
    permission,
    isSubscribed,
    showPrompt,
    subscribe,
    unsubscribe,
    dismissPrompt,
    showLocalNotification,
  };
};
