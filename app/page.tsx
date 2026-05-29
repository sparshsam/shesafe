'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Navbar } from '@/components/navbar';
import { Map } from '@/components/map/map';
import { PinFilters } from '@/components/map/pin-filters';
import { PinDetailPanel } from '@/components/map/pin-detail-panel';
import { PinSubmitDialog } from '@/components/map/pin-submit-dialog';
import type { Pin, SafetyTag, PinCategory, TimeOfDay } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [submitCoords, setSubmitCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

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
    // Fetch pins on mount via a microtask pause to avoid cascading renders
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

  // Apply filters via useMemo to avoid setState-in-effect lint violation
  const filteredPins = useMemo(() => {
    let filtered = [...pins];
    if (tagFilter !== 'all') filtered = filtered.filter(p => p.tag === tagFilter);
    if (categoryFilter !== 'all') filtered = filtered.filter(p => p.category === categoryFilter);
    if (timeFilter !== 'all') filtered = filtered.filter(p => p.time_of_day === timeFilter);
    return filtered;
  }, [pins, tagFilter, categoryFilter, timeFilter]);

  const handleMapClick = (lat: number, lng: number) => {
    setSubmitCoords({ lat, lng });
    setShowSubmitDialog(true);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r p-4 overflow-y-auto space-y-4 bg-background shrink-0">
          <div className="space-y-1">
            <h2 className="font-semibold text-lg">Filters</h2>
            <p className="text-xs text-muted-foreground">{filteredPins.length} pin{filteredPins.length !== 1 ? 's' : ''} shown</p>
          </div>
          <PinFilters
            tagFilter={tagFilter} onTagFilterChange={setTagFilter}
            categoryFilter={categoryFilter} onCategoryFilterChange={setCategoryFilter}
            timeFilter={timeFilter} onTimeFilterChange={setTimeFilter}
          />
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-2">Legend</h3>
            <div className="space-y-1 text-sm">
              <div>✅ Safe</div>
              <div>⚠️ Mixed</div>
              <div>🚫 Unsafe</div>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">Click anywhere on the map to drop a new safety pin.</p>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <Map pins={filteredPins} onMapClick={handleMapClick} onPinClick={setSelectedPin} />
        </div>

        {/* Pin detail panel */}
        <PinDetailPanel pin={selectedPin} onClose={() => setSelectedPin(null)} />
      </div>

      <PinSubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        coords={submitCoords}
        onSuccess={() => { setShowSubmitDialog(false); setSubmitCoords(null); fetchPins(); }}
      />
    </div>
  );
}
