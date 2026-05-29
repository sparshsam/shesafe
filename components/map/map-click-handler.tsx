'use client';

import { useMapEvent } from 'react-leaflet';

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
  enabled: boolean;
}

/**
 * Thin wrapper around react-leaflet's useMapEvent.
 * It re-binds whenever enabled/onMapClick changes (useMapEvent handles this),
 * so the map always calls the latest handler for the current drop mode state.
 */
export function MapClickHandler({ onMapClick, enabled }: MapClickHandlerProps) {
  useMapEvent('click', (e) => {
    if (!enabled) return;
    onMapClick(e.latlng.lat, e.latlng.lng);
  });
  return null;
}
