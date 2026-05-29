import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPublicClient } from '@/lib/supabase/public';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_COMMENTS_PER_SESSION = 10;
const MAX_COMMENT_LENGTH = 500;

const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore[`comment:${sessionId}`];
  if (!entry || now > entry.resetAt) {
    rateLimitStore[`comment:${sessionId}`] = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    return true;
  }
  if (entry.count >= MAX_COMMENTS_PER_SESSION) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pin_comments')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('pin_id', id)
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { body } = await request.json();
  const sessionId = request.headers.get('x-session-id') || '';

  if (!body?.trim()) {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: `Comment must be under ${MAX_COMMENT_LENGTH} characters` }, { status: 400 });
  }

  // Guest rate limiting
  if (!user && sessionId) {
    if (!checkRateLimit(sessionId)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 10 comments per hour.' }, { status: 429 });
    }
  }

  const pb = createPublicClient();
  const insertData: Record<string, unknown> = { pin_id: id, body: body.trim() };
  if (user) {
    insertData.user_id = user.id;
  } else if (sessionId) {
    insertData.session_id = sessionId;
  } else {
    return NextResponse.json({ error: 'Authentication or session required' }, { status: 401 });
  }

  const { data, error } = await pb
    .from('pin_comments')
    .insert(insertData)
    .select('*, profile:profiles(display_name, avatar_url)')
    .single();

  if (error?.message?.includes('violates row-level security')) {
    return NextResponse.json({ error: 'Guest commenting not yet enabled. Run the schema migration.' }, { status: 403 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
