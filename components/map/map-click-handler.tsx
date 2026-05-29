'use client';

import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
  enabled: boolean;
}

/**
 * Uses native Leaflet map.on('click') with ref-based callbacks.
 * 
 * WHY NOT useMapEvent: react-leaflet's useMapEvent re-binds on every render
 * when the handler function changes. That means removing + re-adding the
 * handler every re-render (including state changes). This can cause the
 * click to get lost during render transitions.
 * 
 * Instead, we bind ONCE on mount and use refs to always call the latest
 * onMapClick and enabled values. This is the most reliable approach.
 */
export function MapClickHandler({ onMapClick, enabled }: MapClickHandlerProps) {
  const map = useMap();
  const onMapClickRef = useRef(onMapClick);
  const enabledRef = useRef(enabled);

  // Sync refs every render (happens before any event handler reads them)
  onMapClickRef.current = onMapClick;
  enabledRef.current = enabled;

  useEffect(() => {
    console.log('[MapClickHandler] Mounting, binding click handler');
    const handler = (e: any) => {
      const isEnabled = enabledRef.current;
      console.log('[MapClickHandler] Map click event received', {
        enabled: isEnabled,
        lat: e.latlng?.lat,
        lng: e.latlng?.lng,
        hasCallback: !!onMapClickRef.current,
      });
      if (!isEnabled) return;
      if (!onMapClickRef.current) return;
      onMapClickRef.current(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handler);
    return () => {
      console.log('[MapClickHandler] Unmounting, removing click handler');
      map.off('click', handler);
    };
  }, [map]);

  return null;
}
