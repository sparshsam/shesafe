'use client';

import { useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import { PinMarkers } from './pin-markers';
import { MapClickHandler } from './map-click-handler';
import type { Pin } from '@/lib/types';

function MapResizer() {
  const map = useMap();

  const resize = useCallback(() => {
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    resize();
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
  cursorMode?: 'crosshair' | 'default';
  dropMode?: boolean;
}

export default function DynamicMap({
  pins,
  onMapClick,
  onPinClick,
  center = [20, 78],
  zoom = 5,
  dropMode = false,
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
      {onMapClick && (
        <MapClickHandler onMapClick={onMapClick} enabled={dropMode} />
      )}
    </MapContainer>
  );
}
