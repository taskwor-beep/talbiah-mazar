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
  height = '280px',
  className = '',
  showControls = true
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [geocodedPickup, setGeocodedPickup] = useState(null);
  const [geocodedDropoff, setGeocodedDropoff] = useState(null);

  // Stored coordinate refs for instant camera flying/focus
  const pCoordsRef = useRef(null);
  const dCoordsRef = useRef(null);
  const dvrCoordsRef = useRef(null);
  const boundsPointsRef = useRef([]);

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
      }).setView(initialCenter, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'topleft' }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers & polylines
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const boundsPoints = [];

    // 1. Create Pickup Marker (Real Location)
    if (pCoords) {
      const pickupIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background-color: #16a34a; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 3px solid #ffffff;">
            <span style="color: white; font-size: 13px; font-weight: bold;">أ</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      L.marker(pCoords, { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`<b>نقطة الانطلاق (المعتمر):</b><br/>${pickupAddress || 'الموقع الحالي'}`);
      boundsPoints.push(pCoords);
    }

    // 2. Create Dropoff Marker (Real Destination)
    if (dCoords) {
      const dropoffIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background-color: #dc2626; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 3px solid #ffffff;">
            <span style="color: white; font-size: 13px; font-weight: bold;">ب</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      L.marker(dCoords, { icon: dropoffIcon })
        .addTo(map)
        .bindPopup(`<b>نقطة الوصول (الوجهة):</b><br/>${dropoffAddress || 'الوجهة'}`);
      boundsPoints.push(dCoords);
    }

    // 3. Create Driver Marker ONLY if real GPS coordinates exist
    if (validDriverCoords) {
      const driverIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background-color: #ea580c; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.6); border: 3px solid #ffffff; animation: pulse 2s infinite;">
            <span style="font-size: 22px;">🚗</span>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      L.marker(validDriverCoords, { icon: driverIcon })
        .addTo(map)
        .bindPopup('<b>موقع السائق المباشر (GPS) 🚗</b>');
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

    // Adjust view to contain all real markers
    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [50, 50], maxZoom: 16 });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 15);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [pickupAddress, dropoffAddress, driverCoords, pickupCoords, dropoffCoords, geocodedPickup, geocodedDropoff]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Control handlers
  const handleFocusDriver = () => {
    if (mapInstanceRef.current && dvrCoordsRef.current) {
      mapInstanceRef.current.flyTo(dvrCoordsRef.current, 16, { duration: 1 });
    }
  };

  const handleFocusPickup = () => {
    if (mapInstanceRef.current && pCoordsRef.current) {
      mapInstanceRef.current.flyTo(pCoordsRef.current, 16, { duration: 1 });
    }
  };

  const handleFocusDropoff = () => {
    if (mapInstanceRef.current && dCoordsRef.current) {
      mapInstanceRef.current.flyTo(dCoordsRef.current, 16, { duration: 1 });
    }
  };

  const handleFitAll = () => {
    if (mapInstanceRef.current && boundsPointsRef.current.length > 0) {
      if (boundsPointsRef.current.length === 1) {
        mapInstanceRef.current.flyTo(boundsPointsRef.current[0], 15);
      } else {
        mapInstanceRef.current.fitBounds(L.latLngBounds(boundsPointsRef.current), { padding: [50, 50] });
      }
    }
  };

  return (
    <div 
      className={`relative w-full rounded-3xl overflow-hidden border border-orange-200 shadow-md z-0 ${className}`} 
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Top Status Badge */}
      <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black text-gray-800 shadow-sm border border-gray-100 flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${activePoints.hasDriver ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></span>
        {activePoints.hasDriver ? '🚗 موقع السائق مباشر' : '📍 مسار الرحلة'}
      </div>

      {/* Floating Focus Action Buttons */}
      {showControls && (
        <div className="absolute bottom-3 right-3 left-3 sm:left-auto z-[400] flex flex-wrap gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-gray-200/80">
          {activePoints.hasDriver && (
            <button
              type="button"
              onClick={handleFocusDriver}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 active:scale-95 text-orange-700 rounded-xl text-xs font-black shadow-xs transition"
              title="الانتقال إلى موقع السائق"
            >
              🚗 موقع السائق
            </button>
          )}

          {activePoints.hasPickup && (
            <button
              type="button"
              onClick={handleFocusPickup}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 active:scale-95 text-green-700 rounded-xl text-xs font-black shadow-xs transition"
              title="الانتقال إلى موقع المعتمر"
            >
              👤 المعتمر
            </button>
          )}

          {activePoints.hasDropoff && (
            <button
              type="button"
              onClick={handleFocusDropoff}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 rounded-xl text-xs font-black shadow-xs transition"
              title="الانتقال إلى الوجهة"
            >
              🏁 الوجهة
            </button>
          )}

          {activePoints.totalPoints > 1 && (
            <button
              type="button"
              onClick={handleFitAll}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 rounded-xl text-xs font-black shadow-xs transition"
              title="عرض كامل المسار"
            >
              🗺️ المسار كاملاً
            </button>
          )}
        </div>
      )}
    </div>
  );
}
