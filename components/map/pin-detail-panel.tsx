'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThumbsUp, Flag, MessageSquare, X, MapPin, Clock, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { getGuestSession } from '@/lib/guest';
import type { Pin, PinComment } from '@/lib/types';

const tagLabels: Record<string, { label: string; emoji: string; color: string }> = {
  safe: { label: 'Safe', emoji: '✅', color: 'bg-green-100 text-green-800 border-green-200' },
  mixed: { label: 'Mixed', emoji: '⚠️', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  unsafe: { label: 'Unsafe', emoji: '🚫', color: 'bg-red-100 text-red-800 border-red-200' },
};

const categoryIcons: Record<string, string> = {
  general: '📍',
  lighting: '💡',
  harassment: '🚨',
  traffic: '🚦',
  security: '🔒',
  other: '❓',
};

export function PinDetailPanel({ pin, onClose }: { pin: Pin | null; onClose: () => void }) {
  const [comments, setComments] = useState<PinComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [upvoted, setUpvoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pin) return;
    fetch(`/api/pins/${pin.id}/comments`)
      .then(async (r) => { if (r.ok) { const data = await r.json(); setComments(data); } });
  }, [pin]);

  if (!pin) return null;

  const tagInfo = tagLabels[pin.tag] || tagLabels.mixed;

  const handleUpvote = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pins/${pin.id}/upvote`, { method: upvoted ? 'DELETE' : 'POST', headers: { 'X-Session-Id': getGuestSession() } });
      if (res.ok) {
        setUpvoted(!upvoted);
        toast.success(upvoted ? 'Upvote removed' : 'Upvoted!');
      } else if (res.status === 409) {
        toast.error('Already upvoted');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to upvote');
      }
    } catch {
      toast.error('Failed to upvote');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComment = async () => {
    if (!commentBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pins/${pin.id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Id': getGuestSession() }, body: JSON.stringify({ body: commentBody }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments(prev => [...prev, comment]);
        setCommentBody('');
        toast.success('Comment posted');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to post comment');
      }
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlag = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pins/${pin.id}/flag`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Id': getGuestSession() }, body: JSON.stringify({}) });
      if (res.ok) {
        toast.success('Flagged for review');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to flag');
      }
    } catch {
      toast.error('Failed to flag');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile when pin is selected */}
      <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={onClose} />

      <div className="md:relative fixed bottom-0 left-0 right-0 z-50 md:z-auto w-full md:w-96 md:border-l bg-background md:overflow-y-auto md:max-h-full max-h-[75vh] rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none shrink-0">
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(75vh-32px)] md:max-h-none">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${tagInfo.color}`}>
                {tagInfo.emoji} {tagInfo.label}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Details */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="h-4 w-4 shrink-0" />
              <span>{categoryIcons[pin.category || ''] || '📍'} {pin.category || 'General'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{pin.time_of_day ? pin.time_of_day.charAt(0).toUpperCase() + pin.time_of_day.slice(1) : 'Any time'}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Reported {new Date(pin.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {pin.description && (
              <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                {pin.description}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={upvoted ? 'default' : 'outline'}
              size="sm"
              onClick={handleUpvote}
              disabled={submitting}
              className={`gap-1 ${upvoted ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <ThumbsUp className={`h-4 w-4 ${upvoted ? 'fill-current' : ''}`} />
              {pin.upvotes || 0}
            </Button>
            <Button variant="outline" size="sm" onClick={handleFlag} disabled={submitting} className="gap-1">
              <Flag className="h-4 w-4" />
              Flag
            </Button>
          </div>

          {/* Comments section */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </h4>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first to share your thoughts.</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-6 w-6 shrink-0"><AvatarFallback className="text-[10px]">U</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{c.profile?.display_name || 'Anonymous'}</p>
                      <p className="text-sm break-words">{c.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input */}
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background"
                placeholder="Add a comment..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleComment()}
                maxLength={500}
              />
              <Button size="sm" onClick={handleComment} disabled={submitting || !commentBody.trim()}>
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
