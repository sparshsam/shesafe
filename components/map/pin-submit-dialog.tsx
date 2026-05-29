'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, MapPin } from 'lucide-react';
import type { SafetyTag, PinCategory, TimeOfDay } from '@/lib/types';
import { getGuestSession } from '@/lib/guest';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coords: { lat: number; lng: number } | null;
  onSuccess: () => void;
}

export function PinSubmitDialog({ open, onOpenChange, coords, onSuccess }: Props) {
  const [tag, setTag] = useState<SafetyTag>('safe');
  const [category, setCategory] = useState<PinCategory>('general');
  const [description, setDescription] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('any');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!coords) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': getGuestSession() },
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng, tag, category, description, time_of_day: timeOfDay }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit');
      }
      toast.success('Safety pin submitted!', { description: 'Thank you for helping the community.' });
      setDescription('');
      onSuccess();
    } catch (err: any) {
      toast.error('Something went wrong', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (submitting) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5" /> Add Safety Pin
          </DialogTitle>
          <DialogDescription>
            {coords
              ? `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
              : 'Click on the map to select a location'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Safety Level */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">How safe is this area?</label>
            <Select value={tag} onValueChange={(v) => setTag(v as SafetyTag)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="safe">✅ Safe — felt secure</SelectItem>
                <SelectItem value="mixed">⚠️ Mixed — some concerns</SelectItem>
                <SelectItem value="unsafe">🚫 Unsafe — avoid if possible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category (optional)</label>
            <Select value={category} onValueChange={(v) => setCategory(v as PinCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">📍 General</SelectItem>
                <SelectItem value="lighting">💡 Lighting</SelectItem>
                <SelectItem value="harassment">🚨 Harassment</SelectItem>
                <SelectItem value="traffic">🚦 Traffic</SelectItem>
                <SelectItem value="security">🔒 Security</SelectItem>
                <SelectItem value="other">❓ Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time of day */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time of day (optional)</label>
            <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as TimeOfDay)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">🕐 Any Time</SelectItem>
                <SelectItem value="morning">🌅 Morning</SelectItem>
                <SelectItem value="afternoon">☀️ Afternoon</SelectItem>
                <SelectItem value="evening">🌆 Evening</SelectItem>
                <SelectItem value="night">🌙 Night</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened or what to watch out for..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleCancel} disabled={submitting} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !coords} className="flex-1 gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Pin
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
