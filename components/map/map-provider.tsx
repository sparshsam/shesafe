'use client';

import type { ReactNode } from 'react';

/**
 * @deprecated Leaflet CSS is now imported globally in layout.tsx via
 * `import 'leaflet/dist/leaflet.css'`. This component is no longer needed.
 *
 * Kept as a no-op to avoid breaking any existing imports.
 */
export function MapProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
