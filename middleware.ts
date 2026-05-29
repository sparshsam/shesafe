import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Only protect the admin dashboard
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return;
  }

  const { supabase, supabaseResponse } = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = new URL('/auth', request.url);
    return Response.redirect(url);
  }

  return supabaseResponse;
}

export const config = { matcher: ['/admin/:path*'] };
