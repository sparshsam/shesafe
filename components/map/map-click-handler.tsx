'use client';

import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
  enabled: boolean;
}

/**
 * Map click handler that uses a ref-based callback to avoid stale closures.
 * react-leaflet's useMapEvents binds handlers once on mount — if the callback
 * reference changes (which it does every render when it's an inline function),
 * the map event listeners never update. By using a ref + manual DOM event,
 * we always call the latest onMapClick without re-binding Leaflet events.
 */
export function MapClickHandler({ onMapClick, enabled }: MapClickHandlerProps) {
  const map = useMap();
  const callbackRef = useRef(onMapClick);
  const enabledRef = useRef(enabled);

  // Keep refs in sync with latest props
  callbackRef.current = onMapClick;
  enabledRef.current = enabled;

  useEffect(() => {
    const handler = (e: any) => {
      // Only process map clicks when enabled (i.e. in drop mode).
      // Without this gate, every map click would open the submit dialog
      // even when the user is just trying to pan or select a pin.
      if (!enabledRef.current) return;
      if (!callbackRef.current) return;
      callbackRef.current(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map]);

  return null;
}
