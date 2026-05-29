import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from('pins').select('*, pin_upvotes(count), pin_comments(count)').eq('id', id).single();
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...data, upvotes: (data as any).pin_upvotes?.[0]?.count ?? 0, comment_count: (data as any).pin_comments?.[0]?.count ?? 0 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: pin } = await supabase.from('pins').select('user_id').eq('id', id).single();
  if (!pin || pin.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { data, error } = await supabase.from('pins').update(body).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: pin } = await supabase.from('pins').select('user_id').eq('id', id).single();
  if (!pin) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (pin.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase.from('pins').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
