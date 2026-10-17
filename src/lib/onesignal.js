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

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        if (OneSignal.Notifications) {
          const permission = await OneSignal.Notifications.requestPermission();
          resolve(permission);
        } else {
          resolve(false);
        }
      } catch (e) {
        console.warn('Error requesting OneSignal permission:', e);
        resolve(false);
      }
    });
  });
}

/**
 * 5. Secure Backend Notification Dispatcher:
 * Principle 1: Absolute Zero-Trust Key Separation.
 * The REST API Key is NEVER stored or sent from client code.
 * All notifications are dispatched through the Supabase Edge Function!
 */
export async function sendPushNotification({ 
  title, 
  message, 
  targetRole = null, 
  targetUserId = null, 
  targetUrl = '/',
  data = {}
}) {
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

    if (error) {
      console.warn('Backend push notification warning:', error);
      return { error };
    }
    return responseData;
  } catch (err) {
    console.warn('Failed to invoke onesignal-notify edge function:', err);
    return { error: err.message };
  }
}
