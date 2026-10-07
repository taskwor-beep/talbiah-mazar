/**
 * Accurate Device GPS Locator:
 * Uses high-accuracy device GPS (satellites/device sensors) down to meters.
 * Strictly avoids inaccurate cellular IP/ISP proxies.
 */
export async function getReliablePosition() {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return resolve(null);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps_accurate'
        });
      },
      (err) => {
        console.warn('GPS accurate location error:', err);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  });
}
