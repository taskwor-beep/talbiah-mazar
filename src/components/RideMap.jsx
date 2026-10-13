import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// Known landmark coordinates in Makkah & Madinah (used ONLY when explicitly matched)
const KNOWN_LOCATIONS = {
  'فندق أبراج الكسوة': [21.4339, 39.8139],
  'الحرم المكي': [21.4225, 39.8262],
  'غار حراء': [21.4578, 39.8592],
  'جبل ثور': [21.3783, 39.8504],
  'مسجد قباء': [24.4394, 39.6172],
  'المسجد النبوي': [24.4672, 39.6111],
  'محطة قطار الحرمين': [21.4312, 39.8011],
  'منى': [21.4133, 39.8933],
  'عرفات': [21.3547, 39.9842],
};

function extractCoordsFromString(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [lat, lng];
    }
  }
  return null;
}

function resolveKnownOrExtractedCoords(address) {
  if (!address || typeof address !== 'string') return null;
  
  // 1. Check if the address contains coordinates: e.g. "موقعي الحالي (21.4339, 39.8139)"
  const extracted = extractCoordsFromString(address);
  if (extracted) return extracted;

  // 2. Check known landmarks
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (address.includes(key) || key.includes(address)) {
      return coords;
    }
  }

  return null;
}

export default function RideMap({
  pickupAddress = '',
  dropoffAddress = '',
  driverCoords = null,
  pickupCoords = null,
  dropoffCoords = null,
  height = '340px',
  className = '',
  showControls = true
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [geocodedPickup, setGeocodedPickup] = useState(null);
  const [geocodedDropoff, setGeocodedDropoff] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentFocus, setCurrentFocus] = useState(null); // 'driver' | 'pickup' | 'dropoff' | 'all' | null

  // Stored coordinate refs for instant camera focus
  const pCoordsRef = useRef(null);
  const dCoordsRef = useRef(null);
  const dvrCoordsRef = useRef(null);
  const boundsPointsRef = useRef([]);

  // Marker instance refs to control popups and highlights
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const hasInitialFittedRef = useRef(false);
  const userManualFocusRef = useRef(null);

  const [activePoints, setActivePoints] = useState({ hasDriver: false, hasPickup: false, hasDropoff: false, totalPoints: 0 });

  // Dynamic geocoding for custom addresses if coordinates not provided
  useEffect(() => {
    let isMounted = true;

    async function geocodeAddress(address, isPickup) {
      if (!address || typeof address !== 'string') return;
      const staticCoords = resolveKnownOrExtractedCoords(address);
      if (staticCoords) {
        if (isPickup) setGeocodedPickup(staticCoords);
        else setGeocodedDropoff(staticCoords);
        return;
      }

      // Try OpenStreetMap Nominatim for real geocoding
      try {
        const cleanQuery = address.replace(/[()]/g, '').trim();
        if (cleanQuery.length < 3) return;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=1`, {
          headers: { 'Accept-Language': 'ar,en' }
        });
        const data = await res.json();
        if (isMounted && data && data.length > 0) {
          const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          if (isPickup) setGeocodedPickup(coords);
          else setGeocodedDropoff(coords);
        }
      } catch (e) {
        // Quiet fallback
      }
    }

    if (!pickupCoords) {
      geocodeAddress(pickupAddress, true);
    }
    if (!dropoffCoords) {
      geocodeAddress(dropoffAddress, false);
    }

    return () => {
      isMounted = false;
    };
  }, [pickupAddress, dropoffAddress, pickupCoords, dropoffCoords]);

  // Handle map resize and body scroll on fullscreen toggle
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleResize = () => {
      const map = mapInstanceRef.current;
      if (map && map._mapPane && mapContainerRef.current) {
        try {
          map.invalidateSize();
          if (boundsPointsRef.current.length > 1) {
            map.fitBounds(L.latLngBounds(boundsPointsRef.current), { padding: [50, 50] });
          }
        } catch (e) {}
      }
    };

    const t1 = setTimeout(handleResize, 100);
    const t2 = setTimeout(handleResize, 350);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Resolve final coordinates
    const pCoords = pickupCoords || geocodedPickup || resolveKnownOrExtractedCoords(pickupAddress);
    const dCoords = dropoffCoords || geocodedDropoff || resolveKnownOrExtractedCoords(dropoffAddress);

    // REAL DRIVER COORDINATES ONLY: Never invent fake driver coordinates!
    const validDriverCoords = (driverCoords && Array.isArray(driverCoords) && driverCoords.length === 2 && !isNaN(driverCoords[0]) && !isNaN(driverCoords[1]))
      ? driverCoords
      : null;

    pCoordsRef.current = pCoords;
    dCoordsRef.current = dCoords;
    dvrCoordsRef.current = validDriverCoords;

    // Default center if no coordinates are known yet
    const initialCenter = validDriverCoords || pCoords || dCoords || [21.4225, 39.8262];

    // Initialize map if not yet created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(initialCenter, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Reset manual focus when user pans or drags the map manually
      map.on('dragstart', () => {
        userManualFocusRef.current = null;
        setCurrentFocus(null);
      });

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers & polylines
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    pickupMarkerRef.current = null;
    dropoffMarkerRef.current = null;
    driverMarkerRef.current = null;

    const boundsPoints = [];

    // 1. Create Pickup Marker (Real Location)
    if (pCoords) {
      const pickupIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background-color: #16a34a; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.5); border: 3px solid #ffffff; position: relative;">
            <span style="color: white; font-size: 16px; font-weight: 900;">📍</span>
            <div style="position: absolute; inset: -6px; border: 2px solid #16a34a; border-radius: 50%; opacity: 0.6; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -22]
      });

      const pMarker = L.marker(pCoords, { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`
          <div dir="rtl" style="text-align: right; font-family: inherit; min-width: 170px;">
            <div style="font-weight: 900; color: #16a34a; font-size: 13px; margin-bottom: 3px;">📍 موقع المعتمر (الانطلاق)</div>
            <div style="font-size: 12px; color: #1f2937; font-weight: bold; line-height: 1.4;">${pickupAddress || 'الموقع الحالي للمعتمر'}</div>
          </div>
        `, { autoPan: true, autoPanPadding: [30, 30] });

      pickupMarkerRef.current = pMarker;
      pMarker.on('click', () => {
        userManualFocusRef.current = 'pickup';
        setCurrentFocus('pickup');
      });
      boundsPoints.push(pCoords);
    }

    // 2. Create Dropoff Marker (Real Destination)
    if (dCoords) {
      const dropoffIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background-color: #dc2626; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.5); border: 3px solid #ffffff; position: relative;">
            <span style="color: white; font-size: 16px; font-weight: 900;">🏁</span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -22]
      });

      const dMarker = L.marker(dCoords, { icon: dropoffIcon })
        .addTo(map)
        .bindPopup(`
          <div dir="rtl" style="text-align: right; font-family: inherit; min-width: 170px;">
            <div style="font-weight: 900; color: #dc2626; font-size: 13px; margin-bottom: 3px;">🏁 وجهة الوصول (النزول)</div>
            <div style="font-size: 12px; color: #1f2937; font-weight: bold; line-height: 1.4;">${dropoffAddress || 'الوجهة المحددة'}</div>
          </div>
        `, { autoPan: true, autoPanPadding: [30, 30] });

      dropoffMarkerRef.current = dMarker;
      dMarker.on('click', () => {
        userManualFocusRef.current = 'dropoff';
        setCurrentFocus('dropoff');
      });
      boundsPoints.push(dCoords);
    }

    // 3. Create Driver Marker ONLY if real GPS coordinates exist
    if (validDriverCoords) {
      const driverIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background-color: #ea580c; width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(234, 88, 12, 0.6); border: 3px solid #ffffff; position: relative;">
            <span style="font-size: 24px;">🚗</span>
            <div style="position: absolute; inset: -6px; border: 2px solid #ea580c; border-radius: 50%; opacity: 0.7; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          </div>
        `,
        iconSize: [46, 46],
        iconAnchor: [23, 23],
        popupAnchor: [0, -25]
      });

      const dvrMarker = L.marker(validDriverCoords, { icon: driverIcon })
        .addTo(map)
        .bindPopup(`
          <div dir="rtl" style="text-align: right; font-family: inherit; min-width: 170px;">
            <div style="font-weight: 900; color: #ea580c; font-size: 13px; margin-bottom: 3px;">🚗 موقع السائق المباشر (GPS)</div>
            <div style="font-size: 11px; color: #4b5563; font-weight: bold;">يتم تحديث موقع السيارة مباشرة أثناء السير</div>
          </div>
        `, { autoPan: true, autoPanPadding: [30, 30] });

      driverMarkerRef.current = dvrMarker;
      dvrMarker.on('click', () => {
        userManualFocusRef.current = 'driver';
        setCurrentFocus('driver');
      });
      boundsPoints.push(validDriverCoords);
    }

    // 4. Connect route polyline if both points exist
    if (pCoords && dCoords) {
      const latlngs = [pCoords, dCoords];
      L.polyline(latlngs, {
        color: '#ea580c',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8'
      }).addTo(map);
    }

    // Connect line between Driver and Pickup if driver is approaching
    if (validDriverCoords && pCoords) {
      L.polyline([validDriverCoords, pCoords], {
        color: '#2563eb',
        weight: 3,
        opacity: 0.7,
        dashArray: '4, 4'
      }).addTo(map);
    }

    boundsPointsRef.current = boundsPoints;
    setActivePoints({
      hasDriver: !!validDriverCoords,
      hasPickup: !!pCoords,
      hasDropoff: !!dCoords,
      totalPoints: boundsPoints.length
    });

    // Adjust view: Only fitBounds initially or if user hasn't explicitly focused on a specific marker
    if (!hasInitialFittedRef.current || !userManualFocusRef.current) {
      if (boundsPoints.length > 1) {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [50, 50], maxZoom: 16 });
        hasInitialFittedRef.current = true;
      } else if (boundsPoints.length === 1) {
        map.setView(boundsPoints[0], 16);
        hasInitialFittedRef.current = true;
      }
    } else if (userManualFocusRef.current === 'driver' && validDriverCoords) {
      try {
        map.panTo(validDriverCoords, { animate: true });
      } catch (e) {}
    }

    const invTimer = setTimeout(() => {
      const currentMap = mapInstanceRef.current;
      if (currentMap && currentMap._mapPane && mapContainerRef.current) {
        try {
          currentMap.invalidateSize();
        } catch (e) {}
      }
    }, 200);

    return () => {
      clearTimeout(invTimer);
    };

  }, [pickupAddress, dropoffAddress, driverCoords, pickupCoords, dropoffCoords, geocodedPickup, geocodedDropoff]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Control handlers
  const handleFocusDriver = () => {
    setCurrentFocus('driver');
    userManualFocusRef.current = 'driver';
    const map = mapInstanceRef.current;
    const coords = dvrCoordsRef.current;
    if (map && map._mapPane && coords) {
      try {
        map.setView(coords, 17, { animate: true });
        if (driverMarkerRef.current) {
          driverMarkerRef.current.openPopup();
        }
      } catch (e) {}
    }
  };

  const handleFocusPickup = () => {
    setCurrentFocus('pickup');
    userManualFocusRef.current = 'pickup';
    const map = mapInstanceRef.current;
    const coords = pCoordsRef.current;
    if (map && map._mapPane && coords) {
      try {
        map.setView(coords, 17, { animate: true });
        if (pickupMarkerRef.current) {
          pickupMarkerRef.current.openPopup();
        }
      } catch (e) {}
    }
  };

  const handleFocusDropoff = () => {
    setCurrentFocus('dropoff');
    userManualFocusRef.current = 'dropoff';
    const map = mapInstanceRef.current;
    const coords = dCoordsRef.current;
    if (map && map._mapPane && coords) {
      try {
        map.setView(coords, 17, { animate: true });
        if (dropoffMarkerRef.current) {
          dropoffMarkerRef.current.openPopup();
        }
      } catch (e) {}
    }
  };

  const handleFitAll = () => {
    setCurrentFocus('all');
    userManualFocusRef.current = null;
    const map = mapInstanceRef.current;
    if (map && map._mapPane && boundsPointsRef.current.length > 0) {
      try {
        map.closePopup();
        if (boundsPointsRef.current.length === 1) {
          map.setView(boundsPointsRef.current[0], 15, { animate: true });
        } else {
          map.fitBounds(L.latLngBounds(boundsPointsRef.current), { padding: [50, 50] });
        }
      } catch (e) {}
    }
  };

  return (
    <div 
      className={isFullscreen 
        ? 'fixed inset-0 z-[99999] h-screen w-screen bg-white' 
        : `relative w-full rounded-3xl overflow-hidden border border-orange-200 shadow-md z-0 ${className}`
      } 
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Top Header Bar when in Fullscreen */}
      {isFullscreen ? (
        <div className="absolute top-3 left-3 right-3 z-[500] flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="pointer-events-auto bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-black shadow-xl flex items-center gap-2 transition"
          >
            <span>✕</span>
            <span>تصغير الخريطة (رجوع)</span>
          </button>
          
          <div className="pointer-events-auto bg-white/95 backdrop-blur px-3.5 py-1.5 rounded-full text-xs font-black text-gray-800 shadow-lg border border-gray-200 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${activePoints.hasDriver ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></span>
            <span>{activePoints.hasDriver ? '🚗 تتبع السائق مباشر' : '📍 مسار الرحلة'}</span>
          </div>
        </div>
      ) : (
        /* Top Controls in Normal Embedded View */
        <>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="absolute top-3 left-14 z-[400] bg-orange-600 hover:bg-orange-700 active:scale-95 text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 transition"
            title="تكبير الخريطة للشاشة كاملة"
          >
            <span className="text-sm">⛶</span>
            <span>تكبير الخريطة</span>
          </button>

          <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black text-gray-800 shadow-sm border border-gray-100 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${activePoints.hasDriver ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></span>
            {activePoints.hasDriver ? '🚗 موقع السائق' : '📍 المسار'}
          </div>
        </>
      )}

      {/* Floating Focus and Quick Action Buttons */}
      {showControls && (
        <div className="absolute bottom-3 right-3 left-3 sm:left-auto z-[400] flex flex-wrap gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-gray-200/80">
          {activePoints.hasDriver && (
            <button
              type="button"
              onClick={handleFocusDriver}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition active:scale-95 ${
                currentFocus === 'driver'
                  ? 'bg-orange-500 text-white shadow-md ring-2 ring-orange-300'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-700'
              }`}
              title="الانتقال إلى موقع السائق وتحديده"
            >
              <span>🚗</span>
              <span>موقع السائق</span>
              {currentFocus === 'driver' && <span className="text-[10px]">✓</span>}
            </button>
          )}

          {activePoints.hasPickup && (
            <button
              type="button"
              onClick={handleFocusPickup}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition active:scale-95 ${
                currentFocus === 'pickup'
                  ? 'bg-green-600 text-white shadow-md ring-2 ring-green-300'
                  : 'bg-green-50 hover:bg-green-100 text-green-700'
              }`}
              title="الانتقال إلى موقع المعتمر وتحديده"
            >
              <span>👤</span>
              <span>المعتمر</span>
              {currentFocus === 'pickup' && <span className="text-[10px]">✓</span>}
            </button>
          )}

          {activePoints.hasDropoff && (
            <button
              type="button"
              onClick={handleFocusDropoff}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition active:scale-95 ${
                currentFocus === 'dropoff'
                  ? 'bg-red-600 text-white shadow-md ring-2 ring-red-300'
                  : 'bg-red-50 hover:bg-red-100 text-red-700'
              }`}
              title="الانتقال إلى وجهة النزول وتحديدها"
            >
              <span>🏁</span>
              <span>الوجهة</span>
              {currentFocus === 'dropoff' && <span className="text-[10px]">✓</span>}
            </button>
          )}

          {activePoints.totalPoints > 1 && (
            <button
              type="button"
              onClick={handleFitAll}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition active:scale-95 ${
                currentFocus === 'all'
                  ? 'bg-gray-800 text-white shadow-md ring-2 ring-gray-400'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
              title="عرض كامل المسار والنقاط"
            >
              <span>🗺️</span>
              <span>كامل المسار</span>
            </button>
          )}

          {/* Quick Bottom Toggle for Mobile Users */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition active:scale-95 ${
              isFullscreen 
                ? 'bg-red-50 hover:bg-red-100 text-red-600' 
                : 'bg-orange-50 hover:bg-orange-100 text-orange-700'
            }`}
            title={isFullscreen ? 'تصغير الخريطة' : 'تكبير الخريطة'}
          >
            {isFullscreen ? '✕ تصغير' : '⛶ تكبير'}
          </button>
        </div>
      )}
    </div>
  );
}
