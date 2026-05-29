import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPublicClient } from '@/lib/supabase/public';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_UPVOTES_PER_SESSION = 30;

const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore[`upvote:${sessionId}`];
  if (!entry || now > entry.resetAt) {
    rateLimitStore[`upvote:${sessionId}`] = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    return true;
  }
  if (entry.count >= MAX_UPVOTES_PER_SESSION) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const sessionId = request.headers.get('x-session-id') || '';

  // Guest rate limiting
  if (!user && sessionId) {
    if (!checkRateLimit(sessionId)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 30 upvotes per hour.' }, { status: 429 });
    }
  }

  // Check for existing upvote by session
  if (!user && sessionId) {
    const pb = createPublicClient();
    const { data: existing } = await pb
      .from('pin_upvotes')
      .select('id')
      .eq('pin_id', id)
      .eq('session_id', sessionId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Already upvoted' }, { status: 409 });
    }
  }

  const pb = createPublicClient();
  const insertData: Record<string, unknown> = { pin_id: id };
  if (user) {
    insertData.user_id = user.id;
  } else if (sessionId) {
    insertData.session_id = sessionId;
  } else {
    return NextResponse.json({ error: 'Authentication or session required' }, { status: 401 });
  }

  const { error } = await pb.from('pin_upvotes').insert(insertData);
  if (error?.message?.includes('violates row-level security')) {
    return NextResponse.json({ error: 'Guest upvoting not yet enabled. Run the schema migration.' }, { status: 403 });
  }
  if (error?.code === '23505') return NextResponse.json({ error: 'Already upvoted' }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sessionId = request.headers.get('x-session-id') || '';

  const pb = createPublicClient();
  let query = pb.from('pin_upvotes').delete().eq('pin_id', id);

  if (user) {
    query = query.eq('user_id', user.id);
  } else if (sessionId) {
    query = query.eq('session_id', sessionId);
  } else {
    return NextResponse.json({ error: 'Authentication or session required' }, { status: 401 });
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
