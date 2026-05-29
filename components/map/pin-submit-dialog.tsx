'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { SafetyTag, PinCategory, TimeOfDay } from '@/lib/types';

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng, tag, category, description, time_of_day: timeOfDay }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }
      toast.success('Pin submitted!', { description: 'Thank you for contributing to safety.' });
      setDescription('');
      onSuccess();
    } catch (err: any) {
      toast.error('Error', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Safety Pin</DialogTitle>
          <DialogDescription>
            {coords ? `Location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Click on the map to select a location'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Safety Level</label>
            <Select value={tag} onValueChange={(v) => setTag(v as SafetyTag)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="safe">✅ Safe</SelectItem>
                <SelectItem value="mixed">⚠️ Mixed</SelectItem>
                <SelectItem value="unsafe">🚫 Unsafe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
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
          <div className="space-y-1">
            <label className="text-sm font-medium">Time of Day</label>
            <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as TimeOfDay)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Time</SelectItem>
                <SelectItem value="morning">🌅 Morning</SelectItem>
                <SelectItem value="afternoon">☀️ Afternoon</SelectItem>
                <SelectItem value="evening">🌆 Evening</SelectItem>
                <SelectItem value="night">🌙 Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your experience..." rows={3} />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Pin
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
