// OneSignal Web Push Integration for Mazar App

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '';

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
