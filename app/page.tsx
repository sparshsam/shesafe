'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Navbar } from '@/components/navbar';
import { Map } from '@/components/map/map';
import { PinFilters } from '@/components/map/pin-filters';
import { PinDetailPanel } from '@/components/map/pin-detail-panel';
import { PinSubmitDialog } from '@/components/map/pin-submit-dialog';
import type { Pin, SafetyTag, PinCategory, TimeOfDay } from '@/lib/types';
import { Loader2, MapPin, Crosshair, Info, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [submitCoords, setSubmitCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [dropMode, setDropMode] = useState(false);

  // Filters
  const [tagFilter, setTagFilter] = useState<SafetyTag | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<PinCategory | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeOfDay | 'all'>('all');

  const fetchPins = useCallback(async () => {
    try {
      const res = await fetch('/api/pins');
      if (res.ok) {
        const data = await res.json();
        setPins(data);
      }
    } catch (e) {
      console.error('Failed to fetch pins', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => fetchPins());
    return () => cancelAnimationFrame(id);
  }, [fetchPins]);

  // Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('pins-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pins' }, (payload) => {
        setPins(prev => [payload.new as Pin, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredPins = useMemo(() => {
    let filtered = [...pins];
    if (tagFilter !== 'all') filtered = filtered.filter(p => p.tag === tagFilter);
    if (categoryFilter !== 'all') filtered = filtered.filter(p => p.category === categoryFilter);
    if (timeFilter !== 'all') filtered = filtered.filter(p => p.time_of_day === timeFilter);
    return filtered;
  }, [pins, tagFilter, categoryFilter, timeFilter]);

  const handleDropPinClick = () => {
    if (dropMode) {
      setDropMode(false);
      return;
    }
    setDropMode(true);
    setSelectedPin(null);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSubmitCoords({ lat, lng });
    setShowSubmitDialog(true);
    setDropMode(false);
  };

  const handleCloseDetail = () => setSelectedPin(null);

  // Full-page loader
  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - desktop */}
        <div className="hidden md:flex md:w-80 flex-col border-r bg-background shrink-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Drop Pin Button */}
            <Button
              onClick={handleDropPinClick}
              className={`w-full gap-2 text-base py-6 font-semibold transition-all ${
                dropMode
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg scale-[1.02]'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
              size="lg"
            >
              {dropMode ? (
                <><Crosshair className="h-5 w-5 animate-pulse" /> Click the map to place pin</>
              ) : (
                <><MapPin className="h-5 w-5" /> Drop a Safety Pin</>
              )}
            </Button>

            {/* Pin count + instruction */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Safety Pins</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {filteredPins.length}
                </span>
              </div>
              {pins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pins yet. Be the first to mark this area.</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {dropMode
                    ? 'Tap anywhere on the map to place your pin.'
                    : 'Click a pin to view details.'}
                </p>
              )}
            </div>

            {/* Filters */}
            <PinFilters
              tagFilter={tagFilter} onTagFilterChange={setTagFilter}
              categoryFilter={categoryFilter} onCategoryFilterChange={setCategoryFilter}
              timeFilter={timeFilter} onTimeFilterChange={setTimeFilter}
            />

            {/* Legend */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Legend</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="text-lg">✅</span> <span>Safe</span></div>
                <div className="flex items-center gap-2"><span className="text-lg">⚠️</span> <span>Mixed</span></div>
                <div className="flex items-center gap-2"><span className="text-lg">🚫</span> <span>Unsafe</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className={`flex-1 relative transition-colors duration-300 ${dropMode ? 'drop-mode-active' : ''}`}>
          {/* Drop mode overlay banner */}
          {dropMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
              <div className="bg-amber-500 text-white px-5 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                <Crosshair className="h-4 w-4 animate-pulse" />
                Click anywhere on the map to drop a safety pin
              </div>
            </div>
          )}

          <Map
            pins={filteredPins}
            onMapClick={handleMapClick}
            onPinClick={setSelectedPin}
            cursorMode={dropMode ? 'crosshair' : undefined}
            dropMode={dropMode}
          />

          {/* Mobile: Drop Pin FAB */}
          <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
            <Button
              onClick={handleDropPinClick}
              className={`shadow-xl rounded-full px-6 py-6 text-base font-semibold gap-2 transition-all ${
                dropMode
                  ? 'bg-amber-500 hover:bg-amber-600 text-white scale-110'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
              size="lg"
            >
              {dropMode ? (
                <><Crosshair className="h-5 w-5 animate-pulse" /> Tap the map</>
              ) : (
                <><MapPinned className="h-5 w-5" /> Drop Pin</>
              )}
            </Button>
          </div>
        </div>

        {/* Pin detail panel */}
        <PinDetailPanel pin={selectedPin} onClose={handleCloseDetail} />
      </div>

      {/* Mobile bottom bar (when no pin selected) */}
      {!selectedPin && !dropMode && pins.length > 0 && (
        <div className="md:hidden border-t bg-background px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{filteredPins.length} pin{filteredPins.length !== 1 ? 's' : ''} shown</span>
          </div>
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>Tap a pin or press Drop Pin</span>
          </div>
        </div>
      )}

      <PinSubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        coords={submitCoords}
        onSuccess={() => { setShowSubmitDialog(false); setSubmitCoords(null); fetchPins(); }}
      />
    </div>
  );
}
