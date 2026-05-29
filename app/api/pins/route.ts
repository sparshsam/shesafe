import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { lat, lng, tag, category, description, time_of_day } = body;

  if (!lat || !lng || !tag) {
    return NextResponse.json({ error: 'lat, lng, and tag are required' }, { status: 400 });
  }

  if (!['safe', 'mixed', 'unsafe'].includes(tag)) {
    return NextResponse.json({ error: 'Invalid tag' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('pins')
    .insert({ user_id: user.id, lat, lng, tag, category, description, time_of_day })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
