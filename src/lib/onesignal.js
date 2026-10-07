// OneSignal Web Push Integration for Mazar App

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'acccfba5-e13c-4bd5-a2ad-d7f9e4f15c62';

/**
 * Initialize OneSignal Web SDK
 */
export async function initOneSignal() {
  if (typeof window === 'undefined') return;

  // Check if App ID is configured
  if (!ONESIGNAL_APP_ID) {
    console.log('OneSignal: VITE_ONESIGNAL_APP_ID is not set yet.');
    return;
  }

  // Load SDK dynamically if not already loaded
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
      safari_web_id: '',
      notifyButton: {
        enable: false, // We use custom UI prompt
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
 * Tag the user by their role ('driver' or 'pilgrim') so we can target notifications
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

const ONESIGNAL_REST_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY || '';

/**
 * Send push notification to target role ('driver' or 'pilgrim')
 */
export async function sendPushNotification({ title, message, targetRole = 'driver', targetUrl = '/' }) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_KEY) return;
  try {
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      filters: [
        { field: 'tag', key: 'role', relation: '=', value: targetRole }
      ],
      headings: {
        ar: title,
        en: title
      },
      contents: {
        ar: message,
        en: message
      },
      url: targetUrl
    };

    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('Error sending OneSignal push:', err);
  }
}

