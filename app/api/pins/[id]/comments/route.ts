import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from('pin_comments').select('*, profile:profiles(display_name, avatar_url)').eq('pin_id', id).order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { body } = await request.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });

  const { data, error } = await supabase.from('pin_comments').insert({ pin_id: id, user_id: user.id, body }).select('*, profile:profiles(display_name, avatar_url)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
