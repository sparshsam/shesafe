'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Pin } from '@/lib/types';
import { Loader2 } from 'lucide-react';

// All react-leaflet components must be loaded client-side only.
const DynamicMap = dynamic(
  () => import('./dynamic-map'),
  { ssr: false }
);

interface MapProps {
  pins: Pin[];
  onMapClick?: (lat: number, lng: number) => void;
  onPinClick?: (pin: Pin) => void;
  selectedPinId?: string | null;
  center?: [number, number];
  zoom?: number;
  cursorMode?: 'crosshair' | 'default';
}

export function Map(props: MapProps) {
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-muted/20 min-h-[400px]"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative ${props.cursorMode === 'crosshair' ? '[&_.leaflet-container]:cursor-crosshair' : ''}`}>
      <DynamicMap {...props} />
    </div>
  );
}
