'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/navbar';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FlaggedPin {
  pin: any;
  flags: any[];
  flag_count: number;
}

export default function AdminPage() {
  const [flaggedPins, setFlaggedPins] = useState<FlaggedPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/flags').then(r => r.ok && r.json()).then(data => {
      setFlaggedPins(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleDelete = async (pinId: string) => {
    if (!confirm('Delete this pin permanently?')) return;
    const res = await fetch(`/api/pins/${pinId}`, { method: 'DELETE' });
    if (res.ok) {
      setFlaggedPins(prev => prev.filter(p => p.pin.id !== pinId));
      toast.success('Pin deleted');
    } else toast.error('Failed to delete pin');
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-5xl mx-auto p-6 space-y-6 w-full">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Moderation Dashboard</h1>
        </div>
        {flaggedPins.length === 0 ? (
          <p className="text-muted-foreground">No flagged pins to review. ✨</p>
        ) : (
          <div className="grid gap-4">
            {flaggedPins.map(({ pin, flags, flag_count }) => (
              <Card key={pin.id}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{pin.tag} at ({pin.lat?.toFixed(4)}, {pin.lng?.toFixed(4)})</span>
                    <span className="text-destructive text-xs">{flag_count} flag{flag_count > 1 ? 's' : ''}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{pin.description || 'No description'}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {flags.map((f: any) => (
                      <p key={f.id}>Flagged: {f.reason || 'No reason'} — {new Date(f.created_at).toLocaleString()}</p>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(pin.id)}>Delete Pin</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
