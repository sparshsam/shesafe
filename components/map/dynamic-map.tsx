'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvent } from 'react-leaflet';
import { PinMarkers } from './pin-markers';
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


/**
 * Wraps react-leaflet's useMapEvent to always call the latest callback.
 * react-leaflet v4's useMapEvent does this internally via refs, but this
 * explicit version makes it more transparent and debuggable.
 */
function ClickHandler({ onMapClick, enabled }: { onMapClick: (lat: number, lng: number) => void; enabled: boolean }) {
  const map = useMap();

  const handleClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      console.log('[ClickHandler] Map click fired', { enabled, lat: e.latlng.lat, lng: e.latlng.lng });
      if (!enabled) {
        console.log('[ClickHandler] Ignored — not in drop mode');
        return;
      }
      try {
        onMapClick(e.latlng.lat, e.latlng.lng);
        console.log('[ClickHandler] onMapClick called successfully');
      } catch (err) {
        console.error('[ClickHandler] Error in onMapClick:', err);
      }
    },
    [onMapClick, enabled]
  );

  // useMapEvent re-binds the handler whenever its deps change (onMapClick or enabled).
  // This ensures the map always calls the latest handler, avoiding stale closures.
  console.log('[ClickHandler] Rendering with', { enabled, hasOnMapClick: !!onMapClick });
  useMapEvent('click', handleClick);

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
  console.log('[DynamicMap] Render', { pinCount: pins.length, dropMode, hasOnMapClick: !!onMapClick });

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
        <ClickHandler onMapClick={onMapClick} enabled={dropMode} />
      )}
    </MapContainer>
  );
}
