import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPublicClient } from '@/lib/supabase/public';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_FLAGS_PER_SESSION = 5;

const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore[`flag:${sessionId}`];
  if (!entry || now > entry.resetAt) {
    rateLimitStore[`flag:${sessionId}`] = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    return true;
  }
  if (entry.count >= MAX_FLAGS_PER_SESSION) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { reason } = await request.json();
  const sessionId = request.headers.get('x-session-id') || '';

  // Guest rate limiting
  if (!user && sessionId) {
    if (!checkRateLimit(sessionId)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 5 flags per hour.' }, { status: 429 });
    }
  }

  const pb = createPublicClient();
  const insertData: Record<string, unknown> = { pin_id: id, reason: reason || 'inappropriate' };
  if (user) {
    insertData.user_id = user.id;
  } else if (sessionId) {
    insertData.session_id = sessionId;
  } else {
    return NextResponse.json({ error: 'Authentication or session required' }, { status: 401 });
  }

  const { error } = await pb.from('pin_flags').insert(insertData);
  if (error?.message?.includes('violates row-level security')) {
    return NextResponse.json({ error: 'Guest flagging not yet enabled. Run the schema migration.' }, { status: 403 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
