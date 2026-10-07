/**
 * Reliable multi-tier Geolocation helper:
 * 1. Fast cached/network location (instant on Android)
 * 2. High-accuracy GPS with realistic timeout
 * 3. Automatic IP-based Geolocation fallback if GPS permission is blocked/denied/indoor
 */
export async function getReliablePosition() {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      return fallbackIpGeolocation(resolve);
    }

    // Step 1: Fast retrieval (uses Android cached position or Wi-Fi triangulation)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'gps'
        });
      },
      (errFast) => {
        // Step 2: High accuracy with generous timeout (10s)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              source: 'gps_high'
            });
          },
          (errHigh) => {
            console.warn('Browser GPS unavailable, falling back to IP network location:', errHigh);
            fallbackIpGeolocation(resolve);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
        );
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
    );
  });
}

async function fallbackIpGeolocation(resolve) {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      return resolve({
        lat: parseFloat(data.latitude),
        lng: parseFloat(data.longitude),
        city: data.city,
        source: 'ip'
      });
    }
  } catch (e) {
    try {
      const res2 = await fetch('https://freeipapi.com/api/json');
      const data2 = await res2.json();
      if (data2 && data2.latitude && data2.longitude) {
        return resolve({
          lat: parseFloat(data2.latitude),
          lng: parseFloat(data2.longitude),
          city: data2.cityName,
          source: 'ip'
        });
      }
    } catch (e2) {}
  }
  resolve(null);
}
