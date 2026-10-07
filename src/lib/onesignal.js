// OneSignal Web Push Integration for Mazar App
import { supabase } from './supabase';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'acccfba5-e13c-4bd5-a2ad-d7f9e4f15c62';

/**
 * Initialize OneSignal Web SDK
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
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: '/sw.js',
      notifyButton: {
        enable: false,
      },
      allowLocalhostAsSecureOrigin: true,
    });
  });
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !window.OneSignalDeferred) return;

  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.Notifications.requestPermission();
    } catch (e) {
      console.warn('Error requesting OneSignal permission:', e);
    }
  });
}

/**
 * Tag the user by their role ('driver' or 'pilgrim')
 */
export function setOneSignalRole(role, userName) {
  if (typeof window === 'undefined' || !window.OneSignalDeferred) return;

  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      if (OneSignal.User) {
        await OneSignal.User.addTag('role', role);
        if (userName) {
          await OneSignal.User.addTag('name', userName);
        }
      }
    } catch (e) {
      console.warn('Error setting OneSignal tags:', e);
    }
  });
}

/**
 * Send push notification (fetches key dynamically from admin_settings in Supabase)
 */
export async function sendPushNotification({ title, message, targetRole = null, targetUrl = '/' }) {
  try {
    // 1. Fetch credentials from admin_settings in Supabase
    const { data: settingData } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'onesignal_notify')
      .limit(1)
      .maybeSingle();

    const appId = settingData?.value?.app_id || ONESIGNAL_APP_ID;
    const restKey = settingData?.value?.rest_api_key;

    if (!appId || !restKey) {
      console.warn('OneSignal credentials missing in admin_settings');
      return;
    }

    const payload = {
      app_id: appId,
      headings: {
        ar: title || 'مزار - طلب توصيل جديد 🚗',
        en: title || 'Mazar - New Request 🚗'
      },
      contents: {
        ar: message || 'هناك معتمر يطلب توصيلة الآن!',
        en: message || 'A pilgrim is requesting a ride now!'
      },
      url: targetUrl
    };

    if (targetRole) {
      payload.filters = [
        { field: 'tag', key: 'role', relation: '=', value: targetRole }
      ];
    } else {
      payload.included_segments = ['Total Subscriptions'];
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${restKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    return result;
  } catch (err) {
    console.warn('Error sending OneSignal push:', err);
  }
}
