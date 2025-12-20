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
  return outputArray as Uint8Array<ArrayBuffer>;
}

// Register service worker (outside hook to avoid dependency issues)
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

  // Check if push notifications are supported
  useEffect(() => {
    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check if already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !userId) return;

      try {
        // Register service worker first
        await registerSW();

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);

        // Show prompt if not subscribed and permission not denied
        if (!subscription && Notification.permission !== 'denied') {
          const dismissed = localStorage.getItem(`push_prompt_dismissed_${userId}`);
          if (!dismissed) {
            setTimeout(() => setShowPrompt(true), 2000);
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        // Still show prompt if there's an error
        if (Notification.permission !== 'denied') {
          const dismissed = localStorage.getItem(`push_prompt_dismissed_${userId}`);
          if (!dismissed) {
            setTimeout(() => setShowPrompt(true), 2000);
          }
        }
      }
    };

    checkSubscription();
  }, [isSupported, userId]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !userId || !VAPID_PUBLIC_KEY) {
      console.warn('Push notifications not supported or VAPID key missing');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      const registration = await registerSW();
      if (!registration) return false;

      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,endpoint',
        }
      );

      if (error) {
        console.error('Error saving subscription:', error);
        return false;
      }

      setIsSubscribed(true);
      setShowPrompt(false);
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
  }, [isSupported, userId]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    if (!userId) return false;

    try {
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
        console.error('Error showing notification:', error);
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
