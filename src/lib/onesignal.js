// OneSignal Web & Mobile Push Integration for Mazar App
// Architectural Standard: Key Separation & Zero Trust
import { supabase } from './supabase';

export const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'a6871e60-16a7-424e-a111-f6a2ee2a5f78';

/**
 * 1. Initialize OneSignal SDK (Web & Capacitor WebView)
 */
export async function initOneSignal() {
  if (typeof window === 'undefined') return;

  if (!window.OneSignalDeferred) {
    window.OneSignalDeferred = [];
  }

  if (!document.getElementById('onesignal-sdk')) {
    const script = document.createElement('script');
    script.id = 'onesignal-sdk';
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    document.head.appendChild(script);
  }

  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        serviceWorkerParam: { scope: '/' },
        serviceWorkerPath: '/sw.js',
        notifyButton: {
          enable: false,
        },
        allowLocalhostAsSecureOrigin: true,
      });
      console.log('✅ OneSignal initialized successfully with App ID:', ONESIGNAL_APP_ID);
    } catch (err) {
      console.warn('OneSignal init warning:', err);
    }
  });
}

/**
 * 2. Identity & Subscription Lifecycle:
 * Login user using external_id (Database UUID).
 */
export async function loginOneSignal(userId, role, userName) {
  if (typeof window === 'undefined') return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      if (userId && OneSignal.login) {
        await OneSignal.login(String(userId));
        console.log('🔒 OneSignal logged in with external_id:', userId);
      }
      if (OneSignal.User) {
        if (role) await OneSignal.User.addTag('role', role);
        if (userName) await OneSignal.User.addTag('name', userName);
      }
    } catch (e) {
      console.warn('OneSignal login error:', e);
    }
  });
}

/**
 * 3. Identity Lifecycle:
 * Logout user from OneSignal on app logout.
 */
export async function logoutOneSignal() {
  if (typeof window === 'undefined') return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      if (OneSignal.logout) {
        await OneSignal.logout();
        console.log('🔓 OneSignal logged out');
      }
    } catch (e) {
      console.warn('OneSignal logout error:', e);
    }
  });
}

/**
 * Tag the user by their role ('driver' or 'pilgrim') - backward compatibility
 */
export function setOneSignalRole(role, userName, userId = null) {
  loginOneSignal(userId, role, userName);
}

/**
 * 4. Request notification permission (Android 13+ / Browser)
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined') return false;

  // Request browser permission directly
  if ('Notification' in window && Notification.permission !== 'granted') {
    try {
      await Notification.requestPermission();
    } catch (e) {}
  }

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        if (OneSignal.Notifications) {
          const permission = await OneSignal.Notifications.requestPermission();
          resolve(permission);
        } else {
          resolve(true);
        }
      } catch (e) {
        console.warn('Error requesting OneSignal permission:', e);
        resolve(false);
      }
    });
  });
}

/**
 * 5. Show External / System Notification (Instant Device Delivery):
 * - Native Android Status Bar via NativeBridge (when inside Capacitor APK)
 * - ServiceWorker showNotification / Web Notification (when inside Browser/PWA)
 * - Hardware Vibration & Audio Chime
 */
export async function showExternalNotification({
  title = 'مزار - إشعار جديد 🚗',
  message = 'لديك تحديث جديد في التطبيق',
  url = '/',
  icon = '/icon.svg'
}) {
  if (typeof window === 'undefined') return false;

  console.log('📣 [External Notification]', title, message);

  // A. Native Android Bridge (Status Bar & System Drawer in APK)
  if (window.NativeBridge && typeof window.NativeBridge.showNotification === 'function') {
    try {
      window.NativeBridge.showNotification(title, message, url);
      console.log('✅ Displayed natively via Android Status Bar');
      return true;
    } catch (e) {
      console.warn('NativeBridge showNotification error:', e);
    }
  }

  // B. Hardware Vibration
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } catch (e) {}
  }

  // C. Browser / PWA Service Worker Notification
  if ('serviceWorker' in navigator && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body: message,
            icon: icon,
            badge: icon,
            tag: 'mazar-alert-' + Date.now(),
            renotify: true,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            data: { url }
          });
          return true;
        }
      } catch (swErr) {
        console.warn('ServiceWorker showNotification error:', swErr);
      }

      try {
        new Notification(title, {
          body: message,
          icon: icon
        });
        return true;
      } catch (domErr) {
        console.warn('HTML5 Notification constructor error:', domErr);
      }
    } else if (Notification.permission !== 'denied') {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          return showExternalNotification({ title, message, url, icon });
        }
      } catch (permErr) {}
    }
  }

  return false;
}

/**
 * 6. Remote Push Notification Dispatcher (Server-to-Device):
 * Sends push to targeted users or roles (Driver, Pilgrim, Admin).
 * Fallback to direct OneSignal REST API if Edge Function is 404 or unconfigured.
 */
export async function sendPushNotification({ 
  title, 
  message, 
  targetRole = null, 
  targetUserId = null, 
  targetUrl = '/',
  data = {}
}) {
  const restApiKey = import.meta.env.VITE_ONESIGNAL_REST_API_KEY || '';

  // 1. Try Supabase Edge Function first
  try {
    const { data: responseData, error } = await supabase.functions.invoke('onesignal-notify', {
      body: {
        title,
        message,
        targetRole,
        targetUserId,
        targetUrl,
        data
      }
    });

    if (!error && responseData && !responseData.error) {
      return responseData;
    }
  } catch (err) {
    console.warn('Edge function invoke skipped, attempting direct OneSignal fallback');
  }

  // 2. Direct OneSignal REST API Fallback
  if (restApiKey && ONESIGNAL_APP_ID) {
    try {
      const payload = {
        app_id: ONESIGNAL_APP_ID,
        headings: {
          ar: title || 'مزار - إشعار جديد 🚗',
          en: title || 'Mazar Notification'
        },
        contents: {
          ar: message || 'لديك إشعار جديد في تطبيق مزار',
          en: message || 'You have a new update in Mazar App'
        },
        url: targetUrl,
        data: data,
        android_channel_id: 'default_notification_channel',
        priority: 10,
        android_accent_color: 'FFE65100',
        android_visibility: 1
      };

      if (targetUserId) {
        payload.include_aliases = { external_id: [String(targetUserId)] };
        payload.target_channel = 'push';
      } else if (targetRole) {
        payload.filters = [{ field: 'tag', key: 'role', relation: '=', value: targetRole }];
      } else {
        payload.included_segments = ['Total Subscriptions'];
      }

      const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${restApiKey}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      console.log('✅ Direct OneSignal dispatch response:', resData);
      return resData;
    } catch (directErr) {
      console.error('Direct OneSignal dispatch failed:', directErr);
      return { error: directErr };
    }
  }

  return { error: 'No notification dispatcher available' };
}
