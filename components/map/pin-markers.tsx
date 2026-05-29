'use client';

import { useEffect } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Pin } from '@/lib/types';

const iconMap: Record<string, L.DivIcon> = {
  safe: L.divIcon({ className: 'custom-marker', html: '<div style="font-size:24px;line-height:1">✅</div>', iconSize: [30, 30], iconAnchor: [15, 30] }),
  mixed: L.divIcon({ className: 'custom-marker', html: '<div style="font-size:24px;line-height:1">⚠️</div>', iconSize: [30, 30], iconAnchor: [15, 30] }),
  unsafe: L.divIcon({ className: 'custom-marker', html: '<div style="font-size:24px;line-height:1">🚫</div>', iconSize: [30, 30], iconAnchor: [15, 30] }),
};

interface PinMarkersProps {
  pins: Pin[];
  selectedPinId?: string | null;
  onPinClick?: (pin: Pin) => void;
}

export function PinMarkers({ pins, onPinClick }: PinMarkersProps) {
  // Fix default Leaflet icon path issue with webpack/Next.js
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <>
      {pins.map(pin => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={iconMap[pin.tag] || iconMap.mixed}
          eventHandlers={{ click: () => onPinClick?.(pin) }}
        >
          <Popup>
            <div className="text-sm">
              <b>{pin.tag}</b>
              {pin.description && <p className="mt-1">{pin.description}</p>}
              {pin.category && <p className="text-xs text-muted-foreground mt-1">Category: {pin.category}</p>}
              <p className="text-xs text-muted-foreground">{new Date(pin.created_at).toLocaleDateString()}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
