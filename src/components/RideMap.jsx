import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Known landmark coords in Makkah & Madinah for quick fallback geocoding
const KNOWN_LOCATIONS = {
  'فندق أبراج الكسوة': [21.4339, 39.8139],
  'الحرم المكي': [21.4225, 39.8262],
  'غار حراء': [21.4578, 39.8592],
  'جبل ثور': [21.3783, 39.8504],
  'مسجد قباء (المدينة)': [24.4394, 39.6172],
  'المسجد النبوي': [24.4672, 39.6111],
  'محطة قطار الحرمين': [21.4312, 39.8011],
  'منى': [21.4133, 39.8933],
  'عرفات': [21.3547, 39.9842],
};

function resolveCoords(address, defaultFallback) {
  if (!address) return defaultFallback;
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (address.includes(key) || key.includes(address)) {
      return coords;
    }
  }
  return defaultFallback;
}

export default function RideMap({
  pickupAddress = '',
  dropoffAddress = '',
  driverCoords = null,
  pickupCoords = null,
  dropoffCoords = null,
  height = '280px',
  className = ''
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Resolve coordinates
    const pCoords = pickupCoords || resolveCoords(pickupAddress, [21.4225, 39.8262]);
    const dCoords = dropoffCoords || (dropoffAddress ? resolveCoords(dropoffAddress, [21.4578, 39.8592]) : null);
    const dvrCoords = driverCoords || [pCoords[0] + 0.003, pCoords[1] + 0.003];

    // Initialize map if not yet created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(pCoords, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const boundsPoints = [];

    // Create Pickup Marker
    if (pCoords) {
      const pickupIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background-color: #16a34a; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 3px solid #ffffff;">
            <span style="color: white; font-size: 14px; font-weight: bold;">أ</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      L.marker(pCoords, { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`<b>الانطلاق:</b><br/>${pickupAddress || 'موقع الركوب'}`);
      boundsPoints.push(pCoords);
    }

    // Create Dropoff Marker
    if (dCoords) {
      const dropoffIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background-color: #dc2626; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 3px solid #ffffff;">
            <span style="color: white; font-size: 14px; font-weight: bold;">ب</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      L.marker(dCoords, { icon: dropoffIcon })
        .addTo(map)
        .bindPopup(`<b>الوجهة:</b><br/>${dropoffAddress || 'نقطة الوصول'}`);
      boundsPoints.push(dCoords);
    }

    // Create Driver Marker (if active)
    if (dvrCoords) {
      const driverIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background-color: #ea580c; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.5); border: 3px solid #ffffff;">
            <span style="font-size: 18px;">🚗</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      L.marker(dvrCoords, { icon: driverIcon })
        .addTo(map)
        .bindPopup('<b>السائق</b>');
      boundsPoints.push(dvrCoords);
    }

    // Connect line if both pickup and dropoff exist
    if (pCoords && dCoords) {
      const latlngs = [pCoords, dCoords];
      L.polyline(latlngs, {
        color: '#ea580c',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8'
      }).addTo(map);
    }

    // Fit bounds to show all markers
    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40] });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 14);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      // Keep instance or cleanup on unmount
    };
  }, [pickupAddress, dropoffAddress, driverCoords, pickupCoords, dropoffCoords]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      className={`relative w-full rounded-2xl overflow-hidden border border-orange-200 shadow-inner z-0 ${className}`} 
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm border border-orange-100 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        خريطة المسار الحي
      </div>
    </div>
  );
}
