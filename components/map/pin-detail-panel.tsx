'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThumbsUp, Flag, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { getGuestSession } from '@/lib/guest';
import type { Pin, PinComment } from '@/lib/types';

const tagLabels: Record<string, string> = { safe: '✅ Safe', mixed: '⚠️ Mixed', unsafe: '🚫 Unsafe' };

export function PinDetailPanel({ pin, onClose }: { pin: Pin | null; onClose: () => void }) {
  const [comments, setComments] = useState<PinComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [upvoted, setUpvoted] = useState(false);

  useEffect(() => {
    if (!pin) return;
    fetch(`/api/pins/${pin.id}/comments`)
      .then(async (r) => { if (r.ok) { const data = await r.json(); setComments(data); } });
  }, [pin]);

  if (!pin) return null;

  const handleUpvote = async () => {
    const res = await fetch(`/api/pins/${pin.id}/upvote`, { method: upvoted ? 'DELETE' : 'POST', headers: { 'X-Session-Id': getGuestSession() } });
    if (res.ok) setUpvoted(!upvoted);
    else toast.error('Failed to toggle upvote');
  };

  const handleComment = async () => {
    if (!commentBody.trim()) return;
    const res = await fetch(`/api/pins/${pin.id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Id': getGuestSession() }, body: JSON.stringify({ body: commentBody }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments(prev => [...prev, comment]);
      setCommentBody('');
    } else toast.error('Failed to post comment');
  };

  const handleFlag = async () => {
    await fetch(`/api/pins/${pin.id}/flag`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Id': getGuestSession() }, body: JSON.stringify({}) });
    toast.success('Flagged for review');
  };

  return (
    <div className="w-96 border-l bg-background p-4 overflow-y-auto shrink-0">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-lg">{tagLabels[pin.tag]}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="space-y-2 text-sm mb-4">
        <p><span className="text-muted-foreground">Category:</span> {pin.category || 'General'}</p>
        <p><span className="text-muted-foreground">Time:</span> {pin.time_of_day || 'Any'}</p>
        <p><span className="text-muted-foreground">Reported:</span> {new Date(pin.created_at).toLocaleDateString()}</p>
        {pin.description && <p className="mt-2 p-3 bg-muted rounded-md">{pin.description}</p>}
      </div>
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handleUpvote}>
          <ThumbsUp className={`h-4 w-4 mr-1 ${upvoted ? 'fill-current' : ''}`} /> {pin.upvotes || 0}
        </Button>
        <Button variant="outline" size="sm" onClick={handleFlag}>
          <Flag className="h-4 w-4 mr-1" /> Flag
        </Button>
      </div>
      <div className="border-t pt-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-1">
          <MessageSquare className="h-4 w-4" /> Comments ({comments.length})
        </h4>
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-6 w-6"><AvatarFallback>U</AvatarFallback></Avatar>
              <div>
                <p className="text-xs text-muted-foreground">{c.profile?.display_name || 'Anonymous'}</p>
                <p className="text-sm">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 border rounded-md px-3 py-2 text-sm" placeholder="Add a comment..." value={commentBody} onChange={(e) => setCommentBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleComment()} />
          <Button size="sm" onClick={handleComment}>Post</Button>
        </div>
      </div>
    </div>
  );
}
