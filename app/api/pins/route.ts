import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPublicClient } from '@/lib/supabase/public';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PINS_PER_SESSION = 10;

/** Simple in-memory rate limiter keyed by session_id. */
const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};

function checkPinRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore[`pins:${sessionId}`];
  if (!entry || now > entry.resetAt) {
    rateLimitStore[`pins:${sessionId}`] = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    return true;
  }
  if (entry.count >= MAX_PINS_PER_SESSION) return false;
  entry.count++;
  return true;
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pins')
    .select('*, pin_upvotes(count), pin_comments(count)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pins = data?.map(pin => ({
    ...pin,
    upvotes: (pin as any).pin_upvotes?.[0]?.count ?? 0,
    comment_count: (pin as any).pin_comments?.[0]?.count ?? 0,
    pin_upvotes: undefined,
    pin_comments: undefined,
  })) || [];

  return NextResponse.json(pins);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await request.json();
  const { lat, lng, tag, category, description, time_of_day } = body;
  const sessionId = request.headers.get('x-session-id') || body.session_id;

  // Validate required fields
  if (!lat || !lng || !tag) {
    return NextResponse.json({ error: 'lat, lng, and tag are required' }, { status: 400 });
  }
  if (!['safe', 'mixed', 'unsafe'].includes(tag)) {
    return NextResponse.json({ error: 'Invalid tag' }, { status: 400 });
  }

  // Validate description length
  if (description && description.length > 500) {
    return NextResponse.json({ error: 'Description must be under 500 characters' }, { status: 400 });
  }

  // Guest rate limiting
  if (!user && sessionId) {
    if (!checkPinRateLimit(sessionId)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 10 pins per hour.' }, { status: 429 });
    }
  }

  // Insert via public client (anon key) to respect RLS for both auth and guest
  const pb = createPublicClient();
  const insertData: Record<string, unknown> = { lat, lng, tag, category, description, time_of_day };

  if (user) {
    insertData.user_id = user.id;
  } else if (sessionId) {
    insertData.session_id = sessionId;
  } else {
    return NextResponse.json({ error: 'Authentication or session required' }, { status: 401 });
  }

  const { data, error } = await pb
    .from('pins')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // If RLS blocks, provide a helpful message
    if (error.message?.includes('violates row-level security')) {
      return NextResponse.json({
        error: 'Public pin submission is not yet enabled. Run the schema migration in Supabase Dashboard to enable guest access.',
      }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
