'use client';

import { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import { PinMarkers } from './pin-markers';
import { MapClickHandler } from './map-click-handler';
import type { Pin } from '@/lib/types';

/**
 * Safely invalidates the map size after the layout settles.
 * Leaflet stores the container dimensions at init time; if the container
 * is inside a flex/grid layout that hasn't finished calculating, the map
 * gets zero or partial dimensions and never self-corrects.
 *
 * Calling invalidateSize() after mount forces Leaflet to re-read the
 * container, fixing the "fragmented tiles" issue.
 */
function MapResizer() {
  const map = useMap();

  const resize = useCallback(() => {
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    // First invalidation after mount — layout should be settled by now
    // because dynamic-map.tsx is loaded as a deferred dynamic import.
    resize();

    // Second invalidation after a short delay to catch any late layout shifts.
    const timer = setTimeout(resize, 300);
    return () => clearTimeout(timer);
  }, [resize, map]);

  return null;
}

interface DynamicMapProps {
  pins: Pin[];
  onMapClick?: (lat: number, lng: number) => void;
  onPinClick?: (pin: Pin) => void;
  selectedPinId?: string | null;
  center?: [number, number];
  zoom?: number;
}

export default function DynamicMap({
  pins,
  onMapClick,
  onPinClick,
  center = [20, 78],
  zoom = 5,
}: DynamicMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      zoomControl={false}
    >
      <MapResizer />
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PinMarkers pins={pins} onPinClick={onPinClick} />
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
    </MapContainer>
  );
}
