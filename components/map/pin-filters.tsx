'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SafetyTag, PinCategory, TimeOfDay } from '@/lib/types';

interface PinFiltersProps {
  tagFilter: SafetyTag | 'all';
  onTagFilterChange: (v: SafetyTag | 'all') => void;
  categoryFilter: PinCategory | 'all';
  onCategoryFilterChange: (v: PinCategory | 'all') => void;
  timeFilter: TimeOfDay | 'all';
  onTimeFilterChange: (v: TimeOfDay | 'all') => void;
}

export function PinFilters({ tagFilter, onTagFilterChange, categoryFilter, onCategoryFilterChange, timeFilter, onTimeFilterChange }: PinFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Safety</label>
        <Select value={tagFilter} onValueChange={(v) => onTagFilterChange(v as SafetyTag | 'all')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="safe">✅ Safe</SelectItem>
            <SelectItem value="mixed">⚠️ Mixed</SelectItem>
            <SelectItem value="unsafe">🚫 Unsafe</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Category</label>
        <Select value={categoryFilter} onValueChange={(v) => onCategoryFilterChange(v as PinCategory | 'all')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="lighting">💡 Lighting</SelectItem>
            <SelectItem value="harassment">🚨 Harassment</SelectItem>
            <SelectItem value="traffic">🚦 Traffic</SelectItem>
            <SelectItem value="security">🔒 Security</SelectItem>
            <SelectItem value="general">📍 General</SelectItem>
            <SelectItem value="other">❓ Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Time of Day</label>
        <Select value={timeFilter} onValueChange={(v) => onTimeFilterChange(v as TimeOfDay | 'all')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Time</SelectItem>
            <SelectItem value="morning">🌅 Morning</SelectItem>
            <SelectItem value="afternoon">☀️ Afternoon</SelectItem>
            <SelectItem value="evening">🌆 Evening</SelectItem>
            <SelectItem value="night">🌙 Night</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
