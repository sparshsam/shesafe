import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!user || !adminEmails.includes(user.email?.toLowerCase() || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: rawFlags } = await supabase
    .from('pin_flags')
    .select('*, pin:pins(*)')
    .order('created_at', { ascending: false });

  const seen = new Set();
  const grouped = rawFlags?.reduce((acc: any[], f: any) => {
    if (!seen.has(f.pin_id)) {
      seen.add(f.pin_id);
      acc.push({ pin: f.pin, flags: [f], flag_count: 1 });
    } else {
      const existing = acc.find((g: any) => g.pin.id === f.pin_id);
      if (existing) { existing.flags.push(f); existing.flag_count++; }
    }
    return acc;
  }, []) || [];

  return NextResponse.json(grouped);
}
